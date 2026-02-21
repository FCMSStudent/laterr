import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  esbuild: {
    jsx: "automatic",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./tests/setup/vitest.setup.ts"],
    include: ["tests/bookmarks/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: [
        "src/features/bookmarks/**/*.{ts,tsx}",
        "src/shared/lib/supabase-utils.ts",
        "src/integrations/supabase/client.ts",
      ],
      exclude: [
        "src/features/bookmarks/index.ts",
        "src/features/bookmarks/pages/BookmarksPage.tsx",
      ],
    },
  },
});
