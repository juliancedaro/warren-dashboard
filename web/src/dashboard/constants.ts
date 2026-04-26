import type { MinCapOption, OptionItem } from './types'

/**
 * Margen derecho unificado (Recharts `margin.right`).
 * Mismo px que `--dash-gutter-right` en `dashboard.css` (treemaps, paneles, outlet).
 */
export const DASH_RECHARTS_MARGIN_RIGHT = 32
export const DASH_COUNTRY_OPTIONS = ['argentina', 'brasil', 'USA', 'GB', 'China'] as const

export const DASH_MIN_CAPS: MinCapOption[] = [
  { id: '0', label: 'Todas', min: 0 },
  { id: '1b', label: '≥ 1B', min: 1e9 },
  { id: '10b', label: '≥ 10B', min: 10e9 },
  { id: '100b', label: '≥ 100B', min: 100e9 },
]

export const DASH_TOP_OPTS = [10, 20, 50]
export const DASH_VOL_THRESHOLD_OPTS = [30, 50, 100, 150]
export const DASH_SEMAPHORE_SORT_OPTS: Array<OptionItem> = [
  { id: 'rs', label: 'RS Score' },
  { id: 'change', label: 'Var %' },
  { id: 'sym', label: 'Ticker' },
]
