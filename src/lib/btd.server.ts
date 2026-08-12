// Server-only data acquisition for the BTD Index™ v1.0 pipeline.
import {
  annualizedVol,
  composeBtd,
  fearScore,
  momentumScore,
  percentileRank,
  qualityScore,
  riskScore,
  rsiFromCloses,
  valuationScore,
  type AssetClass,
  type Fundamentals,
  type MarketFear,
  type RankedAsset,
  type RankingsPayload,
} from "./btd-core";

const UA = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36",
};

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
  { symbol: "BAC", yahoo: "BAC", name: "Bank of America", assetClass: "Stock", country: "US" },
  { symbol: "UNH", yahoo: "UNH", name: "UnitedHealth", assetClass: "Stock", country: "US" },
  { symbol: "PFE", yahoo: "PFE", name: "Pfizer", assetClass: "Stock", country: "US" },
  { symbol: "MRK", yahoo: "MRK", name: "Merck", assetClass: "Stock", country: "US" },
  { symbol: "KO", yahoo: "KO", name: "Coca-Cola", assetClass: "Stock", country: "US" },
  { symbol: "PEP", yahoo: "PEP", name: "PepsiCo", assetClass: "Stock", country: "US" },
  { symbol: "NKE", yahoo: "NKE", name: "Nike", assetClass: "Stock", country: "US" },
  { symbol: "DIS", yahoo: "DIS", name: "Walt Disney", assetClass: "Stock", country: "US" },
  { symbol: "INTC", yahoo: "INTC", name: "Intel", assetClass: "Stock", country: "US" },
  { symbol: "AMD", yahoo: "AMD", name: "AMD", assetClass: "Stock", country: "US" },
  { symbol: "XOM", yahoo: "XOM", name: "Exxon Mobil", assetClass: "Stock", country: "US" },
  { symbol: "CVX", yahoo: "CVX", name: "Chevron", assetClass: "Stock", country: "US" },
  { symbol: "ASML", yahoo: "ASML", name: "ASML Holding", assetClass: "Stock", country: "NL" },
  { symbol: "TSM", yahoo: "TSM", name: "TSMC", assetClass: "Stock", country: "TW" },
  { symbol: "BABA", yahoo: "BABA", name: "Alibaba", assetClass: "Stock", country: "CN" },
  { symbol: "PDD", yahoo: "PDD", name: "PDD Holdings", assetClass: "Stock", country: "CN" },
  { symbol: "TM", yahoo: "TM", name: "Toyota Motor", assetClass: "Stock", country: "JP" },
  { symbol: "SONY", yahoo: "SONY", name: "Sony Group", assetClass: "Stock", country: "JP" },
  { symbol: "NVO", yahoo: "NVO", name: "Novo Nordisk", assetClass: "Stock", country: "DK" },
  { symbol: "SAP", yahoo: "SAP", name: "SAP SE", assetClass: "Stock", country: "DE" },
  { symbol: "SHEL", yahoo: "SHEL", name: "Shell plc", assetClass: "Stock", country: "UK" },
  { symbol: "HSBC", yahoo: "HSBC", name: "HSBC Holdings", assetClass: "Stock", country: "UK" },
  { symbol: "RY", yahoo: "RY", name: "Royal Bank of Canada", assetClass: "Stock", country: "CA" },
  { symbol: "INFY", yahoo: "INFY", name: "Infosys", assetClass: "Stock", country: "IN" },
  { symbol: "VALE", yahoo: "VALE", name: "Vale S.A.", assetClass: "Stock", country: "BR" },
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
    return { closes, price, high52 };
  } catch {
    return null;
  }
}

// --- Yahoo fundamentals (cookie + crumb handshake) -------------------------

interface Session {
  cookie: string;
  crumb: string;
}

async function yahooSession(): Promise<Session | null> {
  try {
    const res = await fetch("https://fc.yahoo.com", { headers: UA, redirect: "manual" });
    const setCookie = res.headers.get("set-cookie") ?? "";
    const cookie = setCookie.split(",").map((c) => c.split(";")[0]!.trim()).filter(Boolean).join("; ");
    if (!cookie) return null;
    const crumbRes = await fetch("https://query1.finance.yahoo.com/v1/test/getcrumb", {
      headers: { ...UA, cookie },
    });
    const crumb = (await crumbRes.text()).trim();
    if (!crumb || crumb.includes("<")) return null;
    return { cookie, crumb };
  } catch {
    return null;
  }
}

