import { useCallback, useMemo, useState } from 'react'
import type { DashboardFilterChipRemove, DashboardFiltersState } from '../types'
import { uniqueStrings } from '../utils/array'

const DEFAULT_FILTERS: DashboardFiltersState = {
  symbols: [],
  countries: [],
  indexTags: ['SP500'],
  sectors: [],
  industries: [],
  minCapMin: 0,
  minCapMax: 5e12,
  adrMin: 0,
  adrMax: 100,
  excludeNear52w: false,
  unusualThresholdPct: 50,
  unusualTopN: 20,
  semaphoreSort: 'rs',
  scanRsMin: 60,
  scanVolRelMax: 1,
  scanRsiMin: 0,
  scanRsiMax: 100,
  scanSoloVolInusual: false,
}

export function useDashboardFilters() {
  const [filters, setFilters] = useState<DashboardFiltersState>(DEFAULT_FILTERS)

  const removeFilterChip = useCallback((chip: DashboardFilterChipRemove) => {
    const { key, value } = chip
    if (key === 'excludeNear52w') {
      setFilters((prev) => ({ ...prev, excludeNear52w: false }))
      return
    }
    if (key === 'minCapRange') {
      setFilters((prev) => ({ ...prev, minCapMin: DEFAULT_FILTERS.minCapMin, minCapMax: DEFAULT_FILTERS.minCapMax }))
      return
    }
    if (key === 'adrRange') {
      setFilters((prev) => ({ ...prev, adrMin: DEFAULT_FILTERS.adrMin, adrMax: DEFAULT_FILTERS.adrMax }))
      return
    }
    if (key === 'country' && value) {
      setFilters((prev) => ({ ...prev, countries: prev.countries.filter((item) => item !== value) }))
      return
    }
    if (key === 'symbol' && value) {
      setFilters((prev) => ({ ...prev, symbols: prev.symbols.filter((item) => item !== value) }))
      return
    }
    if (key === 'indexTag' && value) {
      setFilters((prev) => ({ ...prev, indexTags: prev.indexTags.filter((item) => item !== value) }))
      return
    }
    if (key === 'sector' && value) {
      setFilters((prev) => ({ ...prev, sectors: prev.sectors.filter((item) => item !== value), industries: [] }))
      return
    }
    if (key === 'industry' && value) {
      setFilters((prev) => ({ ...prev, industries: prev.industries.filter((item) => item !== value) }))
    }
  }, [])

  const api = useMemo(() => ({
    ...filters,
    setSymbols: (symbols: string[]) => setFilters((prev) => ({ ...prev, symbols: uniqueStrings(symbols.map((s) => s.trim().toUpperCase()).filter(Boolean)) })),
    setCountries: (countries: string[]) => setFilters((prev) => ({ ...prev, countries: uniqueStrings(countries) })),
    setIndexTags: (indexTags: string[]) => setFilters((prev) => ({ ...prev, indexTags: uniqueStrings(indexTags) })),
    setSectors: (sectors: string[]) => setFilters((prev) => {
      const nextSectors = uniqueStrings(sectors)
      const nextIndustries = nextSectors.length === 0 ? prev.industries : []
      return { ...prev, sectors: nextSectors, industries: nextIndustries }
    }),
    setIndustries: (industries: string[]) => setFilters((prev) => ({ ...prev, industries: uniqueStrings(industries) })),
    removeCountry: (country: string) => setFilters((prev) => ({ ...prev, countries: prev.countries.filter((item) => item !== country) })),
    removeIndexTag: (indexTag: string) => setFilters((prev) => ({ ...prev, indexTags: prev.indexTags.filter((item) => item !== indexTag) })),
    removeSector: (sector: string) => setFilters((prev) => ({ ...prev, sectors: prev.sectors.filter((item) => item !== sector), industries: [] })),
    removeIndustry: (industry: string) => setFilters((prev) => ({ ...prev, industries: prev.industries.filter((item) => item !== industry) })),
    setMinCapMin: (minCapMin: number) => setFilters((prev) => {
      const nextMin = Math.max(0, minCapMin)
      return { ...prev, minCapMin: nextMin, minCapMax: Math.max(nextMin, prev.minCapMax) }
    }),
    setMinCapMax: (minCapMax: number) => setFilters((prev) => {
      const nextMax = Math.max(0, minCapMax)
      return { ...prev, minCapMax: nextMax, minCapMin: Math.min(prev.minCapMin, nextMax) }
    }),
    setAdrMin: (adrMin: number) => setFilters((prev) => {
      const nextMin = Math.max(0, adrMin)
      return { ...prev, adrMin: nextMin, adrMax: Math.max(nextMin, prev.adrMax) }
    }),
    setAdrMax: (adrMax: number) => setFilters((prev) => {
      const nextMax = Math.max(0, adrMax)
      return { ...prev, adrMax: nextMax, adrMin: Math.min(prev.adrMin, nextMax) }
    }),
    setExcludeNear52w: (excludeNear52w: boolean) => setFilters((prev) => ({ ...prev, excludeNear52w })),
    setUnusualThresholdPct: (unusualThresholdPct: number) => setFilters((prev) => ({ ...prev, unusualThresholdPct })),
    setUnusualTopN: (unusualTopN: number) => setFilters((prev) => ({ ...prev, unusualTopN })),
    setSemaphoreSort: (semaphoreSort: string) => setFilters((prev) => ({ ...prev, semaphoreSort })),
    setScanRsMin: (scanRsMin: number) => setFilters((prev) => ({ ...prev, scanRsMin })),
    setScanVolRelMax: (scanVolRelMax: number) => setFilters((prev) => ({ ...prev, scanVolRelMax })),
    setScanRsiMin: (scanRsiMin: number) => setFilters((prev) => ({ ...prev, scanRsiMin })),
    setScanRsiMax: (scanRsiMax: number) => setFilters((prev) => ({ ...prev, scanRsiMax })),
    setScanSoloVolInusual: (scanSoloVolInusual: boolean) => setFilters((prev) => ({ ...prev, scanSoloVolInusual })),
    applyFilters: (next: Partial<DashboardFiltersState>) => setFilters((prev) => ({ ...prev, ...next })),
    resetFilters: () => setFilters(DEFAULT_FILTERS),
    removeFilterChip,
    currentFilters: filters,
  }), [filters, removeFilterChip])

  return api
}
