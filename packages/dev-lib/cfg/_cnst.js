// ESLint config decides which file types to lint inside these dirs.
// The dirs are needed, because the shared ESLint config enables type-aware parsing only for them.
const eslintDirs = ['src', 'scripts', 'e2e']
// stylelint has no file discovery of its own, and it doesn't read .gitignore files.
// `--ignore-path .gitignore` is not a replacement: it reads only the root .gitignore (not nested ones),
// and stylelint still walks the ignored dirs (e.g android/ios build output), which is slow.
// That's why stylelint gets the source dirs explicitly.
const stylelintDirs = ['src', 'scripts', 'e2e', 'resources', 'public', 'static']
const stylelintExtensions = 'css,scss'
const lintExclude = ['**/__exclude/**']
const minActionlintVersion = '1.7.12'

export { eslintDirs, stylelintDirs, stylelintExtensions, lintExclude, minActionlintVersion }
