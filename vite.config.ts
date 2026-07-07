import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";
import { fileURLToPath } from "node:url";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [tailwindcss(), reactRouter()],
    resolve: {
      alias: {
        "~": fileURLToPath(new URL("./app", import.meta.url)),
        "@": fileURLToPath(new URL("./", import.meta.url)),
      },
    },
    server: {
      proxy: {
        "/api/v1": {
          target: env.VITE_API_URL ?? "http://localhost:8000",
          changeOrigin: true,
        },
      },
    },
  };
});
