// Step 1 — character turnaround sheets (multi-angle, locked wardrobe) + product box reference.
// Usage: node pipeline/01-references.mjs [--force] [id ...]
import { shots, seedream, GEN, ROOT, path, existsSync, ensure, pool } from "./lib.mjs";

const spec = shots();
const dir = ensure(path.join(GEN, "refs"));
const args = process.argv.slice(2);
const force = args.includes("--force");
const only = args.filter((a) => !a.startsWith("--"));

const SHEET = (who, wardrobe) =>
  `Professional film-production character turnaround reference sheet of ONE single person, ${who}. ` +
  `The same person shown five times side by side on a seamless light-grey studio background, evenly lit with soft daylight: ` +
  `(1) close-up head and shoulders, front view, neutral expression; (2) head and shoulders three-quarter view; (3) head and shoulders side profile; ` +
  `(4) full body standing, front view, arms relaxed at the sides; (5) full body standing, back view. ` +
  `Wardrobe in every view: ${wardrobe}. Identical face, hairstyle, skin tone and body proportions in all five views. ` +
  `Anatomically correct: exactly two arms, two hands with five fingers each, two legs per figure. Photorealistic, natural skin texture, no text, no labels, no watermark.`;

const C = spec.characters;
const jobs = (spec.sheets ?? []).map((sh) => ({ id: sh.id, size: "2848x1600", prompt: SHEET(C[sh.char], sh.wardrobe) }));
if (!existsSync(path.join(ROOT, "assets/gen/refs/product_box.jpg")))
  jobs.push({ id: "product_box", size: "1536x2048", prompt: `Luxury product photo: an elegant matte black rigid lingerie gift box, lid slightly open, black satin ribbon, black tissue paper, on white linen, soft daylight, no text, no logo. ${spec.style}` });

await pool(jobs.filter((j) => !only.length || only.includes(j.id)), 5, async (j) => {
  const out = path.join(dir, `${j.id}.jpg`);
  if (existsSync(out) && !force) return console.log(`= ${j.id} (exists)`);
  await seedream({ prompt: j.prompt, out, size: j.size });
  console.log(`✓ ${j.id}`);
});
