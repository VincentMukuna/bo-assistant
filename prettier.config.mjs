import adonisConfig from "@adonisjs/prettier-config";

export default {
  ...adonisConfig,
  semi: true,
  singleQuote: false,
  trailingComma: "es5",
  plugins: [...adonisConfig.plugins, "prettier-plugin-tailwindcss"],
};
