import { useMemo, useState } from "react";
import {
  fmtCap,
  fmtPct,
  fmtPrice,
  type AssetClass,
  type RankedAsset,
} from "@/lib/btd-core";
import { RatingBadge, ScoreCell } from "./RatingBadge";

type SortKey =
  | "btdScore"
  | "price"
  | "changeDay"
  | "changeWeek"
  | "changeMonth"
  | "marketCap"
  | "assetClass";

const CLASSES: (AssetClass | "All")[] = ["All", "Stock", "Crypto", "ETF", "Commodity", "Index"];

const COLUMNS: { key: SortKey; label: string; align: "left" | "right" }[] = [
  { key: "assetClass", label: "Class", align: "left" },
  { key: "price", label: "Price", align: "right" },
  { key: "changeDay", label: "1D", align: "right" },
  { key: "changeWeek", label: "1W", align: "right" },
  { key: "changeMonth", label: "1M", align: "right" },
  { key: "marketCap", label: "Mkt Cap", align: "right" },
];

function Delta({ v }: { v: number }) {
  return (
    <span className={`tabular text-xs ${v >= 0 ? "text-up" : "text-down"}`}>{fmtPct(v)}</span>
  );
}

function Logo({ asset }: { asset: RankedAsset }) {
  if (asset.logo) {
    return (
      <img
        src={asset.logo}
        alt={`${asset.name} logo`}
        loading="lazy"
        className="h-6 w-6 shrink-0 rounded-full bg-secondary"
      />
    );
  }
  return (
    <span className="tabular flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-[10px] font-bold text-muted-foreground">
      {asset.symbol.slice(0, 2)}
    </span>
  );
}

