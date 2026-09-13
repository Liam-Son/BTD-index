import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { getRankings } from "@/lib/btd.functions";
import { getLiveQuotes } from "@/lib/quotes.functions";
import { applyLiveQuotes, averageScore, type RankingsPayload } from "@/lib/btd-core";

/** Full snapshot (fundamentals, sentiment, peer pools) refresh cadence. */
export const SNAPSHOT_MS = 5 * 60 * 1000;
/** Live price cadence — scores re-derive from these prices every minute. */
export const LIVE_MS = 60 * 1000;

export interface PulsePoint {
  t: number;
  score: number;
}

export function useLiveRankings() {
  const snapshot = useQuery({
    queryKey: ["btd-rankings"],
    queryFn: () => getRankings(),
    refetchInterval: SNAPSHOT_MS,
    staleTime: SNAPSHOT_MS,
  });

  const ids = useMemo(() => {
    const assets = snapshot.data?.assets ?? [];
    return {
      yahoo: assets.filter((a) => a.quoteSource === "yahoo").map((a) => a.quoteId),
      coingecko: assets.filter((a) => a.quoteSource === "coingecko").map((a) => a.quoteId),
    };
  }, [snapshot.data]);

  const quotes = useQuery({
    queryKey: ["btd-live-quotes", ids.yahoo.length, ids.coingecko.length],
    queryFn: () => getLiveQuotes({ data: ids }),
    enabled: ids.yahoo.length + ids.coingecko.length > 0,
    refetchInterval: LIVE_MS,
    staleTime: LIVE_MS,
  });

  const data: RankingsPayload | undefined = useMemo(() => {
    if (!snapshot.data) return undefined;
    if (!quotes.data?.prices) return snapshot.data;
    return applyLiveQuotes(snapshot.data, quotes.data.prices);
  }, [snapshot.data, quotes.data]);

  // Rolling market-wide BTD pulse, one point per live tick.
  const [pulse, setPulse] = useState<PulsePoint[]>([]);
  const lastTick = useRef<string | null>(null);
  useEffect(() => {
    if (!data?.assets.length) return;
    const stamp = quotes.data?.fetchedAt ?? data.updatedAt;
    if (lastTick.current === stamp) return;
    lastTick.current = stamp;
    setPulse((prev) => [...prev, { t: Date.parse(stamp) || Date.now(), score: averageScore(data.assets) }].slice(-60));
  }, [data, quotes.data?.fetchedAt]);

  return {
    data,
    pulse,
    isPending: snapshot.isPending,
    error: snapshot.error,
    snapshotUpdatedAt: snapshot.dataUpdatedAt,
    liveUpdatedAt: quotes.data?.fetchedAt ? Date.parse(quotes.data.fetchedAt) : snapshot.dataUpdatedAt,
    isLive: Boolean(quotes.data?.prices && Object.keys(quotes.data.prices).length),
    isRefreshingLive: quotes.isFetching,
  };
}

export function livePrices(payload: RankingsPayload | undefined) {
  const map: Record<string, number> = {};
  for (const a of payload?.assets ?? []) map[a.symbol] = a.price;
  return map;
}
