import { _by } from '@naturalcycles/js-lib/array/array.util.js'
import { _assert } from '@naturalcycles/js-lib/error/assert.js'
import type { StringMap } from '@naturalcycles/js-lib/types'
import { dimGrey } from '@naturalcycles/nodejs-lib/colors'

export interface BaseEnv {
  name: string
}

export interface EnvSharedServiceCfg<ENV> {
  environments: ENV[]
}

export class EnvSharedService<ENV extends BaseEnv> {
  constructor(cfg: EnvSharedServiceCfg<ENV>) {
    this.envMap = _by(cfg.environments, e => e.name)
  }

  envMap: StringMap<ENV>

  private env?: ENV

  init(): void {
    this.getEnv()
  }

  getEnv(): ENV {
    if (!this.env) {
      const { APP_ENV } = process.env
      _assert(APP_ENV, 'APP_ENV should be defined!')

      const env = this.envMap[APP_ENV]
      _assert(env, `Environment ${APP_ENV} is not defined`)

      this.env = env
      console.log(`APP_ENV=${dimGrey(APP_ENV)} loaded`)
    }

    return this.env
  }

  setEnv(env?: ENV): void {
    this.env = env
    console.log(`setEnv APP_ENV=${dimGrey(env?.name || 'undefined')}`)
  }
}
