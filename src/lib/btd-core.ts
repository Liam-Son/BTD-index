// Client-safe BTD Index™ scoring primitives and types.

export type AssetClass = "Stock" | "Crypto" | "ETF" | "Commodity" | "Index";

export type FactorKey =
  | "fear"
  | "drawdown"
  | "momentum"
  | "meanReversion"
  | "trend"
  | "risk";

export interface FactorScore {
  key: FactorKey;
  label: string;
  value: number; // 0-100, higher = more attractive to buy
  detail: string;
}

export interface RankedAsset {
  symbol: string;
  name: string;
  assetClass: AssetClass;
  country: string;
  logo: string | null;
  price: number;
  changeDay: number;
  changeWeek: number;
  changeMonth: number;
  marketCap: number | null;
  drawdown: number; // % below 52w high (negative)
  rsi: number | null;
  btdScore: number;
  confidence: number;
  factors: FactorScore[];
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

export const RATINGS = [
  { min: 95, label: "Extreme Opportunity", tone: "extreme" },
  { min: 90, label: "Exceptional", tone: "exceptional" },
  { min: 80, label: "Strong Buy", tone: "strong" },
  { min: 70, label: "Buy", tone: "buy" },
  { min: 60, label: "Watch", tone: "watch" },
  { min: 50, label: "Neutral", tone: "neutral" },
  { min: 40, label: "Weak", tone: "weak" },
  { min: 0, label: "Avoid", tone: "avoid" },
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

export interface ScoreInput {
  price: number;
  changeMonth: number;
  high52: number;
  rsi: number | null;
  vol: number | null;
  sma50: number | null;
  sma200: number | null;
  marketFear: number | null; // 0-100 fear&greed (0 = extreme fear)
  vix: number | null;
}

/**
 * BTD Score — six normalized engines aggregated with fixed weights.
 * Higher = stronger statistical evidence of an attractive dip.
 */
export function computeBtd(input: ScoreInput): {
  score: number;
  confidence: number;
  factors: FactorScore[];
} {
  const drawdownPct =
    input.high52 > 0 ? ((input.price - input.high52) / input.high52) * 100 : 0;

  const factors: FactorScore[] = [];
  const weights: number[] = [];

  // 1. Fear engine — market-wide fear & volatility regime
  const fgScore = input.marketFear === null ? 50 : normalize(100 - input.marketFear, 20, 85);
  const vixScore = input.vix === null ? 50 : normalize(input.vix, 12, 38);
  const fear = (fgScore + vixScore) / 2;
  factors.push({
    key: "fear",
    label: "Fear",
    value: fear,
    detail:
      input.vix !== null
        ? `VIX ${input.vix.toFixed(1)} · F&G ${input.marketFear ?? "n/a"}`
        : `F&G ${input.marketFear ?? "n/a"}`,
  });
  weights.push(0.15);

  // 2. Drawdown engine — distance from 52-week high
  const dd = normalize(-drawdownPct, 2, 45);
  factors.push({
    key: "drawdown",
    label: "Drawdown",
    value: dd,
    detail: `${drawdownPct.toFixed(1)}% from 52w high`,
  });
  weights.push(0.25);

  // 3. Momentum engine — oversold RSI
  const rsiScore = input.rsi === null ? 50 : normalize(70 - input.rsi, 0, 40);
  factors.push({
    key: "momentum",
    label: "Momentum",
    value: rsiScore,
    detail: input.rsi === null ? "RSI n/a" : `RSI(14) ${input.rsi.toFixed(1)}`,
  });
  weights.push(0.2);

  // 4. Mean reversion — recent one-month weakness
  const mr = normalize(-input.changeMonth, -3, 25);
  factors.push({
    key: "meanReversion",
    label: "Mean Reversion",
    value: mr,
    detail: `1M ${input.changeMonth >= 0 ? "+" : ""}${input.changeMonth.toFixed(1)}%`,
  });
  weights.push(0.18);

  // 5. Trend quality — dip inside an intact long-term uptrend scores best
  let trend = 50;
  let trendDetail = "Trend n/a";
  if (input.sma50 !== null && input.sma200 !== null && input.sma200 > 0) {
    const above200 = ((input.price - input.sma200) / input.sma200) * 100;
    const below50 = input.sma50 > 0 ? ((input.sma50 - input.price) / input.sma50) * 100 : 0;
    trend = clamp(normalize(above200, -18, 22) * 0.55 + normalize(below50, -6, 14) * 0.45);
    trendDetail = `${above200 >= 0 ? "+" : ""}${above200.toFixed(1)}% vs 200D MA`;
  }
  factors.push({ key: "trend", label: "Trend Quality", value: trend, detail: trendDetail });
  weights.push(0.12);

  // 6. Risk engine — lower realized volatility is a cleaner entry
  const riskScore = input.vol === null ? 50 : normalize(90 - input.vol, 0, 70);
  factors.push({
    key: "risk",
    label: "Risk",
    value: riskScore,
    detail: input.vol === null ? "Vol n/a" : `Ann. vol ${input.vol.toFixed(0)}%`,
  });
  weights.push(0.1);

  const score = clamp(
    factors.reduce((acc, f, i) => acc + f.value * weights[i]!, 0),
  );

  const known = [input.rsi, input.vol, input.sma50, input.sma200, input.marketFear, input.vix]
    .filter((v) => v !== null).length;
  const spread =
    Math.max(...factors.map((f) => f.value)) - Math.min(...factors.map((f) => f.value));
  const confidence = clamp(45 + (known / 6) * 45 - (spread / 100) * 18, 20, 99);

  return { score: Math.round(score * 10) / 10, confidence: Math.round(confidence), factors };
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
