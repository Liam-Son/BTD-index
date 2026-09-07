// Server-only historical backtest: BTD Index™ rule vs. S&P 500 buy & hold.
//
// Rule under test: buy (equal weight) any universe member whose historical BTD
// score is >= 65 while price is above its 200-day average (trend filter), and
// exit a held position once its score falls <= 35.
// Rebalanced weekly, uninvested capital is parked in the S&P 500 (SPY proxy).
//
// Historical fundamentals (P/E, P/B, ROE, D/E) are not available point-in-time
// from the free feeds, so the backtest uses the time-series-observable subset of
// the v1.0 engine — valuation via drawdown-implied cheapness, momentum via
// RSI(14), fear via the VIX series, risk via trailing realized volatility —
// re-weighted across the available factors.

import { clamp, normalize, rsiFromCloses, annualizedVol } from "./btd-core";
import type { BacktestPayload, BacktestPoint } from "./backtest-core";

const UA = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36",
};

// Top ~100 US companies by market cap (S&P 500 mega/large caps).
const UNIVERSE = [
  "AAPL", "MSFT", "NVDA", "AMZN", "GOOGL", "GOOG", "META", "TSLA", "AVGO", "BRK-B",
  "LLY", "JPM", "V", "XOM", "WMT", "UNH", "MA", "COST", "HD", "PG",
  "ORCL", "JNJ", "NFLX", "BAC", "CRM", "ABBV", "CVX", "MRK", "KO", "AMD",
  "PEP", "ADBE", "LIN", "TMO", "MCD", "CSCO", "WFC", "ACN", "ABT", "GE",
  "DHR", "IBM", "QCOM", "TXN", "VZ", "CAT", "INTU", "AXP", "NOW", "PFE",
  "AMGN", "ISRG", "MS", "GS", "PM", "SPGI", "LOW", "RTX", "BX", "NEE",
  "UBER", "UNP", "HON", "BKNG", "PGR", "SYK", "T", "VRTX", "BLK", "ELV",
  "SCHW", "ADI", "C", "LRCX", "AMAT", "TJX", "BA", "MDT", "DE", "CB",
  "REGN", "ADP", "PLD", "GILD", "MMC", "MU", "CI", "ETN", "CVS", "BSX",
  "LMT", "ZTS", "FI", "SO", "MO", "SHW", "DIS", "NKE", "INTC", "CMCSA",
];

const BENCH = "^GSPC";
const RANGE = "5y";

interface Series {
  dates: number[]; // epoch seconds
  closes: number[];
}

