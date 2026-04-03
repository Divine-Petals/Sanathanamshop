import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// Domains allowed to make cross-origin requests IN DEVELOPMENT.
// The Vite proxy forwards /supabase/* to your Supabase project so the
// browser never hits a different origin during local dev.
const ALLOWED_DEV_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://divinepetals.netlify.app",
  "https://sanathanamshop.in", // ← add any extra origins here
];

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react()],
    base: "/",
    server: {
      cors: {
        origin: ALLOWED_DEV_ORIGINS,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: [
          "Content-Type",
          "Authorization",
          "apikey",
          "x-client-info",
        ],
        credentials: true,
      },
      // Proxy Supabase REST / Auth / Storage calls to avoid CORS in local dev.
      // Usage: fetch("/supabase/rest/v1/...") instead of the full URL only
      // needed when you want to hide the project URL from the browser.
      proxy: {
        "/supabase": {
          target: env.VITE_SUPABASE_URL || "https://placeholder.supabase.co",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/supabase/, ""),
        },
      },
    },
  };
});
