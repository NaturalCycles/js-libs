import fs from 'node:fs'
import fsp from 'node:fs/promises'
import type {
  CreateNodeOptions,
  DocumentOptions,
  ParseOptions,
  SchemaOptions,
  ToStringOptions,
} from 'yaml'
import { parse, stringify } from 'yaml'
import { fs2 } from './fs2.js'

export type YamlStringifyOptions = DocumentOptions &
  SchemaOptions &
  ParseOptions &
  CreateNodeOptions &
  ToStringOptions

class Yaml2 {
  readYaml<T = unknown>(filePath: string): T {
    return parse(fs.readFileSync(filePath, 'utf8')) as T
  }

  async readYamlAsync<T = unknown>(filePath: string): Promise<T> {
    return parse(await fsp.readFile(filePath, 'utf8')) as T
  }

  writeYaml(filePath: string, data: any, opt?: YamlStringifyOptions): void {
    const str = stringify(data, opt)
    fs.writeFileSync(filePath, str)
  }

  async writeYamlAsync(filePath: string, data: any, opt?: YamlStringifyOptions): Promise<void> {
    const str = stringify(data, opt)
    await fsp.writeFile(filePath, str)
  }

  outputYaml(filePath: string, data: any, opt?: YamlStringifyOptions): void {
    const str = stringify(data, opt)
    fs2.outputFile(filePath, str)
  }

  async outputYamlAsync(filePath: string, data: any, opt?: YamlStringifyOptions): Promise<void> {
    const str = stringify(data, opt)
    await fs2.outputFileAsync(filePath, str)
  }
}

export const yaml2 = new Yaml2()
