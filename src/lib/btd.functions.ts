import { createServerFn } from "@tanstack/react-start";
import type { RankingsPayload } from "./btd-core";

export const getRankings = createServerFn({ method: "GET" }).handler(
  async (): Promise<RankingsPayload> => {
    const { buildRankings } = await import("./btd.server");
    return buildRankings();
  },
);