async function fetchSeries(sym: string): Promise<Series | null> {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?range=${RANGE}&interval=1d`,
      { headers: UA },
    );
    if (!res.ok) return null;
    const json = (await res.json()) as any;
    const r = json?.chart?.result?.[0];
    const ts: number[] = r?.timestamp ?? [];
    const raw: (number | null)[] = r?.indicators?.quote?.[0]?.close ?? [];
    const dates: number[] = [];
    const closes: number[] = [];
    for (let i = 0; i < ts.length; i++) {
      const c = raw[i];
      if (typeof c === "number" && c > 0) {
        dates.push(ts[i]!);
        closes.push(c);
      }
    }
    if (closes.length < 300) return null;
    return { dates, closes };
  } catch {
    return null;
  }
}

/** Align a series onto the benchmark's trading-day calendar (last known close). */
function alignTo(dates: number[], s: Series): (number | null)[] {
  const out: (number | null)[] = [];
  let j = 0;
  let last: number | null = null;
  for (const d of dates) {
    while (j < s.dates.length && s.dates[j]! <= d) {
      last = s.closes[j]!;
      j++;
    }
    out.push(last);
  }
  return out;
}

const W = { valuation: 0.4, momentum: 0.25, fear: 0.2, risk: 0.05 };
const WSUM = W.valuation + W.momentum + W.fear + W.risk;

/** Historical BTD proxy score for index `i` of a close series. */
function scoreAt(closes: (number | null)[], i: number, fear: number): number | null {
  const price = closes[i];
  if (price === null || price === undefined) return null;
  const window: number[] = [];
  for (let k = Math.max(0, i - 251); k <= i; k++) {
    const c = closes[k];
    if (typeof c === "number") window.push(c);
  }
  if (window.length < 120) return null;

  const high = Math.max(...window);
  const drawdown = ((price - high) / high) * 100; // negative
  // 0% off the high -> 0, 40% off the high -> 100
  const valuation = normalize(-drawdown, 0, 40);

  const rsi = rsiFromCloses(window);
  const momentum = rsi === null ? 50 : clamp(((70 - rsi) / 50) * 100);

  const vol = annualizedVol(window.slice(-120));
  const pseudoBeta = vol === null ? 1 : vol / 20;
  const risk = clamp(100 - ((pseudoBeta - 0.5) / 1.5) * 100);

  return clamp(
    (valuation * W.valuation + momentum * W.momentum + fear * W.fear + risk * W.risk) / WSUM,
  );
}

const BUY_AT = 65;
const SELL_AT = 35;
const REBALANCE_EVERY = 5; // trading days

/** True when the price at index `i` is at/above its 200-day SMA (trend filter). */
function aboveTrend(closes: (number | null)[], i: number): boolean {
  const price = closes[i];
  if (typeof price !== "number") return false;
  let sum = 0;
  let count = 0;
  for (let k = Math.max(0, i - 199); k <= i; k++) {
    const c = closes[k];
    if (typeof c === "number") {
      sum += c;
      count++;
    }
  }
  if (count < 100) return false;
  return price >= sum / count;
}

export async function runBacktest(
  thresholds: { buy?: number; sell?: number; trendFilter?: boolean } = {},
): Promise<BacktestPayload> {
  const buyAt = thresholds.buy ?? BUY_AT;
  const sellAt = thresholds.sell ?? SELL_AT;
  const trendFilter = thresholds.trendFilter ?? true;
  const bench = await fetchSeries(BENCH);
  if (!bench) throw new Error("benchmark series unavailable");
  const vixRaw = await fetchSeries("^VIX");

  const results = await Promise.all(UNIVERSE.map((s) => fetchSeries(s)));
  const names: string[] = [];
  const aligned: (number | null)[][] = [];
  results.forEach((s, idx) => {
    if (!s) return;
    names.push(UNIVERSE[idx]!);
    aligned.push(alignTo(bench.dates, s));
  });
  if (!aligned.length) throw new Error("universe series unavailable");

  const vix = vixRaw ? alignTo(bench.dates, vixRaw) : bench.dates.map(() => null);
  const n = bench.dates.length;

  // Portfolio state: symbol index -> share count
  let cash = 100;
  const holdings = new Map<number, number>();
  const points: BacktestPoint[] = [];
  let trades = 0;
  let exposureSum = 0;

  const startBench = bench.closes[0]!;

  const value = (i: number) => {
    let v = cash;
    for (const [idx, sh] of holdings) {
      const p = aligned[idx]![i];
      if (typeof p === "number") v += sh * p;
    }
    return v;
  };

  for (let i = 0; i < n; i++) {
    const v = vix[i];
    const fear = typeof v === "number" ? normalize(v, 12, 38) : 50;

    // Uninvested capital is parked in the S&P 500 (SPY proxy) instead of 0% cash.
    if (i > 0 && cash > 0) {
      cash *= bench.closes[i]! / bench.closes[i - 1]!;
    }

    if (i > 0 && i % REBALANCE_EVERY === 0) {
      const scores = aligned.map((c) => scoreAt(c, i, fear));

      // Exits first: score <= 20 or data gone.
      for (const [idx, sh] of [...holdings]) {
        const s = scores[idx];
        const p = aligned[idx]![i];
        if (typeof p !== "number") continue;
        if (s == null || s <= sellAt) {
          cash += sh * p;
          holdings.delete(idx);
          trades++;
        }
      }

      // Entries: any name scoring >= threshold we don't already hold.
      const buys = scores
        .map((s, idx) => ({ s, idx }))
        .filter(
          (x) =>
            x.s !== null &&
            x.s >= buyAt &&
            !holdings.has(x.idx) &&
            (!trendFilter || aboveTrend(aligned[x.idx]!, i)),
        );
      if (buys.length && cash > 0.01) {
        const per = cash / buys.length;
        for (const b of buys) {
          const p = aligned[b.idx]![i];
          if (typeof p !== "number" || p <= 0) continue;
          holdings.set(b.idx, per / p);
          cash -= per;
          trades++;
        }
      }
    }

    const pv = value(i);
    const invested = pv > 0 ? (pv - cash) / pv : 0;
    exposureSum += invested;

    // Sample monthly (and always the last bar) to keep the payload light.
    const isLast = i === n - 1;
    const d = new Date(bench.dates[i]! * 1000);
    const prev = i > 0 ? new Date(bench.dates[i - 1]! * 1000) : null;
    const newMonth = !prev || prev.getUTCMonth() !== d.getUTCMonth();
    if (newMonth || isLast) {
      points.push({
        date: d.toISOString().slice(0, 10),
        btd: Math.round((pv - 100) * 100) / 100,
        benchmark: Math.round(((bench.closes[i]! / startBench) * 100 - 100) * 100) / 100,
        invested: Math.round(invested * 100),
      });
    }
  }

  const final = points[points.length - 1]!;
  const years = (bench.dates[n - 1]! - bench.dates[0]!) / (365.25 * 24 * 3600);

  const cagr = (totalPct: number) => ((1 + totalPct / 100) ** (1 / years) - 1) * 100;
  const maxDD = (key: "btd" | "benchmark") => {
    let peak = -Infinity;
    let dd = 0;
    for (const p of points) {
      const v = 100 + p[key];
      peak = Math.max(peak, v);
      dd = Math.min(dd, ((v - peak) / peak) * 100);
    }
    return Math.round(dd * 10) / 10;
  };

  return {
    updatedAt: new Date().toISOString(),
    startDate: points[0]!.date,
    endDate: final.date,
    universeSize: names.length,
    points,
    stats: {
      btdTotal: final.btd,
      benchTotal: final.benchmark,
      btdCagr: Math.round(cagr(final.btd) * 10) / 10,
      benchCagr: Math.round(cagr(final.benchmark) * 10) / 10,
      btdMaxDrawdown: maxDD("btd"),
      benchMaxDrawdown: maxDD("benchmark"),
      trades,
      avgExposure: Math.round((exposureSum / n) * 100),
    },
  };
}
