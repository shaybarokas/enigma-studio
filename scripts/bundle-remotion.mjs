// Bundles the Remotion compositions for server rendering (Vercel Sandbox) into ./remotion-bundle,
// with a content hash so each deploy's sandbox snapshot matches its own templates.
import { bundle } from "@remotion/bundler";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const outDir = path.resolve("remotion-bundle");
fs.rmSync(outDir, { recursive: true, force: true });
await bundle({ entryPoint: path.resolve("src/remotion/index.ts"), outDir, publicDir: path.resolve("remotion-public") });

// Chunk source maps are dead weight in the sandbox (the renderer only reads bundle.js.map).
for (const f of fs.readdirSync(outDir)) if (f.endsWith(".map") && f !== "bundle.js.map") fs.rmSync(path.join(outDir, f));

const hash = createHash("sha256");
const walk = (d) =>
  fs.readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).forEach((e) => {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else hash.update(e.name).update(fs.readFileSync(p));
  });
walk(outDir);
fs.writeFileSync(path.join(outDir, "VERSION"), hash.digest("hex").slice(0, 16));
console.log("remotion bundle", fs.readFileSync(path.join(outDir, "VERSION"), "utf8"));
