export type TickerRow = {
  symbol: string;
  name: string;
  price: number;
  changePct: number;
  marketCap: number;
  sector: string;
  industry: string;
  country: string;
  indexTag: string;
  adrPct: number;
  /** Posición en el rango 52s (0–100), proxy de “fuerza” para el mapa */
  rsScore: number;
  /** Δ RS vs cierre anterior (misma métrica RS 52S) */
  rsDelta1d: number | null;
  /** Δ RS vs ~20 ruedas (aprox. 1 mes) */
  rsDelta20d: number | null;
  /** RSI 14 períodos; null si no hay historia suficiente */
  rsi14: number | null;
  /** Desvío % del volumen de hoy vs promedio móvil de 5 sesiones */
  volDevPct5: number;
  /** Distancia % a la EMA20 */
  distEma20Pct: number | null;
  /** Distancia % a la EMA50 */
  distEma50Pct: number | null;
  /** Distancia % al EMA200 (positivo = sobre la media) */
  distEma200Pct: number | null;
  /** Distancia al máximo 52s, ≤ 0 */
  dist52wPct: number;
  volRelative: number;
  unusualVol: boolean;
  warrenScore: number;
  aboveEma20: boolean;
  aboveEma50: boolean;
  aboveEma200: boolean;
  plus25FromLow: boolean;
  volGt08: boolean;
  near52wHigh: boolean;
  /**
   * Rank RS entre el universo del dashboard (1 = mejor RS) en snapshots ~4/3/2/1 sem y hoy.
   */
  rsRank4w: number | null;
  rsRank3w: number | null;
  rsRank2w: number | null;
  rsRank1w: number | null;
  rsRankNow: number | null;
  /**
   * Volatilidad realizada anualizada (últimos 5 retornos diarios) /
   * vol. anualizada ~1 año (252 retornos). null si no hay historia.
   */
  vol5Vs1yRatio: number | null;
};

export type DashboardSummary = {
  activeTickers: number;
  aboveEma20: number;
  aboveEma50: number;
  aboveEma200: number;
  rsScoreGt70: number;
  unusualVolToday: number;
  qualityCandidates: number;
};

export type DashboardResponse = {
  updatedAt: string;
  rows: TickerRow[];
  summary: DashboardSummary;
  skipped: string[];
};


export type DashboardBootstrapResponse = {
  hasSnapshots: boolean;
  isRefreshing: boolean;
  isStale: boolean;
  updatedAt: string | null;
  rowCount: number;
  summary: DashboardSummary | null;
};


export type CarouselRow = {
  symbol: string;
  name: string;
  price: number;
  changePct: number;
  marketCap: number;
  website: string | null;
  logoUrl: string | null;
};

export type CarouselResponse = {
  updatedAt: string;
  rows: CarouselRow[];
  skipped: string[];
};


export type PaginatedResponse<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  updatedAt: string;
};


export type RowsResponse<T> = {
  items: T[];
  updatedAt: string;
};
