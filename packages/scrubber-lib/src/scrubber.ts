import { _assert } from '@naturalcycles/js-lib/error/assert.js'
import { _deepEquals } from '@naturalcycles/js-lib/object'
import type { StringMap } from '@naturalcycles/js-lib/types'
import { nanoid } from '@naturalcycles/nodejs-lib'
import type { ScrubberConfig, ScrubbersMap, ScrubbersSQLMap } from './scrubber.model.js'
import { defaultScrubbers, defaultScrubbersSQL } from './scrubbers.js'

const defaultCfg: Partial<ScrubberConfig> = { throwOnError: false, preserveFalsy: true }

export class Scrubber {
  private readonly scrubbersMap: ScrubbersMap
  private readonly scrubbersSQLMap: ScrubbersSQLMap
  private readonly initializationVector: string
  private readonly rootType?: string

  /**
   * Create new scrubber instance
   *
   * @param cfg
   * @param additionalScrubbersMap optional additional scrubbers
   * @param additionalScrubbersSQLMap optional additional scrubbers SQL
   * @param initializationVector optional initialization vector used by some scrubbers.
   * @param rootType optional root type. Assumes all objects passed to this scubber is of named type for the sake of parent matching.
   */
  constructor(
    private cfg: ScrubberConfig,
    additionalScrubbersMap?: ScrubbersMap,
    additionalScrubbersSQLMap?: ScrubbersSQLMap,
    initializationVector?: string,
    rootType?: string,
  ) {
    this.initializationVector = initializationVector || nanoid()
    this.scrubbersMap = { ...defaultScrubbers, ...additionalScrubbersMap }
    this.scrubbersSQLMap = { ...defaultScrubbersSQL, ...additionalScrubbersSQLMap }
    this.cfg = { ...defaultCfg, ...this.expandCfg(cfg) }
    this.cfg.splitFields = this.splitFields(cfg)
    this.checkIfScrubbersExistAndRaise(cfg, this.scrubbersMap)
    this.rootType = rootType
  }

  static getScrubberForType(
    rootType: string,
    cfg: ScrubberConfig,
    additionalScrubbersImpl?: ScrubbersMap,
    additionalScrubbersSQLImpl?: ScrubbersSQLMap,
    initializationVector?: string,
  ): Scrubber {
    return new Scrubber(
      cfg,
      additionalScrubbersImpl,
      additionalScrubbersSQLImpl,
      initializationVector,
      rootType,
    )
  }

  /**
   * Returns undefined if there's no scrubber defined for the field.
   */
  getScrubberSql(fieldName: string): string | undefined {
    const scrubberCurrentField = this.cfg.fields[fieldName]
    if (!scrubberCurrentField) return undefined

    const scrubber = this.scrubbersSQLMap[scrubberCurrentField.scrubber]
    _assert(scrubber, `No SQL factory for ${scrubberCurrentField.scrubber}, used for ${fieldName}`)

    return scrubber({
      initializationVector: this.initializationVector,
      ...scrubberCurrentField.params,
    })
  }

  scrub<T>(data: T): T {
    return this.applyScrubbers(data, this.rootType ? [this.rootType] : undefined)
  }

