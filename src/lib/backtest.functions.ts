import { createServerFn } from "@tanstack/react-start";
import type { BacktestPayload } from "./backtest-core";

export const getBacktest = createServerFn({ method: "GET" }).handler(
  async (): Promise<BacktestPayload> => {
    const { runBacktest } = await import("./backtest.server");
    return runBacktest();
  },
);
