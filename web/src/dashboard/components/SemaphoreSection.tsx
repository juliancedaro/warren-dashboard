import { useMemo } from 'react'
import type { DashboardRow, FetchJson, OptionItem } from '../types'
import { usePaginatedDashboardResource } from '../hooks/usePaginatedDashboardResource'
import { PaginationControls } from './PaginationControls'

function SemaphoreDot({ tone }: { tone: string }) {
  return <span className="dash-sem-dot" data-tone={tone} aria-hidden />
}

interface Props {
  enabled?: boolean
  fetchJson: FetchJson
  countries: string[]
  indexTags: string[]
  sectors: string[]
  industries: string[]
  minCap: number
  adrMin: number
  adrMax: number
  excludeNear52w: boolean
  sort: string
  setSort: (value: string) => void
  unusualThresholdPct: number
  metricToneRsi: (value?: number | null) => string
  metricToneRs: (value: number) => string
  metricToneVolRel: (value: number) => string
  sortOptions: Array<OptionItem>
  symbols?: string[] | null
}

export function SemaphoreSection({ fetchJson, countries, indexTags, sectors, industries, minCap, adrMin, adrMax, excludeNear52w, sort, setSort, unusualThresholdPct, metricToneRsi, metricToneRs, metricToneVolRel, sortOptions, symbols, enabled = true }: Props) {
  const query = useMemo(() => ({ country: countries.length ? countries : undefined, indexTag: indexTags.length ? indexTags : undefined, sector: sectors.length ? sectors : undefined, industry: industries.length ? industries : undefined, minCap, adrMin, adrMax, excludeNear52w: excludeNear52w ? 1 : 0, sort, symbols: symbols ?? undefined }), [countries, indexTags, sectors, industries, minCap, adrMin, adrMax, excludeNear52w, sort, symbols])

  const { items, loading, loadingMore, error, page, total, totalPages, pageSize, pageSizeOptions, setPage, setPageSize } = usePaginatedDashboardResource<DashboardRow>({ endpoint: '/dashboard/semaphore', fetchJson, query, enabled })

  return (
    <section className="dash-panel dash-semaphore-panel" aria-label="Semáforo">
      <div className="dash-panel-head dash-panel-head-row">
        <div>
          <h2>Semáforo por ticker</h2>
          <p className="dash-muted">Borde naranja = volumen inusual hoy</p>
        </div>
        <label className="dash-field dash-field-inline">
          <span>Ordenar</span>
          <select value={sort} onChange={(e) => setSort(e.target.value)}>{sortOptions.map((option) => <option key={String(option.id)} value={option.id}>{option.label}</option>)}</select>
        </label>
      </div>
      <div className="dash-table-shell">
        <div className={`dash-sem-grid dash-sem-grid-fixed ${loadingMore ? 'dash-grid-dimmed' : ''}`}>
          {items.length > 0 ? items.map((row) => {
            const up = row.changePct >= 0
            const volHot = row.unusualVol || (row.volDevPct5 ?? 0) >= unusualThresholdPct
            return (
              <article key={row.symbol} className="dash-sem-card" data-vol-hot={volHot ? '1' : '0'}>
                <div className="dash-sem-card-top">
                  <span className="dash-sem-sym">{row.symbol}</span>
                  {volHot ? <span className="dash-sem-vol-badge">VOL</span> : null}
                  <span className="dash-sem-pct" data-up={up ? '1' : '0'}>{up ? '+' : ''}{row.changePct.toFixed(2)}%</span>
                </div>
                <ul className="dash-sem-metrics">
                  <li><SemaphoreDot tone={row.aboveEma20 ? 'up' : 'down'} /><span className="dash-sem-metric-label">EMA20</span><span className="dash-sem-metric-val">{row.distEma20Pct != null ? `${row.distEma20Pct >= 0 ? '+' : ''}${row.distEma20Pct.toFixed(1)}%` : '—'}</span></li>
                  <li><SemaphoreDot tone={row.aboveEma50 ? 'up' : 'down'} /><span className="dash-sem-metric-label">EMA50</span><span className="dash-sem-metric-val">{row.distEma50Pct != null ? `${row.distEma50Pct >= 0 ? '+' : ''}${row.distEma50Pct.toFixed(1)}%` : '—'}</span></li>
                  <li><SemaphoreDot tone={row.aboveEma200 ? 'up' : 'down'} /><span className="dash-sem-metric-label">EMA200</span><span className="dash-sem-metric-val">{row.distEma200Pct != null ? `${row.distEma200Pct >= 0 ? '+' : ''}${row.distEma200Pct.toFixed(1)}%` : '—'}</span></li>
                  <li><SemaphoreDot tone={metricToneRsi(row.rsi14)} /><span className="dash-sem-metric-label">RSI 14</span><span className="dash-sem-metric-val">{row.rsi14 != null ? row.rsi14.toFixed(1) : '—'}</span></li>
                  <li><SemaphoreDot tone={metricToneRs(row.rsScore)} /><span className="dash-sem-metric-label">RS Score</span><span className="dash-sem-metric-val">{row.rsScore.toFixed(1)}</span></li>
                  <li><SemaphoreDot tone={metricToneVolRel(row.volRelative)} /><span className="dash-sem-metric-label">Vol rel.</span><span className="dash-sem-metric-val">{row.volRelative.toFixed(2)}x</span></li>
                </ul>
              </article>
            )
          }) : null}
          {loading && items.length === 0 ? Array.from({ length: pageSize }).map((_, index) => (
            <article key={`sem-skel-${index}`} className="dash-sem-card dash-sem-card-skel">
              <div className="dash-skel-line dash-skel-line-short" />
              <div className="dash-skel-line" />
              <div className="dash-skel-line" />
              <div className="dash-skel-line" />
            </article>
          )) : null}
          {!loading && !error && items.length === 0 ? <div className="dash-empty-block">No hay tickers para esos filtros.</div> : null}
          {!loading && error ? <div className="dash-empty-block">{error}</div> : null}
        </div>
        {loadingMore ? <div className="dash-loading-overlay">Cargando página…</div> : null}
      </div>
      <PaginationControls page={page} total={total} totalPages={totalPages} pageSize={pageSize} pageSizeOptions={pageSizeOptions} onPageChange={setPage} onPageSizeChange={setPageSize} />
    </section>
  )
}
