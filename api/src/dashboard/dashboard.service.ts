import { Injectable, Logger } from '@nestjs/common';
import { YahooMarketService } from '../yahoo/yahoo-market.service';
import type {
  CarouselResponse,
  CarouselRow,
  DashboardBootstrapResponse,
  DashboardResponse,
  PaginatedResponse,
  RowsResponse,
  RsTrendRowDto,
  TickerRow,
} from './dashboard.types';
import { SP500_CONSTITUENTS } from './sp500-constituents';
import { SymbolSnapshotService } from './symbol-snapshot.service';

const PRIORITY_SYMBOLS = [
  'AAPL',
  'MSFT',
  'AMZN',
  'GOOGL',
  'GOOG',
  'META',
  'TSLA',
  'NVDA',
  'JPM',
  'JNJ',
  'V',
  'MA',
  'UNH',
  'XOM',
  'KO',
  'PEP',
  'WMT',
  'MCD',
  'NFLX',
  'DIS',
];

function shuffleArray<T>(items: T[]) {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Universo: constituyentes S&P 500; solo entran filas con cap ≥ esto (Yahoo). */
const MIN_MARKET_CAP_USD = 20_000_000_000;

const DEFAULT_SYMBOLS = SP500_CONSTITUENTS;

function normalizeCountry(country?: string | null): string {
  const value = String(country ?? '').trim();
  if (!value) return 'USA';
  const upper = value.toUpperCase();
  if (upper === 'AR' || upper === 'ARGENTINA') return 'argentina';
  if (['BR', 'BRAZIL', 'BRASIL'].includes(upper)) return 'brasil';
  if (
    upper === 'US' ||
    upper === 'UNITED STATES' ||
    upper === 'UNITED STATES OF AMERICA' ||
    upper === 'USA'
  )
    return 'USA';
  if (['UK', 'UNITED KINGDOM', 'GB'].includes(upper)) return 'GB';
  if (
    upper === 'CN' ||
    upper === 'CHN' ||
    upper === 'CHINA' ||
    upper === "PEOPLE'S REPUBLIC OF CHINA" ||
    upper === 'PRC'
  )
    return 'China';
  return 'USA';
}

function normalizeIndustry(
  industry?: string | null,
  sector?: string | null,
): string {
  const value = String(industry ?? '').trim();
  if (!value) return String(sector ?? 'Otros').trim() || 'Otros';
  return value
    .replace(/\s+/g, ' ')
    .replace(/^N\/?A$/i, 'Otros')
    .trim();
}

function deriveIndexTag(symbol: string): string {
  return SP500_CONSTITUENTS.includes(symbol.toUpperCase()) ? 'SP500' : 'OTHER';
}

function adrPct20(highs: number[], lows: number[], closes: number[]): number {
  const span = Math.min(20, highs.length, lows.length, closes.length);
  if (!span) return 0;
  let total = 0;
  let count = 0;
  for (let i = highs.length - span; i < highs.length; i++) {
    const high = Number(highs[i] ?? 0);
    const low = Number(lows[i] ?? 0);
    const close = Number(closes[i] ?? 0);
    if (high > 0 && low >= 0 && close > 0) {
      total += ((high - low) / close) * 100;
      count += 1;
    }
  }
  return count ? Math.round((total / count) * 100) / 100 : 0;
}

const CACHE_MS = 120_000;
const CAROUSEL_CACHE_MS = 60_000;
const CAROUSEL_SYMBOL_LIMIT = 24;
const CAROUSEL_RESULT_LIMIT = 16;
const CAROUSEL_BATCH_SIZE = 8;

/** Ticker normalizado (mayúsculas, `.` → `-`) para excluir del carrusel solamente. */
function carouselSymbolKey(symbol: string): string {
  return symbol.trim().toUpperCase().replace(/\./g, '-');
}

function isCarouselExcludedSymbol(symbol: string): boolean {
  return carouselSymbolKey(symbol) === 'BRK-B';
}

const DASHBOARD_BATCH_SIZE = 12;
const CANDLE_LOOKBACK_DAYS = 420;
const BARS_52W = 252;

function smaLast(values: number[], period: number): number | null {
  if (values.length < period) return null;
  const slice = values.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

function emaLast(values: number[], period: number): number | null {
  if (values.length < period) return null;
  const k = 2 / (period + 1);
  const first = values.slice(0, period);
  let e = first.reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < values.length; i++) {
    e = values[i] * k + e * (1 - k);
  }
  return e;
}

/** RSI Wilder, último valor; requiere al menos period+1 cierres. */
function rsiLast(closes: number[], period = 14): number | null {
  if (closes.length < period + 1) return null;
  let sumGain = 0;
  let sumLoss = 0;
  for (let i = 1; i <= period; i++) {
    const ch = closes[i] - closes[i - 1];
    if (ch >= 0) sumGain += ch;
    else sumLoss -= ch;
  }
  let avgGain = sumGain / period;
  let avgLoss = sumLoss / period;
  for (let i = period + 1; i < closes.length; i++) {
    const ch = closes[i] - closes[i - 1];
    const g = ch > 0 ? ch : 0;
    const l = ch < 0 ? -ch : 0;
    avgGain = (avgGain * (period - 1) + g) / period;
    avgLoss = (avgLoss * (period - 1) + l) / period;
  }
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

/** RS (posición en rango 52S) usando velas hasta endIdx inclusive. */
function rsScoreAtEndIdx(
  highs: number[],
  lows: number[],
  closes: number[],
  endIdx: number,
): number | null {
  if (endIdx < 0 || endIdx >= closes.length) return null;
  const startIdx = Math.max(0, endIdx + 1 - BARS_52W);
  let high52 = highs[startIdx];
  let low52 = lows[startIdx];
  for (let i = startIdx + 1; i <= endIdx; i++) {
    high52 = Math.max(high52, highs[i]);
    low52 = Math.min(low52, lows[i]);
  }
  const price = closes[endIdx];
  if (price <= 0 || high52 <= low52) return null;
  return clamp(((price - low52) / (high52 - low52)) * 100, 0, 100);
}

/** Retornos log diarios: los últimos `count` intervalos terminando en endIdx. */
function logReturnsEnding(
  closes: number[],
  endIdx: number,
  count: number,
): number[] | null {
  if (count < 1 || endIdx < count) return null;
  const out: number[] = [];
  for (let i = endIdx - count + 1; i <= endIdx; i++) {
    const a = closes[i - 1];
    const b = closes[i];
    if (a <= 0 || b <= 0) return null;
    out.push(Math.log(b / a));
  }
  return out.length === count ? out : null;
}

function stdevSample(vals: number[]): number {
  if (vals.length < 2) return 0;
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  const v = vals.reduce((s, x) => s + (x - mean) ** 2, 0) / (vals.length - 1);
  return Math.sqrt(v);
}

/** Volatilidad anualizada desde `count` retornos diarios consecutivos. */
function annVolFromReturns(count: number, closes: number[], endIdx: number) {
  const rets = logReturnsEnding(closes, endIdx, count);
  if (!rets) return null;
  const sd = stdevSample(rets);
  return sd * Math.sqrt(252);
}

/** Vol 5d anualizada / vol 1y anualizada. */
function vol5Vs1yRatio(closes: number[], endIdx: number): number | null {
  const v5 = annVolFromReturns(5, closes, endIdx);
  const v1y = annVolFromReturns(252, closes, endIdx);
  if (v5 == null || v1y == null || v1y <= 1e-12) return null;
  return v5 / v1y;
}

type DashboardBaseFilters = {
  country?: string[];
  indexTag?: string[];
  sector?: string[];
  industry?: string[];
  minCap?: number;
  excludeNear52w?: boolean;
  symbols?: string[];
};

type ScannerFilters = DashboardBaseFilters & {
  rsMin?: number;
  volRelMax?: number;
  rsiMin?: number;
  rsiMax?: number;
  onlyUnusualVol?: boolean;
};

const PAGE_SIZE_OPTIONS = [10, 20, 25, 50, 100] as const;
const DEFAULT_PAGE_SIZE = 20;

function normalizePage(page?: number): number {
  return Number.isFinite(page) && page && page > 0 ? Math.floor(page) : 1;
}

function normalizePageSize(pageSize?: number): number {
  const parsed =
    Number.isFinite(pageSize) && pageSize
      ? Math.floor(pageSize)
      : DEFAULT_PAGE_SIZE;
  return (PAGE_SIZE_OPTIONS as readonly number[]).includes(parsed)
    ? parsed
    : DEFAULT_PAGE_SIZE;
}

function rowMatchesAdrQuery(
  adrPct: number | null | undefined,
  adrMin?: number,
  adrMax?: number,
): boolean {
  if (!Number.isFinite(adrMin) && !Number.isFinite(adrMax)) return true;
  const a = Number(adrPct);
  if (!Number.isFinite(a)) return false;
  if (Number.isFinite(adrMin) && Number.isFinite(adrMax))
    return a >= (adrMin as number) && a <= (adrMax as number);
  if (Number.isFinite(adrMax) && (adrMax as number) === 2) return a < 2;
  if (Number.isFinite(adrMin) && (adrMin as number) === 4) return a > 4;
  return true;
}

function applyDashboardBaseFilters(
  rows: TickerRow[],
  filters: DashboardBaseFilters,
): TickerRow[] {
  let out = rows;
  if (filters.symbols?.length) {
    const set = new Set(filters.symbols.map((item) => item.toUpperCase()));
    out = out.filter((row) => set.has(row.symbol.toUpperCase()));
  }
  const minCap = Number.isFinite(filters.minCap)
    ? Math.max(0, filters.minCap ?? 0)
    : 0;
  if (minCap > 0) out = out.filter((row) => row.marketCap >= minCap);
  if (filters.country?.length)
    out = out.filter((row) => filters.country!.includes(row.country));
  if (filters.indexTag?.length)
    out = out.filter((row) => filters.indexTag!.includes(row.indexTag));
  if (filters.sector?.length)
    out = out.filter((row) => filters.sector!.includes(row.sector));
  if (filters.industry?.length)
    out = out.filter((row) => filters.industry!.includes(row.industry));
  if (filters.excludeNear52w) out = out.filter((row) => !row.near52wHigh);
  return out;
}

function paginateRows<T>(
  rows: T[],
  page?: number,
  pageSize?: number,
): PaginatedResponse<T> {
  const safePageSize = normalizePageSize(pageSize);
  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / safePageSize));
  const safePage = Math.min(normalizePage(page), totalPages);
  const start = (safePage - 1) * safePageSize;
  return {
    items: rows.slice(start, start + safePageSize),
    page: safePage,
    pageSize: safePageSize,
    total,
    totalPages,
    updatedAt: new Date().toISOString(),
  };
}

