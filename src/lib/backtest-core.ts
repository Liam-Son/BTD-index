// Client-safe types for the BTD backtest.

export interface BacktestPoint {
  date: string; // YYYY-MM-DD
  btd: number; // cumulative P&L % of the BTD rule
  benchmark: number; // cumulative P&L % of S&P 500 buy & hold
  invested: number; // % of the BTD portfolio deployed in equities
}

export interface BacktestStats {
  btdTotal: number;
  benchTotal: number;
  btdCagr: number;
  benchCagr: number;
  btdMaxDrawdown: number;
  benchMaxDrawdown: number;
  trades: number;
  avgExposure: number;
}

export interface BacktestPayload {
  updatedAt: string;
  startDate: string;
  endDate: string;
  universeSize: number;
  points: BacktestPoint[];
  stats: BacktestStats;
}

export const BUY_THRESHOLD = 65;
export const SELL_THRESHOLD = 35;
