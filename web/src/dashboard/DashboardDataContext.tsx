import { createContext, useContext, type ReactNode } from 'react'
import { useDashboardBootstrap } from './hooks/useDashboardBootstrap'
import { useDashboardDerived } from './hooks/useDashboardDerived'
import { useDashboardFilters } from './hooks/useDashboardFilters'

type DashboardDataValue = {
  filters: ReturnType<typeof useDashboardFilters>
  bootstrap: ReturnType<typeof useDashboardBootstrap>
  derived: ReturnType<typeof useDashboardDerived>
  minCap: number
}

const DashboardDataContext = createContext<DashboardDataValue | null>(null)

export function DashboardDataProvider({ children }: { children: ReactNode }) {
  const filters = useDashboardFilters()
  const bootstrap = useDashboardBootstrap()
  const derived = useDashboardDerived({
    payload: bootstrap.payload,
    countries: filters.countries,
    indexTags: filters.indexTags,
    sectors: filters.sectors,
    industries: filters.industries,
    minCapMin: filters.minCapMin,
    minCapMax: filters.minCapMax,
    adrMin: filters.adrMin,
    adrMax: filters.adrMax,
    excludeNear52w: filters.excludeNear52w,
    unusualThresholdPct: filters.unusualThresholdPct,
    unusualTopN: filters.unusualTopN,
    symbols: filters.symbols,
  })

  const value: DashboardDataValue = {
    filters,
    bootstrap,
    derived,
    minCap: derived.minCap,
  }

  return <DashboardDataContext.Provider value={value}>{children}</DashboardDataContext.Provider>
}

export function useDashboardData() {
  const v = useContext(DashboardDataContext)
  if (!v) {
    throw new Error('useDashboardData must be used within DashboardDataProvider')
  }
  return v
}
