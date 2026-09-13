import { createServerFn } from "@tanstack/react-start";
import type { LiveQuotes } from "./quotes.server";

export interface QuoteRequest {
  yahoo: string[];
  coingecko: string[];
}

export const getLiveQuotes = createServerFn({ method: "POST" })
  .inputValidator((data: QuoteRequest): QuoteRequest => ({
    yahoo: Array.isArray(data?.yahoo) ? data.yahoo.slice(0, 200).map(String) : [],
    coingecko: Array.isArray(data?.coingecko) ? data.coingecko.slice(0, 200).map(String) : [],
  }))
  .handler(async ({ data }): Promise<LiveQuotes> => {
    const { fetchLiveQuotes } = await import("./quotes.server");
    return fetchLiveQuotes(data);
  });