export function RankingsTable({
  assets,
  updatedAt,
}: {
  assets: RankedAsset[];
  updatedAt: string;
}) {
  const [sort, setSort] = useState<SortKey>("btdScore");
  const [dir, setDir] = useState<"asc" | "desc">("desc");
  const [filter, setFilter] = useState<AssetClass | "All">("All");
  const [open, setOpen] = useState<string | null>(null);

  const rows = useMemo(() => {
    const list = assets.filter((a) => filter === "All" || a.assetClass === filter);
    const sorted = [...list].sort((a, b) => {
      const av = a[sort];
      const bv = b[sort];
      if (typeof av === "string" || typeof bv === "string") {
        return String(av).localeCompare(String(bv)) * (dir === "asc" ? 1 : -1);
      }
      return ((av ?? -Infinity) < (bv ?? -Infinity) ? -1 : 1) * (dir === "asc" ? 1 : -1);
    });
    return sorted.slice(0, 30);
  }, [assets, filter, sort, dir]);

  const toggle = (key: SortKey) => {
    if (sort === key) setDir(dir === "asc" ? "desc" : "asc");
    else {
      setSort(key);
      setDir(key === "assetClass" ? "asc" : "desc");
    }
  };

  const arrow = (key: SortKey) => (sort === key ? (dir === "asc" ? "▲" : "▼") : "");

  return (
    <section className="rounded border border-border bg-surface">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-widest">
            Top 30 Global Buying Opportunities
          </h2>
          <p className="tabular text-[11px] text-muted-foreground">
            Last updated {new Date(updatedAt).toLocaleTimeString("en-US", { hour12: false })} ·
            recalculated every 5 minutes
          </p>
        </div>
        <div className="flex flex-wrap gap-1">
          {CLASSES.map((c) => (
            <button
              key={c}
              onClick={() => setFilter(c)}
              className={`rounded-sm border px-2 py-1 text-[11px] font-medium uppercase tracking-wide transition-colors ${
                filter === c
                  ? "border-primary/50 bg-primary/10 text-primary"
                  : "border-border bg-surface-2 text-muted-foreground hover:text-foreground"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </header>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-[10px] uppercase tracking-widest text-muted-foreground">
              <th className="w-10 px-3 py-2 text-left font-medium">#</th>
              <th className="px-3 py-2 text-left font-medium">Asset</th>
              {COLUMNS.map((c) => (
                <th
                  key={c.key}
                  onClick={() => toggle(c.key)}
                  className={`cursor-pointer select-none px-3 py-2 font-medium hover:text-foreground ${
                    c.align === "right" ? "text-right" : "text-left"
                  }`}
                >
                  {c.label} <span className="text-primary">{arrow(c.key)}</span>
                </th>
              ))}
              <th className="px-3 py-2 text-right font-medium">Conf.</th>
              <th className="px-3 py-2 text-left font-medium">Rating</th>
              <th
                onClick={() => toggle("btdScore")}
                className="cursor-pointer select-none px-3 py-2 text-right font-medium hover:text-foreground"
              >
                BTD Score <span className="text-primary">{arrow("btdScore")}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a, i) => {
              const id = `${a.assetClass}-${a.symbol}`;
              const isOpen = open === id;
              return (
                <tr
                  key={id}
                  onClick={() => setOpen(isOpen ? null : id)}
                  className="row-enter cursor-pointer border-b border-border/60 transition-colors last:border-0 hover:bg-surface-2"
                >
                  <td className="tabular px-3 py-2.5 text-xs text-muted-foreground">{i + 1}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <Logo asset={a} />
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold leading-tight">
                          {a.name}
                        </p>
                        <p className="tabular text-[11px] text-muted-foreground">
                          {a.symbol} · {a.country}
                        </p>
                      </div>
                    </div>
                    {isOpen && (
                      <div className="mt-3 space-y-3 rounded-sm bg-background p-3">
                        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
                          {a.factors.map((f) => (
                            <div key={f.key}>
                              <div className="flex items-baseline justify-between gap-2">
                                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                  {f.label}{" "}
                                  <span className="text-muted-foreground/60">
                                    {Math.round(f.weight * 100)}%
                                  </span>
                                </span>
                                <span className="tabular text-xs font-bold">
                                  {f.points.toFixed(1)}
                                  <span className="font-normal text-muted-foreground">
                                    /{f.max}
                                  </span>
                                </span>
                              </div>
                              <div className="mt-1 h-1 overflow-hidden rounded-full bg-secondary">
                                <div
                                  className="score-bar h-full"
                                  style={{ width: `${f.value}%` }}
                                />
                              </div>
                              <p className="tabular mt-1 text-[10px] text-muted-foreground">
                                {f.value.toFixed(0)}/100 · {f.detail}
                                {f.proxy ? " (proxy)" : ""}
                              </p>
                            </div>
                          ))}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border pt-2 text-[11px]">
                          <span className="tabular font-semibold">
                            Total {a.btdScore.toFixed(1)} / 100
                          </span>
                          <span className="tabular text-muted-foreground">
                            Confidence {a.confidence}%
                          </span>
                          <span className="text-muted-foreground">
                            {a.reasons.join(" · ")}
                          </span>
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-[11px] uppercase tracking-wide text-muted-foreground">
                    {a.assetClass}
                  </td>
                  <td className="tabular px-3 py-2.5 text-right text-[13px]">
                    ${fmtPrice(a.price)}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <Delta v={a.changeDay} />
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <Delta v={a.changeWeek} />
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <Delta v={a.changeMonth} />
                  </td>
                  <td className="tabular px-3 py-2.5 text-right text-xs text-muted-foreground">
                    {fmtCap(a.marketCap)}
                  </td>
                  <td className="tabular px-3 py-2.5 text-right text-xs text-muted-foreground">
                    {a.confidence}%
                  </td>
                  <td className="px-3 py-2.5">
                    <RatingBadge score={a.btdScore} />
                  </td>
                  <td className="px-3 py-2.5">
                    <ScoreCell score={a.btdScore} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="border-t border-border px-4 py-2 text-[11px] text-muted-foreground">
        Click any row to expand its quantitative factor breakdown. Scores are research signals, not
        investment advice.
      </p>
    </section>
  );
}
