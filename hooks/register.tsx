import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Limit } from '../types'
import { buildSvg } from './bar'

const limits = atom({ plugin: 'usage-band', key: 'limits' } as const, [])
const now = atom({ plugin: 'usage-band', key: 'now' } as const, 0)

const LABELS: Record<string, string> = { five_hour: '5h', seven_day: '7d', spend_limit: 'spend' }

const resetIn = (iso: string | undefined, at: number) => {
  if (!iso || !at) return ''
  const mins = Math.max(0, Math.round((Date.parse(iso) - at) / 60000))
  if (mins >= 1440) return ` ↻${Math.floor(mins / 1440)}d${Math.floor((mins % 1440) / 60)}h`
  return ` ↻${Math.floor(mins / 60)}h${String(mins % 60).padStart(2, '0')}m`
}

async function save($: any, next: Limit[]) {
  const t = await $.clock.now()
  await update($, limits, () => next.map(l => ({ kind: l.kind, percentUsed: l.percentUsed, resetsAt: l.resetsAt })))
  await update($, now, () => t)
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    try {
      await save($, (await $.session.usage()).rateLimits)
    } catch {}
    return next(e)
  })

  on('session.measure', async ($, e, next) => {
    await save($, e.rateLimits)
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const rest = await next(e)
    const list = await read($, limits)
    if (e.props.hasSurvey || list.length === 0) return rest
    const at = await read($, now)
    const { Box, Text, Svg } = $.ui.resolve(e)

    // Desktop, mobile and the editor draw the new soft card; the terminal keeps the text bars.
    if (e.surface !== 'terminal' && Svg) {
      return (
        <Box flexDirection="column">
          {rest}
          <Svg source={buildSvg(list, at)} alt="Remaining usage limits" />
        </Box>
      )
    }

    return (
      <Box flexDirection="column">
        {rest}
        <Box columnGap={3}>
          {list.map(l => {
            const left = Math.max(0, Math.min(100, Math.round(100 - l.percentUsed)))
            const color = left <= 10 ? 'red' : left <= 30 ? 'yellow' : 'green'
            return (
              <Box key={l.kind} flexGrow={1} columnGap={1}>
                <Text dimColor>{LABELS[l.kind] ?? l.kind}</Text>
                <Box flexGrow={1} height={1}>
                  <Box flexGrow={left} height={1} backgroundColor={color}>{' '}</Box>
                  <Box flexGrow={100 - left} height={1} backgroundColor="gray">{' '}</Box>
                </Box>
                <Text color={color}>{left}% left</Text>
                <Text dimColor>{resetIn(l.resetsAt, at).trim()}</Text>
              </Box>
            )
          })}
        </Box>
      </Box>
    )
  })
}
