// "I KNOW WHERE THE MILK IS." — 12 colour/design variations (kie.ai GPT Image 2). Real logo composited afterwards (apply_logo.py).
import { presign, download, sleep, path, ROOT, pool } from "../../pipeline/lib.mjs";
const here = path.join(ROOT, "gifts/onesie");
const out = path.join(here, "milk2"); await import("node:fs").then((fs) => fs.mkdirSync(out, { recursive: true }));
const KIE = "https://api.kie.ai/api/v1";
const headers = { Authorization: `Bearer ${process.env.KIE_AI_API_KEY}`, "Content-Type": "application/json" };

const RULES = " The only words on the print are \"I KNOW WHERE THE MILK IS.\" and the \"GIANNA BELLUCCI\" logo (plus any extra words explicitly listed) — no slogan, nothing else. All lettering crisp and perfectly spelled. Photorealistic product photo, soft natural light.";
const BRA = "a VERY simple minimal bra icon based on the shape of @Image3: two rounded balconette cups with a gently scalloped top edge, two thin straps and a narrow band, drawn as a clean single-weight line icon (like a premium app icon), no lace detail, no shading, no skin";
const LOGO = "the \"GIANNA BELLUCCI\" logo exactly as the engraved roman serif wordmark in @Image2, on one line";
const O = (color, print) =>
  `Clean e-commerce flat-lay product photo of a ${color} organic cotton baby onesie (bodysuit) with short sleeves and snap buttons on a pure white background, same garment shape and lighting as @Image1. Chest print: ${print}.` + RULES;
const ONLY = process.argv.slice(2);
const DESIGNS_ALL = [
  { id: "n01-map-pin", prompt: O("natural cream", `a large map location pin in cocoa brown with ${BRA} inside the pin head in cream; below it "I KNOW WHERE THE MILK IS." in bold rounded capitals, cocoa brown; below ${LOGO} in cocoa brown`) },
  { id: "n02-treasure-map", prompt: O("oat beige", `a cute treasure-map illustration in deep brown ink: a dotted path winding to a big red "X", with ${BRA} drawn at the X; above the map "I KNOW WHERE THE MILK IS." in a hand-drawn pirate-map serif; small words "X MARKS THE SPOT" near the X; below ${LOGO}`) },
  { id: "n03-navigation", prompt: O("powder blue", `a phone-navigation style card in deep navy: a route line ending at a pin containing ${BRA}; header "DESTINATION: MILK" small; below the card "I KNOW WHERE THE MILK IS." in bold sans capitals, deep navy; below ${LOGO} in deep navy`) },
  { id: "n04-hero-icon", prompt: O("soft sage green", `${BRA} very large as the hero of the print in deep forest green; below it small spaced capitals "I KNOW WHERE THE MILK IS."; below ${LOGO} in deep forest green`) },
  { id: "n05-embroidered", prompt: O("natural cream", `looks EMBROIDERED with raised thread stitching in cocoa-brown thread: "I KNOW WHERE THE MILK IS." in a cursive script, ${BRA} stitched below, then ${LOGO} stitched small`) },
  { id: "n06-speech-bubble", prompt: O("light sky blue", `a tiny cute line doodle of a baby face at the bottom left saying a speech bubble that contains "I KNOW WHERE THE MILK IS." in bold rounded navy capitals; a small ${BRA} in navy inside the bubble's tail area; below ${LOGO} in navy`) },
  { id: "n07-dairy-label", prompt: O("muted olive", `a vintage 1950s dairy-brand oval emblem in cream ink with a thin double border and small decorative stars: inside, ${BRA} at the top, then "I KNOW WHERE THE MILK IS." in a classic bold serif across a ribbon banner, then ${LOGO} small at the bottom inside the oval`) },
  { id: "n08-heart-script", prompt: O("dusty blue", `"I KNOW WHERE" in small spaced navy capitals, then "the milk is." large in a playful bouncy navy script with a little flourish; below ${BRA} in white with a tiny heart above it; below ${LOGO} in navy`) },
  { id: "n09-arrow-pointing", prompt: O("deep navy blue", `"I KNOW WHERE THE MILK IS." in bold rounded capitals, warm cream; a playful hand-drawn curved arrow in mustard yellow pointing sideways off the print with a small ${BRA} in cream at the arrow tip; below ${LOGO} in cream`) },
  { id: "n10-milk-carton", prompt: O("natural cream", `a cute retro milk-carton illustration in cocoa brown line art with a cream label panel; on the label panel ONLY the words "I KNOW WHERE THE MILK IS." in bold rounded capitals (no face, no icon on the carton); next to the carton on the right ${BRA} in cocoa brown; below both ${LOGO} in cocoa brown`) },
  { id: "n11-sticker-badge", prompt: O("terracotta", `a round retro sticker badge in cream with a thin double border: around the top edge "I KNOW WHERE THE MILK IS." curved; ${BRA} in the centre in terracotta; ${LOGO} curved along the bottom edge`) },
  { id: "n12-stacked-bold", prompt: O("charcoal grey", `huge stacked bold condensed capitals filling the chest: "I KNOW" / "WHERE" / "THE MILK" / "IS." in warm white, with the word "MILK" in a soft blush tone; ${BRA} small in warm white; ${LOGO} small in warm white at the bottom`) },
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
