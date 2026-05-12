import tsparser from "@typescript-eslint/parser";
import { defineConfig } from "eslint/config";
import obsidianmd from "eslint-plugin-obsidianmd";

export default defineConfig([
    {
        ignores: [
            "*.config.mjs",
            "main.js",
            "node_modules/**",
            ".github/**",
            ".githooks/**"
        ]
    },
    ...obsidianmd.configs.recommended,
    {
        files: ["**/*.ts"],
        languageOptions: {
            parser: tsparser,
            parserOptions: {
                project: "./tsconfig.json",
                tsconfigRootDir: import.meta.dirname
            }
        }
    }
]);
