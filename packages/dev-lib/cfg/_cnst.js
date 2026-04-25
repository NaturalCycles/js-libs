const prettierDirs = ['src,scripts,e2e,docs,cfg,resources,.github,public,static']
// everything that prettier supports:
const prettierExtensionsAll =
  'ts,tsx,cts,mts,css,scss,js,jsx,cjs,mjs,json,md,graphql,yml,yaml,html,vue'
const eslintExtensions = 'ts,tsx,html'
const stylelintExtensions = 'css,scss'
const lintExclude = ['**/__exclude/**']
const minActionlintVersion = '1.7.12'

export {
  prettierDirs,
  prettierExtensionsAll,
  eslintExtensions,
  stylelintExtensions,
  lintExclude,
  minActionlintVersion,
}
