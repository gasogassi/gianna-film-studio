// Gianna × KAN — playful cream/oat/latte baby apparel, varied garments + edge-to-edge prints (kie.ai GPT Image 2).
import { presign, download, sleep, path, ROOT, pool } from "../../pipeline/lib.mjs";
const here = path.join(ROOT, "gifts/onesie");
const out = path.join(here, "v3"); await import("node:fs").then((fs) => fs.mkdirSync(out, { recursive: true }));
const KIE = "https://api.kie.ai/api/v1";
const headers = { Authorization: `Bearer ${process.env.KIE_AI_API_KEY}`, "Content-Type": "application/json" };

const RETRO = "a soft retro arched bubbly serif typeface like a cosy 70s cafe logo (similar to the reference's \"BABYCCINO CLUB\" lettering)";
const BRAND = 'the words "GIANNA BELLUCCI" on ONE single line in a thin elegant high-contrast serif with wide letter-spacing, like a luxury Italian fashion wordmark';
const RULES = " All lettering crisp, perfectly spelled, exactly the words given, no extra text. Cute, playful, tasteful for a baby boy. Photorealistic product photo, soft natural light.";

const SWEAT = (color, print) =>
  `Photo exactly like the reference image: a baby sitting on a cream rug seen from behind, wearing an oversized ${color} fleece crewneck sweatshirt, cosy neutral nursery background. ` +
  `The back of the sweatshirt has a large tonal screen print: ${print}.` + RULES;
const ONESIE = (color, print) =>
  `Clean e-commerce flat-lay product photo of a ${color} organic cotton baby onesie (bodysuit) with short sleeves and snap buttons on a pure white background, same garment shape and lighting as the reference image. ` +
  `Chest print: ${print}.` + RULES;

const DESIGNS = [
  { id: "s1-lock-up-sweatshirt", ref: "sweat", prompt: SWEAT("oat beige", `small handwritten script "mommy wore" in mocha brown; below it ${BRAND} in mocha brown; below that large "LOCK UP YOUR DAUGHTERS" in ${RETRO}, mocha brown, arched over two lines; under it a cute little line illustration of a padlock with a heart-shaped keyhole`) },
  { id: "s2-designed-by-women-sweatshirt", ref: "sweat", prompt: SWEAT("warm cream", `small spaced capitals "DESIGNED BY WOMEN WHO KNOW WOMEN" in latte brown; below it large "KAN KNOWS TOO" in ${RETRO}, cocoa brown, arched; below that ${BRAND} in cocoa brown; under it a tiny cute lace bow and a little heart illustration`) },
  { id: "s3-charm-by-kan-sweatshirt", ref: "sweat", prompt: SWEAT("latte sand", `large arched "CHARM BY KAN" in ${RETRO}, cream white; below it small script "lace by" in cream white; below that ${BRAND} in cream white; under it a tiny cute illustration of a lace bow next to a baby pacifier with a heart`) },
  { id: "s4-limited-edition-varsity", ref: "sweat", prompt: SWEAT("cream", `vintage collegiate varsity style: arched "LIMITED EDITION" in small varsity block letters, dusty blue; huge "KAN" in chunky cracked-vintage varsity letters, dusty blue with a mocha outline; below "ONE SIZE · ALL THE GIRLS WANT ONE" small; then ${BRAND} in mocha; tiny heart`) },
  { id: "o1-care-label", ref: "onesie", prompt: ONESIE("natural cream", `a big illustrated lingerie-style garment care label printed in mocha brown ink: a rounded rectangle label outline with a stitched border, inside centred lines: ${BRAND}; "MODEL: KAN"; "100% HEARTBREAKER"; "HAND WASH · HANDLE WITH CARE"; "KEEP AWAY FROM DAUGHTERS"; and a row of small laundry care symbols at the bottom`) },
  { id: "o2-new-arrival", ref: "onesie", prompt: ONESIE("warm sand", `arched "NEW ARRIVAL" in ${RETRO}, cocoa brown; below it "THE KAN COLLECTION" in small spaced capitals, dusty pink; below that ${BRAND} in cocoa brown; then small italic "warning: may cause heartbreak"; tiny cute heart illustration`) },
  { id: "o3-allover-bows-hearts", ref: "onesie", prompt: ONESIE("cream", `EDGE-TO-EDGE all-over repeating pattern covering the entire onesie including sleeves: tiny mocha-brown lace bows, small dusty-pink hearts and the tiny word "KAN" in a cute rounded font, evenly scattered; at the inner neckline a small printed brand label reading "GIANNA BELLUCCI" in a thin serif`) },
  { id: "o4-allover-kisses", ref: "onesie", prompt: ONESIE("cream", `EDGE-TO-EDGE all-over repeating pattern covering the entire onesie: soft red lipstick kiss marks scattered playfully, mixed with the tiny word "KAN" in a cute rounded mocha font and tiny hearts; at the inner neckline a small printed brand label reading "GIANNA BELLUCCI" in a thin serif`) },
  { id: "o5-irresistibly-confident", ref: "onesie", prompt: ONESIE("oat", `arched "IRRESISTIBLY CONFIDENT" in ${RETRO}, mocha brown; below "SINCE 2026" small spaced capitals; below that ${BRAND} in mocha brown; under it a tiny cute cartoon baby face wearing little sunglasses`) },
  { id: "o6-dads-warn", ref: "onesie", prompt: ONESIE("natural cream", `small capitals "MADE POSSIBLE BY" in latte brown; below ${BRAND} in latte brown; below that large "DADS, WARN YOUR DAUGHTERS" in ${RETRO}, terracotta, over two lines; under it a tiny cute illustration of a heart with little motion lines`) },
];

const refs = {
  sweat: await presign(path.join(here, "reference-sweatshirt.png"), "gianna-film/gifts/ref-sweatshirt.png"),
  onesie: await presign(path.join(here, "reference.png"), "gianna-film/gifts/onesie-reference.png"),
};
await pool(DESIGNS, 5, async (d) => {
  const create = await fetch(`${KIE}/jobs/createTask`, { method: "POST", headers,
    body: JSON.stringify({ model: "gpt-image-2-image-to-image", input: { prompt: d.prompt, input_urls: [refs[d.ref]], aspect_ratio: "3:4", output_format: "png" } }) }).then((r) => r.json());
  const taskId = create?.data?.taskId; if (!taskId) throw new Error(`${d.id}: ${JSON.stringify(create).slice(0, 300)}`);
  for (let i = 0; i < 100; i++) {
    await sleep(6000);
    const r = await fetch(`${KIE}/jobs/recordInfo?taskId=${taskId}`, { headers }).then((x) => x.json());
    if (r.data?.state === "success") { await download(JSON.parse(r.data.resultJson).resultUrls[0], path.join(out, `${d.id}.png`)); return console.log(`✓ ${d.id}`); }
    if (r.data?.state === "fail") throw new Error(`${d.id}: ${r.data.failMsg}`);
  }
});
