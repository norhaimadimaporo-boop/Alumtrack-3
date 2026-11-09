export type RecycleKind = "alumni" | "posts" | "admin";

export type RecycleItem = {
  key: string;
  kind: RecycleKind;
  /** Alumni = profile id · Posts = post id · Admin = user id */
  id: number;
  title: string;
  detail: string;
  deletedAt: string;
  stamp: string;
};

export type RecycleBinData = {
  ok: true;
  /** True only for Head Admins — server-enforced. */
  canViewRecycleBin: boolean;
  items: RecycleItem[];
};

export type RecycleBinResult =
  | RecycleBinData
  | { ok: false; canViewRecycleBin: false; items: []; message: string };

export type RecycleRestoreInput = {
  kind: RecycleKind;
  id: number;
};

export type RecycleActionResult = { ok: true; message: string } | { ok: false; message: string };
