import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Ukrainian copy uses the ASCII apostrophe heavily (м'ясо, ім'я); escaping each one hurts readability.
      "react/no-unescaped-entities": "off",
    },
  },
  {
    // Visible text comes from the dictionaries (src/i18n), never from JSX literals: a new string = en + all locales.
    files: ["src/components/**/*.tsx", "src/app/**/*.tsx"],
    ignores: ["**/__tests__/**", "src/app/admin/**", "src/components/Admin*.tsx"], // the back office is the owner's tool, not market-facing
    rules: {
      "react/jsx-no-literals": ["error", { noStrings: false, allowedStrings: ["·", "—", "–", "|", "/", "→", "←", "↑", "↓", "×", "+", "−", "-", "%", ":", ".", ",", "(", ")", "©", "›", "•", "≈", "✓", "✕", "?", "!", "=", "…", "«", "»", "⌄", "Σ", "*", "0", "1.", "2.", "3.", "4.", "5.", "6.", "7.", "8.", "404", ") ·", "· ≈", "/100", "/kW", "(A / B / C)", "1 EUR =", "USD · ECB ·", "EUR →", "UTC",
        // technical tokens, units, symbols and source names that stay as written in every language (glossary DO-NOT-TRANSLATE list)
        "CH₄", "CH₄ + CO₂", "Nm³", "Nm³/", "m³", "t CO₂e", "NPV", "UASB / EGSB", "metha", "lytics", "CC BY 4.0", "· v", "GeoNames", "· ERA5", "Copernicus ERA5 / NSF NCAR / Planette · 0.25°", "EPA AgSTAR", "EPA LMOP · 2021", "IPCC · 2019", "IEA Bioenergy · 2025", "Eurostat · national regulators · EIA · World Bank · ERA5 climate · Damodaran country risk"] }],
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "node_modules/**"]),
]);

export default eslintConfig;
