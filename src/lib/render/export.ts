// Renders a kit's outputs at full resolution and stores them for download.
import { renderStillOnVercel } from "@remotion/vercel";
import { zipSync } from "fflate";
import type { DesignProps } from "@/engine/design";
import { FORMATS, type FormatId } from "@/engine/formats";
import { CATALOG, type TemplateId } from "@/engine/catalog";
import { createAdminClient } from "../supabase/admin";
import { renderSandbox } from "./sandbox";

export type ExportItem = { template: TemplateId; format: FormatId };
export type ExportFile = ExportItem & { url: string; name: string };

const BUCKET = "kit-assets";
const FRAME = 89; // last frame: everything has landed

// "גרפיקת-תצוגה_16x9.png": readable names for the person who downloads them.
function fileName(item: ExportItem) {
  const kind = CATALOG[item.template].kind === "cover" ? "גרפיקת-תצוגה" : CATALOG[item.template].name.replaceAll(" ", "-");
  return `${kind}_${FORMATS[item.format].label.replace(":", "x")}.png`;
}

export async function exportStills(design: DesignProps, items: ExportItem[], folder: string, zipName?: string) {
  const sandbox = await renderSandbox();
  const db = createAdminClient();
  const files: (ExportFile & { data: Buffer })[] = [];
  try {
    for (const item of items) {
      const { sandboxFilePath } = await renderStillOnVercel({
        sandbox,
        compositionId: `design-${item.template}-${item.format}`,
        inputProps: design as unknown as Record<string, unknown>,
        frame: FRAME,
        imageFormat: "png",
        timeoutInMilliseconds: 60_000,
      });
      const data = await sandbox.readFileToBuffer({ path: sandboxFilePath });
      if (!data) throw new Error(`render produced no file for ${item.template}-${item.format}`);
      const name = fileName(item);
      const path = `${folder}/${Date.now()}-${item.template}-${item.format}.png`;
      const { error } = await db.storage.from(BUCKET).upload(path, data, { contentType: "image/png", upsert: true });
      if (error) throw new Error(`storage: ${error.message}`);
      files.push({ ...item, name, data, url: db.storage.from(BUCKET).getPublicUrl(path, { download: name }).data.publicUrl });
    }
  } finally {
    await sandbox.stop().catch(() => {});
  }

  let zipUrl: string | undefined;
  if (zipName) {
    const zip = zipSync(Object.fromEntries(files.map((f) => [f.name, [new Uint8Array(f.data), { level: 0 }]])));
    const path = `${folder}/${Date.now()}-kit.zip`;
    const { error } = await db.storage.from(BUCKET).upload(path, Buffer.from(zip), { contentType: "application/zip", upsert: true });
    if (error) throw new Error(`storage: ${error.message}`);
    zipUrl = db.storage.from(BUCKET).getPublicUrl(path, { download: zipName }).data.publicUrl;
  }
  return { files: files.map((f) => ({ template: f.template, format: f.format, name: f.name, url: f.url })), zipUrl };
}
