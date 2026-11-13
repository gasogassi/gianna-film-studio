// "I KNOW WHERE THE MILK IS." — 12 colour/design variations (kie.ai GPT Image 2). Real logo composited afterwards (apply_logo.py).
import { presign, download, sleep, path, ROOT, pool } from "../../pipeline/lib.mjs";
const here = path.join(ROOT, "gifts/onesie");
const out = path.join(here, "milk3"); await import("node:fs").then((fs) => fs.mkdirSync(out, { recursive: true }));
const KIE = "https://api.kie.ai/api/v1";
const headers = { Authorization: `Bearer ${process.env.KIE_AI_API_KEY}`, "Content-Type": "application/json" };

const RULES = " Aesthetic: Italian luxury lingerie house, refined, understated, editorial, lots of negative space, nothing cartoonish. The only words are \"I KNOW WHERE THE MILK IS.\" and the \"GIANNA BELLUCCI\" logo (plus any extra words explicitly listed). Lettering crisp, perfectly spelled. Photorealistic luxury product photo, soft natural light.";
const BRA = "an elegant fine-line drawing of the balconette bra in @Image3 (thin even hairline strokes, scalloped lace top edge suggested with a delicate line, slim straps and band), refined like a fashion illustration, no fill, no skin";
const LOGO = "the \"GIANNA BELLUCCI\" logo exactly as the engraved roman serif wordmark in @Image2, on one line";
const SERIF = "a refined high-contrast Didone serif";
const O = (color, print) =>
  `Luxury e-commerce flat-lay product photo of a ${color} premium organic cotton baby onesie (bodysuit) with short sleeves and snap buttons on a pure white background, same garment shape and lighting as @Image1. Chest print: ${print}.` + RULES;
const ONLY = process.argv.slice(2);
const DESIGNS_ALL = [
  { id: "e01-ivory-classic", prompt: O("ivory", `small black ${SERIF} capitals with very wide letter-spacing "I KNOW WHERE THE MILK IS." on two lines; below ${BRA} in black; below ${LOGO} in black, small`) },
  { id: "e02-black-gold", prompt: O("black", `everything in shiny GOLD FOIL: "I know where the milk is." in an elegant ${SERIF} italic on two lines; ${BRA} in gold; ${LOGO} in gold`) },
  { id: "e03-cream-tonal-embroidery", prompt: O("cream", `tone-on-tone raised EMBROIDERY in cream thread slightly lighter than the fabric: "I know where the milk is." in a fine script, ${BRA} stitched below, ${LOGO} stitched small — subtle and luxurious`) },
  { id: "e04-champagne-italic", prompt: O("champagne", `small espresso-brown spaced capitals "I KNOW WHERE" above a large elegant ${SERIF} italic "the milk is." in espresso brown; below ${BRA} in espresso; below ${LOGO} in espresso`) },
  { id: "e05-stone-lace-trim", prompt: O("stone grey", `"I KNOW WHERE THE MILK IS." in black ${SERIF} capitals with wide spacing; below it a delicate horizontal black lace trim border line across the chest like lingerie lace; below the lace ${LOGO} in black; ${BRA} small and fine above the text`) },
  { id: "e06-navy-crest", prompt: O("deep navy", `an ivory fine-line crest: ${BRA} inside a thin oval frame flanked by delicate laurel branches; below the crest "I KNOW WHERE THE MILK IS." in small ivory ${SERIF} capitals; below ${LOGO} in ivory`) },
  { id: "e07-white-editorial", prompt: O("pure white", `editorial magazine layout in black: "I know where" and "the milk is." in a large elegant ${SERIF} italic, left-aligned; a small ${BRA} to the right; a thin horizontal hairline rule; ${LOGO} small below, left-aligned`) },
  { id: "e08-sand-perfume-label", prompt: O("warm sand", `a luxury perfume-label composition in espresso brown: a thin rectangular double-line frame; inside, centred: ${BRA}, then "I KNOW WHERE THE MILK IS." in small ${SERIF} capitals, then ${LOGO}`) },
  { id: "e09-ivory-calligraphy", prompt: O("ivory", `in soft dusty-rose ink: "I know where the milk is." in delicate flowing calligraphy; below ${BRA} with a tiny bow at the centre gore; below ${LOGO} in dusty rose`) },
  { id: "e10-black-minimal", prompt: O("black", `extreme luxury minimalism in white: a small ${BRA} at the centre of the chest; below it tiny widely-spaced capitals "I KNOW WHERE THE MILK IS."; below ${LOGO} tiny`) },
  { id: "e11-cream-gold-black", prompt: O("cream", `"I KNOW WHERE THE MILK IS." in black ${SERIF} capitals with wide spacing on two lines; ${BRA} in shiny GOLD FOIL below; ${LOGO} in black below the bra`) },
  { id: "e12-dove-logo-band", prompt: O("dove grey", `"I know where the milk is." in an elegant black ${SERIF} italic; below it a horizontal printed graphic of a black lingerie elastic band, exactly like the logo band on the bra in @Image3, with "GIANNA BELLUCCI" repeated in white along the band; ${BRA} small above the text in black`) },
];

const DESIGNS = DESIGNS_ALL.filter((d) => !ONLY.length || ONLY.includes(d.id));
const refs = [
  await presign(path.join(here, "reference.png"), "gianna-film/gifts/onesie-reference.png"),
  await presign(path.join(here, "milk/reference-logo.png"), "gianna-film/gifts/gb-logo-ref.png"),
  await presign(path.join(here, "milk/reference-bra.png"), "gianna-film/gifts/gb-bra-ref.png"),
];
await pool(DESIGNS, 5, async (d) => {
  const create = await fetch(`${KIE}/jobs/createTask`, { method: "POST", headers,
    body: JSON.stringify({ model: "gpt-image-2-image-to-image", input: { prompt: d.prompt, input_urls: refs, aspect_ratio: "3:4", output_format: "png" } }) }).then((r) => r.json());
  const taskId = create?.data?.taskId; if (!taskId) throw new Error(`${d.id}: ${JSON.stringify(create).slice(0, 300)}`);
  for (let i = 0; i < 100; i++) {
    await sleep(6000);
    const r = await fetch(`${KIE}/jobs/recordInfo?taskId=${taskId}`, { headers }).then((x) => x.json());
    if (r.data?.state === "success") { await download(JSON.parse(r.data.resultJson).resultUrls[0], path.join(out, `${d.id}.png`)); return console.log(`✓ ${d.id}`); }
    if (r.data?.state === "fail") throw new Error(`${d.id}: ${r.data.failMsg}`);
  }
});
