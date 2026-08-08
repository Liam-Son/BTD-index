// Client-safe BTD Index™ v1.0 scoring primitives and types.
// BTD = 0.40V + 0.25M + 0.20F + 0.10Q + 0.05R

export type AssetClass = "Stock" | "Crypto" | "ETF" | "Commodity" | "Index";

export type FactorKey = "valuation" | "momentum" | "fear" | "quality" | "risk";

export interface FactorScore {
  key: FactorKey;
  label: string;
  value: number; // 0-100 component score
  weight: number; // 0-1
  points: number; // value * weight (contribution to final score)
  max: number; // weight * 100
  detail: string;
  proxy: boolean; // true when derived from a proxy instead of reported fundamentals
}

export interface Fundamentals {
  pe: number | null;
  pb: number | null;
  roe: number | null; // decimal, e.g. 0.24
  debtToEquity: number | null; // ratio, e.g. 0.78
  beta: number | null;
  sector: string | null;
  evEbitda: number | null;
  fcfYield: number | null; // decimal
}

export interface RankedAsset {
  symbol: string;
  name: string;
  assetClass: AssetClass;
  country: string;
  sector: string;
  logo: string | null;
  price: number;
  changeDay: number;
  changeWeek: number;
  changeMonth: number;
  marketCap: number | null;
  drawdown: number; // % below 52w high (negative)
  rsi: number | null;
  fundamentals: Fundamentals;
  btdScore: number;
  confidence: number;
  factors: FactorScore[];
  reasons: string[];
}

export interface MarketFear {
  fearGreed: number | null; // 0-100 (0 = extreme fear)
  fearGreedLabel: string;
  vix: number | null;
  vixChange: number | null;
}

export interface RankingsPayload {
  updatedAt: string;
  fear: MarketFear;
  assets: RankedAsset[];
  degraded: string[];
}

export const WEIGHTS: Record<FactorKey, number> = {
  valuation: 0.4,
  momentum: 0.25,
  fear: 0.2,
  quality: 0.1,
  risk: 0.05,
};

export const FACTOR_LABEL: Record<FactorKey, string> = {
  valuation: "Valuation",
  momentum: "Momentum",
  fear: "Fear",
  quality: "Quality",
  risk: "Risk",
};

export const RATINGS = [
  { min: 95, label: "Extreme Opportunity", stars: 5, tone: "extreme" },
  { min: 90, label: "Exceptional Buy", stars: 5, tone: "exceptional" },
  { min: 80, label: "Strong Buy", stars: 4, tone: "strong" },
  { min: 70, label: "Buy", stars: 4, tone: "buy" },
  { min: 60, label: "Watch", stars: 3, tone: "watch" },
  { min: 50, label: "Neutral", stars: 2, tone: "neutral" },
  { min: 40, label: "Weak", stars: 1, tone: "weak" },
  { min: 0, label: "Avoid", stars: 0, tone: "avoid" },
] as const;

export type RatingTone = (typeof RATINGS)[number]["tone"];

export function ratingFor(score: number) {
  return RATINGS.find((r) => score >= r.min) ?? RATINGS[RATINGS.length - 1]!;
}

export const clamp = (n: number, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, n));

/** Map a raw value onto 0-100 where `lo` -> 0 and `hi` -> 100. */
export function normalize(value: number, lo: number, hi: number) {
  if (hi === lo) return 50;
  return clamp(((value - lo) / (hi - lo)) * 100);
}

/** Percentile rank (0-100) of `value` inside `pool` (ascending). */
export function percentileRank(value: number, pool: number[]): number {
  const arr = pool.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (arr.length < 2) return 50;
  let below = 0;
  let equal = 0;
  for (const v of arr) {
    if (v < value) below++;
    else if (v === value) equal++;
  }
  return clamp(((below + equal / 2) / arr.length) * 100);
}

