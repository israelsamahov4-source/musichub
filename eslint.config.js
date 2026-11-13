import globals from "globals";
import pluginJs from "@eslint/js";
import pluginReact from "eslint-plugin-react";
import pluginReactHooks from "eslint-plugin-react-hooks";
import pluginUnusedImports from "eslint-plugin-unused-imports";

export default [
  { ignores: ["dist", "node_modules", "supabase/functions"] },
  {
    files: ["src/**/*.{js,jsx}"],
    ...pluginJs.configs.recommended,
    ...pluginReact.configs.flat.recommended,
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaVersion: 2022, sourceType: "module", ecmaFeatures: { jsx: true } },
    },
    settings: { react: { version: "detect" } },
    plugins: { react: pluginReact, "react-hooks": pluginReactHooks, "unused-imports": pluginUnusedImports },
    rules: {
      ...pluginJs.configs.recommended.rules,
      ...pluginReact.configs.flat.recommended.rules,
      ...pluginReactHooks.configs.recommended.rules,
      "no-unused-vars": "off",
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": ["error", { varsIgnorePattern: "^_", argsIgnorePattern: "^_" }],
      "react/prop-types": "off",
      "react/react-in-jsx-scope": "off",
      "react/no-danger": "error",
      // Hebrew uses ' and " inside words (ז'אנר, מע"מ); JSX renders them safely
      "react/no-unescaped-entities": "off",
      "react/jsx-no-target-blank": "error",
    },
  },
  {
    files: ["supabase/tests/**/*.mjs"],
    languageOptions: { globals: globals.node, ecmaVersion: 2022, sourceType: "module" },
  },
];
