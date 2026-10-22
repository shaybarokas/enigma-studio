// End-to-end agent run on a real course: interview (scripted answers) → 3 concepts → assets → design JSON.
// npx tsx --env-file=.env.local scripts/agent-e2e.mts <lecturerPhoto> <outDir> <answersFile>
import fs from "node:fs";
import path from "node:path";
import type Anthropic from "@anthropic-ai/sdk";
import { emptyBrief } from "../src/lib/agent/brief";
import { interviewTurn } from "../src/lib/agent/interview";
import { createConcepts } from "../src/lib/agent/concepts";
import { buildConceptAssets, cutout, storeUpload } from "../src/lib/agent/assets";
import { conceptToDesign } from "../src/lib/agent/to-design";

const [photo, outDir, answersFile] = process.argv.slice(2);
const answers: string[] = JSON.parse(fs.readFileSync(answersFile, "utf8"));
fs.mkdirSync(outDir, { recursive: true });
const kitId = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const t0 = Date.now();
const log = (m: string) => console.log(`[${((Date.now() - t0) / 1000).toFixed(0)}s] ${m}`);

// Lecturer cut-out runs while the interview happens.
const subjectP = (async () => {
  const url = await storeUpload(`${kitId}/lecturer-original.jpg`, fs.readFileSync(photo), "image/jpeg");
  return cutout(url, "person", `${kitId}/lecturer.png`);
})();

const history: Anthropic.Beta.BetaMessageParam[] = [];
let brief = emptyBrief;
const transcript: string[] = [];
for (const answer of answers) {
  history.push({ role: "user", content: answer });
  transcript.push(`משתמש: ${answer}`);
  const turn = await interviewTurn(history, brief);
  brief = turn.brief;
  history.push({ role: "assistant", content: turn.reply });
  transcript.push(`סוכן: ${turn.reply}\n   [${turn.quickReplies.join(" | ")}]${turn.ready ? "  ✓ready" : ""}`);
  log(`turn ${transcript.length / 2} ready=${turn.ready}`);
  if (turn.ready) break;
}
fs.writeFileSync(path.join(outDir, "transcript.txt"), transcript.join("\n\n"));
fs.writeFileSync(path.join(outDir, "brief.json"), JSON.stringify(brief, null, 2));

const concepts = await createConcepts(brief);
log(`concepts: ${concepts.map((c) => `${c.name} (${c.templateId})`).join(" · ")}`);
fs.writeFileSync(path.join(outDir, "concepts.json"), JSON.stringify(concepts, null, 2));

const subject = await subjectP;
log(`subject aspect ${subject.aspect.toFixed(3)}`);
await Promise.all(
  concepts.map(async (c, i) => {
    const assets = await buildConceptAssets(c, kitId, i, subject);
    const design = conceptToDesign(c, assets, { price: brief.price });
    fs.writeFileSync(path.join(outDir, `design-${i}.json`), JSON.stringify(design, null, 2));
    fs.writeFileSync(path.join(outDir, `template-${i}.txt`), c.templateId);
    log(`assets ready for concept ${i}`);
  }),
);
log("done");
