import { ubaEslintConfig } from "uba-eslint-config";

export default [
  ...ubaEslintConfig,
  {
    ignores: ["**/dist/**", "**/node_modules/**", "**/.auth-cache/**"],
  },
];
