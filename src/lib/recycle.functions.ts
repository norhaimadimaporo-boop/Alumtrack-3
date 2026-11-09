import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { listRecycleBin, purgeRecycleBin, restoreRecycleItem } from "./recycle.server";

export const getRecycleBinData = createServerFn({ method: "GET" }).handler(async () =>
  listRecycleBin(),
);

const restoreSchema = z.object({
  kind: z.enum(["alumni", "posts", "admin"]),
  id: z.number().int().positive(),
});

export const restoreRecycle = createServerFn({ method: "POST" })
  .validator(restoreSchema)
  .handler(async ({ data }) => restoreRecycleItem(data));

export const purgeRecycle = createServerFn({ method: "POST" }).handler(async () =>
  purgeRecycleBin(),
);
