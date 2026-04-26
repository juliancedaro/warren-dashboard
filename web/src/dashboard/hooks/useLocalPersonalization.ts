import { useEffect, useMemo, useState } from 'react'
import type { DashboardFiltersState, SavedFilter, SavedFilterState, Watchlist } from '../types'

const WATCHLISTS_KEY = 'cheddir.watchlists.v1'
const FILTERS_KEY = 'cheddir.savedFilters.v2'
const TICKER_RE = /^[A-Z][A-Z0-9.\-]{0,9}$/

function safeRead<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    return parsed as T
  } catch {
    return fallback
  }
}

export function useLocalPersonalization() {
  const [watchlists, setWatchlists] = useState<Watchlist[]>([])
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([])
  const [activeWatchlistId, setActiveWatchlistId] = useState<string>('all')

  useEffect(() => {
    setWatchlists(safeRead<Watchlist[]>(WATCHLISTS_KEY, []))
    setSavedFilters(safeRead<SavedFilter[]>(FILTERS_KEY, []))
  }, [])

  useEffect(() => {
    window.localStorage.setItem(WATCHLISTS_KEY, JSON.stringify(watchlists))
  }, [watchlists])

  useEffect(() => {
    window.localStorage.setItem(FILTERS_KEY, JSON.stringify(savedFilters))
  }, [savedFilters])

  const activeWatchlist = useMemo(
    () => watchlists.find((item) => item.id === activeWatchlistId) ?? null,
    [watchlists, activeWatchlistId],
  )

  const activeSymbols = useMemo(
    () => activeWatchlist?.items.map((item) => item.symbol) ?? null,
    [activeWatchlist],
  )

  function createWatchlist(name: string) {
    const trimmed = name.trim()
    if (!trimmed) return false
    const next: Watchlist = {
      id: crypto.randomUUID(),
      name: trimmed,
      items: [],
    }
    setWatchlists((prev) => [next, ...prev])
    setActiveWatchlistId(next.id)
    return true
  }

  function addSymbolToActiveWatchlist(symbol: string) {
    const normalized = symbol.trim().toUpperCase()
    if (!normalized || !activeWatchlistId || activeWatchlistId === 'all') return { ok: false, error: 'Elegí una watchlist primero.' }
    if (!TICKER_RE.test(normalized)) return { ok: false, error: 'Ticker inválido. Usá símbolos tipo XOM, MSFT.' }
    let added = false
    setWatchlists((prev) => prev.map((watchlist) => {
      if (watchlist.id !== activeWatchlistId) return watchlist
      if (watchlist.items.some((item) => item.symbol === normalized)) return watchlist
      added = true
      return { ...watchlist, items: [...watchlist.items, { id: crypto.randomUUID(), symbol: normalized }].sort((a, b) => a.symbol.localeCompare(b.symbol)) }
    }))
    return added ? { ok: true } : { ok: false, error: 'Ese ticker ya está en la watchlist.' }
  }

  function removeSymbolFromActiveWatchlist(symbol: string) {
    if (!activeWatchlistId || activeWatchlistId === 'all') return
    setWatchlists((prev) => prev.map((watchlist) => watchlist.id !== activeWatchlistId ? watchlist : { ...watchlist, items: watchlist.items.filter((item) => item.symbol !== symbol) }))
  }

  function saveCurrentFilter(name: string, filters: DashboardFiltersState, activeId?: string) {
    const trimmed = name.trim()
    if (!trimmed) return false
    const snapshot: SavedFilterState = { ...filters, activeWatchlistId: activeId && activeId !== 'all' ? activeId : undefined }
    const next: SavedFilter = {
      id: crypto.randomUUID(),
      name: trimmed,
      filters: snapshot,
    }
    setSavedFilters((prev) => [next, ...prev])
    return true
  }

  function deleteSavedFilter(id: string) {
    setSavedFilters((prev) => prev.filter((item) => item.id !== id))
  }

  return {
    watchlists,
    savedFilters,
    activeWatchlistId,
    setActiveWatchlistId,
    activeWatchlist,
    activeSymbols,
    createWatchlist,
    addSymbolToActiveWatchlist,
    removeSymbolFromActiveWatchlist,
    saveCurrentFilter,
    deleteSavedFilter,
  }
}
