import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { getSessionUser, loginUser, logoutUser } from "./auth.server";

const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address.").max(255),
  password: z.string().min(1, "Enter your password.").max(200),
  role: z.enum(["alumni", "admin"]),
});

export const login = createServerFn({ method: "POST" })
  .validator(loginSchema)
  .handler(async ({ data }) => loginUser(data));

export const logout = createServerFn({ method: "POST" }).handler(async () => logoutUser());

export const getCurrentUser = createServerFn({ method: "GET" }).handler(async () =>
  getSessionUser(),
);
