import { useMemo, useState } from 'react'
import type { DashboardFiltersState, SavedFilter, SavedFilterState, Watchlist } from '../types'

interface Props {
  watchlists: Watchlist[]
  savedFilters: SavedFilter[]
  activeWatchlistId: string
  onSelectWatchlist: (id: string) => void
  onCreateWatchlist: (name: string) => boolean
  onAddSymbol: (symbol: string) => { ok: boolean; error?: string }
  onRemoveSymbol: (symbol: string) => void
  activeSymbols: string[] | null
  currentFilters: DashboardFiltersState
  onSaveCurrentFilter: (name: string, filters: DashboardFiltersState, activeWatchlistId?: string) => boolean
  onApplySavedFilter: (filters: SavedFilterState) => void
  onDeleteSavedFilter: (id: string) => void
}

function summarizeFilter(saved: SavedFilter, watchlists: Watchlist[]) {
  const parts: string[] = []
  const state = saved.filters
  if (state.activeWatchlistId) {
    const watchlist = watchlists.find((w) => w.id === state.activeWatchlistId)
    if (watchlist) parts.push(`Watchlist: ${watchlist.name}`)
  }
  if (state.sectors?.length) parts.push(`Sectores: ${state.sectors.join(', ')}`)
  if (state.industries?.length) parts.push(`Industrias: ${state.industries.join(', ')}`)
  if (state.minCapMin != null || state.minCapMax != null) {
    const minCap = state.minCapMin ?? 0
    const maxCap = state.minCapMax ?? 5e12
    parts.push(`Cap: ${(minCap / 1e9).toFixed(0)}B–${(maxCap / 1e9).toFixed(0)}B`)
  }
  if (state.adrMin != null || state.adrMax != null) {
    const adrMin = state.adrMin ?? 0
    const adrMax = state.adrMax ?? 100
    parts.push(`ADR: ${adrMin.toFixed(1)}%–${adrMax.toFixed(1)}%`)
  }
  if (state.excludeNear52w) parts.push('Sin máx. 52S reciente')
  return parts.length ? parts.join(' · ') : 'Filtro general del dashboard'
}

export function PersonalizationToolbar(props: Props) {
  const { watchlists, savedFilters, activeWatchlistId, onSelectWatchlist, onCreateWatchlist, onAddSymbol, onRemoveSymbol, activeSymbols, currentFilters, onSaveCurrentFilter, onApplySavedFilter, onDeleteSavedFilter } = props
  const [watchlistName, setWatchlistName] = useState('')
  const [symbolInput, setSymbolInput] = useState('')
  const [filterName, setFilterName] = useState('')
  const [tickerError, setTickerError] = useState<string | null>(null)

  const activeLabel = useMemo(() => {
    if (activeWatchlistId === 'all') return 'Mostrando todo el dashboard.'
    const count = activeSymbols?.length ?? 0
    if (count === 0) return 'Esta watchlist no tiene tickers todavía.'
    return `Filtrando dashboard por ${count} ${count === 1 ? 'ticker' : 'tickers'}: ${activeSymbols?.join(', ')}`
  }, [activeWatchlistId, activeSymbols])

  function handleCreateWatchlist() {
    if (onCreateWatchlist(watchlistName)) setWatchlistName('')
  }

  function handleAddTicker() {
    const result = onAddSymbol(symbolInput)
    if (result.ok) {
      setSymbolInput('')
      setTickerError(null)
    } else {
      setTickerError(result.error ?? 'No se pudo agregar el ticker.')
    }
  }

  function handleSaveFilter() {
    if (onSaveCurrentFilter(filterName, currentFilters, activeWatchlistId)) {
      setFilterName('')
    }
  }

  return (
    <section className="dash-panel dash-personalization-bar" aria-label="Workspace">
      <div className="dash-panel-head dash-panel-head-row">
        <div>
          <h2>Workspace</h2>
          <p className="dash-muted">Armá una watchlist y usala para filtrar todo el dashboard.</p>
        </div>
      </div>

      <div className="dash-personal-grid">
        <div className="dash-personal-card">
          <div className="dash-inline-fields dash-personal-watchlist-head">
            <label className="dash-field dash-field-inline dash-field-compact">
              <span>Watchlist</span>
              <select value={activeWatchlistId} onChange={(e) => onSelectWatchlist(e.target.value)}>
                <option value="all">Todas</option>
                {watchlists.map((watchlist) => (
                  <option key={watchlist.id} value={watchlist.id}>{watchlist.name} ({watchlist.items.length})</option>
                ))}
              </select>
            </label>

            <div className="dash-inline-create">
              <input
                className="dash-input"
                placeholder="Nueva watchlist"
                value={watchlistName}
                onChange={(e) => setWatchlistName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleCreateWatchlist() }}
              />
              <button type="button" className="dash-btn" onClick={handleCreateWatchlist}>Nueva</button>
            </div>
          </div>

          <div className="dash-inline-fields dash-personal-inline">
            <input
              className="dash-input"
              placeholder={activeWatchlistId === 'all' ? 'Elegí una watchlist primero' : 'Agregar ticker (ej: XOM)'}
              value={symbolInput}
              onChange={(e) => setSymbolInput(e.target.value.toUpperCase())}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddTicker() }}
              disabled={activeWatchlistId === 'all'}
            />
            <button type="button" className="dash-btn" disabled={activeWatchlistId === 'all'} onClick={handleAddTicker}>Agregar</button>
          </div>

          {tickerError ? <p className="dash-inline-error">{tickerError}</p> : null}
          <p className="dash-muted dash-personal-state">{activeLabel}</p>

          <div className="dash-tag-list">
            {(activeSymbols ?? []).length === 0 ? <span className="dash-muted">No hay tickers en esta watchlist. Agregá uno para filtrar el dashboard.</span> : activeSymbols?.map((symbol) => (
              <button key={symbol} type="button" className="dash-tag" onClick={() => onRemoveSymbol(symbol)} title="Quitar ticker">{symbol} ×</button>
            ))}
          </div>
        </div>

        <div className="dash-personal-card">
          <div className="dash-inline-fields dash-personal-inline">
            <input className="dash-input" placeholder="Guardar filtro actual como…" value={filterName} onChange={(e) => setFilterName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleSaveFilter() }} />
            <button type="button" className="dash-btn" onClick={handleSaveFilter}>Guardar filtro</button>
          </div>

          <div className="dash-saved-list">
            {savedFilters.length === 0 ? <span className="dash-muted">No hay filtros guardados todavía.</span> : savedFilters.map((saved) => (
              <div key={saved.id} className="dash-saved-item">
                <button type="button" className="dash-saved-main" onClick={() => onApplySavedFilter(saved.filters)}>
                  <strong>{saved.name}</strong>
                  <span className="dash-muted">{summarizeFilter(saved, watchlists)}</span>
                </button>
                <button type="button" className="dash-link-btn dash-link-btn-danger" onClick={() => onDeleteSavedFilter(saved.id)}>Borrar</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
