#!/usr/bin/env node

import { SlackService } from '../index.js'
import { runScript } from '../script/runScript.js'
import { _yargs } from '../yargs/yargs.util.js'

runScript(async () => {
  const {
    channel,
    msg,
    username,
    emoji,
    webhook: webhookUrl,
  } = _yargs().options({
    channel: {
      type: 'string',
      demandOption: true,
    },
    msg: {
      type: 'string',
      demandOption: true,
    },
    username: {
      type: 'string',
      default: 'bot',
    },
    emoji: {
      type: 'string',
      default: ':spider_web:',
    },
    webhook: {
      type: 'string',
      default: process.env.SLACK_WEBHOOK_URL,
    },
  }).argv

  if (!webhookUrl) {
    console.log(`Slack webhook is required, either via env.SLACK_WEBHOOK_URL or --webhook`)
    process.exit(1)
  }

  const slack = new SlackService({
    webhookUrl,
  })

  await slack.send({
    items: msg,
    channel,
    username,
    icon_emoji: emoji,
    throwOnError: true,
  })
})

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      SLACK_WEBHOOK_URL?: string
    }
  }
}
