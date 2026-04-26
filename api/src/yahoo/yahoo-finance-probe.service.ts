import { Injectable } from '@nestjs/common';
import YahooFinance from 'yahoo-finance2';

/** Promedio (H−L)/close en las últimas N ruedas con datos. */
function adrPctFromRows(
  rows: { high: number; low: number; close: number }[],
  sessions: number,
): number | null {
  if (rows.length < sessions) return null;
  const slice = rows.slice(-sessions);
  let sum = 0;
  let n = 0;
  for (const r of slice) {
    if (r.close <= 0) continue;
    sum += ((r.high - r.low) / r.close) * 100;
    n++;
  }
  return n > 0 ? sum / n : null;
}

@Injectable()
export class YahooFinanceProbeService {
  private readonly yf = new YahooFinance({
    suppressNotices: ['yahooSurvey', 'ripHistorical'],
  });

  /**
   * Respuesta compacta para explorar qué devuelve Yahoo (sin API key).
   * No usar como fuente única en producción (sin SLA, puede cambiar).
   */
  async probe(symbol: string) {
    const sym = symbol.trim().toUpperCase();
    const period2 = new Date();
    const period1 = new Date();
    period1.setDate(period1.getDate() - 45);

    const p1 = period1.toISOString().slice(0, 10);
    const p2 = period2.toISOString().slice(0, 10);

    const quote = (await this.yf.quote(sym)) as unknown;
    const q: unknown = Array.isArray(quote)
      ? (quote as readonly unknown[])[0]
      : quote;

    const chartResult = await this.yf.chart(sym, {
      period1: p1,
      period2: p2,
      interval: '1d',
    });

    const summary = await this.yf.quoteSummary(sym, {
      modules: ['summaryDetail', 'summaryProfile', 'price'],
    });

    const rawQuotes = chartResult.quotes ?? [];
    const hist: { date: Date; high: number; low: number; close: number }[] = [];
    for (const row of rawQuotes) {
      if (
        row.close == null ||
        row.high == null ||
        row.low == null ||
        !row.date
      ) {
        continue;
      }
      hist.push({
        date: row.date,
        high: row.high,
        low: row.low,
        close: row.close,
      });
    }

    const adr20 = adrPctFromRows(hist, 20);

    return {
      symbol: sym,
      source: 'yahoo-finance2 (no oficial; datos vía Yahoo)',
      quote: this.pickQuote(q),
      historical: {
        period1: p1,
        period2: p2,
        rows: hist.length,
        last5: hist.slice(-5).map((r) => ({
          date: r.date.toISOString().slice(0, 10),
          high: r.high,
          low: r.low,
          close: r.close,
        })),
      },
      derived: {
        adrPct20d: adr20 != null ? Math.round(adr20 * 100) / 100 : null,
      },
      quoteSummary: {
        sector: summary.summaryProfile?.sector,
        industry: summary.summaryProfile?.industry,
        marketCap: summary.summaryDetail?.marketCap,
        previousClose: summary.price?.regularMarketPreviousClose,
      },
    };
  }

  private pickQuote(q: unknown) {
    if (!q || typeof q !== 'object') return null;
    const o = q as Record<string, unknown>;
    return {
      symbol: o.symbol,
      shortName: o.shortName,
      currency: o.currency,
      regularMarketPrice: o.regularMarketPrice,
      regularMarketChange: o.regularMarketChange,
      regularMarketChangePercent: o.regularMarketChangePercent,
      marketState: o.marketState,
      exchange: o.fullExchangeName ?? o.exchange,
      quoteType: o.quoteType,
      marketCap: o.marketCap,
    };
  }
}
