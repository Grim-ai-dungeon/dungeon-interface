import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;
// When running inside Tauri (tauri dev), use port 1420 as Tauri requires.
// For standalone `npm run dev`, use the standard Vite default (5173).
const isTauri = !!host || !!process.env.TAURI_ENV_TARGET_TRIPLE;

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [react()],
  base: './',

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  server: {
    // Use port 1420 (strictPort) when Tauri is driving; otherwise fall back to
    // Vite's default 5173 so plain `npm run dev` "just works" for the Overlord.
    port: isTauri ? 1420 : 5173,
    strictPort: isTauri,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
}));
