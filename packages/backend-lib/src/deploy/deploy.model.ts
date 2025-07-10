import type { UnixTimestamp } from '@naturalcycles/js-lib/types'

export interface DeployInfo {
  gaeProject: string
  gaeService: string
  gaeVersion: string
  versionUrl: string
  serviceUrl: string
  gitRev: string
  gitBranch: string

  /**
   * Unix timestamp of deployInfo.json being generated.
   */
  ts: UnixTimestamp
}

export interface AppYaml extends Record<string, any> {
  runtime: string
  service: string
  inbound_services?: string[]
  instance_class?: string
  automatic_scaling?: {
    min_instances?: number
    max_instances?: number
  }
  env_variables: {
    APP_ENV: string
    DEBUG: string
    [k: string]: string
  }
}
