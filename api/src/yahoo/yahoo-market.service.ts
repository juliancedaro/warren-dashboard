import { Injectable, Logger } from '@nestjs/common';
import YahooFinance from 'yahoo-finance2';
import type { OhlcvCandles } from '../ohlcv.types';

function num(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function normalizeYahooSymbol(symbol: string): string {
  const sym = symbol.trim().toUpperCase();
  const map: Record<string, string> = {
    'BRK.B': 'BRK-B',
    'BRK.A': 'BRK-A',
    'BF.B': 'BF-B',
    'BF.A': 'BF-A',
  };
  return map[sym] ?? sym;
}

function websiteToLogoUrl(website?: string | null): string | null {
  if (!website || typeof website !== 'string') return null;
  try {
    const url = new URL(website.startsWith('http') ? website : `https://${website}`);
    const host = url.hostname.replace(/^www\./, '');
    if (!host) return null;
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=128`;
  } catch {
    return null;
  }
}

const QUOTE_CACHE_MS = 3 * 60_000;
const MARKET_CAP_CACHE_MS = 5 * 60_000;
const CANDLES_CACHE_MS = 10 * 60_000;
const MAX_CACHE_ENTRIES = 2000;

type CacheEntry<T> = { at: number; value: T };

export type YahooFundamentals = {
  name: string;
  sector: string;
  industry: string;
  country: string | null;
  website: string | null;
  logoUrl: string | null;
  marketCapUsd: number;
  regularMarketPrice: number;
  /** Variación % sesión (vs cierre previo) */
  changePct: number;
};

@Injectable()
export class YahooMarketService {
  private readonly logger = new Logger(YahooMarketService.name);
  private readonly yf = new YahooFinance({
    suppressNotices: ['yahooSurvey', 'ripHistorical'],
  });

  private readonly quoteCache = new Map<string, CacheEntry<YahooFundamentals | null>>();
  private readonly marketCapCache = new Map<string, CacheEntry<number | null>>();
  private readonly candlesCache = new Map<string, CacheEntry<OhlcvCandles>>();

  private readonly quoteInflight = new Map<string, Promise<YahooFundamentals | null>>();
  private readonly marketCapInflight = new Map<string, Promise<number | null>>();
  private readonly candlesInflight = new Map<string, Promise<OhlcvCandles>>();

  ensureConfigured(): void {}

  private getCached<T>(cache: Map<string, CacheEntry<T>>, key: string, ttlMs: number): T | null {
    const hit = cache.get(key);
    if (!hit) return null;
    if (Date.now() - hit.at >= ttlMs) {
      cache.delete(key);
      return null;
    }
    return hit.value;
  }

  private setCached<T>(cache: Map<string, CacheEntry<T>>, key: string, value: T): void {
    cache.set(key, { at: Date.now(), value });
    if (cache.size <= MAX_CACHE_ENTRIES) return;
    const oldestKey = cache.keys().next().value;
    if (oldestKey) cache.delete(oldestKey);
  }

  /** Market cap USD desde `quote` (fallback). */
  async marketCapUsd(symbol: string): Promise<number | null> {
    const sym = normalizeYahooSymbol(symbol);
    const cached = this.getCached(this.marketCapCache, sym, MARKET_CAP_CACHE_MS);
    if (cached !== null) {
      return cached;
    }
    const existing = this.marketCapInflight.get(sym);
    if (existing) {
      return existing;
    }

    const promise = (async () => {
      try {
        const q = await this.yf.quote(sym);
        const row = Array.isArray(q) ? q[0] : q;
        if (!row || typeof row !== 'object') {
          this.setCached(this.marketCapCache, sym, null);
          return null;
        }
        const mc = (row as { marketCap?: number }).marketCap;
        const value = typeof mc === 'number' && Number.isFinite(mc) && mc > 0
          ? mc
          : null;
        this.setCached(this.marketCapCache, sym, value);
        return value;
      } catch {
        this.setCached(this.marketCapCache, sym, null);
        return null;
      }
    })().finally(() => {
      this.marketCapInflight.delete(sym);
    });

    this.marketCapInflight.set(sym, promise);
    return promise;
  }

  /**
   * Nombre, sector GICS, industria, cap, precio y var. % vía `quote` + `quoteSummary`.
   */
  async quoteFundamentals(
    symbol: string,
  ): Promise<YahooFundamentals | null> {
    const sym = normalizeYahooSymbol(symbol);
    const cached = this.getCached(this.quoteCache, sym, QUOTE_CACHE_MS);
    if (cached !== null) {
      return cached;
    }
    const existing = this.quoteInflight.get(sym);
    if (existing) {
      return existing;
    }

    const promise = (async () => {
      try {
        const [q, sum] = await Promise.all([
          this.yf.quote(sym),
          this.yf.quoteSummary(sym, {
            modules: ['summaryProfile', 'summaryDetail', 'price'],
          }),
        ]);
        const row = Array.isArray(q) ? q[0] : q;
        if (!row || typeof row !== 'object') {
          this.setCached(this.quoteCache, sym, null);
          return null;
        }
        const r = row as Record<string, unknown>;
        const profile = sum.summaryProfile;
        const name = String(r.shortName || r.longName || sym).trim() || sym;
        const sector = String(profile?.sector ?? 'Otros');
        const industry = String(profile?.industry ?? sector ?? 'Otros');
        const website = typeof profile?.website === 'string' ? profile.website : null;
        const country = typeof profile?.country === 'string' ? profile.country : null;
        const logoUrl = websiteToLogoUrl(website);
        let mc = num(r.marketCap);
        if (mc <= 0) {
          mc = num(sum.summaryDetail?.marketCap);
        }
        let last = num(r.regularMarketPrice);
        if (last <= 0) {
          last = num(
            (sum.price as { regularMarketPrice?: number } | undefined)
              ?.regularMarketPrice,
          );
        }
        let prev = num(r.regularMarketPreviousClose);
        if (prev <= 0) {
          prev = num(
            (sum.price as { regularMarketPreviousClose?: number } | undefined)
              ?.regularMarketPreviousClose,
          );
        }
        let changePct = 0;
        if (last > 0 && prev > 0) {
          changePct = ((last - prev) / prev) * 100;
        }
        const value = {
          name,
          sector,
          industry,
          country,
          website,
          logoUrl,
          marketCapUsd: mc,
          regularMarketPrice: last,
          changePct,
        } satisfies YahooFundamentals;
        this.setCached(this.quoteCache, sym, value);
        return value;
      } catch (e) {
        this.logger.warn(
          `quoteFundamentals ${sym}: ${e instanceof Error ? e.message : e}`,
        );
        this.setCached(this.quoteCache, sym, null);
        return null;
      }
    })().finally(() => {
      this.quoteInflight.delete(sym);
    });

    this.quoteInflight.set(sym, promise);
    return promise;
  }

  /**
   * Velas diarias vía Yahoo (`chart`).
   */
  async dailyCandles(
    symbol: string,
    startDate: string,
    endDate: string,
  ): Promise<OhlcvCandles> {
    const sym = normalizeYahooSymbol(symbol);
    const cacheKey = `${sym}:${startDate}:${endDate}`;
    const cached = this.getCached(this.candlesCache, cacheKey, CANDLES_CACHE_MS);
    if (cached) {
      return cached;
    }
    const existing = this.candlesInflight.get(cacheKey);
    if (existing) {
      return existing;
    }

    const promise = (async () => {
      try {
        const chartResult = await (this.yf.chart as any)(
          sym,
          {
            period1: startDate,
            period2: endDate,
            interval: '1d',
            return: 'array',
          },
          {
            validateResult: false,
          },
        );
        const quotes = Array.isArray(chartResult?.quotes)
          ? chartResult.quotes
          : [];
        if (quotes.length === 0) {
          const empty = { s: 'no_data', t: [], o: [], h: [], l: [], c: [], v: [] } satisfies OhlcvCandles;
          this.setCached(this.candlesCache, cacheKey, empty);
          return empty;
        }
        const t: number[] = [];
        const o: number[] = [];
        const h: number[] = [];
        const l: number[] = [];
        const c: number[] = [];
        const v: number[] = [];
        for (const row of quotes) {
          if (!row?.date) continue;
          const closePx = row.adjclose ?? row.close;
          if (closePx == null) continue;
          const hi = row.high ?? closePx;
          const lo = row.low ?? closePx;
          const op = row.open ?? closePx;
          t.push(Math.floor(new Date(row.date).getTime() / 1000));
          c.push(closePx);
          o.push(op);
          h.push(hi);
          l.push(lo);
          v.push(row.volume ?? 0);
        }
        if (t.length === 0) {
          const empty = { s: 'no_data', t: [], o: [], h: [], l: [], c: [], v: [] } satisfies OhlcvCandles;
          this.setCached(this.candlesCache, cacheKey, empty);
          return empty;
        }
        const value = { s: 'ok', t, o, h, l, c, v } satisfies OhlcvCandles;
        this.setCached(this.candlesCache, cacheKey, value);
        return value;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        this.logger.warn(`Yahoo Finance chart ${sym}: ${msg}`);
        const err = new Error('YAHOO_FINANCE_UPSTREAM');
        (err as Error & { detail?: string }).detail = msg;
        throw err;
      }
    })().finally(() => {
      this.candlesInflight.delete(cacheKey);
    });

    this.candlesInflight.set(cacheKey, promise);
    return promise;
  }

  clearCache(): void {
    this.quoteCache.clear();
    this.marketCapCache.clear();
    this.candlesCache.clear();
    this.quoteInflight.clear();
    this.marketCapInflight.clear();
    this.candlesInflight.clear();
  }
}
