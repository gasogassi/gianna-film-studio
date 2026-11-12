// Gianna × KAN — v4 exploration: Italian angle, fashion-house puns, luxe minimal, new garments (kie.ai GPT Image 2).
import { presign, download, sleep, path, ROOT, pool } from "../../pipeline/lib.mjs";
import fs from "node:fs";
const here = path.join(ROOT, "gifts/onesie");
const out = path.join(here, "v4"); fs.mkdirSync(out, { recursive: true });
const KIE = "https://api.kie.ai/api/v1";
const headers = { Authorization: `Bearer ${process.env.KIE_AI_API_KEY}`, "Content-Type": "application/json" };

const BRAND = 'the words "GIANNA BELLUCCI" on ONE single line in a thin elegant high-contrast serif with wide letter-spacing, like a luxury Italian fashion wordmark';
const RULES = " All lettering crisp, perfectly spelled, exactly the words given, no extra text, no other logos. Cute, playful, tasteful for a baby boy. Photorealistic product photo, soft natural light.";
const ONESIE = (color, print) =>
  `Clean e-commerce flat-lay product photo of a ${color} organic cotton baby onesie (bodysuit) with short sleeves and snap buttons on a pure white background, same garment shape and lighting as the reference image. Print: ${print}.` + RULES;
const FLAT = (garment, print) =>
  `Clean premium e-commerce flat-lay product photo on a soft warm off-white linen background, top-down: ${garment}. ${print}.` + RULES;

const DESIGNS = [
  // Italian angle
  { id: "i1-ciao-belle", ref: "onesie", prompt: ONESIE("soft white", `large flowing hand-lettered brush script "Ciao, belle" in tomato red with a little flourish; below it ${BRAND} in navy; under it a tiny illustration of a red Vespa-style scooter with a heart trailing behind`) },
  { id: "i2-piccolo-amore", ref: "onesie", prompt: ONESIE("pale lemon yellow", `a cute illustration of a Sorrento lemon branch with two lemons and leaves; arched above in elegant navy serif capitals "PICCOLO AMORE"; below it small italic script "KAN" in navy under the lemons; then ${BRAND} in navy small`) },
  { id: "i3-amalfi-stripes", ref: "onesie", prompt: ONESIE("white and navy horizontal Breton-striped", `a small rectangular woven patch sewn on the chest, cream with red stitched border, embroidered with "KAN" in red serif capitals and below it "GIANNA BELLUCCI" tiny in navy; the stripes run across the whole garment`) },
  { id: "i4-made-in-italy", ref: "onesie", prompt: ONESIE("natural cream", `a vintage Italian food-tin style label print in red, green and cream: oval badge with a stitched border, top arch "FATTO CON AMORE", centre big retro serif "KAN", bottom arch ${BRAND}, small "EDIZIONE 2026" ribbon banner across the bottom; tiny sprig of olive leaves`) },
  // Fashion-house / lingerie-brand puns
  { id: "f1-sold-out", ref: "onesie", prompt: ONESIE("blush pink", `bold black condensed sans capitals "SOLD OUT" stamped slightly rotated like a rubber stamp; below it small spaced capitals "9-MONTH WAITLIST · NO RESTOCKS"; below ${BRAND} in black; tiny black heart`) },
  { id: "f2-runway-debut", ref: "onesie", prompt: ONESIE("black", `minimal fashion-week invitation layout in warm white: small spaced capitals "FALL / WINTER 2026"; large elegant serif "KAN"; small italic "runway debut"; thin horizontal hairline; ${BRAND} in warm white`) },
  { id: "f3-face-of-campaign", ref: "onesie", prompt: ONESIE("soft white", `a mock luxury magazine cover layout: masthead "BAMBINO" in huge elegant black high-contrast serif at the top; a cute simple line drawing of a baby face with sunglasses in the middle; cover lines in small black type "KAN: THE FACE OF THE NEW CAMPAIGN" and "MOMMY WORE ${"GIANNA BELLUCCI"}"; small red corner tag "EXCLUSIVE"`) },
  { id: "f4-receipt", ref: "onesie", prompt: ONESIE("oat", `a printed boutique receipt graphic in black thermal-print style on a white paper strip with zigzag torn edges: header ${BRAND}; lines "1 × KAN ........ PRICELESS", "LACE BY MOMMY ........ ✓", "DADDY'S CHANCES ........ 0%", "TOTAL ........ HEARTBREAKER"; bottom a tiny barcode and "NO RETURNS"`) },
  { id: "f5-eau-de-kan", ref: "onesie", prompt: ONESIE("pale powder blue", `an elegant illustration of a classic faceted perfume bottle with a round cap, drawn in navy line art with a soft pink fill; on the bottle label "KAN"; below the bottle "EAU DE BÉBÉ" in small spaced serif capitals; below ${BRAND} in navy`) },
  // Luxe minimal
  { id: "m1-tiny-embroidery", ref: "onesie", prompt: ONESIE("sage green ribbed-knit long-sleeve", `ONLY a tiny delicate embroidery on the left chest: lowercase script "kan" in cream thread with a tiny cream lace bow; nothing else on the front; a small woven neck label reading "GIANNA BELLUCCI"`) },
  { id: "m2-monogram-allover", ref: "onesie", prompt: ONESIE("camel and cream", `EDGE-TO-EDGE all-over luxury monogram pattern covering the entire onesie: an original interlocking "K" and "B" serif monogram alternating with a tiny lace bow motif, cream on camel, evenly tiled like a heritage fashion-house canvas; small woven neck label "GIANNA BELLUCCI"`) },
  { id: "m3-lace-collar", ref: "onesie", prompt: ONESIE("ivory", `a real delicate ivory lace Peter Pan collar trim sewn around the neckline, and below it small embroidered capitals "KAN" in champagne gold thread with ${BRAND} embroidered tiny underneath`) },
  // New garments
  { id: "g1-bib-set", ref: null, prompt: FLAT("a matching set of a cream cotton baby bib, a tiny cream knit beanie and a pair of baby socks, neatly arranged", `the bib is printed in mocha brown: "DROOL-PROOF" small capitals, big retro rounded "KAN", and ${BRAND} small; the beanie has a tiny embroidered lace bow; the socks have "LE" and "KAN" on each sole`) },
  { id: "g2-swaddle", ref: null, prompt: FLAT("a folded oversized soft muslin baby swaddle blanket in warm cream with a satin ribbon", `the blanket has an all-over pattern of tiny navy hand-drawn lace bows and little red hearts; one folded corner shows embroidered "KAN" in navy serif and "GIANNA BELLUCCI" small under it; a gift tag on the ribbon reads "welcome, KAN"`) },
  { id: "g3-bucket-hat-set", ref: null, prompt: FLAT("a summer outfit: a tiny navy-and-white gingham baby bucket hat, a white linen baby romper with shoulder ties, and tiny round baby sunglasses", `the romper has a small chest embroidery "KAN" in navy with a tiny red heart; the hat brim has a small woven tag "GIANNA BELLUCCI"`) },
  { id: "g4-gift-box", ref: null, prompt: FLAT("an open luxury gift box with tissue paper, inside a neatly folded cream baby onesie and a tiny satin ribbon, a lace bow on the lid", `the box lid is matte black with ${BRAND} in gold foil; the folded onesie shows "KAN" in mocha retro letters; a small handwritten card reads "For KAN — with love, the Gianna Bellucci team"`) },
];

