import { createServerFn } from "@tanstack/react-start";

import { getPublicStats } from "./public-stats.server";

export const getPublicStatsData = createServerFn({ method: "GET" }).handler(async () =>
  getPublicStats(),
);
