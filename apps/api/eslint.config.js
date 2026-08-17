import { configApp } from "@adonisjs/eslint-config";
export default configApp(
  {
    ignores: [".adonisjs/**"],
  },
  {
    name: "Project code style",
    files: ["**/*.ts"],
    rules: {
      "prefer-arrow-callback": "error",
      "prefer-template": "error",
    },
  },
  {
    name: "Kebab-case actions",
    files: ["app/actions/*.ts"],
    rules: {
      "@unicorn/filename-case": "off",
    },
  },
  {
    name: "Generated Lucid schema",
    files: ["database/schema.ts"],
    rules: {
      "prettier/prettier": "off",
    },
  }
);
