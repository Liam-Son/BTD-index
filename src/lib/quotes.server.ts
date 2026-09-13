// Server-only live quote feed. Free endpoints only, batched to stay well
// inside the public rate limits at a 60-second cadence.

const UA = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36",
};

export interface LiveQuotes {
  /** Latest price keyed by quote id (Yahoo symbol or CoinGecko id). */
  prices: Record<string, number>;
  fetchedAt: string;
  degraded: string[];
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/** Yahoo `spark` accepts batched symbols and needs no cookie/crumb handshake. */
async function fetchYahooBatch(symbols: string[]): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  const url =
    `https://query1.finance.yahoo.com/v7/finance/spark?symbols=${symbols
      .map((s) => encodeURIComponent(s))
      .join(",")}&range=1d&interval=5m`;
  const res = await fetch(url, { headers: UA });
  if (!res.ok) throw new Error(`yahoo ${res.status}`);
  const json = (await res.json()) as any;
  const results: any[] = json?.spark?.result ?? [];
  for (const r of results) {
    const sym: string = r?.symbol ?? r?.response?.[0]?.meta?.symbol;
    const meta = r?.response?.[0]?.meta;
    const closes: (number | null)[] = r?.response?.[0]?.indicators?.quote?.[0]?.close ?? [];
    const last = [...closes].reverse().find((c): c is number => typeof c === "number" && c > 0);
    const price = typeof meta?.regularMarketPrice === "number" ? meta.regularMarketPrice : last;
    if (sym && typeof price === "number" && price > 0) out[sym] = price;
  }
  return out;
}

async function fetchCoingeckoBatch(ids: string[]): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  const res = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${ids.map(encodeURIComponent).join(",")}&vs_currencies=usd`,
    { headers: UA },
  );
  if (!res.ok) throw new Error(`coingecko ${res.status}`);
  const json = (await res.json()) as Record<string, { usd?: number }>;
  for (const [id, v] of Object.entries(json)) {
    if (typeof v?.usd === "number" && v.usd > 0) out[id] = v.usd;
  }
  return out;
}

export async function fetchLiveQuotes(input: {
  yahoo: string[];
  coingecko: string[];
}): Promise<LiveQuotes> {
  const degraded: string[] = [];
  const prices: Record<string, number> = {};

  const yahooBatches = chunk([...new Set(input.yahoo)].filter(Boolean), 25);
  const geckoBatches = chunk([...new Set(input.coingecko)].filter(Boolean), 100);

  const results = await Promise.allSettled([
    ...yahooBatches.map((b) => fetchYahooBatch(b)),
    ...geckoBatches.map((b) => fetchCoingeckoBatch(b)),
  ]);

  for (const r of results) {
    if (r.status === "fulfilled") Object.assign(prices, r.value);
    else degraded.push("Live quote batch unavailable");
  }

  return { prices, fetchedAt: new Date().toISOString(), degraded: [...new Set(degraded)] };
}
