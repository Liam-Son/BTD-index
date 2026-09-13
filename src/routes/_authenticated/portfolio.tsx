import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { getLiveQuotes } from "@/lib/quotes.functions";
import { useLiveRankings, LIVE_MS } from "@/hooks/useLiveRankings";
import { useAuth, useDisplayName } from "@/hooks/useAuth";
import { fmtPct, fmtPrice, ratingFor } from "@/lib/btd-core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/portfolio")({
  head: () => ({
    meta: [
      { title: "My Portfolio — Live P&L and BTD Scores | BTD Index™" },
      {
        name: "description",
        content:
          "Track your real holdings with live prices, unrealized P&L and a live BTD buy-the-dip score on every position, refreshed every 60 seconds.",
      },
      { property: "og:title", content: "My Portfolio — BTD Index™" },
      {
        property: "og:description",
        content: "Live P&L and buy-the-dip scores across your real holdings.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PortfolioPage,
});

interface Holding {
  id: string;
  symbol: string;
  name: string;
  asset_class: string;
  quantity: number;
  avg_cost: number;
}

function PortfolioPage() {
  const { user, signOut } = useAuth();
  const displayName = useDisplayName(user);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: rankings } = useLiveRankings();

  const holdingsQuery = useQuery({
    queryKey: ["holdings", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Holding[]> => {
      const { data, error } = await supabase
        .from("holdings")
        .select("id, symbol, name, asset_class, quantity, avg_cost")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((h) => ({
        ...h,
        quantity: Number(h.quantity),
        avg_cost: Number(h.avg_cost),
      }));
    },
  });

  const holdings = holdingsQuery.data ?? [];

  const universe = useMemo(() => {
    const map = new Map<string, { price: number; btdScore: number; name: string; quoteId: string }>();
    for (const a of rankings?.assets ?? [])
      map.set(a.symbol.toUpperCase(), {
        price: a.price,
        btdScore: a.btdScore,
        name: a.name,
        quoteId: a.quoteId,
      });
    return map;
  }, [rankings]);

  const extraSymbols = useMemo(
    () => holdings.map((h) => h.symbol.toUpperCase()).filter((s) => !universe.has(s)),
    [holdings, universe],
  );

  const extraQuotes = useQuery({
    queryKey: ["holding-quotes", extraSymbols.join(",")],
    enabled: extraSymbols.length > 0,
    refetchInterval: LIVE_MS,
    queryFn: () => getLiveQuotes({ data: { yahoo: extraSymbols, coingecko: [] } }),
  });

  const rows = holdings.map((h) => {
    const key = h.symbol.toUpperCase();
    const known = universe.get(key);
    const price = known?.price ?? extraQuotes.data?.prices?.[key] ?? null;
    const value = price === null ? null : price * h.quantity;
    const cost = h.avg_cost * h.quantity;
    const pnl = value === null ? null : value - cost;
    const pnlPct = value === null || cost === 0 ? null : ((value - cost) / cost) * 100;
    return { ...h, price, value, cost, pnl, pnlPct, btdScore: known?.btdScore ?? null };
  });

  const totalCost = rows.reduce((a, r) => a + r.cost, 0);
  const totalValue = rows.reduce((a, r) => a + (r.value ?? r.cost), 0);
  const totalPnl = totalValue - totalCost;
  const totalPnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;
  const scored = rows.filter((r) => r.btdScore !== null && r.value);
  const weightedScore = scored.length
    ? scored.reduce((a, r) => a + r.btdScore! * (r.value ?? 0), 0) /
      scored.reduce((a, r) => a + (r.value ?? 0), 0)
    : null;

  const addMutation = useMutation({
    mutationFn: async (payload: {
      symbol: string;
      name: string;
      asset_class: string;
      quantity: number;
      avg_cost: number;
    }) => {
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase.from("holdings").insert({ ...payload, user_id: user.id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Position added");
      qc.invalidateQueries({ queryKey: ["holdings"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not add position"),
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("holdings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["holdings"] }),
  });

  const [symbol, setSymbol] = useState("");
  const [quantity, setQuantity] = useState("");
  const [avgCost, setAvgCost] = useState("");

  function onAdd(e: React.FormEvent) {
    e.preventDefault();
    const sym = symbol.trim().toUpperCase();
    const qty = Number(quantity);
    const cost = Number(avgCost);
    if (!sym || !(qty > 0) || !(cost >= 0)) {
      toast.error("Enter a symbol, a quantity above zero and an average price.");
      return;
    }
    const known = universe.get(sym);
    addMutation.mutate(
      {
        symbol: sym,
        name: known?.name ?? sym,
        asset_class:
          rankings?.assets.find((a) => a.symbol.toUpperCase() === sym)?.assetClass ?? "Stock",
        quantity: qty,
        avg_cost: cost,
      },
      {
        onSuccess: () => {
          setSymbol("");
          setQuantity("");
          setAvgCost("");
        },
      },
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-4 px-4 py-3">
          <Link to="/" className="text-lg font-bold tracking-tight">
            BTD<span className="text-primary">.</span>Index
          </Link>
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="hidden sm:inline">{displayName ?? user?.email}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await signOut();
                qc.clear();
                navigate({ to: "/" });
              }}
            >
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1200px] space-y-4 px-4 py-6">
        <section className="grid gap-4 sm:grid-cols-4">
          {[
            ["Market value", `$${fmtPrice(totalValue)}`, ""],
            ["Cost basis", `$${fmtPrice(totalCost)}`, ""],
            [
              "Unrealized P&L",
              `${totalPnl >= 0 ? "+" : "-"}$${fmtPrice(Math.abs(totalPnl))}`,
              totalPnl >= 0 ? "text-up" : "text-down",
            ],
            [
              "Portfolio BTD",
              weightedScore === null ? "—" : weightedScore.toFixed(1),
              "text-primary",
            ],
          ].map(([label, value, tone]) => (
            <div key={String(label)} className="rounded border border-border bg-surface p-4">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
              <p className={`tabular mt-1 text-xl font-bold ${tone}`}>{value}</p>
              {label === "Unrealized P&L" && (
                <p className={`tabular text-[11px] ${totalPnl >= 0 ? "text-up" : "text-down"}`}>
                  {fmtPct(totalPnlPct)}
                </p>
              )}
            </div>
          ))}
        </section>

        <section className="rounded border border-border bg-surface p-4">
          <h2 className="text-sm font-semibold">Add a position</h2>
          <form onSubmit={onAdd} className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
            <div className="space-y-1.5">
              <Label htmlFor="symbol">Symbol</Label>
              <Input
                id="symbol"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                placeholder="AAPL"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qty">Quantity</Label>
              <Input
                id="qty"
                inputMode="decimal"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="10"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cost">Average price</Label>
              <Input
                id="cost"
                inputMode="decimal"
                value={avgCost}
                onChange={(e) => setAvgCost(e.target.value)}
                placeholder="185.20"
              />
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={addMutation.isPending}>
                Add
              </Button>
            </div>
          </form>
        </section>

        <section className="overflow-x-auto rounded border border-border bg-surface">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-border text-[10px] uppercase tracking-widest text-muted-foreground">
                <th className="px-3 py-2 text-left">Symbol</th>
                <th className="px-3 py-2 text-right">Qty</th>
                <th className="px-3 py-2 text-right">Avg cost</th>
                <th className="px-3 py-2 text-right">Live price</th>
                <th className="px-3 py-2 text-right">Value</th>
                <th className="px-3 py-2 text-right">P&L</th>
                <th className="px-3 py-2 text-right">BTD</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-border/60 last:border-0">
                  <td className="px-3 py-2">
                    <span className="font-semibold">{r.symbol}</span>
                    <span className="ml-2 text-[11px] text-muted-foreground">{r.name}</span>
                  </td>
                  <td className="tabular px-3 py-2 text-right">{r.quantity}</td>
                  <td className="tabular px-3 py-2 text-right">{fmtPrice(r.avg_cost)}</td>
                  <td className="tabular px-3 py-2 text-right">
                    {r.price === null ? "—" : fmtPrice(r.price)}
                  </td>
                  <td className="tabular px-3 py-2 text-right">
                    {r.value === null ? "—" : fmtPrice(r.value)}
                  </td>
                  <td
                    className={`tabular px-3 py-2 text-right ${
                      (r.pnl ?? 0) >= 0 ? "text-up" : "text-down"
                    }`}
                  >
                    {r.pnl === null ? "—" : `${fmtPrice(r.pnl)} (${fmtPct(r.pnlPct ?? 0)})`}
                  </td>
                  <td className="tabular px-3 py-2 text-right">
                    {r.btdScore === null ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <span title={ratingFor(r.btdScore).label} className="text-primary">
                        {r.btdScore.toFixed(1)}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      className="text-[11px] text-muted-foreground hover:text-down"
                      onClick={() => removeMutation.mutate(r.id)}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-sm text-muted-foreground">
                    No positions yet. Add your first holding above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        <p className="text-[11px] text-muted-foreground">
          Prices and BTD scores refresh every 60 seconds. Symbols outside the ranked universe are
          priced live but have no BTD score.
        </p>
      </div>
    </main>
  );
}
