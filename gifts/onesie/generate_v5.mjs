// Gianna × KAN — sarcastic office/e-commerce set (kie.ai GPT Image 2).
import { presign, download, sleep, path, ROOT, pool } from "../../pipeline/lib.mjs";
const here = path.join(ROOT, "gifts/onesie");
const out = path.join(here, "v5"); await import("node:fs").then((fs) => fs.mkdirSync(out, { recursive: true }));
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
const MONO = "a clean monospace typewriter font like an email or terms-and-conditions printout";
const DESIGNS = [
  { id: "x01-not-consulted", ref: "onesie", prompt: ONESIE("oat", `large "I WAS NOT CONSULTED ON THIS LAUNCH." in ${RETRO}, cocoa brown, over three lines; below ${BRAND} in cocoa brown`) },
  { id: "x02-per-my-last-cry", ref: "onesie", prompt: ONESIE("natural cream", `an email-style print in ${MONO}, black ink: line "Per my last cry…", then a small signature line "— KAN" and "${"GIANNA BELLUCCI"} HQ" beneath; a tiny envelope icon`) },
  { id: "x03-circle-back", ref: "onesie", prompt: ONESIE("powder blue", `large "LET'S CIRCLE BACK AFTER MY NAP" in ${RETRO}, deep navy, over three lines; below ${BRAND} in deep navy; tiny crescent moon and stars`) },
  { id: "x04-reports-to-me", ref: "onesie", prompt: ONESIE("deep navy blue", `"I REPORT DIRECTLY TO THE BOSS." in bold rounded capitals, warm white; below in mustard yellow "HE REPORTS TO ME."; below ${BRAND} in warm white; tiny mustard crown`) },
  { id: "x05-unpaid-intern", ref: "onesie", prompt: ONESIE("natural cream", `a cute printed staff name tag outline in black ink: ${BRAND} at the top; large "UNPAID INTERN" in bold capitals; below small "DEMANDS MILK"; a tiny baby bottle icon`) },
  { id: "x06-more-meetings", ref: "onesie", prompt: ONESIE("soft sage green", `large "ALREADY IN MORE MEETINGS THAN YOU" in ${RETRO}, deep navy, over three lines; below ${BRAND} in deep navy; tiny cute calendar doodle`) },
  { id: "x07-could-have-been-an-email", ref: "onesie", prompt: ONESIE("oat", `large "THIS COULD HAVE BEEN AN EMAIL" in ${RETRO}, cocoa brown, over three lines; below ${BRAND} in cocoa brown; tiny envelope with a heart`) },
  { id: "x08-no-returns", ref: "onesie", prompt: ONESIE("natural cream", `bold black capitals "NO RETURNS. NO EXCHANGES. NO REFUNDS." over three lines; below it small fine print in ${MONO} "*terms and conditions apply forever"; below ${BRAND} in black`) },
  { id: "x09-delivered-late", ref: "onesie", prompt: ONESIE("powder blue", `a printed shipping label in deep navy ink with a barcode: header ${BRAND}; lines "ESTIMATED: 9 MONTHS", "STATUS: FINALLY"; a big stamp "DELIVERED LATE. WORTH IT." in tomato red`) },
  { id: "x10-cry-louder", ref: "onesie", prompt: ONESIE("deep navy blue", `"CUSTOMER SUPPORT: CLOSED." in bold rounded capitals, warm white; below "TRY CRYING LOUDER." in tomato red; below ${BRAND} in warm white; tiny headset doodle`) },
  { id: "x11-one-star-review", ref: "onesie", prompt: ONESIE("oat", `one single gold star followed by four empty outlined stars; below handwritten script "Woke me up 6 times. Would cry again." in cocoa brown; small "— KAN"; below ${BRAND} in cocoa brown`) },
  { id: "x12-not-in-stores", ref: "onesie", prompt: ONESIE("soft sage green", `large "NOT AVAILABLE IN STORES" in ${RETRO}, deep navy, over three lines; below ${BRAND} in deep navy; tiny smug sunglasses doodle`) },
  { id: "x13-most-demanding-customer", ref: "onesie", prompt: ONESIE("natural cream", `small spaced capitals "OUR MOST DEMANDING" in latte brown; large "CUSTOMER YET" in ${RETRO}, terracotta; below ${BRAND} in latte brown; tiny shopping bag doodle`) },
  { id: "x14-budget-redirected", ref: "onesie", prompt: ONESIE("oat", `"MOMMY'S LINGERIE BUDGET" in bold rounded capitals, cocoa brown; an arrow pointing down; "REDIRECTED TO DIAPERS" in bold rounded capitals, terracotta; below ${BRAND} in cocoa brown; tiny diaper doodle`) },
  { id: "x15-knows-where-milk-is", ref: "onesie", prompt: ONESIE("natural cream", `small italic serif "Designed by women who know women." in latte brown; below large "I KNOW WHERE THE MILK IS." in ${RETRO}, cocoa brown, over two lines; below ${BRAND} in cocoa brown`) },
  { id: "x16-dress-code", ref: "onesie", prompt: ONESIE("powder blue", `"DRESS CODE: OPTIONAL." in bold rounded capitals, deep navy; below "DIAPER: MANDATORY." in tomato red; below ${BRAND} in deep navy; tiny bow tie`) },
  { id: "x17-too-cool-for-lace", ref: "onesie", prompt: ONESIE("deep navy blue", `large "TOO COOL FOR LACE" in ${RETRO}, warm white, over two lines; below ${BRAND} in warm white; tiny pair of sunglasses in mustard`) },
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
