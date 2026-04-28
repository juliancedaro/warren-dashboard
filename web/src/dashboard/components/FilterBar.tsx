import { useEffect, useMemo, useRef, useState } from 'react'

interface Props {
  symbolsSelected: string[]
  countriesSelected: string[]
  countries: string[]
  sectorsSelected: string[]
  sectors: string[]
  industriesSelected: string[]
  industries: string[]
  minCapMin: number
  minCapMax: number
  adrMin: number
  adrMax: number
  excludeNear52w: boolean
  disabled?: boolean
  onCountriesChange: (value: string[]) => void
  onSymbolsChange: (value: string[]) => void
  onSectorsChange: (value: string[]) => void
  onIndustriesChange: (value: string[]) => void
  onMinCapMinChange: (value: number) => void
  onMinCapMaxChange: (value: number) => void
  onAdrMinChange: (value: number) => void
  onAdrMaxChange: (value: number) => void
  onExcludeNear52wChange: (value: boolean) => void
}

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

const CAP_MIN_DEFAULT_B = 0
const CAP_MAX_DEFAULT_B = 5000
const ADR_MIN_DEFAULT = 0
const ADR_MAX_DEFAULT = 100

export function FilterBar({
  symbolsSelected,
  countriesSelected,
  countries,
  sectorsSelected,
  sectors,
  industriesSelected,
  industries,
  minCapMin,
  minCapMax,
  adrMin,
  adrMax,
  disabled,
  onSymbolsChange,
  onCountriesChange,
  onSectorsChange,
  onIndustriesChange,
  onMinCapMinChange,
  onMinCapMaxChange,
  onAdrMinChange,
  onAdrMaxChange,
}: Props) {
  const capMinB = Math.round(minCapMin / 1e9)
  const capMaxB = Math.round(minCapMax / 1e9)
  const [symbolsInput, setSymbolsInput] = useState('')
  const [draftCapMin, setDraftCapMin] = useState(capMinB === CAP_MIN_DEFAULT_B ? '' : String(capMinB))
  const [draftCapMax, setDraftCapMax] = useState(capMaxB === CAP_MAX_DEFAULT_B ? '' : String(capMaxB))
  const [draftAdrMin, setDraftAdrMin] = useState(adrMin === ADR_MIN_DEFAULT ? '' : String(adrMin))
  const [draftAdrMax, setDraftAdrMax] = useState(adrMax === ADR_MAX_DEFAULT ? '' : String(adrMax))

  useEffect(() => {
    setDraftCapMin(capMinB === CAP_MIN_DEFAULT_B ? '' : String(capMinB))
    setDraftCapMax(capMaxB === CAP_MAX_DEFAULT_B ? '' : String(capMaxB))
  }, [capMinB, capMaxB])

  useEffect(() => {
    setDraftAdrMin(adrMin === ADR_MIN_DEFAULT ? '' : String(adrMin))
    setDraftAdrMax(adrMax === ADR_MAX_DEFAULT ? '' : String(adrMax))
  }, [adrMin, adrMax])

  function applyRanges() {
    const nextCapMin = draftCapMin.trim() ? Number(draftCapMin) : CAP_MIN_DEFAULT_B
    const nextCapMax = draftCapMax.trim() ? Number(draftCapMax) : CAP_MAX_DEFAULT_B
    const nextAdrMin = draftAdrMin.trim() ? Number(draftAdrMin) : ADR_MIN_DEFAULT
    const nextAdrMax = draftAdrMax.trim() ? Number(draftAdrMax) : ADR_MAX_DEFAULT
    if (Number.isFinite(nextCapMin)) onMinCapMinChange(Math.max(0, nextCapMin) * 1e9)
    if (Number.isFinite(nextCapMax)) onMinCapMaxChange(Math.max(0, nextCapMax) * 1e9)
    if (Number.isFinite(nextAdrMin)) onAdrMinChange(Math.max(0, nextAdrMin))
    if (Number.isFinite(nextAdrMax)) onAdrMaxChange(Math.max(0, nextAdrMax))
  }

  function addSymbolsFromInput() {
    const incoming = symbolsInput
      .split(/[,\s]+/)
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean)
    if (!incoming.length) return
    onSymbolsChange([...symbolsSelected, ...incoming])
    setSymbolsInput('')
  }

  function removeSymbol(symbol: string) {
    onSymbolsChange(symbolsSelected.filter((item) => item !== symbol))
  }

  return (
    <section className="dash-filters" aria-label="Filtros">
      <div className="dash-filter-row">
        <div className="dash-field dash-field-wide">
          <span>Tickers (comparativo)</span>
          <div className="dash-inline-fields">
            <input
              className="dash-input"
              placeholder="Ej: AAPL AMD GOOG"
              value={symbolsInput}
              onChange={(e) => setSymbolsInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') addSymbolsFromInput() }}
              disabled={disabled}
            />
            <button type="button" className="dash-btn" onClick={addSymbolsFromInput} disabled={disabled}>Agregar</button>
          </div>
          {symbolsSelected.length ? (
            <div className="dash-tag-list">
              {symbolsSelected.map((symbol) => (
                <button key={symbol} type="button" className="dash-tag" onClick={() => removeSymbol(symbol)} title="Quitar ticker">
                  {symbol} ×
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="dash-filter-row">
        <CheckboxDropdownField label="País" selected={countriesSelected} options={countries} onChange={onCountriesChange} disabled={disabled} emptyLabel="Todos" />
        <CheckboxDropdownField label="Sector" selected={sectorsSelected} options={sectors} onChange={onSectorsChange} disabled={disabled} emptyLabel="Todos" />
        <CheckboxDropdownField label="Industria" selected={industriesSelected} options={industries} onChange={onIndustriesChange} disabled={disabled} wide emptyLabel="Todas" />
      </div>

      <div className="dash-filter-row dash-filter-row-chips">
        <div className="dash-chip-group-wrap">
          <span className="dash-chip-group-label">Capitalización (B USD)</span>
          <div className="dash-chip-group" aria-label="Rango de capitalización">
            <label className="dash-field dash-field-inline">
              <span>Min</span>
              <input
                type="number"
                min={0}
                step={1}
                value={draftCapMin}
                placeholder={String(CAP_MIN_DEFAULT_B)}
                onChange={(e) => setDraftCapMin(e.target.value)}
                disabled={disabled}
                className="dash-input"
              />
            </label>
            <label className="dash-field dash-field-inline">
              <span>Max</span>
              <input
                type="number"
                min={0}
                step={1}
                value={draftCapMax}
                placeholder={String(CAP_MAX_DEFAULT_B)}
                onChange={(e) => setDraftCapMax(e.target.value)}
                disabled={disabled}
                className="dash-input"
              />
            </label>
          </div>
        </div>

        <div className="dash-chip-group-wrap">
          <span className="dash-chip-group-label">ADR (%)</span>
          <div className="dash-chip-group" aria-label="Rango ADR promedio">
            <label className="dash-field dash-field-inline">
              <span>Min</span>
              <input
                type="number"
                min={0}
                step={0.1}
                value={draftAdrMin}
                placeholder={String(ADR_MIN_DEFAULT)}
                onChange={(e) => setDraftAdrMin(e.target.value)}
                disabled={disabled}
                className="dash-input"
              />
            </label>
            <label className="dash-field dash-field-inline">
              <span>Max</span>
              <input
                type="number"
                min={0}
                step={0.1}
                value={draftAdrMax}
                placeholder={String(ADR_MAX_DEFAULT)}
                onChange={(e) => setDraftAdrMax(e.target.value)}
                disabled={disabled}
                className="dash-input"
              />
            </label>
          </div>
        </div>
        <div className="dash-chip-group-wrap dash-range-apply-wrap">
          <div className="dash-chip-group">
            <button type="button" className="dash-btn dash-range-apply-btn" onClick={applyRanges} disabled={disabled}>
              Aplicar rangos
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
