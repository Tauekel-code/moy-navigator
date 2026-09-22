import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Проект намеренно использует простой паттерн "fetch в useEffect при
      // монтировании / смене параметров" в клиентских компонентах вместо
      // библиотеки данных (SWR/React Query) или Suspense — это стандартный
      // и корректный подход, который это (экспериментальное, ориентированное
      // на React Compiler) правило считает антипаттерном по умолчанию.
      "react-hooks/set-state-in-effect": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
