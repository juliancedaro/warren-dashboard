import type { DashboardFilterChipKey, DashboardFilterChipRemove, DashboardFiltersState } from '../types'

interface Props {
  filters: DashboardFiltersState
  onRemove: (chip: DashboardFilterChipRemove) => void
  onClear: () => void
}

function humanizeUsdBillions(value: number) {
  return `${(value / 1e9).toFixed(0)}B`
}

export function FilterChips({ filters, onRemove, onClear }: Props) {
  const chips: Array<{ key: DashboardFilterChipKey; label: string; value?: string; id: string }> = []

  filters.symbols.forEach((value) => chips.push({ key: 'symbol', value, label: `Ticker: ${value}`, id: `symbol-${value}` }))
  filters.countries.forEach((value) => chips.push({ key: 'country', value, label: `País: ${value}`, id: `country-${value}` }))
  filters.sectors.forEach((value) => chips.push({ key: 'sector', value, label: `Sector: ${value}`, id: `sector-${value}` }))
  filters.industries.forEach((value) => chips.push({ key: 'industry', value, label: `Industria: ${value}`, id: `industry-${value}` }))
  if (filters.minCapMin > 0 || filters.minCapMax < 5e12) {
    chips.push({ key: 'minCapRange', label: `Cap: ${humanizeUsdBillions(filters.minCapMin)}–${humanizeUsdBillions(filters.minCapMax)}`, id: 'minCapRange' })
  }
  if (filters.adrMin > 0 || filters.adrMax < 100) chips.push({ key: 'adrRange', label: `ADR: ${filters.adrMin.toFixed(1)}%–${filters.adrMax.toFixed(1)}%`, id: 'adrRange' })
  if (filters.excludeNear52w) chips.push({ key: 'excludeNear52w', label: 'Sin máx. 52S', id: 'exclude52w' })

  if (!chips.length) return null

  return (
    <div className="dash-active-filters">
      <div className="dash-active-filters-list">
        {chips.map((chip) => (
          <button key={chip.id} type="button" className="dash-filter-chip" onClick={() => onRemove({ key: chip.key, value: chip.value })}>
            <span>{chip.label}</span>
            <strong>×</strong>
          </button>
        ))}
      </div>
      <button type="button" className="dash-clear-filters" onClick={onClear}>Limpiar filtros</button>
    </div>
  )
}
