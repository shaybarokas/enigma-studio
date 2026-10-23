// Renders the video composition locally from a spec: node scripts/render-video.mjs <spec.json> <out.mp4|outDir> [frames…]
// With frame numbers, renders those stills (jpg) into outDir instead of the whole video.
import { bundle } from "@remotion/bundler";
import { openBrowser, renderMedia, renderStill, selectComposition } from "@remotion/renderer";
import { readFileSync } from "node:fs";
import path from "node:path";

const [specPath, out, ...frames] = process.argv.slice(2);
const inputProps = JSON.parse(readFileSync(specPath, "utf8"));
const serveUrl = await bundle({ entryPoint: path.resolve("src/remotion/index.ts"), publicDir: path.resolve("public") });
const browser = await openBrowser("chrome");
const composition = await selectComposition({ serveUrl, id: "video", inputProps, puppeteerInstance: browser });
if (frames.length) {
  for (const f of frames.map(Number)) {
    const output = path.resolve(out, `f${String(f).padStart(4, "0")}.jpg`);
    await renderStill({ composition, serveUrl, output, frame: f, inputProps, imageFormat: "jpeg", jpegQuality: 85, puppeteerInstance: browser, timeoutInMilliseconds: 240000 });
    console.log(output);
  }
} else {
  await renderMedia({ composition, serveUrl, codec: "h264", crf: 20, outputLocation: out, inputProps, puppeteerInstance: browser, onProgress: ({ progress }) => process.stdout.write(`\r${Math.round(progress * 100)}%`) });
  console.log(`\n${out} (${composition.durationInFrames} frames)`);
}
await browser.close({ silent: true });
