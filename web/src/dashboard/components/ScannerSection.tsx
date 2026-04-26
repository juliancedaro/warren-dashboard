import { useMemo } from 'react'
import type { AdrRangeId, DashboardRow, FetchJson } from '../types'
import { usePaginatedDashboardResource } from '../hooks/usePaginatedDashboardResource'
import { adrQueryBounds } from '../utils/query'
import { PaginationControls } from './PaginationControls'

interface Props {
  enabled?: boolean
  fetchJson: FetchJson
  countries: string[]
  indexTags: string[]
  sectors: string[]
  industries: string[]
  minCap: number
  adrRange: AdrRangeId
  excludeNear52w: boolean
  scanRsMin: number
  setScanRsMin: (value: number) => void
  scanVolRelMax: number
  setScanVolRelMax: (value: number) => void
  scanRsiMin: number
  setScanRsiMin: (value: number) => void
  scanRsiMax: number
  setScanRsiMax: (value: number) => void
  scanSoloVolInusual: boolean
  setScanSoloVolInusual: (value: boolean) => void
  mcapTier: (value?: number | null) => { label: string; tier: string }
  formatPrice: (value: number) => string
  formatRsDelta: (value?: number | null) => string
  formatDistPct: (value?: number | null) => string
  symbols?: string[] | null
}

