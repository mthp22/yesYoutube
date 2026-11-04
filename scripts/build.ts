import { build, context } from "esbuild";
import { copyFile, mkdir } from "node:fs/promises";

const isWatch = process.argv.includes("--watch");

async function buildExtension(): Promise<void> {
  await mkdir("dist", { recursive: true });

  await copyFile(
    "src/manifest.json",
    "dist/manifest.json"
  );

  const options = {
    entryPoints: ["src/content/index.ts"],
    outfile: "dist/content.js",
    bundle: true,
    platform: "browser" as const,
    target: ["chrome120"],
    format: "iife" as const,
    sourcemap: true
  };

  if (isWatch) {
    const ctx = await context(options);
    await ctx.watch();

    console.log("Watching TypeScript files...");
  } else {
    await build(options);
    console.log("Extension built successfully.");
  }
}

buildExtension().catch(error => {
  console.error(error);
  process.exit(1);
});