export function rsiFromCloses(closes: number[], period = 14): number | null {
  if (closes.length < period + 1) return null;
  let gain = 0;
  let loss = 0;
  const slice = closes.slice(-(period + 1));
  for (let i = 1; i < slice.length; i++) {
    const d = slice[i]! - slice[i - 1]!;
    if (d >= 0) gain += d;
    else loss -= d;
  }
  const avgGain = gain / period;
  const avgLoss = loss / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

export function annualizedVol(closes: number[]): number | null {
  if (closes.length < 30) return null;
  const rets: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    const prev = closes[i - 1]!;
    if (prev > 0) rets.push(Math.log(closes[i]! / prev));
  }
  if (!rets.length) return null;
  const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
  const variance = rets.reduce((a, b) => a + (b - mean) ** 2, 0) / rets.length;
  return Math.sqrt(variance) * Math.sqrt(252) * 100;
}

export function sma(closes: number[], period: number): number | null {
  if (closes.length < period) return null;
  const s = closes.slice(-period);
  return s.reduce((a, b) => a + b, 0) / s.length;
}

export function stdev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const v = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
  return Math.sqrt(v);
}

// ---------------------------------------------------------------------------
// Component engines (each returns 0-100)
// ---------------------------------------------------------------------------

/** V — relative valuation vs. industry peers. Lower multiples score higher. */
export function valuationScore(args: {
  pe: number | null;
  pb: number | null;
  peerPe: number[];
  peerPb: number[];
  fallback: number | null; // proxy score used when no fundamentals exist
}): { value: number; detail: string; proxy: boolean } {
  const parts: number[] = [];
  const bits: string[] = [];
  if (args.pe !== null && args.pe > 0) {
    parts.push(100 - percentileRank(args.pe, args.peerPe));
    bits.push(`P/E ${args.pe.toFixed(1)}`);
  }
  if (args.pb !== null && args.pb > 0) {
    parts.push(100 - percentileRank(args.pb, args.peerPb));
    bits.push(`P/B ${args.pb.toFixed(1)}`);
  }
  if (!parts.length) {
    return {
      value: args.fallback ?? 50,
      detail: "Drawdown-implied value (no reported multiples)",
      proxy: true,
    };
  }
  return {
    value: clamp(parts.reduce((a, b) => a + b, 0) / parts.length),
    detail: `${bits.join(" · ")} vs peers`,
    proxy: false,
  };
}

/** M — oversold momentum. M = clamp(((70 - RSI) / 50) * 100). */
export function momentumScore(rsi: number | null): { value: number; detail: string; proxy: boolean } {
  if (rsi === null) return { value: 50, detail: "RSI unavailable", proxy: true };
  return {
    value: clamp(((70 - rsi) / 50) * 100),
    detail: `RSI(14) ${rsi.toFixed(1)}`,
    proxy: false,
  };
}

/** F — market fear. F = 100 - FearGreed (VIX fallback). */
export function fearScore(
  fearGreed: number | null,
  vix: number | null,
): { value: number; detail: string; proxy: boolean } {
  if (fearGreed !== null) {
    return {
      value: clamp(100 - fearGreed),
      detail: `Fear & Greed ${fearGreed}${vix !== null ? ` · VIX ${vix.toFixed(1)}` : ""}`,
      proxy: false,
    };
  }
  if (vix !== null) {
    return { value: normalize(vix, 12, 38), detail: `VIX ${vix.toFixed(1)}`, proxy: true };
  }
  return { value: 50, detail: "Sentiment unavailable", proxy: true };
}

/** Q — balance-sheet quality from ROE and debt-to-equity. */
export function qualityScore(
  roe: number | null,
  debtToEquity: number | null,
  fallback: number | null,
): { value: number; detail: string; proxy: boolean } {
  if (roe === null && debtToEquity === null) {
    return { value: fallback ?? 50, detail: "No issuer fundamentals", proxy: true };
  }
  const roeScore = roe === null ? 50 : clamp((roe / 0.2) * 100);
  const debtScore = debtToEquity === null ? 50 : clamp(100 - (debtToEquity / 2) * 100);
  const bits: string[] = [];
  if (roe !== null) bits.push(`ROE ${(roe * 100).toFixed(1)}%`);
  if (debtToEquity !== null) bits.push(`D/E ${debtToEquity.toFixed(2)}`);
  return {
    value: clamp((roeScore + debtScore) / 2),
    detail: bits.join(" · "),
    proxy: false,
  };
}

