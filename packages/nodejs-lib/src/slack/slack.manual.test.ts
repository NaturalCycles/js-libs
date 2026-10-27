import { it } from 'vitest'
import { loadEnvFileIfExists, requireEnvKeys } from '../index.js'
import { SlackService } from './slack.service.js'

loadEnvFileIfExists()

const { SLACK_WEBHOOK_URL } = requireEnvKeys('SLACK_WEBHOOK_URL')

// uncomment jestOffline() before use

const slackService = new SlackService({
  webhookUrl: SLACK_WEBHOOK_URL,
  defaults: {
    channel: 'test',
  },
})

it('should send string messages via log and send', async () => {
  await slackService.log(`Hello Slack`)
  await slackService.send({
    items: 'hello string',
    throwOnError: true,
  })
  await slackService.send('hello 3')
})

it('should log an Error and a string', async () => {
  await slackService.log(new Error('hello error'))
  await slackService.log('hello error string')
})

it('should send a message with attachments', async () => {
  await slackService.send({
    items: 'hello',
    attachments: [
      {
        pretext: 'Optional text that appears above the attachment block',
        color: '#2eb886', // green
        text: 'att text',
        // "title": "Slack API Documentation",
        // "title_link": "https://api.slack.com/",
        fields: [
          {
            title: 'Priority',
            value: 'High',
            short: true,
          },
          {
            title: 'Priority2',
            value: '<http://example.com|Low>',
            short: true,
          },
          {
            title: 'Priority3',
            value: 'Med',
            short: true,
          },
          {
            title: 'Priority4 short',
            value: 'Med',
            short: true,
          },
        ],
        // "footer": "Slack API",
        // "footer_icon": "https://platform.slack-edge.com/img/default_application_icon.png",
        // "ts": 123456789,
      },
    ],
  })
})

it('should send a message with mentions and key-value fields', async () => {
  await slackService.send({
    items: 'hello kv',
    mentions: ['kirill'],
    kv: {
      a: 'a1',
      b: 'b1',
      long: 'very very very very very very very very very very very very very very long',
    },
  })
})

it('should log several items in one message', async () => {
  await slackService.log('a', 'b', { c: 'c' }, null)
})
