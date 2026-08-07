// Server-only data acquisition for the BTD Index™ pipeline.
import {
  annualizedVol,
  computeBtd,
  rsiFromCloses,
  sma,
  type AssetClass,
  type MarketFear,
  type RankedAsset,
  type RankingsPayload,
} from "./btd-core";

const UA = { "User-Agent": "Mozilla/5.0 (compatible; BTDIndex/1.0)" };

interface Universe {
  symbol: string;
  yahoo: string;
  name: string;
  assetClass: AssetClass;
  country: string;
}

const EQUITY_UNIVERSE: Universe[] = [
  { symbol: "AAPL", yahoo: "AAPL", name: "Apple", assetClass: "Stock", country: "US" },
  { symbol: "MSFT", yahoo: "MSFT", name: "Microsoft", assetClass: "Stock", country: "US" },
  { symbol: "NVDA", yahoo: "NVDA", name: "NVIDIA", assetClass: "Stock", country: "US" },
  { symbol: "AMZN", yahoo: "AMZN", name: "Amazon", assetClass: "Stock", country: "US" },
  { symbol: "GOOGL", yahoo: "GOOGL", name: "Alphabet", assetClass: "Stock", country: "US" },
  { symbol: "META", yahoo: "META", name: "Meta Platforms", assetClass: "Stock", country: "US" },
  { symbol: "TSLA", yahoo: "TSLA", name: "Tesla", assetClass: "Stock", country: "US" },
  { symbol: "AVGO", yahoo: "AVGO", name: "Broadcom", assetClass: "Stock", country: "US" },
  { symbol: "JPM", yahoo: "JPM", name: "JPMorgan Chase", assetClass: "Stock", country: "US" },
  { symbol: "UNH", yahoo: "UNH", name: "UnitedHealth", assetClass: "Stock", country: "US" },
  { symbol: "PFE", yahoo: "PFE", name: "Pfizer", assetClass: "Stock", country: "US" },
  { symbol: "KO", yahoo: "KO", name: "Coca-Cola", assetClass: "Stock", country: "US" },
  { symbol: "NKE", yahoo: "NKE", name: "Nike", assetClass: "Stock", country: "US" },
  { symbol: "DIS", yahoo: "DIS", name: "Walt Disney", assetClass: "Stock", country: "US" },
  { symbol: "INTC", yahoo: "INTC", name: "Intel", assetClass: "Stock", country: "US" },
  { symbol: "ASML", yahoo: "ASML", name: "ASML Holding", assetClass: "Stock", country: "NL" },
  { symbol: "TSM", yahoo: "TSM", name: "TSMC", assetClass: "Stock", country: "TW" },
  { symbol: "BABA", yahoo: "BABA", name: "Alibaba", assetClass: "Stock", country: "CN" },
  { symbol: "TM", yahoo: "TM", name: "Toyota Motor", assetClass: "Stock", country: "JP" },
  { symbol: "NVO", yahoo: "NVO", name: "Novo Nordisk", assetClass: "Stock", country: "DK" },
  { symbol: "SPY", yahoo: "SPY", name: "SPDR S&P 500 ETF", assetClass: "ETF", country: "US" },
  { symbol: "QQQ", yahoo: "QQQ", name: "Invesco QQQ Trust", assetClass: "ETF", country: "US" },
  { symbol: "IWM", yahoo: "IWM", name: "iShares Russell 2000", assetClass: "ETF", country: "US" },
  { symbol: "EEM", yahoo: "EEM", name: "iShares MSCI EM", assetClass: "ETF", country: "Global" },
  { symbol: "EWJ", yahoo: "EWJ", name: "iShares MSCI Japan", assetClass: "ETF", country: "JP" },
  { symbol: "GLD", yahoo: "GLD", name: "Gold (SPDR Trust)", assetClass: "Commodity", country: "Global" },
  { symbol: "SLV", yahoo: "SLV", name: "Silver (iShares)", assetClass: "Commodity", country: "Global" },
  { symbol: "USO", yahoo: "USO", name: "Crude Oil (USO)", assetClass: "Commodity", country: "Global" },
  { symbol: "UNG", yahoo: "UNG", name: "Natural Gas (UNG)", assetClass: "Commodity", country: "Global" },
  { symbol: "SPX", yahoo: "^GSPC", name: "S&P 500", assetClass: "Index", country: "US" },
  { symbol: "NDX", yahoo: "^NDX", name: "Nasdaq 100", assetClass: "Index", country: "US" },
  { symbol: "DJI", yahoo: "^DJI", name: "Dow Jones Industrial", assetClass: "Index", country: "US" },
  { symbol: "N225", yahoo: "^N225", name: "Nikkei 225", assetClass: "Index", country: "JP" },
  { symbol: "GDAXI", yahoo: "^GDAXI", name: "DAX", assetClass: "Index", country: "DE" },
  { symbol: "FTSE", yahoo: "^FTSE", name: "FTSE 100", assetClass: "Index", country: "UK" },
];

