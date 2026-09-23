import js from "@eslint/js";
import globals from "globals";
import prettierConfig from "eslint-config-prettier";

export default [
    { ignores: ["dist/**"] },
    js.configs.recommended,
    { languageOptions: { globals: globals.node } },
    {
        files: ["electron/renderer/**/*.js"],
        languageOptions: { globals: globals.browser },
    },
    {
        files: ["electron/e2e/**/*.js"],
        languageOptions: { globals: { ...globals.node, ...globals.browser } },
    },
    {
        files: ["electron/preload.cjs"],
        languageOptions: { sourceType: "commonjs", globals: globals.node },
    },
    prettierConfig,
];
