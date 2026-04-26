import type { RsTrendRowDto } from '../shared/rs-trend-row.js';

export type { RsTrendRowDto };

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
  rsScore: number;
  rsDelta1d: number | null;
  rsDelta20d: number | null;
  rsi14: number | null;
  volDevPct5: number;
  distEma20Pct: number | null;
  distEma50Pct: number | null;
  distEma200Pct: number | null;
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
  vol5Vs1yRatio: number | null;
};

export type RsTrendRowInTicker = Pick<TickerRow, keyof RsTrendRowDto>;

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
