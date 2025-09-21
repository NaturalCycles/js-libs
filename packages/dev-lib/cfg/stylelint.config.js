export default {
  extends: ['stylelint-config-standard-scss'],
  ignoreFiles: ['!**/*.{css,scss}'],
  rules: {
    'no-empty-source': null,
    'color-hex-length': 'short',
    'length-zero-no-unit': [
      true,
      // keep units in css variables because their absence breaks css calculations
      { ignore: ['custom-properties'] },
    ],
    // Prettier covers these rules already:
    // 'color-hex-case': 'lower',
    // 'number-leading-zero': 'always',
    // 'number-no-trailing-zeros': true,
  },
  allowEmptyInput: true,
}
