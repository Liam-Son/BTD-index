import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { getRankings } from "@/lib/btd.functions";
import { fmtPct, ratingFor, type RankedAsset } from "@/lib/btd-core";
import { FearPanel } from "@/components/btd/FearPanel";
import { RankingsTable } from "@/components/btd/RankingsTable";
import { RatingBadge } from "@/components/btd/RatingBadge";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BTD Index™ — Live Buy-the-Dip Rankings for 60+ Global Assets" },
      {
        name: "description",
        content:
          "Live BTD Score rankings across US stocks, crypto, ETFs, commodities and indices. Fear, drawdown, momentum and risk engines refreshed every 5 minutes.",
      },
      { property: "og:title", content: "BTD Index™ — Quantitative Buy-the-Dip Terminal" },
      {
        property: "og:description",
        content:
          "Top 30 global buying opportunities scored 0-100 on fear, drawdown, momentum, mean reversion, trend quality and risk.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://dip-finder-score.lovable.app/" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://dip-finder-score.lovable.app/" }],
  }),
  component: Terminal,
});

const REFRESH_MS = 5 * 60 * 1000;

function Countdown({ updatedAt }: { updatedAt: string }) {
  const [left, setLeft] = useState(REFRESH_MS);
  useEffect(() => {
    const target = new Date(updatedAt).getTime() + REFRESH_MS;
    const tick = () => setLeft(Math.max(0, target - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [updatedAt]);
  const m = Math.floor(left / 60000);
  const s = Math.floor((left % 60000) / 1000);
  return (
    <span className="tabular">
      {String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
    </span>
  );
}

function Ticker({ assets }: { assets: RankedAsset[] }) {
  const items = assets.slice(0, 24);
  return (
    <div className="overflow-hidden border-y border-border bg-surface">
      <div className="ticker-track py-1.5">
        {[0, 1].map((dup) => (
          <div key={dup} className="flex shrink-0">
            {items.map((a) => (
              <span
                key={`${dup}-${a.symbol}`}
                className="tabular flex items-center gap-2 whitespace-nowrap px-4 text-[11px]"
              >
                <span className="font-semibold">{a.symbol}</span>
                <span className={a.changeDay >= 0 ? "text-up" : "text-down"}>
                  {fmtPct(a.changeDay)}
                </span>
                <span className="text-muted-foreground">BTD {a.btdScore.toFixed(1)}</span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="h-10 animate-pulse rounded-sm bg-surface-2"
          style={{ opacity: 1 - i * 0.06 }}
        />
      ))}
    </div>
  );
}

function Terminal() {
  const { data, isPending, isFetching, error, dataUpdatedAt } = useQuery({
    queryKey: ["btd", "rankings"],
    queryFn: () => getRankings(),
    refetchInterval: REFRESH_MS,
    refetchOnWindowFocus: false,
    staleTime: REFRESH_MS,
  });

  const top = data?.assets[0];

  return (
    <main className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-baseline gap-3">
            <h1 className="flex items-baseline gap-3 text-lg font-bold tracking-tight">
              <span>
                BTD<span className="text-primary">.</span>Index
                <span className="align-super text-[9px] text-muted-foreground">™</span>
              </span>
              <span className="hidden text-[11px] font-medium uppercase tracking-widest text-muted-foreground sm:inline">
                Quantitative Buy-the-Dip Terminal
              </span>
            </h1>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
            <Link
              to="/stocks"
              className="rounded-sm border border-border px-2 py-1 hover:text-foreground"
            >
              Stocks to buy on the dip
            </Link>
            <Link
              to="/crypto"
              className="rounded-sm border border-border px-2 py-1 hover:text-foreground"
            >
              Crypto to buy on the dip
            </Link>
            <span className="flex items-center gap-1.5">
              <span
                className={`h-1.5 w-1.5 rounded-full ${isFetching ? "live-dot bg-warn" : "bg-up"}`}
              />
              {isFetching ? "Repricing" : "Live"}
            </span>
            {data && (
              <span>
                Next cycle <Countdown updatedAt={data.updatedAt} />
              </span>
            )}
          </div>
        </div>
      </header>

      {data && <Ticker assets={data.assets} />}

      <div className="mx-auto max-w-[1600px] space-y-4 px-4 py-6">
        <section className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
          <div className="rounded border border-border bg-surface p-6">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Methodology
            </p>
            <h2 className="mt-2 text-2xl font-bold leading-tight">
              Is this a statistically attractive time to buy the dip?
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
              BTD Index™ v1.0 scores every asset as{" "}
              <span className="tabular text-foreground">
                0.40V + 0.25M + 0.20F + 0.10Q + 0.05R
              </span>{" "}
              — peer-relative valuation (P/E, P/B percentiles), oversold momentum (RSI 14),
              market fear (Fear &amp; Greed, VIX), balance-sheet quality (ROE, debt-to-equity) and
              risk (beta) — each normalized to 0–100.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {[
                ["Valuation", "40%"],
                ["Momentum", "25%"],
                ["Fear", "20%"],
                ["Quality", "10%"],
                ["Risk", "5%"],
              ].map(([f, w]) => (
                <span
                  key={f}
                  className="rounded-sm border border-border bg-surface-2 px-2 py-1 text-[11px] text-muted-foreground"
                >
                  {f} <span className="tabular text-primary">{w}</span>
                </span>
              ))}
            </div>
          </div>

          <div className="rounded border border-border bg-surface p-6">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Highest conviction right now
            </p>
            {top ? (
              <>
                <div className="mt-2 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-2xl font-bold leading-tight">{top.name}</p>
                    <p className="tabular text-xs text-muted-foreground">
                      {top.symbol} · {top.assetClass} · {top.country}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="tabular text-4xl font-bold text-primary">
                      {top.btdScore.toFixed(1)}
                    </p>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                      {ratingFor(top.btdScore).label}
                    </p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-px overflow-hidden rounded border border-border bg-border">
                  {[
                    ["1D", top.changeDay],
                    ["1W", top.changeWeek],
                    ["1M", top.changeMonth],
                  ].map(([label, v]) => (
                    <div key={String(label)} className="bg-surface-2 px-3 py-2">
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                        {label}
                      </p>
                      <p
                        className={`tabular text-sm font-semibold ${(v as number) >= 0 ? "text-up" : "text-down"}`}
                      >
                        {fmtPct(v as number)}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                  <RatingBadge score={top.btdScore} />
                  <span className="tabular">
                    {top.drawdown.toFixed(1)}% from 52w high · {top.confidence}% confidence
                  </span>
                </div>
              </>
            ) : (
              <div className="mt-4 h-32 animate-pulse rounded-sm bg-surface-2" />
            )}
          </div>
        </section>

        {data && <FearPanel fear={data.fear} assetCount={data.assets.length} />}

        {error && (
          <div className="rounded border border-down/40 bg-down/10 px-4 py-3 text-sm text-down">
            Market data feed unavailable. Retrying on the next 5-minute cycle.
          </div>
        )}

        {isPending ? (
          <div className="rounded border border-border bg-surface">
            <Skeleton />
          </div>
        ) : data ? (
          <RankingsTable
            assets={data.assets}
            updatedAt={new Date(dataUpdatedAt || Date.now()).toISOString()}
          />
        ) : null}

        {data && data.degraded.length > 0 && (
          <p className="text-[11px] text-muted-foreground">
            Partial coverage this cycle: {data.degraded.join(", ")}
          </p>
        )}

        <footer className="border-t border-border pt-4 text-[11px] leading-relaxed text-muted-foreground">
          BTD Index™ — data from CoinGecko, Yahoo Finance and alternative.me. Scores are
          quantitative research signals and never a guarantee of future returns. Not investment
          advice.
        </footer>
      </div>
    </main>
  );
}
