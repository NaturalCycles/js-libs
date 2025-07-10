import type { StringMap } from '@naturalcycles/js-lib'
import {
  _get,
  _mapValues,
  _mb,
  _ms,
  _percentile,
  _sortBy,
  _stringMapEntries,
  _stringMapValues,
  _sum,
  NumberStack,
} from '@naturalcycles/js-lib'
import { onFinished } from '../onFinished.js'
import { getRequestEndpoint } from './request.util.js'
import type { BackendRequestHandler } from './server.model.js'

const { GAE_INSTANCE } = process.env

// Map from "endpoint" to latency
interface Stat {
  stack: NumberStack
  '2xx': number
  '4xx': number
  '5xx': number

  // calculated on the fly
  total?: number
  pc?: Record<number, number> // e.g 50 => 123
}

const serverStatsMap: StringMap<Stat> = {}

const percentiles = [50, 90, 99]
const families: (keyof Stat)[] = ['2xx', '4xx', '5xx']

// Store this number of last latencies
const SIZE = 50
const MAX_ENDPOINTS = 30

/**
 * Depends on serverStatsMiddleware to work.
 *
 * @example
 *
 * router.get('/stats', serverStatsHTMLHandler)
 */
export const serverStatsHTMLHandler: BackendRequestHandler = (req, res) => {
  const { sortBy = 'total', asc } = req.query as { sortBy?: keyof Stat; asc?: string }

  // calc things
  _stringMapValues(serverStatsMap).forEach(s => {
    s.total = s['2xx'] + s['4xx'] + s['5xx']
    s.pc = _mapValues(s.stack.percentiles(percentiles), (_k, v) => Math.round(v), { mutate: true })
  })
  const allLatencies = _stringMapValues(serverStatsMap).flatMap(s => s.stack.items)
  const all2xx = _sum(_stringMapValues(serverStatsMap).flatMap(s => s['2xx']))
  const all4xx = _sum(_stringMapValues(serverStatsMap).flatMap(s => s['4xx']))
  const all5xx = _sum(_stringMapValues(serverStatsMap).flatMap(s => s['5xx']))

  const uptime = _ms(process.uptime() * 1000)
  const rss = _mb(process.memoryUsage().rss)
  const inst = GAE_INSTANCE ? `, instance: ${GAE_INSTANCE.slice(GAE_INSTANCE.length - 3)}` : ''

  function link(col: string, s = col): string {
    return `<pre><a href="?sortBy=${col}${sortBy === col && !asc ? '&asc=1' : ''}">${s}</a></pre>`
  }

  const html = [
    `<pre>uptime: ${uptime}, rss: ${rss} Mb${inst}</pre>`,
    '<table border="1" cellpadding="15">',
    `<tr>`,
    `<th><pre>endpoint</pre></th>`,
    `<th>${link('total')}</th>`,
    ...families.map(f => `<th>${link(f)}</th>`),
    ...percentiles.map(pc => `<th>${link(`pc.${pc}`, `p${pc}`)}</th>`),
    `</tr>`,
    `<tr>`,
    `<td><pre>*</pre></td>`,
    `<td align="right"><pre>${all2xx + all4xx + all5xx}</pre></td>`,
    `<td align="right"><pre>${all2xx}</pre></td>`,
    `<td align="right"><pre>${all4xx}</pre></td>`,
    `<td align="right"><pre>${all5xx}</pre></td>`,
    ...percentiles.map(
      pc => `<td align="right"><pre>${Math.round(_percentile(allLatencies, pc))}</pre></td>`,
    ),
    `</tr>`,
    ..._sortBy(_stringMapEntries(serverStatsMap), ([_, stat]) => _get(stat, sortBy) as string, {
      dir: asc ? 'asc' : 'desc',
    }).map(([endpoint, stat]) => {
      return [
        '<tr>',
        `<td><pre>${endpoint}</pre></td>`,
        `<td align="right"><pre>${stat.total}</pre></td>`,
        // eslint-disable-next-line @typescript-eslint/no-base-to-string
        ...families.map(f => `<td align="right"><pre>${stat[f]}</pre></td>`),
        ...percentiles.map(pc => `<td align="right"><pre>${stat.pc![pc]}</pre></td>`),
        '</tr>',
      ].join('\n')
    }),
    '</table>',
  ].join('\n')

  res.send(html)
}

/**
 * Unlocks serverStatsHTMLHandler
 */
export function serverStatsMiddleware(): BackendRequestHandler {
  let lastCleanup = Date.now()

  return function serverStatsHandler(req, res, next) {
    const started = Date.now()

    onFinished(res, () => {
      const now = Date.now()
      const latency = now - started

      const endpoint = getRequestEndpoint(req)

      serverStatsMap[endpoint] ||= {
        stack: new NumberStack(SIZE),
        '2xx': 0,
        '4xx': 0,
        '5xx': 0,
      }

      serverStatsMap[endpoint].stack.push(latency)
      if (res.statusCode) {
        serverStatsMap[endpoint][getStatusFamily(res.statusCode)]++
      }

      if (now - lastCleanup > 60_000) {
        lastCleanup = now
        cleanupServerStats()
      }
    })

    next()
  }
}

function cleanupServerStats(): void {
  if (Object.keys(serverStatsMap).length <= MAX_ENDPOINTS) return

  _sortBy(_stringMapEntries(serverStatsMap), ([_, stat]) => stat['2xx'] + stat['4xx'] + stat['5xx'])
    .slice(0, Object.keys(serverStatsMap).length - MAX_ENDPOINTS)
    .forEach(([k]) => delete serverStatsMap[k])
}

function getStatusFamily(statusCode: number): '2xx' | '4xx' | '5xx' {
  if (statusCode < 400) return '2xx'
  if (statusCode < 500) return '4xx'
  return '5xx'
}
