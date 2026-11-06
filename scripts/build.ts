import { build, context, type BuildOptions } from "esbuild";
import { copyFile, mkdir, rm } from "node:fs/promises";
import { writeIcons } from "./generate-icons";

const args = process.argv.slice(2);
const isWatch = args.includes("--watch");

const isDebug = args.includes("--debug") || isWatch;

const options: BuildOptions = {
  entryPoints: ["src/content/index.ts"],
  outfile: "dist/content.js",
  bundle: true,
  platform: "browser",
  target: ["chrome120"],
  format: "iife",
  sourcemap: true,
  minifySyntax: true,
  define: {
    __YESYOUTUBE_DEBUG__: isDebug ? "true" : "false"
  }
};

async function buildExtension(): Promise<void> {
  await rm("dist", { recursive: true, force: true });
  await mkdir("dist", { recursive: true });

  await copyFile("src/manifest.json", "dist/manifest.json");
  await writeIcons("dist/icons");

  if (isWatch) {
    const ctx = await context(options);
    await ctx.watch();

    console.log(`Watching for changes (debug build: ${isDebug})...`);
  } else {
    await build(options);
    console.log(`Extension built successfully (debug build: ${isDebug}).`);
  }
}

buildExtension().catch(error => {
  console.error(error);
  process.exit(1);
});