const onesieRef = await presign(path.join(here, "reference.png"), "gianna-film/gifts/onesie-reference.png");
const only = process.argv.slice(2);
const todo = DESIGNS.filter((d) => !only.length || only.includes(d.id));
const fails = [];
await pool(todo, 6, async (d) => {
  try {
    const input = d.ref ? { prompt: d.prompt, input_urls: [onesieRef], aspect_ratio: "3:4", output_format: "png" }
                        : { prompt: d.prompt, aspect_ratio: "3:4", output_format: "png" };
    const model = d.ref ? "gpt-image-2-image-to-image" : "gpt-image-2-text-to-image";
    const create = await fetch(`${KIE}/jobs/createTask`, { method: "POST", headers, body: JSON.stringify({ model, input }) }).then((r) => r.json());
    const taskId = create?.data?.taskId; if (!taskId) throw new Error(JSON.stringify(create).slice(0, 300));
    for (let i = 0; i < 120; i++) {
      await sleep(6000);
      const r = await fetch(`${KIE}/jobs/recordInfo?taskId=${taskId}`, { headers }).then((x) => x.json());
      if (r.data?.state === "success") { await download(JSON.parse(r.data.resultJson).resultUrls[0], path.join(out, `${d.id}.png`)); return console.log(`✓ ${d.id}`); }
      if (r.data?.state === "fail") throw new Error(r.data.failMsg);
    }
    throw new Error("timeout");
  } catch (e) { fails.push(d.id); console.log(`✗ ${d.id}: ${e.message}`); }
});
console.log("failed:", fails.join(" ") || "none");
