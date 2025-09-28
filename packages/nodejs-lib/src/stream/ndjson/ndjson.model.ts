import { _hb } from '@naturalcycles/js-lib'
import { _ms } from '@naturalcycles/js-lib/datetime/time.util.js'
import { boldWhite, dimWhite } from '../../colors/colors.js'

export class NDJsonStats {
  static create(o: Partial<NDJsonStats> = {}): NDJsonStats {
    return Object.assign(new NDJsonStats(), o)
  }

  static empty(): NDJsonStats {
    return new NDJsonStats()
  }

  static createCombined(stats: NDJsonStats[]): NDJsonStats {
    // oxlint-disable-next-line unicorn/no-array-reduce
    return stats.reduce((statsTotal, stats) => statsTotal.add(stats), new NDJsonStats())
  }

  tookMillis = 0
  rows = 0
  sizeBytes = 0

  get rpsTotal(): number {
    return Math.round(this.rows / ((this.tookMillis || 1) / 1000))
  }

  get bpsTotal(): number {
    return this.sizeBytes === 0 ? 0 : Math.round(this.sizeBytes / ((this.tookMillis || 1) / 1000))
  }

  get avgBytesPerRow(): number {
    return Math.round(this.sizeBytes / this.rows)
  }

  /**
   * Non-mutating addition, returns new object
   */
  add(s: NDJsonStats): NDJsonStats {
    return NDJsonStats.create({
      tookMillis: this.tookMillis + s.tookMillis,
      rows: this.rows + s.rows,
      sizeBytes: this.sizeBytes + s.sizeBytes,
    })
  }

  toPretty(name?: string): string {
    return [
      `Processed ${name ? boldWhite(name) + ': ' : ''}${dimWhite(this.rows)} rows, ${dimWhite(
        _hb(this.sizeBytes),
      )} in ${dimWhite(_ms(this.tookMillis))}`,
      dimWhite(this.rpsTotal + ' rows/sec'),
      dimWhite(_hb(this.avgBytesPerRow) + '/row'),
      dimWhite(_hb(this.bpsTotal) + '/sec'),
    ].join(', ')
  }
}
