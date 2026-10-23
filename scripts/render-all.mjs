// Renders every template in every format for each design JSON, with one bundle and one browser:
// node scripts/render-all.mjs <outDir> <design.json>… → <outDir>/<design name>/<template>-<format>.jpg
// Optional env TEMPLATES=a,b and FORMATS=x,y narrow it down.
import { bundle } from "@remotion/bundler";
import { getCompositions, openBrowser, renderStill } from "@remotion/renderer";
import fs from "node:fs";
import path from "node:path";

const [outDir, ...designs] = process.argv.slice(2);
if (!designs.length) throw new Error("usage: render-all.mjs <outDir> <design.json>…");
const only = (v) => (v ? new Set(v.split(",")) : null);
const templates = only(process.env.TEMPLATES);
const formats = only(process.env.FORMATS);

const serveUrl = await bundle({ entryPoint: path.resolve("src/remotion/index.ts"), publicDir: path.resolve("public") });
const browser = await openBrowser("chrome");
for (const file of designs) {
  const inputProps = JSON.parse(fs.readFileSync(file, "utf8"));
  const dir = path.join(outDir, path.basename(file, ".json"));
  fs.mkdirSync(dir, { recursive: true });
  const comps = (await getCompositions(serveUrl, { puppeteerInstance: browser, inputProps })).filter((c) => {
    const m = c.id.match(/^design-(.+)-(landscape|square|portrait|story)$/);
    return m && (!templates || templates.has(m[1])) && (!formats || formats.has(m[2]));
  });
  await Promise.all(
    comps.map((composition) =>
      renderStill({
        composition,
        serveUrl,
        inputProps,
        output: path.join(dir, `${composition.id.replace("design-", "")}.jpg`),
        frame: composition.durationInFrames - 1,
        imageFormat: "jpeg",
        jpegQuality: 85,
        puppeteerInstance: browser,
      }),
    ),
  );
  console.log(dir, comps.length);
}
await browser.close({ silent: true });
