const outputDirectory = new URL("../.mastra/output/", import.meta.url);
const packageJsonPath = new URL("package.json", outputDirectory);
const npmLockfilePath = new URL("package-lock.json", outputDirectory);

const packageJson = await Bun.file(packageJsonPath).json();

packageJson.scripts = {
  ...packageJson.scripts,
  start: "bun run ./index.mjs",
};

await Bun.write(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);

const npmLockfile = Bun.file(npmLockfilePath);

if (await npmLockfile.exists()) {
  await npmLockfile.delete();
}

console.log("Normalized Mastra build output for Bun");
