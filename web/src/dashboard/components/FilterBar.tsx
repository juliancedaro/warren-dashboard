import { useEffect, useMemo, useRef, useState } from 'react'
import type { AdrRangeId, MinCapOption } from '../types'

interface Props {
  countriesSelected: string[]
  countries: string[]
  indexTagsSelected: string[]
  indexTags: string[]
  sectorsSelected: string[]
  sectors: string[]
  industriesSelected: string[]
  industries: string[]
  minCapId: string
  minCaps: MinCapOption[]
  adrRange: AdrRangeId
  excludeNear52w: boolean
  disabled?: boolean
  onCountriesChange: (value: string[]) => void
  onIndexTagsChange: (value: string[]) => void
  onSectorsChange: (value: string[]) => void
  onIndustriesChange: (value: string[]) => void
  onMinCapChange: (value: string) => void
  onAdrRangeChange: (value: AdrRangeId) => void
  onExcludeNear52wChange: (value: boolean) => void
}

const ADR_OPTIONS: Array<{ id: AdrRangeId; label: string }> = [
  { id: 'all', label: 'Todas' },
  { id: 'lt2', label: '< 2%' },
  { id: '2to4', label: '2% - 4%' },
  { id: 'gt4', label: '> 4%' },
]

function buildTriggerLabel(selected: string[], emptyLabel: string) {
  if (!selected.length) return emptyLabel
  if (selected.length <= 2) return selected.join(', ')
  return `${selected.length} seleccionados`
}

function CheckboxDropdownField({
  label,
  selected,
  options,
  disabled,
  onChange,
  wide = false,
  emptyLabel,
}: {
  label: string
  selected: string[]
  options: string[]
  disabled?: boolean
  onChange: (value: string[]) => void
  wide?: boolean
  emptyLabel: string
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (disabled) setOpen(false)
  }, [disabled])

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  const normalizedSelected = useMemo(() => selected.filter((value) => options.includes(value)), [selected, options])
  const triggerLabel = buildTriggerLabel(normalizedSelected, emptyLabel)

  const toggleValue = (value: string) => {
    if (normalizedSelected.includes(value)) {
      onChange(normalizedSelected.filter((item) => item !== value))
      return
    }
    onChange([...normalizedSelected, value])
  }

  return (
    <div className={`dash-field dash-field-compact dash-dropdown-field ${wide ? 'dash-field-wide' : ''}`} ref={rootRef}>
      <span>{label}</span>

      <button
        type="button"
        className="dash-dropdown-trigger"
        data-open={open ? '1' : '0'}
        onClick={() => setOpen((prev) => !prev)}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className={`dash-dropdown-trigger-text ${normalizedSelected.length ? 'is-selected' : ''}`}>{triggerLabel}</span>
        <span className="dash-dropdown-trigger-icon" aria-hidden>{open ? '−' : '+'}</span>
      </button>
      {open ? (
        <div className="dash-dropdown-panel" role="dialog" aria-label={label}>
          <div className="dash-dropdown-panel-head">
            <strong>{label}</strong>
            <button type="button" className="dash-dropdown-clear" onClick={() => onChange([])} disabled={!normalizedSelected.length}>
              Limpiar
            </button>
          </div>

          <div className="dash-dropdown-options">
            {options.length ? options.map((option) => {
              const checked = normalizedSelected.includes(option)
              return (
                <label key={option} className="dash-dropdown-option">
                  <input type="checkbox" checked={checked} onChange={() => toggleValue(option)} />
                  <span>{option}</span>
                </label>
              )
            }) : (
              <div className="dash-dropdown-empty">No hay opciones disponibles</div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}

export function FilterBar({
  countriesSelected,
  countries,
  indexTagsSelected,
  indexTags,
  sectorsSelected,
  sectors,
  industriesSelected,
  industries,
  minCapId,
  minCaps,
  adrRange,
  disabled,
  onCountriesChange,
  onIndexTagsChange,
  onSectorsChange,
  onIndustriesChange,
  onMinCapChange,
  onAdrRangeChange,
}: Props) {
  return (
    <section className="dash-filters" aria-label="Filtros">
      <div className="dash-filter-row">
        <CheckboxDropdownField label="País" selected={countriesSelected} options={countries} onChange={onCountriesChange} disabled={disabled} emptyLabel="Todos" />
        <CheckboxDropdownField label="Índice" selected={indexTagsSelected} options={indexTags} onChange={onIndexTagsChange} disabled={disabled} emptyLabel="Todos" />
        <CheckboxDropdownField label="Sector" selected={sectorsSelected} options={sectors} onChange={onSectorsChange} disabled={disabled} emptyLabel="Todos" />
        <CheckboxDropdownField label="Industria" selected={industriesSelected} options={industries} onChange={onIndustriesChange} disabled={disabled} wide emptyLabel="Todas" />
      </div>

      <div className="dash-filter-row dash-filter-row-chips">
        <div className="dash-chip-group-wrap">
          <span className="dash-chip-group-label">Capitalización</span>
          <div className="dash-chip-group" role="tablist" aria-label="Capitalización de mercado">
            {minCaps.map((option) => (
              <button
                key={option.id}
                type="button"
                className="dash-chip-btn"
                data-active={minCapId === option.id ? '1' : '0'}
                onClick={() => onMinCapChange(option.id)}
                disabled={disabled}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="dash-chip-group-wrap">
          <span className="dash-chip-group-label">ADR</span>
          <div className="dash-chip-group" role="tablist" aria-label="ADR promedio">
            {ADR_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                className="dash-chip-btn"
                data-active={adrRange === option.id ? '1' : '0'}
                onClick={() => onAdrRangeChange(option.id)}
                disabled={disabled}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
