import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getRankings } from "@/lib/btd.functions";
import { fmtPct, ratingFor } from "@/lib/btd-core";
import { RankingsTable } from "@/components/btd/RankingsTable";
import { RatingBadge } from "@/components/btd/RatingBadge";
import { buildFaqJsonLd, type FaqItem } from "@/lib/structured-data";

const TITLE = "Crypto to Buy on the Dip — Live BTD Index™ Crypto Rankings";
const DESCRIPTION =
  "Quantitative rankings of major cryptocurrencies to buy on the dip, scored 0–100 on drawdown value, oversold momentum, market fear and realized-volatility risk. Repriced every 5 minutes.";
const URL = "https://dip-finder-score.lovable.app/crypto";

export const FAQ: FaqItem[] = [
  {
    q: "What does it mean to buy the dip in crypto?",
    a: "Buying the dip in crypto means accumulating a coin after a sharp drawdown, on the thesis that the sell-off is driven by leverage flushes and sentiment rather than a permanent break in the asset's adoption or network fundamentals. BTD Index™ tests that thesis with data instead of intuition.",
  },
  {
    q: "How is the BTD Score for a cryptocurrency calculated?",
    a: "Crypto uses the same 0.40 × Valuation + 0.25 × Momentum + 0.20 × Fear + 0.10 × Quality + 0.05 × Risk formula as equities. Because coins have no P/E or P/B, valuation and quality fall back to drawdown-implied value proxies, momentum uses RSI(14), fear uses the Fear & Greed Index and VIX, and risk uses annualized realized volatility as a beta proxy.",
  },
  {
    q: "What is a good BTD Score for a coin?",
    a: "Scores above 80 flag extreme opportunity, 65–80 strong opportunity, 50–65 neutral accumulation and below 35 avoid. A high score means the drawdown is mostly explained by fear and stretched technicals rather than by risk that keeps compounding against the holder.",
  },
  {
    q: "How often do the crypto rankings update?",
    a: "Crypto trades continuously, so prices, momentum and sentiment inputs are re-fetched and the whole board is re-scored every five minutes, twenty-four hours a day including weekends.",
  },
];

export const Route = createFileRoute("/crypto")({
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
    scripts: [{ type: "application/ld+json", children: JSON.stringify(buildFaqJsonLd(FAQ)) }],
  }),
  component: CryptoPage,
});

const REFRESH_MS = 5 * 60 * 1000;

function CryptoPage() {
  const { data, isPending, error, dataUpdatedAt } = useQuery({
    queryKey: ["btd", "rankings"],
    queryFn: () => getRankings(),
    refetchInterval: REFRESH_MS,
    refetchOnWindowFocus: false,
    staleTime: REFRESH_MS,
  });

  const coins = (data?.assets ?? []).filter((a) => a.assetClass === "Crypto");
  const top = coins[0];

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto max-w-[1600px] px-4 py-8">
          <nav className="mb-4 text-[11px] text-muted-foreground">
            <Link to="/" className="hover:text-foreground">
              BTD.Index™
            </Link>
            <span className="px-2">/</span>
            <span className="text-foreground">Crypto</span>
          </nav>
          <h1 className="max-w-3xl text-3xl font-bold leading-tight">
            Crypto to Buy on the Dip — Live BTD Index™ Crypto Rankings
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Every major cryptocurrency in our universe is re-scored every five minutes on how
            statistically attractive its drawdown is: distance from the 52-week high, oversold
            momentum, market-wide fear and realized volatility — combined into one 0–100 BTD Score.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-[1600px] space-y-6 px-4 py-6">
        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded border border-border bg-surface p-5">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Coins tracked
            </p>
            <p className="tabular mt-1 text-3xl font-bold">{coins.length || "—"}</p>
          </div>
          <div className="rounded border border-border bg-surface p-5">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Average BTD Score
            </p>
            <p className="tabular mt-1 text-3xl font-bold">
              {coins.length
                ? (coins.reduce((s, a) => s + a.btdScore, 0) / coins.length).toFixed(1)
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
            Crypto data feed unavailable. Retrying on the next 5-minute cycle.
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
            assets={coins}
            updatedAt={new Date(dataUpdatedAt || Date.now()).toISOString()}
          />
        )}

        <section className="rounded border border-border bg-surface p-6">
          <h2 className="text-xl font-bold">How to read the crypto board</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {[
              [
                "Valuation (40%)",
                "Coins have no earnings multiples, so value is inferred from how far price sits below its 52-week high relative to the rest of the crypto universe.",
              ],
              [
                "Momentum (25%)",
                "RSI(14). Deeply oversold prints score highest — capitulation, not a slow bleed.",
              ],
              [
                "Fear & sentiment (20%)",
                "Fear & Greed Index and VIX. Crypto drawdowns cluster with broad risk-off panic, which is when discounts are widest.",
              ],
              [
                "Quality & risk (15%)",
                "Annualized realized volatility stands in for beta, penalising coins whose recovery path is likely to be violent.",
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
            <Link to="/stocks" className="text-primary hover:underline">
              Stocks to buy on the dip →
            </Link>
          </div>
          <p className="mt-2">
            Data from CoinGecko, Yahoo Finance and alternative.me. Quantitative research signals
            only — not investment advice.
          </p>
        </footer>
      </div>
    </main>
  );
}
