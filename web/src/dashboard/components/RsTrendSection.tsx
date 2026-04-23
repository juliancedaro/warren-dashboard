import { useEffect, useState } from 'react'
import type { FetchJson, RsTrendRow } from '../types'
import { buildQueryString } from '../utils/query'

function adrBounds(range: 'all' | 'lt2' | '2to4' | 'gt4') {
  if (range === 'lt2') return { adrMax: 2 }
  if (range === '2to4') return { adrMin: 2, adrMax: 4 }
  if (range === 'gt4') return { adrMin: 4 }
  return {}
}

const TREND_TICKER_OPTS = [10, 20, 50]

interface Props {
  fetchJson: FetchJson
  countries: string[]
  indexTags: string[]
  sectors: string[]
  industries: string[]
  minCap: number
  adrRange: 'all' | 'lt2' | '2to4' | 'gt4'
  excludeNear52w: boolean
  enabled?: boolean
  symbols?: string[] | null
}

function RsRankBadge({ rank, prevRank }: { rank?: number | null; prevRank?: number | null }) {
  const hasPair = prevRank != null && rank != null && prevRank > 0 && rank > 0
  const delta = hasPair ? prevRank - rank : null
  const dir = delta == null ? 'na' : delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat'
  return <div className="dash-rs-badge" data-dir={dir}><span className="dash-rs-rank">{rank != null ? `#${rank}` : '—'}</span>{hasPair ? <span className="dash-rs-delta">{delta! > 0 ? `▲${delta}` : delta! < 0 ? `▼${Math.abs(delta!)}` : '—'}</span> : null}</div>
}

function RsDeltaSummary({ fromRank, toRank, rsScore }: { fromRank?: number | null; toRank?: number | null; rsScore: number }) {
  if (fromRank == null || toRank == null) return <div className="dash-rs-sum"><span className="dash-rs-sum-main">—</span><span className="dash-rs-sum-sub">RS: —</span></div>
  const delta = fromRank - toRank
  const dir = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat'
  return <div className="dash-rs-sum" data-dir={dir}><span className="dash-rs-sum-main">{delta > 0 ? `▲${delta}` : delta < 0 ? `▼${Math.abs(delta)}` : '—'}</span><span className="dash-rs-sum-sub">RS: {rsScore.toFixed(1)}</span></div>
}

export function RsTrendSection({ fetchJson, countries, indexTags, sectors, industries, minCap, adrRange, excludeNear52w, enabled = true, symbols }: Props) {
  const [rows, setRows] = useState<RsTrendRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [trendTickerN, setTrendTickerN] = useState(20)
  const [trendRsMin, setTrendRsMin] = useState(0)

  useEffect(() => {
    if (!enabled) {
      setLoading(true)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    const query = buildQueryString({ country: countries.length ? countries : undefined, indexTag: indexTags.length ? indexTags : undefined, sector: sectors.length ? sectors : undefined, industry: industries.length ? industries : undefined, minCap: minCap > 0 ? minCap : undefined, excludeNear52w: excludeNear52w ? 1 : undefined, rsMin: trendRsMin, limit: trendTickerN, ...adrBounds(adrRange), symbols: symbols ?? undefined })
    fetchJson<{ items?: RsTrendRow[] }>(`/dashboard/rs-trend?${query}`)
      .then((data) => { if (!cancelled) setRows(data.items ?? []) })
      .catch((e) => { if (!cancelled) { setError(e instanceof Error ? e.message : String(e)); setRows([]) } })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [enabled, fetchJson, countries, indexTags, sectors, industries, minCap, adrRange, excludeNear52w, trendRsMin, trendTickerN, symbols])

  return (
    <section className="dash-panel dash-panel-trend dash-panel-wide">
      <div className="dash-panel-head dash-panel-head-row">
        <div><h2>Tendencia RS Score</h2><p className="dash-muted">Evolución últimas 4 semanas</p></div>
        <div className="dash-inline-fields dash-trend-controls">
          <label className="dash-field dash-field-inline"><span>Tickers</span><select value={trendTickerN} onChange={(e) => setTrendTickerN(Number(e.target.value))}>{TREND_TICKER_OPTS.map((n) => <option key={n} value={n}>{n}</option>)}</select></label>
          <label className="dash-field dash-field-range"><span>RS min · {trendRsMin}</span><input type="range" min={0} max={100} value={trendRsMin} onChange={(e) => setTrendRsMin(Number(e.target.value))} /></label>
        </div>
      </div>
      <ul className="dash-rs-legend" aria-label="Leyenda"><li><span className="dash-rs-leg-swatch" data-dir="up" />Subió</li><li><span className="dash-rs-leg-swatch" data-dir="down" />Bajó</li><li><span className="dash-rs-leg-swatch" data-dir="flat" />Sin cambio</li></ul>
      <div className="dash-rs-table-wrap">
        <table className="dash-rs-table">
          <thead><tr><th>Ticker</th><th>Hace 4 sem</th><th>Hace 3 sem</th><th>Hace 2 sem</th><th>Actual</th><th>Δ vs mes</th><th>Δ vs sem</th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={7} className="dash-muted">Cargando…</td></tr> : error ? <tr><td colSpan={7} className="dash-muted">{error}</td></tr> : rows.length === 0 ? <tr><td colSpan={7} className="dash-muted">Sin filas con los filtros actuales.</td></tr> : rows.map((row: any) => (
              <tr key={row.symbol}>
                <td className="dash-td-sym">{row.symbol}</td>
                <td><RsRankBadge rank={row.rsRank4w ?? null} prevRank={null} /></td>
                <td><RsRankBadge rank={row.rsRank3w ?? null} prevRank={row.rsRank4w ?? null} /></td>
                <td><RsRankBadge rank={row.rsRank2w ?? null} prevRank={row.rsRank3w ?? null} /></td>
                <td><RsRankBadge rank={row.rsRankNow ?? null} prevRank={row.rsRank2w ?? null} /></td>
                <td><RsDeltaSummary fromRank={row.rsRank4w ?? null} toRank={row.rsRankNow ?? null} rsScore={row.rsScore} /></td>
                <td><RsDeltaSummary fromRank={row.rsRank1w ?? null} toRank={row.rsRankNow ?? null} rsScore={row.rsScore} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
