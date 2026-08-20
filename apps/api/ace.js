/*
|--------------------------------------------------------------------------
| JavaScript entrypoint for running ace commands
|--------------------------------------------------------------------------
|
| DO NOT MODIFY THIS FILE AS IT WILL BE OVERRIDDEN DURING THE BUILD
| PROCESS.
|
| See docs.adonisjs.com/guides/typescript-build-process#creating-production-build
|
| This JavaScript entrypoint lets Bun run the TypeScript Ace commands through
| AdonisJS's TypeScript compatibility hook.
|
| The hook maps the generated JavaScript specifier to "bin/console.ts" during
| local development.
|
*/

/**
 * Register hook to process TypeScript files using @poppinss/ts-exec
 */
import "@poppinss/ts-exec";

/**
 * Import ace console entrypoint
 */
await import("./bin/console.js");
