import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { fileURLToPath } from "node:url";

// `@pi/*` = pi-web's client-safe modules in ../server/lib, reused verbatim.
export default defineConfig({
  plugins: [svelte()],
  resolve: {
    alias: {
      "@pi": fileURLToPath(new URL("../server/lib", import.meta.url)),
      "$lib": fileURLToPath(new URL("./src/lib", import.meta.url)),
    },
  },
  build: { target: "chrome100", outDir: "dist", sourcemap: false },
  server: { port: 5173 },
});
