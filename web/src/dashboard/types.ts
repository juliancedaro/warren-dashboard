import type { ReactNode } from 'react'

export type FetchJson = <T = unknown>(path: string, init?: RequestInit) => Promise<T>

export interface DashboardRow {
  symbol: string
  name?: string
  price: number
  changePct: number
  marketCap: number
  adrPct?: number | null
  sector?: string
  industry?: string
  country?: string | null
  indexTag?: string | null
  website?: string | null
  logoUrl?: string | null
  rsScore: number
  dist52wPct?: number | null
  bubbleSize?: number
  rsi14?: number | null
  volDevPct5?: number | null
  volRelative: number
  vol5Vs1yRatio?: number | null
  near52wHigh?: boolean
  unusualVol?: boolean
  aboveEma20?: boolean
  aboveEma50?: boolean
  aboveEma200?: boolean
  distEma20Pct?: number | null
  distEma50Pct?: number | null
  distEma200Pct?: number | null
  warrenScore?: number | null
  plus25FromLow?: boolean
  volGt08?: boolean
  rsDelta1d?: number | null
  rsDelta20d?: number | null
}

export interface CarouselRow {
  symbol: string
  name?: string
  price: number
  changePct: number
  marketCap?: number
  website?: string | null
  logoUrl?: string | null
}

export interface DashboardCarouselPayload {
  rows: CarouselRow[]
}

export type DashboardFilterChipKey =
  | 'country'
  | 'indexTag'
  | 'sector'
  | 'industry'
  | 'minCapId'
  | 'adrRange'
  | 'excludeNear52w'

export interface DashboardFilterChipRemove {
  key: DashboardFilterChipKey
  value?: string
}

export interface DashboardTablePayload {
  rows: DashboardRow[]
}

export interface DashboardSummary {
  activeTickers: number
  aboveEma20: number
  aboveEma50: number
  aboveEma200: number
  rsScoreGt70: number
  unusualVolToday: number
  qualityCandidates: number
}


export interface DashboardBootstrapPayload {
  hasSnapshots: boolean
  isRefreshing: boolean
  isStale: boolean
  updatedAt: string | null
  rowCount: number
  summary: DashboardSummary | null
}

export interface HeatmapCell {
  symbol: string
  name?: string
  marketCap: number
  changePct: number
  adrPct?: number | null
  sector?: string
  industry?: string
  country?: string | null
  indexTag?: string | null
  website?: string | null
  logoUrl?: string | null
  price?: number | null
}

export interface HeatmapPayload {
  cells: HeatmapCell[]
  matched?: number
  scanned?: number
  filters?: {
    minCapUsd: number
    maxCapUsd: number
    adrSessions: number
    minAdrPct: number
    maxAdrPct: number
    universeSize?: number
  }
  skipped?: Array<unknown>
}

export interface TreemapLeaf {
  name: string
  symbol: string
  size: number
  marketCap: number
  changePct: number
  adrPct?: number | null
  fullName?: string
  sector: string
  industry: string
  price?: number | null
  website?: string | null
  logoUrl?: string | null
  fill: string
}

export interface TreemapGroup {
  name: string
  children: Array<TreemapGroup | TreemapLeaf>
}

/** Un sector en la tira horizontal; el treemap solo usa hojas (top por cap). */
export interface HeatmapSectorColumn {
  name: string
  leaves: TreemapLeaf[]
}

export interface MinCapOption {
  id: string
  label: string
  min: number
}

export interface OptionItem<T extends string | number = string> {
  id: T
  label: string
}

export type AdrRangeId = 'all' | 'lt2' | '2to4' | 'gt4'

export interface DashboardFiltersState {
  countries: string[]
  indexTags: string[]
  sectors: string[]
  industries: string[]
  minCapId: string
  adrRange: AdrRangeId
  excludeNear52w: boolean
  unusualThresholdPct: number
  unusualTopN: number
  semaphoreSort: string
  scanRsMin: number
  scanVolRelMax: number
  scanRsiMin: number
  scanRsiMax: number
  scanSoloVolInusual: boolean
}

export interface DashboardBootstrapState {
  carouselPayload: DashboardCarouselPayload | null
  carouselLoading: boolean
  payload: DashboardTablePayload | null
  loading: boolean
  err: string | null
  heatmap: HeatmapPayload | null
  heatmapLoading: boolean
  heatmapErr: string | null
  bootstrapMeta: DashboardBootstrapPayload | null
  summary: DashboardSummary | null
  secondaryReady: boolean
  tertiaryReady: boolean
  load: (refresh?: boolean) => Promise<void>
  fetchJson: FetchJson
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  totalPages: number
  updatedAt: string | null
}

export interface PaginatedHookState<T> extends PaginatedResponse<T> {
  loading: boolean
  loadingMore: boolean
  error: string | null
  page: number
  pageSize: number
  pageSizeOptions: number[]
  setPage: (value: number) => void
  setPageSize: (value: number) => void
}

export interface PaginationProps {
  page: number
  totalPages: number
  total: number
  pageSize: number
  pageSizeOptions: number[]
  onPageChange: (value: number) => void
  onPageSizeChange: (value: number) => void
}

export interface SectionStatusProps {
  children?: ReactNode
}

export type { RsTrendRowDto as RsTrendRow } from '../../../api/src/shared/rs-trend-row'

export interface RelativeVolatilityRow {
  symbol: string
  vol5Vs1yRatio: number
  rsScore: number
}


export interface WatchlistItem {
  id: string
  symbol: string
}

export interface Watchlist {
  id: string
  name: string
  items: WatchlistItem[]
}

export interface SavedFilterState extends Partial<DashboardFiltersState> {
  activeWatchlistId?: string
}

export interface SavedFilter {
  id: string
  name: string
  filters: SavedFilterState
}
