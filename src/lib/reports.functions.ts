import { createServerFn } from "@tanstack/react-start";

import { listReportRecords } from "./reports.server";

export const getReportRecords = createServerFn({ method: "GET" }).handler(async () =>
  listReportRecords(),
);
