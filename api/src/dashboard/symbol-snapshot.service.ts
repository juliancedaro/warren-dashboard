import { Injectable, Logger } from '@nestjs/common';
import { Prisma, SymbolSnapshot } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type {
  DashboardSummary,
  PaginatedResponse,
  RowsResponse,
  TickerRow,
} from './dashboard.types';

const SNAPSHOT_FRESH_MS = 5 * 60_000;
const PAGE_SIZE_OPTIONS = [10, 20, 25, 50, 100] as const;
const DEFAULT_PAGE_SIZE = 20;

function normalizePage(page?: number): number {
  const parsed = Number(page);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 1;
}

function normalizePageSize(pageSize?: number): number {
  const parsed = Number(pageSize);
  return (PAGE_SIZE_OPTIONS as readonly number[]).includes(parsed)
    ? parsed
    : DEFAULT_PAGE_SIZE;
}

function toTickerRow(row: SymbolSnapshot): TickerRow {
  return {
    symbol: row.symbol,
    name: row.name,
    price: row.price,
    changePct: row.changePct,
    marketCap: row.marketCap,
    sector: row.sector,
    industry: row.industry,
    country: (row as any).country ?? 'US',
    indexTag: (row as any).indexTag ?? 'SP500',
    adrPct: (row as any).adrPct ?? 0,
    rsScore: row.rsScore,
    rsDelta1d: row.rsDelta1d,
    rsDelta20d: row.rsDelta20d,
    rsi14: row.rsi14,
    volDevPct5: row.volDevPct5,
    distEma20Pct: row.distEma20Pct,
    distEma50Pct: row.distEma50Pct,
    distEma200Pct: row.distEma200Pct,
    dist52wPct: row.dist52wPct,
    volRelative: row.volRelative,
    unusualVol: row.unusualVol,
    warrenScore: row.warrenScore,
    aboveEma20: row.aboveEma20,
    aboveEma50: row.aboveEma50,
    aboveEma200: row.aboveEma200,
    plus25FromLow: row.plus25FromLow,
    volGt08: row.volGt08,
    near52wHigh: row.near52wHigh,
    rsRank4w: row.rsRank4w,
    rsRank3w: row.rsRank3w,
    rsRank2w: row.rsRank2w,
    rsRank1w: row.rsRank1w,
    rsRankNow: row.rsRankNow,
    vol5Vs1yRatio: row.vol5Vs1yRatio,
  };
}

@Injectable()
export class SymbolSnapshotService {
  private readonly logger = new Logger(SymbolSnapshotService.name);

  constructor(private readonly prisma: PrismaService) {}

  isEnabled() {
    return this.prisma.isEnabled();
  }

  async hasAnyRows(): Promise<boolean> {
    if (!this.isEnabled()) return false;
    const count = await this.prisma.symbolSnapshot.count();
    return count > 0;
  }

  async hasFreshRows(maxAgeMs = SNAPSHOT_FRESH_MS): Promise<boolean> {
    if (!this.isEnabled()) return false;
    const latest = await this.prisma.symbolSnapshot.findFirst({
      orderBy: { updatedAt: 'desc' },
      select: { updatedAt: true },
    });
    if (!latest) return false;
    return Date.now() - latest.updatedAt.getTime() < maxAgeMs;
  }

  async getLatestUpdatedAt(): Promise<string | null> {
    if (!this.isEnabled()) return null;
    const latest = await this.prisma.symbolSnapshot.findFirst({
      orderBy: { updatedAt: 'desc' },
      select: { updatedAt: true },
    });
    return latest?.updatedAt.toISOString() ?? null;
  }

  async getAllRows(): Promise<RowsResponse<TickerRow> | null> {
    if (!this.isEnabled()) return null;
    const rows = await this.prisma.symbolSnapshot.findMany({
      orderBy: [{ rsScore: 'desc' }, { symbol: 'asc' }],
    });
    const updatedAt =
      rows[0]?.updatedAt.toISOString() ??
      (await this.getLatestUpdatedAt()) ??
      new Date().toISOString();
    return {
      items: rows.map(toTickerRow),
      updatedAt,
    };
  }

