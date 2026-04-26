import { useEffect, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { DASH_RECHARTS_MARGIN_RIGHT } from '../constants'
import type { AdrRangeId, FetchJson, RelativeVolatilityRow } from '../types'
import { adrQueryBounds, buildQueryString } from '../utils/query'
import type { RechartsTooltipProps } from '../utils/rechartsTooltip'

const VOL_REL_TOP_OPTS = [10, 20, 30, 50]
const VOL_UNUSUAL_RATIO = 1

interface Props {
  fetchJson: FetchJson
  countries: string[]
  indexTags: string[]
  sectors: string[]
  industries: string[]
  minCap: number
  adrRange: AdrRangeId
  excludeNear52w: boolean
  enabled?: boolean
  symbols?: string[] | null
}

function VolRelTooltip({ active, payload }: RechartsTooltipProps<RelativeVolatilityRow>) {
  if (!active || !payload?.length) return null
  const point = payload[0].payload as RelativeVolatilityRow
  return <div className="dash-tooltip"><strong>{point.symbol}</strong><div>Vol 5d / Vol 1y: {point.vol5Vs1yRatio != null ? `${Number(point.vol5Vs1yRatio).toFixed(3)}x` : '—'}</div><div>RS: {point.rsScore.toFixed(1)}</div></div>
}

export function RelativeVolatilitySection({ fetchJson, countries, indexTags, sectors, industries, minCap, adrRange, excludeNear52w, enabled = true, symbols }: Props) {
  const [rows, setRows] = useState<RelativeVolatilityRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [volRelSortDesc, setVolRelSortDesc] = useState(false)
  const [volRelTopN, setVolRelTopN] = useState(30)
  const [volRelRsMin, setVolRelRsMin] = useState(0)

  useEffect(() => {
    if (!enabled) {
      setLoading(true)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    const query = buildQueryString({ country: countries.length ? countries : undefined, indexTag: indexTags.length ? indexTags : undefined, sector: sectors.length ? sectors : undefined, industry: industries.length ? industries : undefined, minCap: minCap > 0 ? minCap : undefined, excludeNear52w: excludeNear52w ? 1 : undefined, rsMin: volRelRsMin, limit: volRelTopN, sort: volRelSortDesc ? 'desc' : 'asc', ...adrQueryBounds(adrRange), symbols: symbols ?? undefined })
    fetchJson<{ items?: RelativeVolatilityRow[] }>(`/dashboard/volatility-relative?${query}`)
      .then((data) => { if (!cancelled) setRows(data.items ?? []) })
      .catch((e) => { if (!cancelled) { setError(e instanceof Error ? e.message : String(e)); setRows([]) } })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [enabled, fetchJson, countries, indexTags, sectors, industries, minCap, adrRange, excludeNear52w, volRelRsMin, volRelTopN, volRelSortDesc, symbols])

  const xTickInterval = rows.length > 40 ? 2 : rows.length > 24 ? 1 : 0

  return (
    <section className="dash-panel dash-panel-compact dash-panel-wide">
      <div className="dash-panel-head dash-panel-head-row">
        <div><h2>Volatilidad relativa</h2><p className="dash-muted">Vol 5 ruedas / Vol histórica 1 año — naranja = vol inusual</p></div>
        <div className="dash-inline-fields">
          <label className="dash-field dash-field-inline"><span>Ordenar</span><select value={volRelSortDesc ? 'desc' : 'asc'} onChange={(e) => setVolRelSortDesc(e.target.value === 'desc')}><option value="asc">Menor a mayor</option><option value="desc">Mayor a menor</option></select></label>
          <label className="dash-field dash-field-inline"><span>Top</span><select value={volRelTopN} onChange={(e) => setVolRelTopN(Number(e.target.value))}>{VOL_REL_TOP_OPTS.map((n) => <option key={n} value={n}>{n}</option>)}</select></label>
          <label className="dash-field dash-field-range"><span>RS min · {volRelRsMin}</span><input type="range" min={0} max={100} value={volRelRsMin} onChange={(e) => setVolRelRsMin(Number(e.target.value))} /></label>
        </div>
      </div>
      <div className="dash-chart-wrap dash-chart-wrap-short">
        {loading ? <p className="dash-muted">Cargando…</p> : error ? <p className="dash-muted">{error}</p> : rows.length === 0 ? <p className="dash-muted">Sin ratio de volatilidad o filtros muy estrictos.</p> : (
          <ResponsiveContainer width="100%" height="100%" minHeight={280}>
            <BarChart data={rows} margin={{ top: 8, right: DASH_RECHARTS_MARGIN_RIGHT, left: 4, bottom: 36 }}>
              <CartesianGrid stroke="var(--dash-grid)" strokeDasharray="4 6" vertical={false} />
              <XAxis dataKey="symbol" tick={{ fill: 'var(--dash-muted)', fontSize: 10 }} stroke="var(--dash-border)" interval={xTickInterval} angle={-28} textAnchor="end" height={56} />
              <YAxis tickFormatter={(v: number) => `${v.toFixed(1)}x`} tick={{ fill: 'var(--dash-muted)', fontSize: 11 }} stroke="var(--dash-border)" domain={[0, 'auto']} label={{ value: 'Vol 5d / Vol 1y', angle: -90, position: 'insideLeft', fill: 'var(--dash-muted)', fontSize: 11 }} />
              <Tooltip cursor={false} content={<VolRelTooltip />} />
              <Bar dataKey="vol5Vs1yRatio" radius={[6, 6, 0, 0]}>
                {rows.map((row) => <Cell key={row.symbol} fill={row.vol5Vs1yRatio >= VOL_UNUSUAL_RATIO ? '#fb923c' : 'var(--dash-up)'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  )
}