const EMPTY_FUNDAMENTALS: Fundamentals = {
  pe: null,
  pb: null,
  roe: null,
  debtToEquity: null,
  beta: null,
  sector: null,
  evEbitda: null,
  fcfYield: null,
};

const num = (v: any): number | null => {
  const n = typeof v === "object" && v !== null ? v.raw : v;
  return typeof n === "number" && isFinite(n) ? n : null;
};

async function fetchFundamentals(
  session: Session,
  sym: string,
): Promise<{ f: Fundamentals; marketCap: number | null } | null> {
  try {
    const url =
      `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(sym)}` +
      `?modules=summaryDetail,defaultKeyStatistics,financialData,assetProfile&crumb=${encodeURIComponent(session.crumb)}`;
    const res = await fetch(url, { headers: { ...UA, cookie: session.cookie } });
    if (!res.ok) return null;
    const json = (await res.json()) as any;
    const r = json?.quoteSummary?.result?.[0];
    if (!r) return null;
    const sd = r.summaryDetail ?? {};
    const ks = r.defaultKeyStatistics ?? {};
    const fd = r.financialData ?? {};
    const ap = r.assetProfile ?? {};
    const marketCap = num(sd.marketCap) ?? num(ks.marketCap);
    const fcf = num(fd.freeCashflow);
    return {
      marketCap,
      f: {
        pe: num(sd.trailingPE) ?? num(ks.trailingPE),
        pb: num(ks.priceToBook),
        roe: num(fd.returnOnEquity),
        // Yahoo reports debt-to-equity in percent.
        debtToEquity: (() => {
          const d = num(fd.debtToEquity);
          return d === null ? null : d / 100;
        })(),
        beta: num(sd.beta) ?? num(ks.beta),
        sector: typeof ap.sector === "string" ? ap.sector : null,
        evEbitda: num(ks.enterpriseToEbitda),
        fcfYield: fcf !== null && marketCap ? fcf / marketCap : null,
      },
    };
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

interface CryptoRow {
  symbol: string;
  name: string;
  logo: string | null;
  price: number;
  changeDay: number;
  changeWeek: number;
  changeMonth: number;
  marketCap: number | null;
  drawdown: number;
  ath: number;
}

async function fetchCrypto(): Promise<{ rows: CryptoRow[]; issues: string[] }> {
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
        logo: c.image ?? null,
        price: Number(c.current_price ?? 0),
        changeDay: Number(
          c.price_change_percentage_24h_in_currency ?? c.price_change_percentage_24h ?? 0,
        ),
        changeWeek: Number(c.price_change_percentage_7d_in_currency ?? 0),
        changeMonth: Number(c.price_change_percentage_30d_in_currency ?? 0),
        marketCap: c.market_cap ? Number(c.market_cap) : null,
        drawdown: Number(c.ath_change_percentage ?? 0),
        ath: Number(c.ath ?? 0),
      })),
      issues: [],
    };
  } catch {
    return { rows: [], issues: ["Crypto market data"] };
  }
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

interface Draft {
  base: Omit<RankedAsset, "btdScore" | "confidence" | "factors" | "reasons">;
  peerKey: string;
  vol: number | null;
  drawdownForValue: number; // negative %
}