/** R — risk. R = 100 - min(100, ((Beta - 0.5) / 1.5) * 100). */
export function riskScore(
  beta: number | null,
  vol: number | null,
): { value: number; detail: string; proxy: boolean } {
  if (beta !== null) {
    return {
      value: clamp(100 - ((beta - 0.5) / 1.5) * 100),
      detail: `Beta ${beta.toFixed(2)}`,
      proxy: false,
    };
  }
  if (vol !== null) {
    const pseudoBeta = vol / 20; // market annualized vol ≈ 20%
    return {
      value: clamp(100 - ((pseudoBeta - 0.5) / 1.5) * 100),
      detail: `Ann. vol ${vol.toFixed(0)}% (beta proxy ${pseudoBeta.toFixed(2)})`,
      proxy: true,
    };
  }
  return { value: 50, detail: "Risk unavailable", proxy: true };
}

export interface ScoreInput {
  valuation: { value: number; detail: string; proxy: boolean };
  momentum: { value: number; detail: string; proxy: boolean };
  fear: { value: number; detail: string; proxy: boolean };
  quality: { value: number; detail: string; proxy: boolean };
  risk: { value: number; detail: string; proxy: boolean };
  context: { rsi: number | null; drawdown: number; fearGreedLabel: string };
}

export function composeBtd(input: ScoreInput): {
  score: number;
  confidence: number;
  factors: FactorScore[];
  reasons: string[];
} {
  const keys: FactorKey[] = ["valuation", "momentum", "fear", "quality", "risk"];
  const factors: FactorScore[] = keys.map((key) => {
    const c = input[key];
    const weight = WEIGHTS[key];
    return {
      key,
      label: FACTOR_LABEL[key],
      value: Math.round(c.value * 10) / 10,
      weight,
      points: Math.round(c.value * weight * 10) / 10,
      max: Math.round(weight * 100),
      detail: c.detail,
      proxy: c.proxy,
    };
  });

  const score = clamp(factors.reduce((acc, f) => acc + f.value * f.weight, 0));
  const confidence = clamp(100 - stdev(factors.map((f) => f.value)), 0, 100);

  const reasons: string[] = [];
  if (input.valuation.value >= 65 && !input.valuation.proxy) reasons.push("Undervalued vs peers");
  if (input.context.rsi !== null && input.context.rsi < 35) reasons.push("Oversold (RSI < 35)");
  else if (input.momentum.value >= 60) reasons.push("Weak short-term momentum");
  if (input.context.drawdown <= -15)
    reasons.push(`${Math.abs(input.context.drawdown).toFixed(0)}% below 52w high`);
  if (input.fear.value >= 60) reasons.push(`Market in ${input.context.fearGreedLabel.toLowerCase()}`);
  if (input.quality.value >= 65 && !input.quality.proxy) reasons.push("Strong balance sheet");
  if (input.risk.value >= 60) reasons.push("Low relative risk");
  if (!reasons.length) reasons.push("No dominant dip signal");

  return {
    score: Math.round(score * 10) / 10,
    confidence: Math.round(confidence),
    factors,
    reasons,
  };
}

export function fmtPrice(n: number) {
  if (n >= 1000) return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (n >= 1) return n.toFixed(2);
  return n.toPrecision(3);
}

export function fmtCap(n: number | null) {
  if (n === null || !isFinite(n) || n <= 0) return "—";
  if (n >= 1e12) return `${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  return n.toFixed(0);
}

export function fmtPct(n: number) {
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}
