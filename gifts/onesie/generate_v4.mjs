// Gianna × KAN — "gift from the team" set: onesies, bib, gift-box packaging (kie.ai GPT Image 2).
import { presign, download, sleep, path, ROOT, pool } from "../../pipeline/lib.mjs";
const here = path.join(ROOT, "gifts/onesie");
const out = path.join(here, "v4"); await import("node:fs").then((fs) => fs.mkdirSync(out, { recursive: true }));
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

const BOX = (scene) =>
  `Luxury gift unboxing product photo, same matte black rigid gift box with black satin ribbon as the reference image: ${scene}.` + RULES;
const BIB = (color, print) =>
  `Clean e-commerce flat-lay product photo of a ${color} organic cotton baby bib with a snap closure on a pure white background, soft even light. Bib print: ${print}.` + RULES;
const BADGE = 'a small cute illustrated logo badge';
const DESIGNS = [
  { id: "t01-boss-of-the-boss", ref: "onesie", prompt: ONESIE("oat", `large "I'M THE BOSS'S BOSS" in ${RETRO}, cocoa brown, over three lines; below it ${BRAND}; under that small spaced capitals "HQ" and a tiny cute crown illustration`) },
  { id: "t02-staff-badge", ref: "onesie", prompt: ONESIE("powder blue", `a cute illustrated staff ID badge hanging from a printed lanyard on the chest: rounded rectangle card with ${BRAND} at the top, a small round placeholder photo circle with a smiling baby face doodle, then lines "STAFF", "NAME: KAN", "POSITION: CHIEF CUTENESS OFFICER", "DEPARTMENT: NAPS & SNACKS", printed in deep navy ink`) },
  { id: "t03-newest-team-member", ref: "onesie", prompt: ONESIE("natural cream", `small capitals "NEWEST MEMBER OF THE TEAM" in latte brown; below ${BRAND} in cocoa brown; below that handwritten script "Welcome to the family, KAN" in dusty pink; tiny heart`) },
  { id: "t04-team-love-allover", ref: "onesie", prompt: ONESIE("cream", `EDGE-TO-EDGE all-over repeating pattern covering the entire onesie: the handwritten script phrase "love, the Gianna team" in mocha brown alternating with tiny dusty-pink hearts and tiny black lace bows, evenly scattered at different small angles; at the inner neckline a small printed brand label reading "GIANNA BELLUCCI" in a thin serif`) },
  { id: "t05-shipping-label", ref: "onesie", prompt: ONESIE("natural cream", `a big realistic-looking printed parcel shipping label graphic in black ink with a barcode: header ${BRAND} EXPRESS; lines "ORDER #001", "SHIP TO: MOMMY & DADDY", "CONTENTS: 1 × KAN", "HANDLE WITH LOVE"; and a red rubber-stamp style mark "FRAGILE: VERY CUTE"`) },
  { id: "t06-five-star-review", ref: "onesie", prompt: ONESIE("oat", `five big cute gold stars in a row; below in handwritten script "Absolutely perfect. Would order again." in cocoa brown; below small "— MOMMY"; below that ${BRAND} in cocoa brown`) },
  { id: "t07-sold-out", ref: "onesie", prompt: ONESIE("deep navy blue", `a printed product hang-tag graphic in warm white outline with a string hole: inside ${BRAND} in warm white, then "MODEL: KAN", "LIMITED EDITION OF 1"; across the tag a bold diagonal red stamp "SOLD OUT"`) },
  { id: "t08-best-launch-yet", ref: "onesie", prompt: ONESIE("powder blue", `small spaced capitals "NEW ARRIVAL" in deep navy; large "OUR BEST LAUNCH YET" in ${RETRO}, deep navy, over two lines; below ${BRAND} in deep navy; below small "EST. 2026"; tiny cute rocket illustration`) },
  { id: "t09-piccolo-bellucci", ref: "onesie", prompt: ONESIE("natural cream", `large elegant thin high-contrast serif words "PICCOLO BELLUCCI" in cocoa brown with wide letter-spacing over two lines, like a luxury Italian fashion wordmark; above it a tiny cute gold crown illustration; below small italic "little Bellucci"`) },
  { id: "t10-bello-come-papa", ref: "onesie", prompt: ONESIE("light sky blue", `large "BELLO COME PAPÀ" in ${RETRO}, deep navy, over two lines; below small italic "handsome like dad"; below that ${BRAND} in deep navy; tiny cute navy moustache illustration`) },
  { id: "t11-gift-box", ref: "box", prompt: BOX('on white linen, the black box is open with black tissue paper folded back, revealing a neatly folded natural-cream baby onesie printed with tiny text and a small heart; leaning against the box a small elegant cream card with handwritten black ink "From the Gianna Bellucci team, with love"; soft daylight, tasteful styling, a sprig of eucalyptus') },
  { id: "t12-bib-spit-happens", ref: "onesie", prompt: BIB("oat", `"SPIT HAPPENS." in ${RETRO}, cocoa brown; below small spaced capitals "— CUSTOMER CARE"; below ${BRAND} in cocoa brown; tiny cute heart`) },
  { id: "t13-clapperboard", ref: "onesie", prompt: ONESIE("natural cream", `a cute illustrated film clapperboard in black and cream; on the board lines "RITORNO", "IL SEGRETO", "and now… KAN"; above it small ${BRAND}; tiny film-camera doodle`) },
];

const refs = {
  sweat: await presign(path.join(here, "reference-sweatshirt.png"), "gianna-film/gifts/ref-sweatshirt.png"),
  onesie: await presign(path.join(here, "reference.png"), "gianna-film/gifts/onesie-reference.png"),
  box: await presign(path.join(ROOT, "assets/gen/refs/product_box.jpg"), "gianna-film/gifts/box-reference.jpg"),
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
