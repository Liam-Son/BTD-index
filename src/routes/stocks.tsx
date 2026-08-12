import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getRankings } from "@/lib/btd.functions";
import { fmtPct, ratingFor } from "@/lib/btd-core";
import { RankingsTable } from "@/components/btd/RankingsTable";
import { RatingBadge } from "@/components/btd/RatingBadge";
import { buildFaqJsonLd, type FaqItem } from "@/lib/structured-data";

const TITLE = "Stocks to Buy on the Dip — Live BTD Index™ Equity Rankings";
const DESCRIPTION =
  "Quantitative rankings of global stocks to buy on the dip, scored 0–100 on valuation, oversold momentum, market fear, quality and risk. Repriced every 5 minutes.";
const URL = "https://dip-finder-score.lovable.app/stocks";

export const FAQ: FaqItem[] = [
  {
    q: "What does it mean to buy the dip in stocks?",
    a: "Buying the dip means adding to a stock after its price falls below recent levels, on the thesis that the decline is driven by sentiment rather than a permanent change in fundamentals. BTD Index™ tests that thesis quantitatively instead of relying on intuition.",
  },
  {
    q: "How is the BTD Score for a stock calculated?",
    a: "Each equity is scored as 0.40 × Valuation + 0.25 × Momentum + 0.20 × Fear + 0.10 × Quality + 0.05 × Risk. Valuation uses P/E and P/B percentiles against sector peers, momentum uses RSI(14), fear uses the Fear & Greed Index and VIX, quality blends ROE and debt-to-equity, and risk uses beta.",
  },
  {
    q: "What is a good BTD Score for a stock?",
    a: "Scores above 80 are flagged as extreme opportunity, 65–80 as strong opportunity, 50–65 as neutral accumulation and below 35 as avoid. Higher scores mean more of the dip is explained by fear and cheapness rather than deteriorating quality.",
  },
  {
    q: "How often do the stock rankings update?",
    a: "Prices, fundamentals and sentiment inputs are re-fetched and the whole equity board is re-scored every five minutes during and outside market hours.",
  },
];

export const Route = createFileRoute("/stocks")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: URL },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [
      { type: "application/ld+json", children: JSON.stringify(buildFaqJsonLd(FAQ)) },
    ],
  }),
  component: StocksPage,
});

const REFRESH_MS = 5 * 60 * 1000;

function StocksPage() {
  const { data, isPending, error, dataUpdatedAt } = useQuery({
    queryKey: ["btd", "rankings"],
    queryFn: () => getRankings(),
    refetchInterval: REFRESH_MS,
    refetchOnWindowFocus: false,
    staleTime: REFRESH_MS,
  });

  const stocks = (data?.assets ?? []).filter((a) => a.assetClass === "Stock");
  const top = stocks[0];

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto max-w-[1600px] px-4 py-8">
          <nav className="mb-4 text-[11px] text-muted-foreground">
            <Link to="/" className="hover:text-foreground">
              BTD.Index™
            </Link>
            <span className="px-2">/</span>
            <span className="text-foreground">Stocks</span>
          </nav>
          <h1 className="max-w-3xl text-3xl font-bold leading-tight">
            Stocks to Buy on the Dip — Live BTD Index™ Equity Rankings
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Every US and global equity in our universe is re-scored every five minutes on how
            statistically attractive its drawdown is: peer-relative valuation, oversold momentum,
            market-wide fear, balance-sheet quality and beta risk — combined into one 0–100 BTD
            Score.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-[1600px] space-y-6 px-4 py-6">
        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded border border-border bg-surface p-5">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Equities tracked
            </p>
            <p className="tabular mt-1 text-3xl font-bold">{stocks.length || "—"}</p>
          </div>
          <div className="rounded border border-border bg-surface p-5">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Average BTD Score
            </p>
            <p className="tabular mt-1 text-3xl font-bold">
              {stocks.length
                ? (stocks.reduce((s, a) => s + a.btdScore, 0) / stocks.length).toFixed(1)
                : "—"}
            </p>
          </div>
          <div className="rounded border border-border bg-surface p-5">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Top-ranked dip
            </p>
            {top ? (
              <div className="mt-1 flex items-end justify-between gap-3">
                <div>
                  <p className="text-xl font-bold leading-tight">{top.symbol}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {fmtPct(top.changeMonth)} 1M · {ratingFor(top.btdScore).label}
                  </p>
                </div>
                <RatingBadge score={top.btdScore} />
              </div>
            ) : (
              <p className="tabular mt-1 text-3xl font-bold">—</p>
            )}
          </div>
        </section>

        {error && (
          <div className="rounded border border-down/40 bg-down/10 px-4 py-3 text-sm text-down">
            Equity data feed unavailable. Retrying on the next 5-minute cycle.
          </div>
        )}

        {isPending ? (
          <div className="space-y-2 rounded border border-border bg-surface p-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded-sm bg-surface-2" />
            ))}
          </div>
        ) : (
          <RankingsTable
            assets={stocks}
            updatedAt={new Date(dataUpdatedAt || Date.now()).toISOString()}
          />
        )}

        <section className="rounded border border-border bg-surface p-6">
          <h2 className="text-xl font-bold">How to read the equity board</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {[
              [
                "Valuation (40%)",
                "P/E and P/B percentiles against sector peers. A stock trading cheap relative to its own industry earns the most points.",
              ],
              [
                "Momentum (25%)",
                "RSI(14). Deeply oversold prints score highest — the dip is technically stretched, not merely soft.",
              ],
              [
                "Fear & sentiment (20%)",
                "Fear & Greed Index and VIX. Broad panic tends to discount good businesses alongside bad ones.",
              ],
              [
                "Quality & risk (15%)",
                "ROE and debt-to-equity confirm the business can survive the drawdown; beta scales how violent the recovery path may be.",
              ],
            ].map(([h, p]) => (
              <div key={h} className="rounded-sm border border-border bg-surface-2 p-4">
                <h3 className="text-sm font-semibold">{h}</h3>
                <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{p}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded border border-border bg-surface p-6">
          <h2 className="text-xl font-bold">Frequently asked questions</h2>
          <dl className="mt-4 space-y-4">
            {FAQ.map((f) => (
              <div key={f.q} className="border-b border-border pb-4 last:border-0 last:pb-0">
                <dt className="text-sm font-semibold">{f.q}</dt>
                <dd className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{f.a}</dd>
              </div>
            ))}
          </dl>
        </section>

        <footer className="border-t border-border pt-4 text-[11px] leading-relaxed text-muted-foreground">
          <div className="flex flex-wrap gap-4">
            <Link to="/" className="text-primary hover:underline">
              ← Back to the full BTD Index™ terminal
            </Link>
            <Link to="/crypto" className="text-primary hover:underline">
              Crypto to buy on the dip →
            </Link>
          </div>
          <p className="mt-2">
            Data from Yahoo Finance and alternative.me. Quantitative research signals only — not
            investment advice.
          </p>
        </footer>
      </div>
    </main>
  );
}
