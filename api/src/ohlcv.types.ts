/** Serie diaria OHLCV alineada por índice (dashboard / Yahoo). */
export type OhlcvCandles = {
  s: string;
  t: number[];
  o: number[];
  h: number[];
  l: number[];
  c: number[];
  v: number[];
};
