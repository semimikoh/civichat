import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import importPlugin from "eslint-plugin-import";
import tseslint from "typescript-eslint";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  // import 정렬, 순환 의존 감지
  {
    plugins: { import: importPlugin },
    rules: {
      "import/no-duplicates": "warn",
      "import/order": ["warn", {
        "groups": ["builtin", "external", "internal", "parent", "sibling", "index"],
        "newlines-between": "never",
      }],
    },
  },

  // 접근성 린트 (jsx-a11y는 next/core-web-vitals에 포함, 규칙만 강화)
  {
    rules: {
      "jsx-a11y/anchor-is-valid": "warn",
      "jsx-a11y/alt-text": "error",
      "jsx-a11y/aria-props": "error",
      "jsx-a11y/aria-role": "error",
      "jsx-a11y/no-noninteractive-element-interactions": "warn",
    },
  },

  // TypeScript strict 규칙
  {
    plugins: { "@typescript-eslint": tseslint.plugin },
    rules: {
      "@typescript-eslint/consistent-type-imports": "warn",
    },
  },

  // Default ignores
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
