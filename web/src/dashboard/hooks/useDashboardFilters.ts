import { useCallback, useMemo, useState } from 'react'
import type { DashboardFilterChipRemove, DashboardFiltersState } from '../types'
import { uniqueStrings } from '../utils/array'

const DEFAULT_FILTERS: DashboardFiltersState = {
  countries: [],
  indexTags: [],
  sectors: [],
  industries: [],
  minCapId: '0',
  adrRange: 'all',
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
    if (key === 'minCapId') {
      setFilters((prev) => ({ ...prev, minCapId: '0' }))
      return
    }
    if (key === 'adrRange') {
      setFilters((prev) => ({ ...prev, adrRange: 'all' }))
      return
    }
    if (key === 'country' && value) {
      setFilters((prev) => ({ ...prev, countries: prev.countries.filter((item) => item !== value) }))
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
    setMinCapId: (minCapId: string) => setFilters((prev) => ({ ...prev, minCapId })),
    setAdrRange: (adrRange: DashboardFiltersState['adrRange']) => setFilters((prev) => ({ ...prev, adrRange })),
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
