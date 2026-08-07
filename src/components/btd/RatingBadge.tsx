import { ratingFor, type RatingTone } from "@/lib/btd-core";

const TONE_CLASS: Record<RatingTone, string> = {
  extreme: "bg-up/20 text-up border-up/50",
  exceptional: "bg-up/15 text-up border-up/35",
  strong: "bg-up/10 text-up border-up/25",
  buy: "bg-primary/8 text-primary border-primary/20",
  watch: "bg-warn/10 text-warn border-warn/25",
  neutral: "bg-muted text-muted-foreground border-border",
  weak: "bg-down/8 text-down/85 border-down/20",
  avoid: "bg-down/15 text-down border-down/35",
};

export function RatingBadge({ score }: { score: number }) {
  const rating = ratingFor(score);
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-sm border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${TONE_CLASS[rating.tone]}`}
    >
      {rating.label}
    </span>
  );
}

export function ScoreCell({ score }: { score: number }) {
  return (
    <div className="flex items-center justify-end gap-2">
      <div className="hidden h-1 w-16 overflow-hidden rounded-full bg-secondary sm:block">
        <div className="score-bar h-full" style={{ width: `${score}%` }} />
      </div>
      <span className="tabular w-12 text-right text-sm font-bold text-foreground">
        {score.toFixed(1)}
      </span>
    </div>
  );
}
