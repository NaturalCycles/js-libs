import { getEslintConfigForDir } from './eslint.config.js'

const config = getEslintConfigForDir(`${process.cwd()}/scripts`)
export default config