export async function buildRankings(): Promise<RankingsPayload> {
  const degraded: string[] = [];
  const [{ fear, issues: fearIssues }, crypto, session] = await Promise.all([
    fetchFear(),
    fetchCrypto(),
    yahooSession(),
  ]);
  degraded.push(...fearIssues, ...crypto.issues);
  if (!session) degraded.push("Fundamental data (valuation/quality proxied)");

  const [charts, funds] = await Promise.all([
    Promise.all(EQUITY_UNIVERSE.map((u) => fetchChart(u.yahoo))),
    session
      ? Promise.all(
          EQUITY_UNIVERSE.map((u) =>
            u.assetClass === "Stock" ? fetchFundamentals(session, u.yahoo) : Promise.resolve(null),
          ),
        )
      : Promise.resolve(EQUITY_UNIVERSE.map(() => null)),
  ]);

  const drafts: Draft[] = [];

  EQUITY_UNIVERSE.forEach((u, i) => {
    const c = charts[i];
    if (!c) {
      degraded.push(u.symbol);
      return;
    }
    const { closes, price, high52 } = c;
    const fundRes = funds[i] ?? null;
    const f = fundRes?.f ?? { ...EMPTY_FUNDAMENTALS };
    const drawdown = high52 > 0 ? ((price - high52) / high52) * 100 : 0;
    drafts.push({
      peerKey: u.assetClass === "Stock" ? (f.sector ?? "Other Equities") : u.assetClass,
      vol: annualizedVol(closes.slice(-120)),
      drawdownForValue: drawdown,
      base: {
        symbol: u.symbol,
        name: u.name,
        assetClass: u.assetClass,
        country: u.country,
        sector: f.sector ?? u.assetClass,
        logo: null,
        price,
        changeDay: pctFrom(closes, 1, price),
        changeWeek: pctFrom(closes, 5, price),
        changeMonth: pctFrom(closes, 21, price),
        marketCap: fundRes?.marketCap ?? null,
        drawdown,
        rsi: rsiFromCloses(closes),
        fundamentals: f,
      },
    });
  });

  crypto.rows.forEach((row) => {
    const synthetic = syntheticCloses(row.price, row.changeDay, row.changeWeek, row.changeMonth);
    drafts.push({
      peerKey: "Crypto",
      vol: annualizedVol(synthetic),
      drawdownForValue: row.drawdown,
      base: {
        symbol: row.symbol,
        name: row.name,
        assetClass: "Crypto",
        country: "Global",
        sector: "Digital Assets",
        logo: row.logo,
        price: row.price,
        changeDay: row.changeDay,
        changeWeek: row.changeWeek,
        changeMonth: row.changeMonth,
        marketCap: row.marketCap,
        drawdown: row.drawdown,
        rsi: rsiFromCloses(synthetic, 10),
        fundamentals: { ...EMPTY_FUNDAMENTALS },
      },
    });
  });

  // Peer pools for percentile-based valuation (industry/sector relative).
  const pePools = new Map<string, number[]>();
  const pbPools = new Map<string, number[]>();
  const ddPools = new Map<string, number[]>();
  for (const d of drafts) {
    const { pe, pb } = d.base.fundamentals;
    if (pe !== null && pe > 0) pePools.set(d.peerKey, [...(pePools.get(d.peerKey) ?? []), pe]);
    if (pb !== null && pb > 0) pbPools.set(d.peerKey, [...(pbPools.get(d.peerKey) ?? []), pb]);
    ddPools.set(d.peerKey, [...(ddPools.get(d.peerKey) ?? []), d.drawdownForValue]);
  }
  const allPe = drafts.map((d) => d.base.fundamentals.pe).filter((v): v is number => !!v && v > 0);
  const allPb = drafts.map((d) => d.base.fundamentals.pb).filter((v): v is number => !!v && v > 0);

  const assets: RankedAsset[] = drafts.map((d) => {
    const peerPe = (pePools.get(d.peerKey) ?? []).length >= 3 ? pePools.get(d.peerKey)! : allPe;
    const peerPb = (pbPools.get(d.peerKey) ?? []).length >= 3 ? pbPools.get(d.peerKey)! : allPb;
    // Fallback value proxy: deeper drawdown vs. peers = cheaper.
    const ddPool = ddPools.get(d.peerKey) ?? [];
    const valueProxy = 100 - percentileRank(d.drawdownForValue, ddPool);

    const valuation = valuationScore({
      pe: d.base.fundamentals.pe,
      pb: d.base.fundamentals.pb,
      peerPe,
      peerPb,
      fallback: valueProxy,
    });
    const momentum = momentumScore(d.base.rsi);
    const fearC = fearScore(fear.fearGreed, fear.vix);
    // Crypto has no ROE or debt-to-equity; the closest structural analogue is
    // network scale / liquidity, so large caps score modestly above neutral.
    const mcap = d.base.marketCap ?? 0;
    const qualityFallback =
      d.base.assetClass === "ETF" || d.base.assetClass === "Index"
        ? 60
        : d.base.assetClass === "Crypto"
          ? mcap >= 2e11
            ? 62
            : mcap >= 2e10
              ? 54
              : mcap >= 5e9
                ? 46
                : 38
          : 50;
    const quality = qualityScore(
      d.base.fundamentals.roe,
      d.base.fundamentals.debtToEquity,
      qualityFallback,
    );
    const risk = riskScore(d.base.fundamentals.beta, d.vol);

    const { score, confidence, factors, reasons } = composeBtd({
      valuation,
      momentum,
      fear: fearC,
      quality,
      risk,
      context: {
        rsi: d.base.rsi,
        drawdown: d.base.drawdown,
        fearGreedLabel: fear.fearGreedLabel,
      },
    });

    return { ...d.base, btdScore: score, confidence, factors, reasons };
  });

  assets.sort((a, b) => b.btdScore - a.btdScore);

  return {
    updatedAt: new Date().toISOString(),
    fear,
    assets,
    degraded: [...new Set(degraded)],
  };
}
