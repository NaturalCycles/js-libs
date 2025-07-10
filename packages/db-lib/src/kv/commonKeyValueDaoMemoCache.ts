import { localTime } from '@naturalcycles/js-lib/datetime'
import type { AsyncMemoCache } from '@naturalcycles/js-lib/decorators'
import type { NumberOfSeconds, UnixTimestamp } from '@naturalcycles/js-lib/types'
import { MISS } from '@naturalcycles/js-lib/types'
import type { CommonKeyValueDao } from './commonKeyValueDao.js'

export interface CommonKeyValueDaoMemoCacheCfg<VALUE> {
  dao: CommonKeyValueDao<string, VALUE>

  /**
   * If set, every `set()` will set `expireAt` (TTL) option.
   */
  ttl?: NumberOfSeconds
}

/**
 * AsyncMemoCache implementation, backed by CommonKeyValueDao.
 *
 * Does NOT support persisting Errors, skips them instead.
 *
 * Also, does not support .clear(), as it's more dangerous than useful to actually
 * clear the whole table/cache.
 */
export class CommonKeyValueDaoMemoCache<VALUE> implements AsyncMemoCache<string, VALUE> {
  constructor(private cfg: CommonKeyValueDaoMemoCacheCfg<VALUE>) {}

  async get(k: string): Promise<VALUE | typeof MISS> {
    return (await this.cfg.dao.getById(k)) || MISS
  }

  async set(k: string, v: VALUE): Promise<void> {
    const opt = this.cfg.ttl
      ? { expireAt: (localTime.nowUnix() + this.cfg.ttl) as UnixTimestamp }
      : undefined

    await this.cfg.dao.save(k, v, opt)
  }

  async clear(): Promise<void> {
    throw new Error(
      'CommonKeyValueDaoMemoCache.clear is not supported, because cache is expected to be persistent',
    )
  }
}
