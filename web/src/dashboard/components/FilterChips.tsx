import type { DashboardFilterChipKey, DashboardFilterChipRemove, DashboardFiltersState, MinCapOption } from '../types'

interface Props {
  filters: DashboardFiltersState
  minCaps: MinCapOption[]
  onRemove: (chip: DashboardFilterChipRemove) => void
  onClear: () => void
}

function humanizeAdr(value: DashboardFiltersState['adrRange']) {
  if (value === 'lt2') return 'ADR < 2%'
  if (value === '2to4') return 'ADR 2%–4%'
  if (value === 'gt4') return 'ADR > 4%'
  return ''
}

export function FilterChips({ filters, minCaps, onRemove, onClear }: Props) {
  const chips: Array<{ key: DashboardFilterChipKey; label: string; value?: string; id: string }> = []

  filters.countries.forEach((value) => chips.push({ key: 'country', value, label: `País: ${value}`, id: `country-${value}` }))
  filters.indexTags.forEach((value) => chips.push({ key: 'indexTag', value, label: `Índice: ${value}`, id: `index-${value}` }))
  filters.sectors.forEach((value) => chips.push({ key: 'sector', value, label: `Sector: ${value}`, id: `sector-${value}` }))
  filters.industries.forEach((value) => chips.push({ key: 'industry', value, label: `Industria: ${value}`, id: `industry-${value}` }))
  if (filters.minCapId !== '0') {
    const found = minCaps.find((item) => item.id === filters.minCapId)
    chips.push({ key: 'minCapId', label: `Cap: ${found?.label ?? filters.minCapId}`, id: 'minCap' })
  }
  if (filters.adrRange !== 'all') chips.push({ key: 'adrRange', label: humanizeAdr(filters.adrRange), id: 'adr' })
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