  private applyScrubbers<T>(data: T, parents: string[] = []): T {
    const isArray = Array.isArray(data)
    const dataCopy: any = Array.isArray(data) ? [...data] : { ...data }

    Object.keys(dataCopy).forEach(key => {
      let scrubberCurrentField = this.cfg.fields[key]

      if (!scrubberCurrentField && this.cfg.splitFields?.[key] && parents) {
        for (const splitFieldParentCfg of this.cfg.splitFields[key]) {
          if (this.arrayContainsInOrder(parents, splitFieldParentCfg)) {
            const recomposedKey = [...splitFieldParentCfg, key].join('.')
            scrubberCurrentField = this.cfg.fields[recomposedKey]
          }
        }
      }

      if (!scrubberCurrentField) {
        // Ignore unsupported object types
        if (
          dataCopy[key] instanceof Map ||
          dataCopy[key] instanceof Set ||
          Buffer.isBuffer(dataCopy[key])
        ) {
          return
        }

        // Deep traverse
        if (typeof dataCopy[key] === 'object' && dataCopy[key]) {
          // Don't append array keys to parent array as it breaks parent matching
          const parentsNext = isArray ? parents : [...parents, key]
          dataCopy[key] = this.applyScrubbers(dataCopy[key], parentsNext)
        }

        return
      }

      const scrubber = this.scrubbersMap[scrubberCurrentField.scrubber]!
      const params = {
        initializationVector: this.initializationVector,
        ...scrubberCurrentField.params,
      }

      try {
        if (!this.cfg.preserveFalsy || dataCopy[key]) {
          dataCopy[key] = scrubber(dataCopy[key], params)
        }
      } catch (err) {
        if (this.cfg.throwOnError) {
          throw err
        }
        console.log(
          `Error when applying scrubber '${scrubberCurrentField.scrubber}' to field '${key}'`,
          err,
        )
      }
    })

    return dataCopy
  }

  /*
   * Allows comma-separated field names to be used as keys on YAML for better reusability
   * YAML:
   *  field1, field2, field3:
   *    scrubber: <scrubberName>
   *
   * Will become:
   *  field1:
   *    scrubber: <scrubberName>
   *  field2:
   *    scrubber: <scrubberName>
      ...
   *
   *
   * This function returns a new ScrubberConfig where each field is denormalized,
   * allowing fast lookup by keys
   */
  private expandCfg(cfg: ScrubberConfig): ScrubberConfig {
    const newCfg = { ...cfg }

    Object.keys(newCfg.fields).forEach(key => {
      if (key.includes(',')) {
        const fieldNames = key.split(',')
        const fieldCfg = newCfg.fields[key]!

        delete newCfg.fields[key]

        fieldNames.forEach(fieldName => {
          newCfg.fields[fieldName.trim()] = fieldCfg
        })
      }
    })

    return newCfg
  }

  private checkIfScrubbersExistAndRaise(cfg: ScrubberConfig, scrubbers: ScrubbersMap): void {
    _assert(cfg.fields, "Missing the 'fields' key on ScrubberConfig")

    const scrubbersOnConfig = Object.keys(cfg.fields).map(field => cfg.fields[field]!.scrubber)
    const scrubbersAvailable = Object.keys(scrubbers)

    scrubbersOnConfig.forEach(scrubber => {
      _assert(scrubbersAvailable.includes(scrubber), `${scrubber} not found`)
    })
  }

  private splitFields(cfg: ScrubberConfig): StringMap<string[][]> {
    const output: StringMap<string[][]> = {}
    for (const field of Object.keys(cfg.fields)) {
      const splitField = field.split('.')

      if (splitField.length > 1) {
        const key = splitField.pop()!
        // Support multiple keys with different parents
        output[key] ||= []
        output[key].push(splitField)
      }
    }
    return output
  }

  /**
   * returns true if all entries in b are equal to the end of entries of a. a may be longer than b.
   * Supports objects inside of arrays by removing any integer entries from a before comparing
   */
  private arrayContainsInOrder(a: any[] | undefined, b: any[] | undefined): boolean {
    if (!a || !b) return false
    if (a === b) return true
    if (a.length < b.length) return false

    const intRegex = /^[0-9]*$/g

    // Remove any entries that are integers as we assume they are array indices that should be ignored for parent matching
    let aSliced = a.filter(e => !intRegex.test(e))

    if (aSliced.length < b.length) return false

    // a may be longer than b, slice a to the size of b, take chunk from the end
    aSliced = aSliced.slice(aSliced.length - b.length)

    return _deepEquals(aSliced, b)
  }
}
