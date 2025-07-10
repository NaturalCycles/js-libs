export enum BotReason {
  NoNavigator = 1,
  NoUserAgent = 2,
  UserAgent = 3,
  WebDriver = 4,
  // ZeroPlugins = 5,
  EmptyLanguages = 6,
  // ChromeWithoutChrome = 7,
  /**
   * This is when CDP is considered to be a reason to be a Bot.
   * By default it's not.
   */
  CDP = 8,
}
