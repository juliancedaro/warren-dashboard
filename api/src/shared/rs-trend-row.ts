/**
 * Contrato común para ítems de GET /dashboard/rs-trend (`items[]`).
 * El backend usa `TickerRow` completo; este tipo es el subconjunto que consume el FE.
 * Compilación en API: `Pick<TickerRow, keyof RsTrendRowDto>` debe coincidir con `RsTrendRowDto`.
 */
export interface RsTrendRowDto {
  symbol: string;
  rsScore: number;
  rsRank4w: number | null;
  rsRank3w: number | null;
  rsRank2w: number | null;
  rsRank1w: number | null;
  rsRankNow: number | null;
}