  async getSummary(): Promise<DashboardSummary | null> {
    if (!this.isEnabled()) return null;
    const [
      activeTickers,
      aboveEma20,
      aboveEma50,
      aboveEma200,
      rsScoreGt70,
      unusualVolToday,
      qualityCandidates,
    ] = await this.prisma.$transaction([
      this.prisma.symbolSnapshot.count(),
      this.prisma.symbolSnapshot.count({ where: { aboveEma20: true } }),
      this.prisma.symbolSnapshot.count({ where: { aboveEma50: true } }),
      this.prisma.symbolSnapshot.count({ where: { aboveEma200: true } }),
      this.prisma.symbolSnapshot.count({ where: { rsScore: { gte: 70 } } }),
      this.prisma.symbolSnapshot.count({
        where: { OR: [{ unusualVol: true }, { volDevPct5: { gte: 50 } }] },
      }),
      this.prisma.symbolSnapshot.count({ where: { warrenScore: { gte: 6 } } }),
    ]);
    return {
      activeTickers,
      aboveEma20,
      aboveEma50,
      aboveEma200,
      rsScoreGt70,
      unusualVolToday,
      qualityCandidates,
    };
  }

  async saveRows(rows: TickerRow[]): Promise<void> {
    if (!this.isEnabled() || rows.length === 0) return;
    const batches: TickerRow[][] = [];
    for (let i = 0; i < rows.length; i += 25)
      batches.push(rows.slice(i, i + 25));
    for (const batch of batches) {
      await this.prisma.$transaction(
        batch.flatMap((row) => [
          this.prisma.symbol.upsert({
            where: { symbol: row.symbol },
            create: {
              symbol: row.symbol,
              name: row.name,
              sector: row.sector,
              industry: row.industry,
              country: row.country,
              indexTag: row.indexTag,
              adrPct: row.adrPct,
              isActive: true,
            },
            update: {
              name: row.name,
              sector: row.sector,
              industry: row.industry,
              country: row.country,
              indexTag: row.indexTag,
              adrPct: row.adrPct,
              isActive: true,
            },
          }),
          this.prisma.symbolSnapshot.upsert({
            where: { symbol: row.symbol },
            create: {
              symbol: row.symbol,
              name: row.name,
              sector: row.sector,
              industry: row.industry,
              country: row.country,
              indexTag: row.indexTag,
              adrPct: row.adrPct,
              price: row.price,
              changePct: row.changePct,
              marketCap: row.marketCap,
              rsScore: row.rsScore,
              rsDelta1d: row.rsDelta1d,
              rsDelta20d: row.rsDelta20d,
              rsi14: row.rsi14,
              volDevPct5: row.volDevPct5,
              distEma20Pct: row.distEma20Pct,
              distEma50Pct: row.distEma50Pct,
              distEma200Pct: row.distEma200Pct,
              dist52wPct: row.dist52wPct,
              volRelative: row.volRelative,
              unusualVol: row.unusualVol,
              warrenScore: row.warrenScore,
              aboveEma20: row.aboveEma20,
              aboveEma50: row.aboveEma50,
              aboveEma200: row.aboveEma200,
              plus25FromLow: row.plus25FromLow,
              volGt08: row.volGt08,
              near52wHigh: row.near52wHigh,
              rsRank4w: row.rsRank4w,
              rsRank3w: row.rsRank3w,
              rsRank2w: row.rsRank2w,
              rsRank1w: row.rsRank1w,
              rsRankNow: row.rsRankNow,
              vol5Vs1yRatio: row.vol5Vs1yRatio,
            },
            update: {
              name: row.name,
              sector: row.sector,
              industry: row.industry,
              country: row.country,
              indexTag: row.indexTag,
              adrPct: row.adrPct,
              price: row.price,
              changePct: row.changePct,
              marketCap: row.marketCap,
              rsScore: row.rsScore,
              rsDelta1d: row.rsDelta1d,
              rsDelta20d: row.rsDelta20d,
              rsi14: row.rsi14,
              volDevPct5: row.volDevPct5,
              distEma20Pct: row.distEma20Pct,
              distEma50Pct: row.distEma50Pct,
              distEma200Pct: row.distEma200Pct,
              dist52wPct: row.dist52wPct,
              volRelative: row.volRelative,
              unusualVol: row.unusualVol,
              warrenScore: row.warrenScore,
              aboveEma20: row.aboveEma20,
              aboveEma50: row.aboveEma50,
              aboveEma200: row.aboveEma200,
              plus25FromLow: row.plus25FromLow,
              volGt08: row.volGt08,
              near52wHigh: row.near52wHigh,
              rsRank4w: row.rsRank4w,
              rsRank3w: row.rsRank3w,
              rsRank2w: row.rsRank2w,
              rsRank1w: row.rsRank1w,
              rsRankNow: row.rsRankNow,
              vol5Vs1yRatio: row.vol5Vs1yRatio,
            },
          }),
        ]),
      );
    }
  }

