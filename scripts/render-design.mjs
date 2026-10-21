// Renders a design JSON with a template in the given formats:
// node scripts/render-design.mjs <design.json> <templateId> <outPrefix> [landscape,square,portrait,story]
import { bundle } from "@remotion/bundler";
import { getCompositions, openBrowser, renderStill } from "@remotion/renderer";
import fs from "node:fs";
import path from "node:path";

const [designPath, template, outPrefix, formatsArg = "landscape,square,portrait,story"] = process.argv.slice(2);
if (!outPrefix) throw new Error("usage: render-design.mjs <design.json> <templateId> <outPrefix> [formats]");
const inputProps = JSON.parse(fs.readFileSync(designPath, "utf8"));

const serveUrl = await bundle({ entryPoint: path.resolve("src/remotion/index.ts"), publicDir: path.resolve("public") });
const browser = await openBrowser("chrome");
const all = await getCompositions(serveUrl, { puppeteerInstance: browser, inputProps });
for (const f of formatsArg.split(",")) {
  const composition = all.find((c) => c.id === `design-${template}-${f}`);
  if (!composition) throw new Error(`no composition design-${template}-${f}`);
  const output = `${outPrefix}-${f}.jpg`;
  await renderStill({
    composition,
    serveUrl,
    inputProps,
    output,
    frame: composition.durationInFrames - 1,
    imageFormat: "jpeg",
    jpegQuality: 92,
    puppeteerInstance: browser,
  });
  console.log(output);
}
await browser.close({ silent: true });
