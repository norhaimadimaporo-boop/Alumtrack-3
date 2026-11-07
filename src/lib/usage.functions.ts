import { createServerFn } from "@tanstack/react-start";

import { getSystemUsage } from "./usage.server";

export const getSystemUsageData = createServerFn({ method: "GET" }).handler(async () =>
  getSystemUsage(),
);
