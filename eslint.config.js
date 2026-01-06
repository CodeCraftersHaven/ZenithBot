import unusedImports from "eslint-plugin-unused-imports";
import tseslint from "typescript-eslint";

export default [
  {
    ignores: [
      "dist",
      "node_modules",
      ".sern",
      "prisma",
      "src/plugins", // prevent eslint from removing nochecks
      //⬇️Temporary until self role system is complete⬇️
      "src/systems/selfRoles.ts",
      "src/components/buttons/selfRoles/self-role.ts",
    ],
  },

  ...tseslint.configs.recommended,

  {
    plugins: {
      "unused-imports": unusedImports,
    },
    rules: {
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "warn",
        {
          vars: "all",
          varsIgnorePattern: "^_",
          args: "after-used",
          argsIgnorePattern: "^_",
        },
      ],
    },
  },
];
