// Step 3 — Seedance 2.5 image-to-video per shot (720p, 9:16, native production audio).
// Usage: node pipeline/03-video.mjs [--force] [S01 S05 ...]
import { shots, seedanceAny as seedance, GEN, path, existsSync, ensure, pool } from "./lib.mjs";

const spec = shots();
const kfDir = path.join(GEN, "keyframes");
const dir = ensure(path.join(GEN, "video"));
const args = process.argv.slice(2);
const force = args.includes("--force");
const only = args.filter((a) => !a.startsWith("--"));

const DIRECTION =
  "Single continuous take, no cuts, no scene change. Naturalistic, restrained performance, subtle micro-expressions, " +
  "realistic physics and motion, cinematic camera movement only as described. Any dialogue is spoken in English with a soft, natural Italian accent, with accurate lip-sync. " +
  "Anatomically correct at all times: every person keeps exactly two arms and two hands, no limbs appear, merge or disappear. " +
  "Physically plausible objects and liquids: liquid only ever flows from a spout or bottle neck into the vessel. " +
  "No background music, no subtitles, no on-screen text.";

const list = spec.shots.filter((s) => !only.length || only.includes(s.id));
await pool(list, 6, async (s) => {
  const out = path.join(dir, `${s.id}.mp4`);
  if (existsSync(out) && !force) return console.log(`= ${s.id} (exists)`);
  const t0 = Date.now();
  await seedance({
    prompt: `${s.motion} ${DIRECTION} Colour grade: ${spec.grades[s.act]}.`,
    firstFrame: path.join(kfDir, `${s.id}.jpg`),
    duration: s.duration,
    audio: s.audio !== false,
    out,
  });
  console.log(`✓ ${s.id} (${Math.round((Date.now() - t0) / 1000)}s)`);
});
console.log("done");
