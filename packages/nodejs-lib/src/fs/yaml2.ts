import fs from 'node:fs'
import fsp from 'node:fs/promises'
import type { DumpOptions } from 'js-yaml'
import yaml from 'js-yaml'
import { fs2 } from './fs2.js'

class Yaml2 {
  readYaml<T = unknown>(filePath: string): T {
    return yaml.load(fs.readFileSync(filePath, 'utf8')) as T
  }

  async readYamlAsync<T = unknown>(filePath: string): Promise<T> {
    return yaml.load(await fsp.readFile(filePath, 'utf8')) as T
  }

  writeYaml(filePath: string, data: any, opt?: DumpOptions): void {
    const str = yaml.dump(data, opt)
    fs.writeFileSync(filePath, str)
  }

  async writeYamlAsync(filePath: string, data: any, opt?: DumpOptions): Promise<void> {
    const str = yaml.dump(data, opt)
    await fsp.writeFile(filePath, str)
  }

  outputYaml(filePath: string, data: any, opt?: DumpOptions): void {
    const str = yaml.dump(data, opt)
    fs2.outputFile(filePath, str)
  }

  async outputYamlAsync(filePath: string, data: any, opt?: DumpOptions): Promise<void> {
    const str = yaml.dump(data, opt)
    await fs2.outputFileAsync(filePath, str)
  }
}

export const yaml2 = new Yaml2()