export function ScannerSection(props: Props) {
  const {
    enabled = true, fetchJson, countries, indexTags, sectors, industries, minCap, adrRange, excludeNear52w,
    scanRsMin, setScanRsMin, scanVolRelMax, setScanVolRelMax,
    scanRsiMin, setScanRsiMin, scanRsiMax, setScanRsiMax,
    scanSoloVolInusual, setScanSoloVolInusual,
    mcapTier, formatPrice, formatRsDelta, formatDistPct, symbols,
  } = props

  const query = useMemo(
    () => ({ country: countries.length ? countries : undefined, indexTag: indexTags.length ? indexTags : undefined, sector: sectors.length ? sectors : undefined, industry: industries.length ? industries : undefined, minCap, excludeNear52w: excludeNear52w ? 1 : 0, rsMin: scanRsMin, volRelMax: scanVolRelMax, rsiMin: scanRsiMin, rsiMax: scanRsiMax, onlyUnusualVol: scanSoloVolInusual ? 1 : 0, ...adrQueryBounds(adrRange), symbols: symbols ?? undefined }),
    [countries, indexTags, sectors, industries, minCap, adrRange, excludeNear52w, scanRsMin, scanVolRelMax, scanRsiMin, scanRsiMax, scanSoloVolInusual, symbols],
  )

  const { items, loading, loadingMore, error, page, total, totalPages, pageSize, pageSizeOptions, setPage, setPageSize } = usePaginatedDashboardResource<DashboardRow>({ endpoint: '/dashboard/scanner', fetchJson, query, enabled })

  return (
    <section className="dash-panel dash-scanner-panel" aria-label="Scanner de calidad">
      <div className="dash-panel-head">
        <h2>Scanner de calidad</h2>
        <p className="dash-muted">Sobre medias + RS alto + baja volatilidad</p>
      </div>
      <div className="dash-scanner-filters">
        <label className="dash-field dash-field-range"><span>RS min · {scanRsMin}</span><input type="range" min={0} max={100} value={scanRsMin} onChange={(e) => setScanRsMin(Number(e.target.value))} /></label>
        <label className="dash-field dash-field-range"><span>Vol rel. máx · {scanVolRelMax.toFixed(2)}x</span><input type="range" min={40} max={200} value={Math.round(scanVolRelMax * 100)} onChange={(e) => setScanVolRelMax(Number(e.target.value) / 100)} /></label>
        <label className="dash-field dash-field-range"><span>RSI min · {scanRsiMin}</span><input type="range" min={0} max={100} value={scanRsiMin} onChange={(e) => setScanRsiMin(Number(e.target.value))} /></label>
        <label className="dash-field dash-field-range"><span>RSI máx · {scanRsiMax}</span><input type="range" min={0} max={100} value={scanRsiMax} onChange={(e) => setScanRsiMax(Number(e.target.value))} /></label>
        <label className="dash-check dash-scanner-check"><input type="checkbox" checked={scanSoloVolInusual} onChange={(e) => setScanSoloVolInusual(e.target.checked)} />Solo vol inusual</label>
      </div>
      <div className="dash-table-shell">
        <div className="dash-table-scroll dash-scanner-table-wrap dash-table-scroll-fixed">
          <table className={`dash-table dash-scanner-table ${loadingMore ? 'dash-table-dimmed' : ''}`}>
            <thead><tr><th>Ticker</th><th>Precio</th><th>Var %</th><th>Sector</th><th>MCap</th><th>RS</th><th>Δ RS hoy</th><th>Δ RS 1M</th><th>RSI</th><th>Vol rel.</th><th>Vol inu.</th><th>EMA20</th><th>EMA50</th><th>EMA200</th></tr></thead>
            <tbody>
              {items.length > 0 ? items.map((row) => {
                const up = row.changePct >= 0
                const cap = mcapTier(row.marketCap)
                return (
                  <tr key={row.symbol}>
                    <td className="dash-td-sym">
                      <div className="dash-cell-stack">
                        <span>{row.symbol}</span>
                        <div className="dash-mini-badges">
                          {(row.rsScore ?? 0) >= 80 ? <span className="dash-mini-badge dash-mini-badge-rs">RS+</span> : null}
                          {row.unusualVol ? <span className="dash-mini-badge dash-mini-badge-vol">VOL</span> : null}
                          {row.near52wHigh ? <span className="dash-mini-badge dash-mini-badge-52w">52W</span> : null}
                        </div>
                      </div>
                    </td>
                    <td><span className="dash-scan-price" data-up={up ? '1' : '0'}>${formatPrice(row.price)}</span></td>
                    <td><span className="dash-scan-var" data-up={up ? '1' : '0'}><span className="dash-scan-tri" aria-hidden>{up ? '▲' : '▼'}</span> {up ? '+' : ''}{row.changePct.toFixed(2)}%</span></td>
                    <td className="dash-muted">{row.sector}</td>
                    <td><span className="dash-pill dash-pill-mcap" data-tier={cap.tier}>{cap.label}</span></td>
                    <td><span className="dash-pill dash-pill-rs">{row.rsScore.toFixed(1)}</span></td>
                    <td><span className="dash-scan-delta" data-up={row.rsDelta1d == null ? 'na' : row.rsDelta1d >= 0 ? '1' : '0'}>{formatRsDelta(row.rsDelta1d)}</span></td>
                    <td><span className="dash-scan-delta" data-up={row.rsDelta20d == null ? 'na' : row.rsDelta20d >= 0 ? '1' : '0'}>{formatRsDelta(row.rsDelta20d)}</span></td>
                    <td><span className="dash-scan-rsi" data-rsi={row.rsi14 == null ? 'na' : row.rsi14 >= 60 ? 'high' : row.rsi14 >= 40 ? 'mid' : 'low'}>{row.rsi14 != null ? row.rsi14.toFixed(1) : '—'}</span></td>
                    <td><span className="dash-pill dash-pill-volrel" data-hot={row.volRelative >= 1.05 ? '1' : '0'}>{row.volRelative.toFixed(2)}x</span></td>
                    <td className="dash-scan-vol-inu">{row.volDevPct5 != null ? `${row.volDevPct5 >= 0 ? '+' : ''}${row.volDevPct5.toFixed(0)}%` : '—'}</td>
                    <td><span className="dash-scan-dist" data-up={row.distEma20Pct == null ? 'na' : row.distEma20Pct >= 0 ? '1' : '0'}>{formatDistPct(row.distEma20Pct)}</span></td>
                    <td><span className="dash-scan-dist" data-up={row.distEma50Pct == null ? 'na' : row.distEma50Pct >= 0 ? '1' : '0'}>{formatDistPct(row.distEma50Pct)}</span></td>
                    <td><span className="dash-scan-dist" data-up={row.distEma200Pct == null ? 'na' : row.distEma200Pct >= 0 ? '1' : '0'}>{formatDistPct(row.distEma200Pct)}</span></td>
                  </tr>
                )
              }) : null}
              {loading && items.length === 0 ? Array.from({ length: pageSize }).map((_, index) => (
                <tr key={`s-skel-${index}`} className="dash-skel-row">
                  <td colSpan={14}><div className="dash-skel-line" /></td>
                </tr>
              )) : null}
              {!loading && !error && items.length === 0 ? <tr><td colSpan={14} className="dash-muted dash-empty-cell">Ningún ticker cumple los filtros.</td></tr> : null}
              {!loading && error ? <tr><td colSpan={14} className="dash-muted dash-empty-cell">{error}</td></tr> : null}
            </tbody>
          </table>
        </div>
        {loadingMore ? <div className="dash-loading-overlay">Cargando página…</div> : null}
      </div>
      <PaginationControls page={page} total={total} totalPages={totalPages} pageSize={pageSize} pageSizeOptions={pageSizeOptions} onPageChange={setPage} onPageSizeChange={setPageSize} />
    </section>
  )
}
