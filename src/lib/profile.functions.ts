import { createServerFn } from "@tanstack/react-start";

import { getMyProfile } from "./profile.server";

export const getMyProfileData = createServerFn({ method: "GET" }).handler(async () =>
  getMyProfile(),
);
