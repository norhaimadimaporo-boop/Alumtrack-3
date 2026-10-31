import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";
import { defineConfig, loadEnv } from "vite";
import viteReact from "@vitejs/plugin-react";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig(({ mode }) => {
  // Expose non-VITE_ variables from .env to server-side code (process.env).
  // In production, the hosting platform supplies environment variables.
  const env = loadEnv(mode, process.cwd(), "");
  for (const [key, value] of Object.entries(env)) {
    process.env[key] ??= value;
  }

  return {
    plugins: [
      tsConfigPaths(),
      tanstackStart({
        server: {
          entry: "server",
        },
      }),
      viteReact(),
      tailwindcss(),
      nitro(),
    ],
  };
});
