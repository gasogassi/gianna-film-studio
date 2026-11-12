// Step 2 — first-frame keyframes per shot (Seedream 5 Pro with identity/product references).
// Usage: node pipeline/02-keyframes.mjs [--force] [S01 S05 ...]
import { shots, fill, seedream, GEN, ROOT, path, existsSync, ensure, pool } from "./lib.mjs";

const spec = shots();
const dir = ensure(path.join(GEN, "keyframes"));
const args = process.argv.slice(2);
const force = args.includes("--force");
const only = args.filter((a) => !a.startsWith("--"));

const sheetChar = Object.fromEntries((spec.sheets ?? []).map((sh) => [sh.id, sh.char]));
const refFile = (r) =>
  r === "product" ? path.join(ROOT, "assets/products/palmira-bra-red.jpg")
  : r === "product_box" ? path.join(ROOT, "assets/gen/refs/product_box.jpg")
  : path.join(GEN, `refs/${r}.jpg`);
const refLabel = (r) => {
  if (r === "product") return "the exact red lace balconette bra product (match lace pattern, colour and straps exactly)";
  if (r === "product_box") return "the black gift box";
  const name = (spec.characters[sheetChar[r] ?? r] ?? r).split(",")[0];
  return `the character turnaround sheet of ${name} (match face, hair, skin and body exactly; clothing as described in this scene; do NOT copy the sheet layout)`;
};
const ANATOMY =
  "A single cinematic photograph, one continuous scene, not a collage. Anatomically correct: every person has exactly two arms and two hands with five fingers each, " +
  "natural joints and proportions, no extra or missing limbs. Physically plausible objects and liquids.";

const list = spec.shots.filter((s) => !only.length || only.includes(s.id));
await pool(list, 4, async (s) => {
  const out = path.join(dir, `${s.id}.jpg`);
  if (existsSync(out) && !force) return console.log(`= ${s.id} (exists)`);
  const refs = s.refs.map(refFile);
  const refText = s.refs.length ? " Reference images: " + s.refs.map((r, i) => `@Image${i + 1} is ${refLabel(r)}`).join("; ") + "." : "";
  const prompt = `${fill(s.keyframe, spec)}${refText} ${ANATOMY} Colour grade: ${spec.grades[s.act]}. ${spec.style}`;
  await seedream({ prompt, images: refs, out });
  console.log(`✓ ${s.id}`);
});
