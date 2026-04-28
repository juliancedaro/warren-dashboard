import { useMemo } from 'react'
import type { DashboardRow, FetchJson } from '../types'
import { usePaginatedDashboardResource } from '../hooks/usePaginatedDashboardResource'
import { PaginationControls } from './PaginationControls'

function Dot({ ok }: { ok?: boolean | null }) {
  return <span className="dash-table-dot" data-ok={ok ? '1' : '0'} title={ok ? 'Sí' : 'No'} />
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
  symbols?: string[] | null
}

export function WarrenSection({ fetchJson, countries, indexTags, sectors, industries, minCap, adrMin, adrMax, excludeNear52w, symbols, enabled = true }: Props) {
  const query = useMemo(
    () => ({
      country: countries.length ? countries : undefined,
      indexTag: indexTags.length ? indexTags : undefined,
      sector: sectors.length ? sectors : undefined,
      industry: industries.length ? industries : undefined,
      minCap,
      excludeNear52w: excludeNear52w ? 1 : 0,
      adrMin,
      adrMax,
      symbols: symbols ?? undefined,
    }),
    [countries, indexTags, sectors, industries, minCap, adrMin, adrMax, excludeNear52w, symbols],
  )

  const { items, loading, loadingMore, error, page, total, totalPages, pageSize, pageSizeOptions, setPage, setPageSize, updatedAt } =
    usePaginatedDashboardResource<DashboardRow>({ endpoint: '/dashboard/warren', fetchJson, query, enabled })

  return (
    <section className="dash-panel dash-table-panel dash-panel-wide">
      <div className="dash-panel-head">
        <h2>Warren score</h2>
        <p className="dash-muted">Ordenado por score compuesto. Ahora carga desde snapshots paginados.</p>
      </div>
      <div className="dash-table-shell">
        <div className="dash-table-scroll dash-table-scroll-fixed">
          <table className={`dash-table ${loadingMore ? 'dash-table-dimmed' : ''}`}>
            <thead>
              <tr>
                <th>Ticker</th><th>Score</th><th>Progreso</th><th>RS</th><th>Vol rel.</th><th title="Sobre EMA20">E20</th><th title="Sobre EMA50">E50</th><th title="Sobre EMA200">E200</th><th title="≥25% desde mínimo 52S">+25%</th><th title="Volumen rel. mayor a 0.8">V&gt;0.8</th>
              </tr>
            </thead>
            <tbody>
              {items.length > 0 ? items.map((row) => (
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
                  <td>{row.warrenScore ?? '—'}</td>
                  <td><div className="dash-bar" role="img" aria-label={`Score ${row.warrenScore ?? 0}`}><div className="dash-bar-fill" style={{ width: `${row.warrenScore ?? 0}%` }} /></div></td>
                  <td>{row.rsScore.toFixed(1)}</td>
                  <td>{row.volRelative.toFixed(2)}x</td>
                  <td><Dot ok={row.aboveEma20} /></td>
                  <td><Dot ok={row.aboveEma50} /></td>
                  <td><Dot ok={row.aboveEma200} /></td>
                  <td><Dot ok={row.plus25FromLow} /></td>
                  <td><Dot ok={row.volGt08} /></td>
                </tr>
              )) : null}
              {loading && items.length === 0 ? Array.from({ length: pageSize }).map((_, index) => (
                <tr key={`w-skel-${index}`} className="dash-skel-row">
                  <td colSpan={10}><div className="dash-skel-line" /></td>
                </tr>
              )) : null}
              {!loading && !error && items.length === 0 ? <tr><td colSpan={10} className="dash-muted dash-empty-cell">Sin filas con los filtros actuales.</td></tr> : null}
              {!loading && error ? <tr><td colSpan={10} className="dash-muted dash-empty-cell">{error}</td></tr> : null}
            </tbody>
          </table>
        </div>
        {loadingMore ? <div className="dash-loading-overlay">Cargando página…</div> : null}
      </div>
      <PaginationControls page={page} total={total} totalPages={totalPages} pageSize={pageSize} pageSizeOptions={pageSizeOptions} onPageChange={setPage} onPageSizeChange={setPageSize} />
      {updatedAt ? <p className="dash-foot">Actualizado {new Date(updatedAt).toLocaleString()}</p> : null}
    </section>
  )
}