  private buildWhere(filters: {
    sector?: string[];
    minCap?: number;
    excludeNear52w?: boolean;
    rsMin?: number;
    volRelMax?: number;
    rsiMin?: number;
    rsiMax?: number;
    onlyUnusualVol?: boolean;
    symbols?: string[];
    country?: string[];
    indexTag?: string[];
    industry?: string[];
  }): Prisma.SymbolSnapshotWhereInput {
    const where: Prisma.SymbolSnapshotWhereInput = {};
    if (filters.symbols?.length)
      where.symbol = { in: filters.symbols.map((item) => item.toUpperCase()) };
    if (filters.sector?.length) where.sector = { in: filters.sector };
    if (filters.country?.length) where.country = { in: filters.country };
    if (filters.indexTag?.length) where.indexTag = { in: filters.indexTag };
    if (filters.industry?.length) where.industry = { in: filters.industry };
    if (Number.isFinite(filters.minCap) && (filters.minCap ?? 0) > 0)
      where.marketCap = { gte: filters.minCap! };
    if (filters.excludeNear52w) where.near52wHigh = false;
    if (Number.isFinite(filters.rsMin))
      where.rsScore = {
        ...((where.rsScore as object) || {}),
        gte: filters.rsMin!,
      };
    if (Number.isFinite(filters.volRelMax))
      where.volRelative = { lte: filters.volRelMax! + 1e-9 };
    const lo = Math.min(filters.rsiMin ?? 0, filters.rsiMax ?? 100);
    const hi = Math.max(filters.rsiMin ?? 0, filters.rsiMax ?? 100);
    if (!(lo <= 0 && hi >= 100)) where.rsi14 = { gte: lo, lte: hi };
    if (filters.onlyUnusualVol) {
      where.OR = [{ unusualVol: true }, { volDevPct5: { gte: 50 } }];
    }
    return where;
  }

