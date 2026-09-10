import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  base: "/static/vue/",
  build: {
    outDir: "../static/vue",
    emptyOutDir: true,
    assetsDir: "assets",
    lib: {
      entry: "src/main.ts",
      formats: ["es"],
      fileName: () => "app.js",
    },
  },
  server: {
    proxy: { "/api": "http://127.0.0.1:8771" },
  },
});
