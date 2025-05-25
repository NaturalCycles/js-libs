// Types based on @types/debug
export interface IDebug {
  (namespace: string): IDebugger
  coerce: (val: any) => any
  disable: () => string
  enable: (namespaces: string) => void
  enabled: (namespaces: string) => boolean
  log: (...args: any[]) => any

  names: RegExp[]
  skips: RegExp[]

  formatters: DebugFormatters
}

export interface DebugFormatters {
  [formatter: string]: (v: any) => string
}

export interface IDebugger {
  // (formatter: any, ...args: any[]): void;
  (...args: any[]): void

  color: string
  enabled: boolean
  log: (...args: any[]) => any
  namespace: string
  destroy: () => boolean
  // extend: (namespace: string, delimiter?: string) => IDebugger
}

const originalDebug = require('debug') as IDebug

// eslint-disable-next-line @typescript-eslint/naming-convention
export const Debug = ((namespace: string) => {
  const instance = originalDebug(namespace)
  instance.log = console.log.bind(console) // this enables colors for objects
  return instance
}) as IDebug

Debug.coerce = originalDebug.coerce.bind(originalDebug)
Debug.disable = originalDebug.disable.bind(originalDebug)
Debug.enable = originalDebug.enable.bind(originalDebug)
Debug.enabled = originalDebug.enabled.bind(originalDebug)
Debug.log = originalDebug.log.bind(originalDebug)
Debug.names = originalDebug.names
Debug.skips = originalDebug.skips
Debug.formatters = originalDebug.formatters
