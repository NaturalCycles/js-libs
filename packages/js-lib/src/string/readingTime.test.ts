import { describe, expect, it } from 'vitest'
import type { ReadingTimeOptions, ReadingTimeResult } from './readingTime.js'
import { readingTime } from './readingTime.js'

function runTest(
  words: number | string,
  exp: Partial<ReadingTimeResult>,
  options?: ReadingTimeOptions,
) {
  return () => {
    const text = 'number' === typeof words ? generateText(words) : words

    if ('string' === typeof words) {
      if (text.includes(' ')) {
        words = words.split(/.+ +.+/g).length + 1
      } else if (text.length > 0) {
        words = 1
      } else {
        words = 0
      }
    }

    const res = readingTime(text, options)

    if (exp.minutes) {
      expect(res.minutes).toBe(exp.minutes)
    }
    if (exp.time) {
      expect(res.time).toBe(exp.time)
    }
    if (exp.words) {
      expect(res.words).toEqual(exp.words)
    }
  }
}

function generateText(words: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789àâéèêôùûçÀÂÉÈÔÙÛÇ'
  const charsLength = chars.length
  let text = ''

  for (let i = 0; i < words; i++) {
    const wordLength = Math.ceil(Math.random() * 10)
    for (let j = 0; j < wordLength; j++) {
      text += chars[Math.floor(Math.random() * charsLength)]
    }
    text += ' '
  }

  return text
}

describe('readingTime()', () => {
  it(
    'should round a 2-word text up to 1 minute',
    runTest(2, {
      minutes: 1,
      time: 600,
    }),
  )

  it(
    'should take 15 seconds, rounded up to 1 minute, for 50 words',
    runTest(50, {
      minutes: 1,
      time: 15000,
    }),
  )

  it(
    'should take 30 seconds, rounded up to 1 minute, for 100 words',
    runTest(100, {
      minutes: 1,
      time: 30000,
    }),
  )

  it(
    'should take 90 seconds, rounded up to 2 minutes, for 300 words',
    runTest(300, {
      minutes: 2,
      time: 90000,
    }),
  )

  it(
    'should take 150 seconds, rounded up to 3 minutes, for 500 words',
    runTest(500, {
      minutes: 3,
      time: 150000,
    }),
  )

  it(
    'should count words separated by multiple whitespaces once each',
    runTest('word  word    word', {
      minutes: 1,
      time: 900,
    }),
  )

  it(
    'should ignore leading whitespace when counting words',
    runTest('   word word word', {
      minutes: 1,
      time: 900,
    }),
  )

  it(
    'should ignore trailing whitespace when counting words',
    runTest('word word word   ', {
      minutes: 1,
      time: 900,
    }),
  )

  it(
    'should count a link as one word',
    runTest('word http://ngryman.sh word', {
      minutes: 1,
      time: 900,
    }),
  )

  it(
    'should count a markdown link as one word',
    runTest('word [blog](http://ngryman.sh) word', {
      minutes: 1,
      time: 900,
    }),
  )

  it(
    'should count a single word',
    runTest('0', {
      minutes: 1,
      time: 300,
    }),
  )

  it(
    'should not throw on an empty text',
    runTest('', {
      minutes: 0,
      time: 0,
    }),
  )

  it(
    'should accept a custom word per minutes value',
    runTest(
      200,
      {
        minutes: 2,
        time: 120000,
      },
      { wordsPerMinute: 100 },
    ),
  )
})

describe('readingTime CJK', () => {
  it(
    'should count each CJK character as a word, ignoring punctuation',
    runTest('今天，我要说中文！（没错，现在这个库也完全支持中文了）', {
      words: { total: 22 },
    }),
  )

  it(
    'should count a Latin word inside CJK text as one word',
    runTest('你会说English吗？', {
      words: { total: 5 },
    }),
  )

  it(
    'should ignore Latin punctuation in CJK text',
    runTest('科学文章中, 经常使用英语标点... (虽然这段话并不科学)', {
      words: { total: 22 },
    }),
  )

  it(
    'should count the Latin words at both ends of CJK text',
    runTest('JoshCena喜欢GitHub', {
      words: { total: 4 },
    }),
  )

  it(
    'should count each Korean syllable as a word',
    runTest('이것은 한국어 단락입니다', {
      words: { total: 11 },
    }),
  )

  it(
    'should count each Japanese character as a word',
    runTest('天気がいいから、散歩しましょう', {
      words: { total: 14 },
    }),
  )

  it(
    'should treat Katakana as one word',
    runTest('メガナイトありませんか？', {
      words: { total: 7 },
    }),
  )
})
