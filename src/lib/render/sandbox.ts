// Server rendering on Vercel Sandbox. Preparing a sandbox (system libraries, Chrome, the renderer and
// our template bundle) takes minutes, so it is done once per bundle version and saved as a snapshot;
// every render then starts a fresh sandbox from that snapshot in seconds.
import fs from "node:fs";
import path from "node:path";
import { addBundleToSandbox, createSandbox } from "@remotion/vercel";
import { Sandbox } from "@vercel/sandbox";
import { createAdminClient } from "../supabase/admin";

const BUNDLE_DIR = path.join(process.cwd(), "remotion-bundle");
const RUN_TIMEOUT = 10 * 60 * 1000;

export function bundleVersion(): string {
  return fs.readFileSync(path.join(BUNDLE_DIR, "VERSION"), "utf8").trim();
}

async function snapshotFor(version: string): Promise<string> {
  const db = createAdminClient();
  const { data } = await db.from("render_snapshots").select("snapshot_id").eq("version", version).maybeSingle();
  if (data) return data.snapshot_id;

  const sandbox = await createSandbox();
  // addBundleToSandbox creates nested folders but not the bundle root itself.
  await sandbox.mkDir("remotion-bundle");
  await addBundleToSandbox({ sandbox, bundleDir: BUNDLE_DIR });
  const snapshot = await sandbox.snapshot({ expiration: 0 }); // stops the sandbox
  await db.from("render_snapshots").upsert({ version, snapshot_id: snapshot.snapshotId });
  return snapshot.snapshotId;
}

/** A ready-to-render sandbox. Stop it when done. */
export async function renderSandbox(): Promise<Sandbox> {
  const snapshotId = await snapshotFor(bundleVersion());
  return Sandbox.create({ source: { type: "snapshot", snapshotId }, resources: { vcpus: 4 }, timeout: RUN_TIMEOUT });
}

/** Makes sure this deploy's snapshot exists (called once after deploy so users never wait for it). */
export async function warmRenderSnapshot(): Promise<string> {
  return snapshotFor(bundleVersion());
}
