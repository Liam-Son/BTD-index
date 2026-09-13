import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { PulsePoint } from "@/hooks/useLiveRankings";

const fmtTime = (t: number) =>
  new Date(t).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

export function LivePulseChart({
  pulse,
  isLive,
  assetCount,
}: {
  pulse: PulsePoint[];
  isLive: boolean;
  assetCount: number;
}) {
  const values = pulse.map((p) => p.score);
  const lo = values.length ? Math.min(...values) : 0;
  const hi = values.length ? Math.max(...values) : 100;
  const pad = Math.max(1, (hi - lo) * 0.4);
  const latest = pulse[pulse.length - 1]?.score ?? null;
  const first = pulse[0]?.score ?? null;
  const delta = latest !== null && first !== null ? latest - first : 0;

  return (
    <section className="rounded border border-border bg-surface p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Live market BTD pulse
          </p>
          <h2 className="mt-1 text-lg font-bold leading-tight">
            Average BTD score across {assetCount} assets
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Recomputed from live prices every 60 seconds — valuation multiples, drawdown and RSI
            all move with the market print.
          </p>
        </div>
        <div className="text-right">
          <p className="tabular text-3xl font-bold text-primary">
            {latest === null ? "—" : latest.toFixed(1)}
          </p>
          <p className={`tabular text-[11px] ${delta >= 0 ? "text-up" : "text-down"}`}>
            {delta >= 0 ? "+" : ""}
            {delta.toFixed(2)} this session
          </p>
        </div>
      </div>

      <div className="mt-4 h-[180px]">
        {pulse.length < 2 ? (
          <div className="flex h-full items-center justify-center rounded-sm border border-dashed border-border text-xs text-muted-foreground">
            {isLive ? "Collecting live ticks…" : "Waiting for the first live price tick…"}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={pulse} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="pulseFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="t"
                tickFormatter={fmtTime}
                tick={{ fontSize: 10 }}
                stroke="hsl(var(--muted-foreground))"
                minTickGap={40}
              />
              <YAxis
                domain={[lo - pad, hi + pad]}
                tick={{ fontSize: 10 }}
                stroke="hsl(var(--muted-foreground))"
                width={38}
                tickFormatter={(v: number) => v.toFixed(1)}
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--surface))",
                  border: "1px solid hsl(var(--border))",
                  fontSize: 12,
                }}
                labelFormatter={(t) => fmtTime(Number(t))}
                formatter={(v: number) => [v.toFixed(2), "Avg BTD"]}
              />
              <Area
                type="monotone"
                dataKey="score"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#pulseFill)"
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}
