// Renders the last frame of every composition matching a prefix: node scripts/render-stills.mjs <outDir> [prefix] [frame]
import { bundle } from "@remotion/bundler";
import { getCompositions, openBrowser, renderStill } from "@remotion/renderer";
import path from "node:path";

const [outDir, prefix = "", frameArg] = process.argv.slice(2);
if (!outDir) throw new Error("usage: render-stills.mjs <outDir> [prefix] [frame]");

const serveUrl = await bundle({ entryPoint: path.resolve("src/remotion/index.ts"), publicDir: path.resolve("public") });
const browser = await openBrowser("chrome");
const comps = (await getCompositions(serveUrl, { puppeteerInstance: browser })).filter((c) => c.id.startsWith(prefix));
for (const composition of comps) {
  const frame = frameArg === undefined ? composition.durationInFrames - 1 : Number(frameArg);
  const output = path.resolve(outDir, `${composition.id}${frameArg === undefined ? "" : `-f${frame}`}.jpg`);
  await renderStill({ composition, serveUrl, output, frame, imageFormat: "jpeg", jpegQuality: 92, puppeteerInstance: browser });
  console.log(output);
}
await browser.close({ silent: true });
