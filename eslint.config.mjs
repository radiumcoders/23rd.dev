import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    ".source/**",
    ".registry-standalone/**",
    // OpenNext / Wrangler build output (pnpm preview, cf:deploy)
    ".open-next/**",
    ".wrangler/**",
  ]),
  // 21st/ demos run standalone in 21st.dev's sandbox, not as Next pages.
  {
    files: ["21st/**"],
    rules: {
      "@next/next/no-html-link-for-pages": "off",
      "@next/next/no-img-element": "off",
    },
  },
]);

export default eslintConfig;
