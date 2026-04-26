import { BadGatewayException, Controller, Get, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { HeatmapService } from './heatmap.service';

function parseList(
  input?: string,
  mode: 'upper' | 'raw' = 'raw',
): string[] | undefined {
  if (!input) return undefined;
  const list = input
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => (mode === 'upper' ? item.toUpperCase() : item));
  return list.length ? list : undefined;
}

function parseSymbols(input?: string): string[] | undefined {
  if (!input) return undefined;
  return parseList(input, 'upper');
}

function parseOptionalNum(v?: string): number | undefined {
  if (v == null || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

@Controller('dashboard')
export class DashboardController {
  constructor(
    private readonly dashboard: DashboardService,
    private readonly heatmap: HeatmapService,
  ) {}

  @Get('bootstrap')
  async getBootstrap(
    @Query('refresh') refresh?: string,
  ): Promise<Awaited<ReturnType<DashboardService['getBootstrap']>>> {
    return this.dashboard.getBootstrap(refresh === '1' || refresh === 'true');
  }

  @Get('carousel')
  async getCarousel(
    @Query('refresh') refresh?: string,
  ): Promise<Awaited<ReturnType<DashboardService['getCarousel']>>> {
    try {
      return await this.dashboard.getCarousel(
        refresh === '1' || refresh === 'true',
      );
    } catch (e) {
      if (e instanceof Error && e.message === 'YAHOO_FINANCE_UPSTREAM') {
        const extra = e as Error & { detail?: string };
        throw new BadGatewayException({
          message: 'Yahoo Finance no devolvió datos (límite, símbolo o red)',
          detail: extra.detail,
        });
      }
      throw e;
    }
  }

  @Get('rs-trend')
  async getRsTrend(
    @Query('country') country?: string,
    @Query('indexTag') indexTag?: string,
    @Query('sector') sector?: string,
    @Query('industry') industry?: string,
    @Query('minCap') minCap?: string,
    @Query('excludeNear52w') excludeNear52w?: string,
    @Query('rsMin') rsMin?: string,
    @Query('limit') limit?: string,
    @Query('symbols') symbols?: string,
  ) {
    return this.dashboard.getRsTrend({
      country: parseList(country),
      indexTag: parseList(indexTag),
      sector: parseList(sector),
      industry: parseList(industry),
      minCap: Number(minCap),
      excludeNear52w: excludeNear52w === '1' || excludeNear52w === 'true',
      rsMin: Number(rsMin),
      limit: Number(limit),
      symbols: parseSymbols(symbols),
    });
  }

  @Get('volatility-relative')
  async getVolatilityRelative(
    @Query('country') country?: string,
    @Query('indexTag') indexTag?: string,
    @Query('sector') sector?: string,
    @Query('industry') industry?: string,
    @Query('minCap') minCap?: string,
    @Query('excludeNear52w') excludeNear52w?: string,
    @Query('rsMin') rsMin?: string,
    @Query('limit') limit?: string,
    @Query('sort') sort?: string,
    @Query('symbols') symbols?: string,
    @Query('adrMin') adrMin?: string,
    @Query('adrMax') adrMax?: string,
  ) {
    return this.dashboard.getVolatilityRelative({
      country: parseList(country),
      indexTag: parseList(indexTag),
      sector: parseList(sector),
      industry: parseList(industry),
      minCap: Number(minCap),
      excludeNear52w: excludeNear52w === '1' || excludeNear52w === 'true',
      rsMin: Number(rsMin),
      limit: Number(limit),
      sort: sort === 'desc' ? 'desc' : 'asc',
      symbols: parseSymbols(symbols),
      adrMin: parseOptionalNum(adrMin),
      adrMax: parseOptionalNum(adrMax),
    });
  }

  @Get('semaphore')
  async getSemaphore(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('country') country?: string,
    @Query('indexTag') indexTag?: string,
    @Query('sector') sector?: string,
    @Query('industry') industry?: string,
    @Query('minCap') minCap?: string,
    @Query('excludeNear52w') excludeNear52w?: string,
    @Query('sort') sort?: string,
    @Query('symbols') symbols?: string,
  ) {
    return this.dashboard.getSemaphorePage({
      page: Number(page),
      pageSize: Number(pageSize),
      country: parseList(country),
      indexTag: parseList(indexTag),
      sector: parseList(sector),
      industry: parseList(industry),
      minCap: Number(minCap),
      excludeNear52w: excludeNear52w === '1' || excludeNear52w === 'true',
      sort,
      symbols: parseSymbols(symbols),
    });
  }

  @Get('scanner')
  async getScanner(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('country') country?: string,
    @Query('indexTag') indexTag?: string,
    @Query('sector') sector?: string,
    @Query('industry') industry?: string,
    @Query('minCap') minCap?: string,
    @Query('excludeNear52w') excludeNear52w?: string,
    @Query('rsMin') rsMin?: string,
    @Query('volRelMax') volRelMax?: string,
    @Query('rsiMin') rsiMin?: string,
    @Query('rsiMax') rsiMax?: string,
    @Query('onlyUnusualVol') onlyUnusualVol?: string,
    @Query('symbols') symbols?: string,
  ) {
    return this.dashboard.getScannerPage({
      page: Number(page),
      pageSize: Number(pageSize),
      country: parseList(country),
      indexTag: parseList(indexTag),
      sector: parseList(sector),
      industry: parseList(industry),
      minCap: Number(minCap),
      excludeNear52w: excludeNear52w === '1' || excludeNear52w === 'true',
      rsMin: Number(rsMin),
      volRelMax: Number(volRelMax),
      rsiMin: Number(rsiMin),
      rsiMax: Number(rsiMax),
      onlyUnusualVol: onlyUnusualVol === '1' || onlyUnusualVol === 'true',
      symbols: parseSymbols(symbols),
    });
  }

  @Get('warren')
  async getWarren(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('country') country?: string,
    @Query('indexTag') indexTag?: string,
    @Query('sector') sector?: string,
    @Query('industry') industry?: string,
    @Query('minCap') minCap?: string,
    @Query('excludeNear52w') excludeNear52w?: string,
    @Query('symbols') symbols?: string,
  ) {
    return this.dashboard.getWarrenPage({
      page: Number(page),
      pageSize: Number(pageSize),
      country: parseList(country),
      indexTag: parseList(indexTag),
      sector: parseList(sector),
      industry: parseList(industry),
      minCap: Number(minCap),
      excludeNear52w: excludeNear52w === '1' || excludeNear52w === 'true',
      symbols: parseSymbols(symbols),
    });
  }

  @Get('table')
  async getTable(
    @Query('refresh') refresh?: string,
  ): Promise<Awaited<ReturnType<DashboardService['getDashboard']>>> {
    try {
      return await this.dashboard.getDashboard(
        refresh === '1' || refresh === 'true',
      );
    } catch (e) {
      if (e instanceof Error && e.message === 'YAHOO_FINANCE_UPSTREAM') {
        const extra = e as Error & { detail?: string };
        throw new BadGatewayException({
          message: 'Yahoo Finance no devolvió datos (límite, símbolo o red)',
          detail: extra.detail,
        });
      }
      throw e;
    }
  }

  @Get()
  async get(
    @Query('refresh') refresh?: string,
  ): Promise<Awaited<ReturnType<DashboardService['getDashboard']>>> {
    try {
      return await this.dashboard.getDashboard(
        refresh === '1' || refresh === 'true',
      );
    } catch (e) {
      if (e instanceof Error && e.message === 'YAHOO_FINANCE_UPSTREAM') {
        const extra = e as Error & { detail?: string };
        throw new BadGatewayException({
          message: 'Yahoo Finance no devolvió datos (límite, símbolo o red)',
          detail: extra.detail,
        });
      }
      throw e;
    }
  }

  @Get('heatmap')
  async getHeatmap(
    @Query('refresh') refresh?: string,
    @Query('symbols') symbols?: string,
  ): Promise<Awaited<ReturnType<HeatmapService['getHeatmap']>>> {
    try {
      return await this.heatmap.getHeatmap(
        refresh === '1' || refresh === 'true',
        parseSymbols(symbols),
      );
    } catch (e) {
      if (e instanceof Error && e.message === 'YAHOO_FINANCE_UPSTREAM') {
        const extra = e as Error & { detail?: string };
        throw new BadGatewayException({
          message: 'Yahoo Finance no devolvió datos (límite, símbolo o red)',
          detail: extra.detail,
        });
      }
      throw e;
    }
  }
}
