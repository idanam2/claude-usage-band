// Draws the usage card as one SVG: a soft rounded panel, one slim gradient bar per limit.
// Pure functions, no engine calls, so the design can be previewed outside Claude.

export type Limit = { kind: string; percentUsed: number; resetsAt?: string }

const LABELS: Record<string, string> = { five_hour: '5-hour session', seven_day: 'Weekly', spend_limit: 'Spend limit' }

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export function resetText(iso: string | undefined, at: number): string {
  if (!iso || !at) return ''
  const mins = Math.max(0, Math.round((Date.parse(iso) - at) / 60000))
  if (mins >= 1440) return `resets in ${Math.floor(mins / 1440)}d ${Math.floor((mins % 1440) / 60)}h`
  if (mins >= 60) return `resets in ${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, '0')}m`
  return `resets in ${mins}m`
}

// soft palette: calm teal, warm amber, rose. Never harsh primary colors.
const tone = (left: number) => (left <= 10 ? 'low' : left <= 30 ? 'mid' : 'ok')

export function buildSvg(list: Limit[], at: number): string {
  const colW = 280
  const gap = 28
  const padX = 20
  const h = 66
  const n = list.length
  const w = padX * 2 + n * colW + (n - 1) * gap

  const cols = list
    .map((l, i) => {
      const left = Math.max(0, Math.min(100, Math.round(100 - l.percentUsed)))
      const t = tone(left)
      const x = padX + i * (colW + gap)
      const fillW = Math.max(left === 0 ? 0 : 8, Math.round((colW * left) / 100))
      const label = esc(LABELS[l.kind] ?? l.kind)
      const reset = esc(resetText(l.resetsAt, at))
      return `
  <g transform="translate(${x} 0)">
    <text class="lbl" x="0" y="25">${label}</text>
    <text class="pct ${t}" x="${colW}" y="25" text-anchor="end">${left}<tspan class="unit">% left</tspan></text>
    <rect class="track" x="0" y="34" width="${colW}" height="8" rx="4"/>
    <rect class="fill ${t}" x="0" y="34" width="${fillW}" height="8" rx="4"/>
    <text class="sub" x="0" y="58">${reset}</text>
  </g>`
    })
    .join('')

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
  <defs>
    <linearGradient id="ok" x1="0" x2="1"><stop offset="0" stop-color="#5eead4"/><stop offset="1" stop-color="#2dd4bf"/></linearGradient>
    <linearGradient id="mid" x1="0" x2="1"><stop offset="0" stop-color="#fcd34d"/><stop offset="1" stop-color="#f59e0b"/></linearGradient>
    <linearGradient id="low" x1="0" x2="1"><stop offset="0" stop-color="#fda4af"/><stop offset="1" stop-color="#f43f5e"/></linearGradient>
  </defs>
  <style>
    text { font-family: system-ui, 'Segoe UI', sans-serif; }
    .card { fill: rgba(128,128,128,0.08); stroke: rgba(128,128,128,0.22); stroke-width: 1; }
    .track { fill: rgba(128,128,128,0.22); }
    .lbl { font-size: 12px; font-weight: 600; fill: #6b645c; letter-spacing: 0.2px; }
    .sub { font-size: 11px; fill: #8a8279; }
    .pct { font-size: 15px; font-weight: 700; }
    .unit { font-size: 11px; font-weight: 500; fill: #8a8279; }
    .pct.ok { fill: #0d9488; } .pct.mid { fill: #b45309; } .pct.low { fill: #e11d48; }
    .fill.ok { fill: url(#ok); } .fill.mid { fill: url(#mid); } .fill.low { fill: url(#low); }
    @media (prefers-color-scheme: dark) {
      .lbl { fill: #c9c2b8; }
      .sub, .unit { fill: #9a9288; }
      .pct.ok { fill: #5eead4; } .pct.mid { fill: #fcd34d; } .pct.low { fill: #fda4af; }
    }
  </style>
  <rect class="card" x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="14"/>${cols}
</svg>`
}