type SnapScores = {
  s4: number | null;
  s3: number | null;
  s2: number | null;
  s1: number | null;
  s0: number | null;
};

function ranksFromScores(
  rows: { symbol: string; score: number | null }[],
): (number | null)[] {
  const sorted = [...rows]
    .filter((r): r is { symbol: string; score: number } => r.score != null)
    .sort((a, b) => b.score - a.score);
  const rankBySym = new Map<string, number>();
  for (let i = 0; i < sorted.length; i++) {
    rankBySym.set(sorted[i].symbol, i + 1);
  }
  return rows.map((r) =>
    r.score == null ? null : (rankBySym.get(r.symbol) ?? null),
  );
}

function attachRsRanks(rows: TickerRow[], snaps: SnapScores[]): void {
  const keys: (keyof SnapScores)[] = ['s4', 's3', 's2', 's1', 's0'];
  keys.forEach((k, ki) => {
    const ranks = ranksFromScores(
      rows.map((r, i) => ({
        symbol: r.symbol,
        score: snaps[i][k],
      })),
    );
    for (let i = 0; i < rows.length; i++) {
      const rank = ranks[i]!;
      const row = rows[i];
      if (ki === 0) row.rsRank4w = rank;
      else if (ki === 1) row.rsRank3w = rank;
      else if (ki === 2) row.rsRank2w = rank;
      else if (ki === 3) row.rsRank1w = rank;
      else row.rsRankNow = rank;
    }
  });
}

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);
  private cache: { at: number; data: DashboardResponse } | null = null;
  private inflight: Promise<DashboardResponse> | null = null;
  private carouselCache: { at: number; data: CarouselResponse } | null = null;
  private carouselInflight: Promise<CarouselResponse> | null = null;
  private snapshotRefreshInflight: Promise<void> | null = null;

  constructor(
    private readonly yahooMarket: YahooMarketService,
    private readonly symbolSnapshots: SymbolSnapshotService,
  ) {}

  async getCarousel(forceRefresh = false): Promise<CarouselResponse> {
    if (
      !forceRefresh &&
      this.carouselCache &&
      Date.now() - this.carouselCache.at < CAROUSEL_CACHE_MS
    ) {
      return this.carouselCache.data;
    }
    if (this.carouselInflight) {
      return this.carouselInflight;
    }
    this.carouselInflight = this.buildCarousel()
      .then((data) => {
        this.carouselCache = { at: Date.now(), data };
        return data;
      })
      .finally(() => {
        this.carouselInflight = null;
      });
    return this.carouselInflight;
  }

  async getBootstrap(
    forceRefresh = false,
  ): Promise<DashboardBootstrapResponse> {
    if (!this.symbolSnapshots.isEnabled()) {
      return {
        hasSnapshots: false,
        isRefreshing: false,
        isStale: false,
        updatedAt: null,
        rowCount: 0,
        summary: null,
      };
    }

    const hasSnapshots = await this.symbolSnapshots.hasAnyRows();
    const isStale = hasSnapshots
      ? !(await this.symbolSnapshots.hasFreshRows())
      : false;
    if (forceRefresh || !hasSnapshots || isStale) {
      void this.refreshSnapshotsFromYahoo();
    }
    const [updatedAt, summary] = await Promise.all([
      this.symbolSnapshots.getLatestUpdatedAt(),
      hasSnapshots ? this.symbolSnapshots.getSummary() : Promise.resolve(null),
    ]);
    return {
      hasSnapshots,
      isRefreshing: this.snapshotRefreshInflight != null,
      isStale,
      updatedAt,
      rowCount: summary?.activeTickers ?? 0,
      summary,
    };
  }

  async getDashboard(forceRefresh = false): Promise<DashboardResponse> {
    if (this.symbolSnapshots.isEnabled()) {
      const fromDb = await this.getDashboardFromDb(forceRefresh);
      if (fromDb) {
        return fromDb;
      }
    }

    if (!forceRefresh && this.cache && Date.now() - this.cache.at < CACHE_MS) {
      return this.cache.data;
    }
    if (this.inflight) {
      return this.inflight;
    }
    this.inflight = this.buildDashboard()
      .then((data) => {
        this.cache = { at: Date.now(), data };
        return data;
      })
      .finally(() => {
        this.inflight = null;
      });
    return this.inflight;
  }

  async getRsTrend(params: {
    country?: string[];
    indexTag?: string[];
    sector?: string[];
    industry?: string[];
    minCap?: number;
    excludeNear52w?: boolean;
    rsMin?: number;
    limit?: number;
    symbols?: string[];
  }): Promise<RowsResponse<RsTrendRowDto>> {
    if (this.symbolSnapshots.isEnabled()) {
      const rows = await this.getRsTrendRowsFromDb(params);
      if (rows) return rows;
    }

    const dashboard = await this.getDashboard(false);
    const filtered = applyDashboardBaseFilters(dashboard.rows, params)
      .filter((r) => r.rsScore >= (params.rsMin ?? 0))
      .sort((a, b) => {
        const ra = a.rsRankNow ?? 9999;
        const rb = b.rsRankNow ?? 9999;
        return (
          ra - rb || b.rsScore - a.rsScore || a.symbol.localeCompare(b.symbol)
        );
      })
      .slice(0, Math.max(1, Math.min(100, params.limit ?? 20)));
    return { items: filtered, updatedAt: dashboard.updatedAt };
  }

  async getVolatilityRelative(params: {
    country?: string[];
    indexTag?: string[];
    sector?: string[];
    industry?: string[];
    minCap?: number;
    excludeNear52w?: boolean;
    rsMin?: number;
    limit?: number;
    sort?: 'asc' | 'desc';
    symbols?: string[];
    adrMin?: number;
    adrMax?: number;
  }): Promise<RowsResponse<TickerRow>> {
    if (this.symbolSnapshots.isEnabled()) {
      const rows = await this.getVolatilityRelativeRowsFromDb(params);
      if (rows) return rows;
    }

    const dashboard = await this.getDashboard(false);
    const filtered = applyDashboardBaseFilters(dashboard.rows, params)
      .filter((r) => rowMatchesAdrQuery(r.adrPct, params.adrMin, params.adrMax))
      .filter(
        (r) =>
          r.rsScore >= (params.rsMin ?? 0) &&
          r.vol5Vs1yRatio != null &&
          Number.isFinite(r.vol5Vs1yRatio),
      )
      .sort((a, b) =>
        params.sort === 'desc'
          ? (b.vol5Vs1yRatio ?? 0) - (a.vol5Vs1yRatio ?? 0)
          : (a.vol5Vs1yRatio ?? 0) - (b.vol5Vs1yRatio ?? 0),
      )
      .slice(0, Math.max(1, Math.min(100, params.limit ?? 30)));
    return { items: filtered, updatedAt: dashboard.updatedAt };
  }

  async getSemaphorePage(params: {
    page?: number;
    pageSize?: number;
    country?: string[];
    indexTag?: string[];
    sector?: string[];
    industry?: string[];
    minCap?: number;
    excludeNear52w?: boolean;
    sort?: string;
    symbols?: string[];
  }): Promise<PaginatedResponse<TickerRow>> {
    if (this.symbolSnapshots.isEnabled()) {
      const page = await this.getSemaphorePageFromDb(params);
      if (page) return page;
    }

    const dashboard = await this.getDashboard(false);
    const rows = applyDashboardBaseFilters(dashboard.rows, params);
    const sort = params.sort ?? 'rs';
    const sorted = [...rows].sort((a, b) => {
      if (sort === 'change') return b.changePct - a.changePct;
      if (sort === 'sym') return a.symbol.localeCompare(b.symbol);
      return b.rsScore - a.rsScore;
    });
    return {
      ...paginateRows(sorted, params.page, params.pageSize),
      updatedAt: dashboard.updatedAt,
    };
  }

  async getWarrenPage(params: {
    page?: number;
    pageSize?: number;
    country?: string[];
    indexTag?: string[];
    sector?: string[];
    industry?: string[];
    minCap?: number;
    excludeNear52w?: boolean;
    symbols?: string[];
  }): Promise<PaginatedResponse<TickerRow>> {
    if (this.symbolSnapshots.isEnabled()) {
      const page = await this.getWarrenPageFromDb(params);
      if (page) return page;
    }

    const dashboard = await this.getDashboard(false);
    const rows = applyDashboardBaseFilters(dashboard.rows, params).sort(
      (a, b) =>
        b.warrenScore - a.warrenScore ||
        b.rsScore - a.rsScore ||
        a.symbol.localeCompare(b.symbol),
    );
    return {
      ...paginateRows(rows, params.page, params.pageSize),
      updatedAt: dashboard.updatedAt,
    };
  }

  async getScannerPage(
    params: {
      page?: number;
      pageSize?: number;
      symbols?: string[];
    } & ScannerFilters,
  ): Promise<PaginatedResponse<TickerRow>> {
    if (this.symbolSnapshots.isEnabled()) {
      const page = await this.getScannerPageFromDb(params);
      if (page) return page;
    }

    const dashboard = await this.getDashboard(false);
    const rows = applyDashboardBaseFilters(dashboard.rows, params);
    const lo = Math.min(params.rsiMin ?? 0, params.rsiMax ?? 100);
    const hi = Math.max(params.rsiMin ?? 0, params.rsiMax ?? 100);
    const onlyUnusualVol = Boolean(params.onlyUnusualVol);
    const filtered = rows
      .filter((row) => row.rsScore >= (params.rsMin ?? 60))
      .filter((row) => row.volRelative <= (params.volRelMax ?? 1) + 1e-9)
      .filter((row) => {
        if (lo <= 0 && hi >= 100) return true;
        if (row.rsi14 == null) return false;
        return row.rsi14 >= lo && row.rsi14 <= hi;
      })
      .filter(
        (row) =>
          !onlyUnusualVol || row.unusualVol || (row.volDevPct5 ?? 0) >= 50,
      )
      .sort((a, b) => b.rsScore - a.rsScore);
    return {
      ...paginateRows(filtered, params.page, params.pageSize),
      updatedAt: dashboard.updatedAt,
    };
  }

  private async getDashboardFromDb(
    forceRefresh = false,
  ): Promise<DashboardResponse | null> {
    const state = await this.ensureSnapshotAccess(forceRefresh);
    const rows = await this.symbolSnapshots.getAllRows();
    if (!rows || rows.items.length === 0) {
      return {
        updatedAt: state.updatedAt ?? new Date().toISOString(),
        rows: [],
        summary: state.summary ?? this.summarize([]),
        skipped: [],
      };
    }
    return {
      updatedAt: rows.updatedAt,
      rows: rows.items,
      summary: state.summary ?? this.summarize(rows.items),
      skipped: [],
    };
  }

  private async ensureSnapshotAccess(
    forceRefresh = false,
  ): Promise<DashboardBootstrapResponse> {
    const hasSnapshots = await this.symbolSnapshots.hasAnyRows();
    const isStale = hasSnapshots
      ? !(await this.symbolSnapshots.hasFreshRows())
      : false;
    if (forceRefresh || !hasSnapshots || isStale) {
      void this.refreshSnapshotsFromYahoo();
    }
    const [updatedAt, summary] = await Promise.all([
      this.symbolSnapshots.getLatestUpdatedAt(),
      hasSnapshots ? this.symbolSnapshots.getSummary() : Promise.resolve(null),
    ]);
    return {
      hasSnapshots,
      isRefreshing: this.snapshotRefreshInflight != null,
      isStale,
      updatedAt,
      rowCount: summary?.activeTickers ?? 0,
      summary,
    };
  }

  private emptyRowsResponse<T = TickerRow>(
    updatedAt: string | null,
  ): RowsResponse<T> {
    return { items: [], updatedAt: updatedAt ?? new Date().toISOString() };
  }

  private emptyPaginatedResponse(
    params: { page?: number; pageSize?: number },
    updatedAt: string | null,
  ): PaginatedResponse<TickerRow> {
    const safePageSize = [10, 20, 25, 50, 100].includes(Number(params.pageSize))
      ? Number(params.pageSize)
      : 20;
    const safePage =
      Number(params.page) > 0 ? Math.floor(Number(params.page)) : 1;
    return {
      items: [],
      page: safePage,
      pageSize: safePageSize,
      total: 0,
      totalPages: 1,
      updatedAt: updatedAt ?? new Date().toISOString(),
    };
  }

  private async getRsTrendRowsFromDb(params: {
    country?: string[];
    indexTag?: string[];
    sector?: string[];
    industry?: string[];
    minCap?: number;
    excludeNear52w?: boolean;
    rsMin?: number;
    limit?: number;
  }): Promise<RowsResponse<RsTrendRowDto> | null> {
    const state = await this.ensureSnapshotAccess(false);
    if (!state.hasSnapshots)
      return this.emptyRowsResponse<RsTrendRowDto>(state.updatedAt);
    return this.symbolSnapshots.getRsTrendRows(params);
  }

  private async getVolatilityRelativeRowsFromDb(params: {
    country?: string[];
    indexTag?: string[];
    sector?: string[];
    industry?: string[];
    minCap?: number;
    excludeNear52w?: boolean;
    rsMin?: number;
    limit?: number;
    sort?: 'asc' | 'desc';
    symbols?: string[];
    adrMin?: number;
    adrMax?: number;
  }): Promise<RowsResponse<TickerRow> | null> {
    const state = await this.ensureSnapshotAccess(false);
    if (!state.hasSnapshots) return this.emptyRowsResponse(state.updatedAt);
    return this.symbolSnapshots.getVolatilityRelativeRows(params);
  }

  private async getSemaphorePageFromDb(params: {
    page?: number;
    pageSize?: number;
    country?: string[];
    indexTag?: string[];
    sector?: string[];
    industry?: string[];
    minCap?: number;
    excludeNear52w?: boolean;
    sort?: string;
  }): Promise<PaginatedResponse<TickerRow> | null> {
    const state = await this.ensureSnapshotAccess(false);
    if (!state.hasSnapshots)
      return this.emptyPaginatedResponse(params, state.updatedAt);
    return this.symbolSnapshots.getSemaphorePage(params);
  }

  private async getWarrenPageFromDb(params: {
    page?: number;
    pageSize?: number;
    country?: string[];
    indexTag?: string[];
    sector?: string[];
    industry?: string[];
    minCap?: number;
    excludeNear52w?: boolean;
  }): Promise<PaginatedResponse<TickerRow> | null> {
    const state = await this.ensureSnapshotAccess(false);
    if (!state.hasSnapshots)
      return this.emptyPaginatedResponse(params, state.updatedAt);
    return this.symbolSnapshots.getWarrenPage(params);
  }

  private async getScannerPageFromDb(
    params: {
      page?: number;
      pageSize?: number;
    } & ScannerFilters,
  ): Promise<PaginatedResponse<TickerRow> | null> {
    const state = await this.ensureSnapshotAccess(false);
    if (!state.hasSnapshots)
      return this.emptyPaginatedResponse(params, state.updatedAt);
    return this.symbolSnapshots.getScannerPage(params);
  }

  private async refreshSnapshotsFromYahoo(): Promise<void> {
    if (!this.symbolSnapshots.isEnabled()) return;
    if (this.snapshotRefreshInflight) return this.snapshotRefreshInflight;
    this.snapshotRefreshInflight = this.buildDashboard()
      .then((data) => {
        this.cache = { at: Date.now(), data };
      })
      .catch((error) => {
        this.logger.warn(
          `No se pudieron refrescar snapshots: ${error instanceof Error ? error.message : String(error)}`,
        );
      })
      .finally(() => {
        this.snapshotRefreshInflight = null;
      });
    return this.snapshotRefreshInflight;
  }

  private async buildCarousel(): Promise<CarouselResponse> {
    this.yahooMarket.ensureConfigured();
    const priority = shuffleArray(
      PRIORITY_SYMBOLS.filter((s) => DEFAULT_SYMBOLS.includes(s)),
    );

    const rest = shuffleArray(
      DEFAULT_SYMBOLS.filter((s) => !PRIORITY_SYMBOLS.includes(s)),
    );

    const symbols = [...priority, ...rest]
      .filter((s) => !isCarouselExcludedSymbol(s))
      .slice(0, CAROUSEL_SYMBOL_LIMIT);
    const rows: CarouselRow[] = [];
    const skipped: string[] = [];

    for (let i = 0; i < symbols.length; i += CAROUSEL_BATCH_SIZE) {
      const batch = symbols.slice(i, i + CAROUSEL_BATCH_SIZE);
      const settled = await Promise.allSettled(
        batch.map(async (symbol) => {
          const fund = await this.yahooMarket.quoteFundamentals(symbol);
          if (!fund || fund.regularMarketPrice <= 0) {
            return null;
          }
          return {
            symbol: symbol.toUpperCase(),
            name: fund.name,
            price: fund.regularMarketPrice,
            changePct: fund.changePct,
            marketCap: fund.marketCapUsd,
            website: fund.website,
            logoUrl: fund.logoUrl,
          } satisfies CarouselRow;
        }),
      );

      settled.forEach((result, idx) => {
        const symbol = batch[idx];
        if (result.status === 'fulfilled' && result.value) {
          rows.push(result.value);
        } else {
          skipped.push(symbol);
        }
      });

      if (rows.length >= CAROUSEL_RESULT_LIMIT) {
        break;
      }
    }

    return {
      updatedAt: new Date().toISOString(),
      rows: rows.slice(0, CAROUSEL_RESULT_LIMIT),
      skipped,
    };
  }

  private async buildDashboard(): Promise<DashboardResponse> {
    this.yahooMarket.ensureConfigured();
    const skipped: string[] = [];
    const rows: TickerRow[] = [];
    const now = Math.floor(Date.now() / 1000);
    const from = now - CANDLE_LOOKBACK_DAYS * 86400;

    const snapBuffer: SnapScores[] = [];
    for (let i = 0; i < DEFAULT_SYMBOLS.length; i += DASHBOARD_BATCH_SIZE) {
      const batch = DEFAULT_SYMBOLS.slice(i, i + DASHBOARD_BATCH_SIZE);
      const settled = await Promise.allSettled(
        batch.map(async (symbol) => ({
          symbol,
          built: await this.buildRow(symbol, from, now),
        })),
      );

      settled.forEach((result, idx) => {
        const symbol = batch[idx];
        if (result.status === 'fulfilled' && result.value.built) {
          rows.push(result.value.built.row);
          snapBuffer.push(result.value.built.snaps);
        } else {
          if (result.status === 'rejected') {
            this.logger.warn(
              `Skip ${symbol}: ${result.reason instanceof Error ? result.reason.message : result.reason}`,
            );
          }
          skipped.push(symbol);
        }
      });
    }

    if (rows.length === snapBuffer.length) {
      attachRsRanks(rows, snapBuffer);
    }

    const summary = this.summarize(rows);
    if (this.symbolSnapshots.isEnabled()) {
      try {
        await this.symbolSnapshots.saveRows(rows);
      } catch (error) {
        this.logger.warn(
          `No se pudieron persistir snapshots: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
    return {
      updatedAt: new Date().toISOString(),
      rows,
      summary,
      skipped,
    };
  }

  private async buildRow(
    symbol: string,
    fromUnix: number,
    toUnix: number,
  ): Promise<{ row: TickerRow; snaps: SnapScores } | null> {
    const startDate = new Date(fromUnix * 1000).toISOString().slice(0, 10);
    const endDate = new Date(toUnix * 1000).toISOString().slice(0, 10);
    const candles = await this.yahooMarket.dailyCandles(
      symbol,
      startDate,
      endDate,
    );
    if (candles.s !== 'ok' || !candles.c?.length) {
      return null;
    }
    const fund = await this.yahooMarket.quoteFundamentals(symbol);

    let name = symbol;
    let sector = '—';
    let industry = 'Otros';
    let country = 'USA';
    let indexTag = deriveIndexTag(symbol);
    let marketCap = 0;
    let fundPrice = 0;
    let fundChangePct: number | null = null;
    if (fund) {
      name = fund.name;
      sector = fund.sector;
      industry = normalizeIndustry(fund.industry, fund.sector);
      country = normalizeCountry(fund.country);
      indexTag = deriveIndexTag(symbol);
      marketCap = fund.marketCapUsd;
      fundPrice = fund.regularMarketPrice;
      fundChangePct = fund.changePct;
    }
    if (marketCap <= 0) {
      const yCap = await this.yahooMarket.marketCapUsd(symbol);
      if (yCap != null) {
        marketCap = yCap;
      }
    }
    if (marketCap < MIN_MARKET_CAP_USD) {
      return null;
    }

    const closes = candles.c;
    const highs = candles.h;
    const lows = candles.l;
    const vols = candles.v;
    const n = closes.length;
    const span = Math.min(BARS_52W, n);
    const hiSlice = highs.slice(-span);
    const loSlice = lows.slice(-span);
    const high52 = Math.max(...hiSlice);
    const low52 = Math.min(...loSlice);

    const price = fundPrice > 0 ? fundPrice : (closes[n - 1] ?? 0);
    let changePct: number;
    if (fundChangePct != null && Number.isFinite(fundChangePct)) {
      changePct = fundChangePct;
    } else if (n >= 2 && (closes[n - 2] ?? 0) > 0) {
      changePct = ((closes[n - 1] - closes[n - 2]) / closes[n - 2]) * 100;
    } else {
      changePct = 0;
    }

    if (price <= 0) {
      return null;
    }

    const dist52wPct = high52 > 0 ? ((price - high52) / high52) * 100 : 0;
    const rsNowFromSnap = rsScoreAtEndIdx(highs, lows, closes, n - 1);
    const rsScore =
      rsNowFromSnap != null
        ? rsNowFromSnap
        : high52 > low52
          ? clamp(((price - low52) / (high52 - low52)) * 100, 0, 100)
          : 50;

    const snapOffsets = [20, 15, 10, 5, 0] as const;
    const snapKeys = ['s4', 's3', 's2', 's1', 's0'] as const;
    const snaps: SnapScores = {
      s4: null,
      s3: null,
      s2: null,
      s1: null,
      s0: null,
    };
    for (let i = 0; i < snapOffsets.length; i++) {
      const endIdx = n - 1 - snapOffsets[i];
      const k = snapKeys[i];
      snaps[k] =
        endIdx >= 0 ? rsScoreAtEndIdx(highs, lows, closes, endIdx) : null;
    }

    const volRatioRaw = vol5Vs1yRatio(closes, n - 1);
    const vol5Vs1yRatioVal =
      volRatioRaw != null ? Math.round(volRatioRaw * 10000) / 10000 : null;

    const rsPrevDay =
      n >= 2 ? rsScoreAtEndIdx(highs, lows, closes, n - 2) : null;
    const rsDelta1d =
      rsNowFromSnap != null && rsPrevDay != null
        ? Math.round((rsNowFromSnap - rsPrevDay) * 10) / 10
        : null;
    const rs20dAgo =
      n >= 22 ? rsScoreAtEndIdx(highs, lows, closes, n - 21) : null;
    const rsDelta20d =
      rsNowFromSnap != null && rs20dAgo != null
        ? Math.round((rsNowFromSnap - rs20dAgo) * 10) / 10
        : null;

    const lastVol = vols[n - 1] ?? 0;
    const avgVol20 = (smaLast(vols, 20) ?? lastVol) || 1;
    const volRelative = avgVol20 > 0 ? lastVol / avgVol20 : 1;
    const avgVol5 = smaLast(vols, 5) ?? lastVol;
    const volDevPct5 = avgVol5 > 0 ? (lastVol / avgVol5 - 1) * 100 : 0;
    const unusualVol = volRelative >= 1.5 || volDevPct5 >= 50;
    const volGt08 = volRelative > 0.8;

    const rsi14 = rsiLast(closes, 14);

    const ema20 = emaLast(closes, 20);
    const ema50 = emaLast(closes, 50);
    const ema200 = emaLast(closes, 200);
    const aboveEma20 = ema20 != null ? price >= ema20 : false;
    const aboveEma50 = ema50 != null ? price >= ema50 : false;
    const aboveEma200 = ema200 != null ? price >= ema200 : false;
    const distEma20Pct =
      ema20 != null && ema20 > 0 ? ((price - ema20) / ema20) * 100 : null;
    const distEma50Pct =
      ema50 != null && ema50 > 0 ? ((price - ema50) / ema50) * 100 : null;
    const distEma200Pct =
      ema200 != null && ema200 > 0 ? ((price - ema200) / ema200) * 100 : null;
    const plus25FromLow = low52 > 0 ? (price - low52) / low52 >= 0.25 : false;
    const near52wHigh = dist52wPct >= -5;

    const adrPct = adrPct20(highs, lows, closes);

    const warrenScore = Math.round(
      clamp(
        0.45 * rsScore +
          0.35 * clamp(100 + dist52wPct, 0, 100) +
          0.1 * (aboveEma200 ? 100 : 35) +
          0.1 * (aboveEma50 ? 100 : 35),
        0,
        100,
      ),
    );

    const row: TickerRow = {
      symbol: symbol.toUpperCase(),
      name,
      price,
      changePct,
      marketCap,
      sector,
      industry,
      country,
      indexTag,
      adrPct,
      rsScore: Math.round(rsScore * 10) / 10,
      rsDelta1d,
      rsDelta20d,
      rsi14: rsi14 != null ? Math.round(rsi14 * 10) / 10 : null,
      volDevPct5: Math.round(volDevPct5 * 10) / 10,
      distEma20Pct:
        distEma20Pct != null ? Math.round(distEma20Pct * 100) / 100 : null,
      distEma50Pct:
        distEma50Pct != null ? Math.round(distEma50Pct * 100) / 100 : null,
      distEma200Pct:
        distEma200Pct != null ? Math.round(distEma200Pct * 100) / 100 : null,
      dist52wPct: Math.round(dist52wPct * 100) / 100,
      volRelative: Math.round(volRelative * 100) / 100,
      unusualVol,
      warrenScore,
      aboveEma20,
      aboveEma50,
      aboveEma200,
      plus25FromLow,
      volGt08,
      near52wHigh,
      rsRank4w: null,
      rsRank3w: null,
      rsRank2w: null,
      rsRank1w: null,
      rsRankNow: null,
      vol5Vs1yRatio: vol5Vs1yRatioVal,
    };

    return { row, snaps };
  }

  private summarize(rows: TickerRow[]) {
    const activeTickers = rows.length;
    const aboveEma20Count = rows.filter((r) => r.aboveEma20).length;
    const aboveEma50Count = rows.filter((r) => r.aboveEma50).length;
    const aboveEma200Count = rows.filter((r) => r.aboveEma200).length;
    const rsScoreGt70 = rows.filter((r) => r.rsScore > 70).length;
    const unusualVolToday = rows.filter((r) => r.unusualVol).length;
    const qualityCandidates = rows.filter(
      (r) => r.rsScore > 65 && r.volRelative < 1.15 && r.aboveEma200,
    ).length;
    return {
      activeTickers,
      aboveEma20: aboveEma20Count,
      aboveEma50: aboveEma50Count,
      aboveEma200: aboveEma200Count,
      rsScoreGt70,
      unusualVolToday,
      qualityCandidates,
    };
  }
}
