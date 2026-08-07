import type { MarketFear } from "@/lib/btd-core";

function Gauge({ value }: { value: number }) {
  const angle = -90 + (value / 100) * 180;
  return (
    <svg viewBox="0 0 120 66" className="h-16 w-28">
      <defs>
        <linearGradient id="fg-arc" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--down)" />
          <stop offset="50%" stopColor="var(--warn)" />
          <stop offset="100%" stopColor="var(--up)" />
        </linearGradient>
      </defs>
      <path
        d="M10 60 A50 50 0 0 1 110 60"
        fill="none"
        stroke="url(#fg-arc)"
        strokeWidth="8"
        strokeLinecap="round"
        opacity="0.9"
      />
      <g transform={`rotate(${angle} 60 60)`}>
        <line x1="60" y1="60" x2="60" y2="20" stroke="var(--foreground)" strokeWidth="2.5" />
      </g>
      <circle cx="60" cy="60" r="4" fill="var(--foreground)" />
    </svg>
  );
}

export function FearPanel({ fear, assetCount }: { fear: MarketFear; assetCount: number }) {
  const fg = fear.fearGreed ?? 50;
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded border border-border bg-border lg:grid-cols-4">
      <div className="flex items-center gap-3 bg-surface px-4 py-4">
        <Gauge value={fg} />
        <div>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Fear &amp; Greed
          </p>
          <p className="tabular text-2xl font-bold leading-tight">{fear.fearGreed ?? "—"}</p>
          <p className="text-xs text-warn">{fear.fearGreedLabel}</p>
        </div>
      </div>

      <div className="bg-surface px-4 py-4">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">VIX</p>
        <p className="tabular mt-1 text-2xl font-bold">{fear.vix?.toFixed(2) ?? "—"}</p>
        {fear.vixChange !== null && (
          <p className={`tabular text-xs ${fear.vixChange >= 0 ? "text-down" : "text-up"}`}>
            {fear.vixChange >= 0 ? "+" : ""}
            {fear.vixChange.toFixed(2)}% today
          </p>
        )}
      </div>

      <div className="bg-surface px-4 py-4">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Universe Coverage
        </p>
        <p className="tabular mt-1 text-2xl font-bold">{assetCount}</p>
        <p className="text-xs text-muted-foreground">stocks · crypto · ETFs · commodities</p>
      </div>

      <div className="bg-surface px-4 py-4">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Refresh Cycle</p>
        <p className="tabular mt-1 text-2xl font-bold">5:00</p>
        <p className="text-xs text-muted-foreground">minutes · automatic repricing</p>
      </div>
    </div>
  );
}
