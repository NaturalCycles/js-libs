const prettierDirs = ['src,scripts,e2e,docs,cfg,resources,.github,public,static']
// ts,tsx,css,scss excluded, cause they need to run in special order (overlap between >1 tool):
const prettierExtensionsExclusive = 'js,jsx,json,md,graphql,yml,yaml,html'
// everything that prettier supports:
const prettierExtensionsAll =
  'ts,tsx,cts,mts,css,scss,js,jsx,cjs,mjs,json,md,graphql,yml,yaml,html,vue'
const eslintExtensions = 'ts,tsx,cts,mts,html'
const stylelintExtensions = 'css,scss'
const lintExclude = ['./**/__exclude/**', './**/dist/**', './**/cache/**', './CHANGELOG.md']
const minActionlintVersion = '1.7.10'

export {
  prettierDirs,
  prettierExtensionsExclusive,
  prettierExtensionsAll,
  eslintExtensions,
  stylelintExtensions,
  lintExclude,
  minActionlintVersion,
}
