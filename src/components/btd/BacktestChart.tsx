import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getBacktest } from "@/lib/backtest.functions";
import { BUY_THRESHOLD, SELL_THRESHOLD } from "@/lib/backtest-core";

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "up" | "down" | "muted";
}) {
  return (
    <div className="bg-surface-2 px-3 py-2">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p
        className={`tabular text-sm font-semibold ${
          tone === "up" ? "text-up" : tone === "down" ? "text-down" : "text-foreground"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

export function BacktestChart() {
  const { data, isPending, error } = useQuery({
    queryKey: ["btd", "backtest"],
    queryFn: () => getBacktest(),
    staleTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  return (
    <section className="rounded border border-border bg-surface">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Strategy backtest
          </p>
          <h2 className="text-base font-bold">
            BTD Index™ rule vs. S&amp;P 500 buy &amp; hold — cumulative P&amp;L
          </h2>
        </div>
        <p className="max-w-md text-[11px] leading-relaxed text-muted-foreground">
          Equal-weight entry when an asset&apos;s BTD score crosses {BUY_THRESHOLD}, exit when it
          falls below {SELL_THRESHOLD}. Weekly rebalance, cash earns 0%.
          {data ? ` ${data.universeSize} names · ${data.startDate} → ${data.endDate}.` : ""}
        </p>
      </div>

      {error ? (
        <p className="px-4 py-6 text-sm text-down">
          Backtest feed unavailable — historical prices could not be loaded.
        </p>
      ) : isPending || !data ? (
        <div className="m-4 h-72 animate-pulse rounded-sm bg-surface-2" />
      ) : (
        <>
          <div className="h-80 px-2 py-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.points} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="btdFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="2 4" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                  tickFormatter={(d: string) => d.slice(0, 7)}
                  minTickGap={40}
                  stroke="var(--color-border)"
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                  tickFormatter={(v: number) => `${v.toFixed(0)}%`}
                  width={48}
                  stroke="var(--color-border)"
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-surface-2)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 4,
                    fontSize: 11,
                  }}
                  labelStyle={{ color: "var(--color-muted-foreground)" }}
                  formatter={(v: number, name: string) => [`${v.toFixed(2)}%`, name]}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area
                  type="monotone"
                  dataKey="btd"
                  name="BTD Index™ rule"
                  stroke="var(--color-primary)"
                  fill="url(#btdFill)"
                  strokeWidth={2}
                  dot={false}
                />
                <Area
                  type="monotone"
                  dataKey="benchmark"
                  name="S&P 500 buy & hold"
                  stroke="var(--color-muted-foreground)"
                  fill="none"
                  strokeWidth={1.5}
                  strokeDasharray="4 3"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-px border-t border-border bg-border sm:grid-cols-4 lg:grid-cols-6">
            <Stat
              label="BTD total P&L"
              value={`${data.stats.btdTotal >= 0 ? "+" : ""}${data.stats.btdTotal.toFixed(1)}%`}
              tone={data.stats.btdTotal >= 0 ? "up" : "down"}
            />
            <Stat
              label="S&P 500 total"
              value={`${data.stats.benchTotal >= 0 ? "+" : ""}${data.stats.benchTotal.toFixed(1)}%`}
              tone={data.stats.benchTotal >= 0 ? "up" : "down"}
            />
            <Stat label="BTD CAGR" value={`${data.stats.btdCagr.toFixed(1)}%`} />
            <Stat label="S&P 500 CAGR" value={`${data.stats.benchCagr.toFixed(1)}%`} />
            <Stat
              label="Max drawdown"
              value={`${data.stats.btdMaxDrawdown.toFixed(1)}% vs ${data.stats.benchMaxDrawdown.toFixed(1)}%`}
            />
            <Stat
              label="Avg exposure"
              value={`${data.stats.avgExposure}% · ${data.stats.trades} trades`}
            />
          </div>

          <p className="border-t border-border px-4 py-3 text-[11px] leading-relaxed text-muted-foreground">
            Point-in-time fundamentals are not available from the free feeds, so the historical
            score uses the time-series subset of the v1.0 engine (drawdown-implied valuation, RSI
            momentum, VIX fear, realized-volatility risk) re-weighted across available factors.
            Past performance is not indicative of future results.
          </p>
        </>
      )}
    </section>
  );
}