  async getSemaphorePage(params: {
    page?: number;
    pageSize?: number;
    sector?: string[];
    industry?: string[];
    minCap?: number;
    excludeNear52w?: boolean;
    symbols?: string[];
    sort?: string;
    country?: string[];
    indexTag?: string[];
  }): Promise<PaginatedResponse<TickerRow> | null> {
    if (!this.isEnabled()) return null;
    const safePage = normalizePage(params.page);
    const safePageSize = normalizePageSize(params.pageSize);
    const where = this.buildWhere(params);
    const orderBy: Prisma.SymbolSnapshotOrderByWithRelationInput[] =
      params.sort === 'change'
        ? [{ changePct: 'desc' }, { symbol: 'asc' }]
        : params.sort === 'sym'
          ? [{ symbol: 'asc' }]
          : [{ rsScore: 'desc' }, { symbol: 'asc' }];
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.symbolSnapshot.count({ where }),
      this.prisma.symbolSnapshot.findMany({
        where,
        orderBy,
        skip: (safePage - 1) * safePageSize,
        take: safePageSize,
      }),
    ]);
    const totalPages = Math.max(1, Math.ceil(total / safePageSize));
    const updatedAtRow =
      rows[0] ??
      (await this.prisma.symbolSnapshot.findFirst({
        orderBy: { updatedAt: 'desc' },
      }));
    return {
      items: rows.map(toTickerRow),
      page: Math.min(safePage, totalPages),
      pageSize: safePageSize,
      total,
      totalPages,
      updatedAt:
        updatedAtRow?.updatedAt.toISOString() ?? new Date().toISOString(),
    };
  }

  async getWarrenPage(params: {
    page?: number;
    pageSize?: number;
    sector?: string[];
    industry?: string[];
    minCap?: number;
    excludeNear52w?: boolean;
    symbols?: string[];
    country?: string[];
    indexTag?: string[];
  }): Promise<PaginatedResponse<TickerRow> | null> {
    if (!this.isEnabled()) return null;
    const safePage = normalizePage(params.page);
    const safePageSize = normalizePageSize(params.pageSize);
    const where = this.buildWhere(params);
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.symbolSnapshot.count({ where }),
      this.prisma.symbolSnapshot.findMany({
        where,
        orderBy: [
          { warrenScore: 'desc' },
          { rsScore: 'desc' },
          { symbol: 'asc' },
        ],
        skip: (safePage - 1) * safePageSize,
        take: safePageSize,
      }),
    ]);
    const totalPages = Math.max(1, Math.ceil(total / safePageSize));
    const updatedAtRow =
      rows[0] ??
      (await this.prisma.symbolSnapshot.findFirst({
        orderBy: { updatedAt: 'desc' },
      }));
    return {
      items: rows.map(toTickerRow),
      page: Math.min(safePage, totalPages),
      pageSize: safePageSize,
      total,
      totalPages,
      updatedAt:
        updatedAtRow?.updatedAt.toISOString() ?? new Date().toISOString(),
    };
  }

  async getRsTrendRows(params: {
    country?: string[];
    indexTag?: string[];
    sector?: string[];
    industry?: string[];
    minCap?: number;
    excludeNear52w?: boolean;
    rsMin?: number;
    limit?: number;
    symbols?: string[];
  }): Promise<RowsResponse<TickerRow> | null> {
    if (!this.isEnabled()) return null;
    const limit = Math.max(1, Math.min(100, Number(params.limit) || 20));
    const where = this.buildWhere(params);
    if (Number.isFinite(params.rsMin))
      where.rsScore = {
        ...((where.rsScore as object) || {}),
        gte: params.rsMin!,
      };
    const rows = await this.prisma.symbolSnapshot.findMany({
      where,
      orderBy: [{ rsRankNow: 'asc' }, { rsScore: 'desc' }, { symbol: 'asc' }],
      take: limit,
    });
    const updatedAtRow =
      rows[0] ??
      (await this.prisma.symbolSnapshot.findFirst({
        orderBy: { updatedAt: 'desc' },
      }));
    return {
      items: rows.map(toTickerRow),
      updatedAt:
        updatedAtRow?.updatedAt.toISOString() ?? new Date().toISOString(),
    };
  }

  async getVolatilityRelativeRows(params: {
    country?: string[];
    indexTag?: string[];
    sector?: string[];
    industry?: string[];
    minCap?: number;
    excludeNear52w?: boolean;
    rsMin?: number;
    limit?: number;
    symbols?: string[];
    sort?: 'asc' | 'desc';
  }): Promise<RowsResponse<TickerRow> | null> {
    if (!this.isEnabled()) return null;
    const limit = Math.max(1, Math.min(100, Number(params.limit) || 30));
    const where = this.buildWhere(params);
    if (Number.isFinite(params.rsMin))
      where.rsScore = {
        ...((where.rsScore as object) || {}),
        gte: params.rsMin!,
      };
    where.vol5Vs1yRatio = { not: null };
    const direction = params.sort === 'desc' ? 'desc' : 'asc';
    const rows = await this.prisma.symbolSnapshot.findMany({
      where,
      orderBy: [{ vol5Vs1yRatio: direction }, { symbol: 'asc' }],
      take: limit,
    });
    const updatedAtRow =
      rows[0] ??
      (await this.prisma.symbolSnapshot.findFirst({
        orderBy: { updatedAt: 'desc' },
      }));
    return {
      items: rows.map(toTickerRow),
      updatedAt:
        updatedAtRow?.updatedAt.toISOString() ?? new Date().toISOString(),
    };
  }

  async getScannerPage(params: {
    page?: number;
    pageSize?: number;
    country?: string[];
    indexTag?: string[];
    sector?: string[];
    industry?: string[];
    minCap?: number;
    excludeNear52w?: boolean;
    symbols?: string[];
    rsMin?: number;
    volRelMax?: number;
    rsiMin?: number;
    rsiMax?: number;
    onlyUnusualVol?: boolean;
  }): Promise<PaginatedResponse<TickerRow> | null> {
    if (!this.isEnabled()) return null;
    const safePage = normalizePage(params.page);
    const safePageSize = normalizePageSize(params.pageSize);
    const where = this.buildWhere(params);
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.symbolSnapshot.count({ where }),
      this.prisma.symbolSnapshot.findMany({
        where,
        orderBy: [{ rsScore: 'desc' }, { symbol: 'asc' }],
        skip: (safePage - 1) * safePageSize,
        take: safePageSize,
      }),
    ]);
    const totalPages = Math.max(1, Math.ceil(total / safePageSize));
    const updatedAtRow =
      rows[0] ??
      (await this.prisma.symbolSnapshot.findFirst({
        orderBy: { updatedAt: 'desc' },
      }));
    return {
      items: rows.map(toTickerRow),
      page: Math.min(safePage, totalPages),
      pageSize: safePageSize,
      total,
      totalPages,
      updatedAt:
        updatedAtRow?.updatedAt.toISOString() ?? new Date().toISOString(),
    };
  }
}
