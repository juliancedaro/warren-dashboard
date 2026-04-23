import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { HeatmapCell, HeatmapResponse } from './heatmap.types';

const HEATMAP_CACHE_MS = 300_000;
const MIN_CAP_USD = 50e9;
const MAX_CAP_USD = 2e12;
const MIN_ADR_PCT = 2;
const MAX_ADR_PCT = 4;
const HEATMAP_ROW_LIMIT = 100;

function round2(value: number | null | undefined): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

@Injectable()
export class HeatmapService {
  private readonly logger = new Logger(HeatmapService.name);
  private cache = new Map<string, { at: number; data: HeatmapResponse }>();
  private inflight = new Map<string, Promise<HeatmapResponse>>();

  constructor(private readonly prisma: PrismaService) {}

  async getHeatmap(forceRefresh = false, symbols?: string[]): Promise<HeatmapResponse> {
    const key = symbols?.length ? symbols.join(',') : '__all__';
    const cached = this.cache.get(key);
    if (!forceRefresh && cached && Date.now() - cached.at < HEATMAP_CACHE_MS) {
      return cached.data;
    }
    const inflight = this.inflight.get(key);
    if (inflight) return inflight;

    const next = this.buildHeatmap(symbols)
      .then((data) => {
        this.cache.set(key, { at: Date.now(), data });
        return data;
      })
      .finally(() => {
        this.inflight.delete(key);
      });

    this.inflight.set(key, next);
    return next;
  }

  private async buildHeatmap(symbols?: string[]): Promise<HeatmapResponse> {
    if (!this.prisma.isEnabled()) {
      return this.emptyResponse();
    }

    const snapshotRows = await this.prisma.symbolSnapshot.findMany({
      where: {
        marketCap: { gte: MIN_CAP_USD, lte: MAX_CAP_USD },
        ...(symbols?.length ? { symbol: { in: symbols.map((item) => item.toUpperCase()) } } : {}),
      },
      orderBy: [{ marketCap: 'desc' }, { symbol: 'asc' }],
      take: HEATMAP_ROW_LIMIT,
      select: {
        symbol: true,
        name: true,
        sector: true,
        industry: true,
        website: true,
        logoUrl: true,
        marketCap: true,
        changePct: true,
        price: true,
        adrPct: true,
        updatedAt: true,
      },
    });

    if (!snapshotRows.length) {
      return this.emptyResponse();
    }

    const preferred = snapshotRows.filter((row) => {
      const adrPct = Number(row.adrPct ?? 0);
      return Number.isFinite(adrPct) && adrPct >= MIN_ADR_PCT && adrPct <= MAX_ADR_PCT;
    });

    const rowsForHeatmap = preferred.length >= 24 ? preferred : snapshotRows;

    const cells: HeatmapCell[] = rowsForHeatmap.map((row) => ({
      symbol: row.symbol.toUpperCase(),
      name: row.name,
      sector: row.sector,
      industry: row.industry || row.sector || 'Otros',
      website: row.website,
      logoUrl: row.logoUrl,
      marketCap: row.marketCap,
      changePct: round2(row.changePct),
      adrPct: round2(row.adrPct),
      price: round2(row.price),
    }));

    const updatedAt = snapshotRows[0]?.updatedAt?.toISOString() ?? new Date().toISOString();

    this.logger.debug(`Heatmap served from snapshots: ${cells.length} rows`);

    return {
      updatedAt,
      cells,
      scanned: snapshotRows.length,
      matched: cells.length,
      skipped: [],
      filters: {
        minCapUsd: MIN_CAP_USD,
        maxCapUsd: MAX_CAP_USD,
        minAdrPct: MIN_ADR_PCT,
        maxAdrPct: MAX_ADR_PCT,
        adrSessions: 20,
        universeSize: snapshotRows.length,
      },
    };
  }

  private emptyResponse(): HeatmapResponse {
    return {
      updatedAt: new Date().toISOString(),
      cells: [],
      scanned: 0,
      matched: 0,
      skipped: [],
      filters: {
        minCapUsd: MIN_CAP_USD,
        maxCapUsd: MAX_CAP_USD,
        minAdrPct: MIN_ADR_PCT,
        maxAdrPct: MAX_ADR_PCT,
        adrSessions: 20,
        universeSize: 0,
      },
    };
  }
}