interface Chart {
  closes: number[];
  price: number;
  high52: number;
  marketCap: number | null;
}

async function fetchChart(sym: string): Promise<Chart | null> {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?range=1y&interval=1d`,
      { headers: UA },
    );
    if (!res.ok) return null;
    const json = (await res.json()) as any;
    const r = json?.chart?.result?.[0];
    if (!r) return null;
    const raw: (number | null)[] = r.indicators?.quote?.[0]?.close ?? [];
    const closes = raw.filter((c): c is number => typeof c === "number" && c > 0);
    if (closes.length < 60) return null;
    const price = r.meta?.regularMarketPrice ?? closes[closes.length - 1]!;
    const high52 = r.meta?.fiftyTwoWeekHigh ?? Math.max(...closes);
    return { closes, price, high52, marketCap: null };
  } catch {
    return null;
  }
}

function pctFrom(closes: number[], back: number, price: number) {
  const idx = closes.length - 1 - back;
  const ref = idx >= 0 ? closes[idx]! : closes[0]!;
  return ref > 0 ? ((price - ref) / ref) * 100 : 0;
}

async function fetchFear(): Promise<{ fear: MarketFear; issues: string[] }> {
  const issues: string[] = [];
  let fearGreed: number | null = null;
  let fearGreedLabel = "Unavailable";
  try {
    const res = await fetch("https://api.alternative.me/fng/?limit=1", { headers: UA });
    const json = (await res.json()) as any;
    const d = json?.data?.[0];
    if (d) {
      fearGreed = Number(d.value);
      fearGreedLabel = String(d.value_classification);
    }
  } catch {
    issues.push("Fear & Greed Index");
  }

  let vix: number | null = null;
  let vixChange: number | null = null;
  const vixChart = await fetchChart("^VIX");
  if (vixChart) {
    vix = vixChart.price;
    const prev = vixChart.closes[vixChart.closes.length - 2];
    if (prev) vixChange = ((vix - prev) / prev) * 100;
  } else {
    issues.push("VIX");
  }

  return { fear: { fearGreed, fearGreedLabel, vix, vixChange }, issues };
}

async function fetchCrypto(): Promise<{ rows: RankedAsset[]; issues: string[] }> {
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=30&page=1&price_change_percentage=24h%2C7d%2C30d",
      { headers: UA },
    );
    if (!res.ok) throw new Error("coingecko");
    const raw = (await res.json()) as any[];
    // Stablecoins carry no dip signal — exclude them from the universe.
    const list = raw.filter(
      (c) => Math.abs(Number(c.price_change_percentage_30d_in_currency ?? 0)) > 1.5,
    );

    return {
      rows: list.map((c) => ({
        symbol: String(c.symbol).toUpperCase(),
        name: String(c.name),
        assetClass: "Crypto" as AssetClass,
        country: "Global",
        logo: c.image ?? null,
        price: Number(c.current_price ?? 0),
        changeDay: Number(c.price_change_percentage_24h_in_currency ?? c.price_change_percentage_24h ?? 0),
        changeWeek: Number(c.price_change_percentage_7d_in_currency ?? 0),
        changeMonth: Number(c.price_change_percentage_30d_in_currency ?? 0),
        marketCap: c.market_cap ? Number(c.market_cap) : null,
        drawdown: Number(c.ath_change_percentage ?? 0),
        rsi: null,
        btdScore: 0,
        confidence: 0,
        factors: [],
        __ath: Number(c.ath ?? 0),
      })) as unknown as RankedAsset[],
      issues: [],
    };
  } catch {
    return { rows: [], issues: ["Crypto market data"] };
  }
}

export async function buildRankings(): Promise<RankingsPayload> {
  const degraded: string[] = [];
  const [{ fear, issues: fearIssues }, crypto] = await Promise.all([
    fetchFear(),
    fetchCrypto(),
  ]);
  degraded.push(...fearIssues, ...crypto.issues);

  const charts = await Promise.all(EQUITY_UNIVERSE.map((u) => fetchChart(u.yahoo)));

  const equities: RankedAsset[] = [];
  EQUITY_UNIVERSE.forEach((u, i) => {
    const c = charts[i];
    if (!c) {
      degraded.push(u.symbol);
      return;
    }
    const { closes, price, high52 } = c;
    const changeDay = pctFrom(closes, 1, price);
    const changeWeek = pctFrom(closes, 5, price);
    const changeMonth = pctFrom(closes, 21, price);
    const rsi = rsiFromCloses(closes);
    const vol = annualizedVol(closes.slice(-120));
    const { score, confidence, factors } = computeBtd({
      price,
      changeMonth,
      high52,
      rsi,
      vol,
      sma50: sma(closes, 50),
      sma200: sma(closes, 200),
      marketFear: fear.fearGreed,
      vix: fear.vix,
    });
    equities.push({
      symbol: u.symbol,
      name: u.name,
      assetClass: u.assetClass,
      country: u.country,
      logo: null,
      price,
      changeDay,
      changeWeek,
      changeMonth,
      marketCap: null,
      drawdown: high52 > 0 ? ((price - high52) / high52) * 100 : 0,
      rsi,
      btdScore: score,
      confidence,
      factors,
    });
  });

  const cryptos: RankedAsset[] = crypto.rows.map((row) => {
    const ath = (row as unknown as { __ath: number }).__ath || row.price;
    const synthetic = syntheticCloses(row.price, row.changeDay, row.changeWeek, row.changeMonth);
    const { score, confidence, factors } = computeBtd({
      price: row.price,
      changeMonth: row.changeMonth,
      high52: Math.max(ath, row.price),
      rsi: rsiFromCloses(synthetic, 10),
      vol: annualizedVol(synthetic),
      sma50: null,
      sma200: null,
      marketFear: fear.fearGreed,
      vix: fear.vix,
    });
    return { ...row, rsi: rsiFromCloses(synthetic, 10), btdScore: score, confidence, factors };
  });

  const assets = [...equities, ...cryptos].sort((a, b) => b.btdScore - a.btdScore);

  return {
    updatedAt: new Date().toISOString(),
    fear,
    assets,
    degraded: [...new Set(degraded)],
  };
}

/**
 * CoinGecko's markets endpoint returns aggregate returns rather than a close
 * series, so we reconstruct a smooth path through the 30d/7d/24h anchors to
 * derive RSI and realized volatility for the crypto sleeve.
 */
function syntheticCloses(price: number, d1: number, d7: number, d30: number): number[] {
  const p30 = price / (1 + d30 / 100);
  const p7 = price / (1 + d7 / 100);
  const p1 = price / (1 + d1 / 100);
  const out: number[] = [];
  const seg = (from: number, to: number, n: number) => {
    for (let i = 0; i < n; i++) out.push(from + ((to - from) * i) / n);
  };
  seg(p30, p7, 23);
  seg(p7, p1, 6);
  out.push(p1, price);
  return out.map((v, i) => v * (1 + Math.sin(i * 1.7) * 0.004));
}
