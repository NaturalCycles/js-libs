import type { CommonLogger } from '@naturalcycles/js-lib'
import { _hb, NumberStack } from '@naturalcycles/js-lib'
import { yellow } from '../colors/colors.js'
import { gzipBuffer } from '../zip/zip.util.js'

export class SizeStack extends NumberStack {
  constructor(
    public name: string,
    size: number,
  ) {
    super(size)
  }

  total = 0

  override push(item: any): this {
    this.total += item
    return super.push(item)
  }

  getStats(): string {
    // const pcs = this.percentiles([50, 90])

    return [
      '  ' + this.name,
      'avg',
      yellow(_hb(this.avg())),
      // 'p50',
      // yellow(_hb(pcs[50])),
      // 'p90',
      // yellow(_hb(pcs[90])),
      'total',
      yellow(_hb(this.total)),
    ].join(' ')
  }

  static async countItem(
    item: any,
    logger: CommonLogger,
    sizes?: SizeStack,
    sizesZipped?: SizeStack,
  ): Promise<void> {
    if (!sizes) return

    // try-catch, because we don't want to fail the pipeline on logProgress
    try {
      const buf = Buffer.from(JSON.stringify(item))
      sizes.push(buf.byteLength)

      if (sizesZipped) {
        const { byteLength } = await gzipBuffer(buf)
        sizesZipped.push(byteLength)
      }
    } catch (err) {
      logger.warn(
        `transformLogProgress failed to JSON.stringify the chunk: ${(err as Error).message}`,
      )
    }
  }
}
