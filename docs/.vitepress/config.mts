// vitepress is installed on-demand via `pnpx` (see package.json `docs:*` scripts),
// so it is not resolvable as a local import here. `defineConfig` is just an identity
// helper for typing, so we replace it with a JSDoc type annotation instead.
/** @type {import('vitepress').UserConfig} */
export default {
  base: '/js-libs/',
  title: 'js-libs',
  description:
    'NaturalCycles/js-lib: Standard library for universal (browser + Node.js) javascript',
  // ignoreDeadLinks: true,

  head: [
    // ['link', { rel: 'stylesheet', href: '/custom.css' }]
  ],

  themeConfig: {
    nav: [
      { text: 'Github', link: 'https://github.com/NaturalCycles/js-libs/' },
      { text: 'Changelog', link: 'https://github.com/NaturalCycles/js-libs/releases' },
    ],
    sidebar: [
      {
        text: 'Intro',
        collapsed: false,
        items: [{ text: 'Intro', link: '/' }],
      },
      {
        text: 'Features',
        collapsed: false,
        items: [
          { text: 'Promise', link: '/promise' },
          { text: 'Object', link: '/object' },
          { text: 'Array', link: '/array' },
          { text: 'String', link: '/string' },
          { text: 'Number', link: '/number' },
          { text: 'Math', link: '/math' },
          { text: 'JSON', link: '/json' },
          { text: 'Date', link: '/date' },
          { text: 'Time', link: '/time' },
          { text: 'Units', link: '/units' },
          { text: 'Decorators', link: '/decorators' },
          { text: 'Error', link: '/error' },
          { text: 'Types', link: '/types' },
          { text: 'Lazy', link: '/lazy' },
          { text: 'Fetcher', link: '/fetcher' },
          { text: 'loadScript, loadCSS', link: '/loadScript' },
          { text: 'TranslationService', link: '/translation' },
          { text: 'Analytics', link: '/analytics' },
          { text: 'AdminService', link: '/adminService' },
          { text: 'Image', link: '/image' },
          { text: 'BotDetectionService', link: '/bot' },
        ],
      },
    ],
  },
}
