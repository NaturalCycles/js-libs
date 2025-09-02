import { getEslintConfigForDir } from './eslint.config.js'

const config = getEslintConfigForDir(`${process.cwd()}/e2e`)
export default config
