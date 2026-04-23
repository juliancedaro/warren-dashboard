export type HeatmapCell = {
  symbol: string;
  name: string;
  sector: string;
  industry: string;
  website: string | null;
  logoUrl: string | null;
  marketCap: number;
  changePct: number;
  adrPct: number;
  price: number;
};

export type HeatmapResponse = {
  updatedAt: string;
  cells: HeatmapCell[];
  scanned: number;
  matched: number;
  skipped: string[];
  filters: {
    minCapUsd: number;
    maxCapUsd: number;
    minAdrPct: number;
    maxAdrPct: number;
    adrSessions: number;
    universeSize: number;
  };
};
