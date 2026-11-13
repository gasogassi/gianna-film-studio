// "I KNOW WHERE THE MILK IS." — 12 colour/design variations (kie.ai GPT Image 2). Real logo composited afterwards (apply_logo.py).
import { presign, download, sleep, path, ROOT, pool } from "../../pipeline/lib.mjs";
const here = path.join(ROOT, "gifts/onesie");
const out = path.join(here, "milk"); await import("node:fs").then((fs) => fs.mkdirSync(out, { recursive: true }));
const KIE = "https://api.kie.ai/api/v1";
const headers = { Authorization: `Bearer ${process.env.KIE_AI_API_KEY}`, "Content-Type": "application/json" };

const RULES = " The ONLY text on the print is exactly \"I KNOW WHERE THE MILK IS.\" and \"GIANNA BELLUCCI\" — no other words, no slogan. All lettering crisp and perfectly spelled. Photorealistic product photo, soft natural light.";
const BRA = "a small simplified flat single-colour line-art icon of the bra in @Image3 (balconette underwire cups with a scalloped lace top edge, thin straps and a narrow band), minimal and elegant, no skin, no text";
const LOGO = "\"GIANNA BELLUCCI\" exactly in the classic engraved roman serif capitals of the wordmark in @Image2, on ONE line";
const P = (color, ink, style) =>
  `Clean e-commerce flat-lay product photo of a ${color} organic cotton baby onesie (bodysuit) with short sleeves and snap buttons on a pure white background, same garment shape and lighting as @Image1. ` +
  `Chest print in ${ink} ink, layout from top to bottom: "I KNOW WHERE THE MILK IS." set in ${style}; directly below it ${LOGO}; directly below the logo ${BRA}. Generous spacing, perfectly centred.` + RULES;
const DESIGNS = [
  { id: "m01-cream-retro", prompt: P("natural cream", "cocoa brown", "a soft retro arched bubbly 70s serif over two lines") },
  { id: "m02-oat-varsity", prompt: P("oat beige", "deep navy", "vintage collegiate varsity block letters, slightly arched, over two lines") },
  { id: "m03-sage-script", prompt: P("soft sage green", "deep forest green", "a flowing elegant handwritten brush script over two lines") },
  { id: "m04-powderblue-block", prompt: P("powder blue", "deep navy", "big chunky rounded sans-serif capitals stacked over three lines") },
  { id: "m05-navy-serif", prompt: P("deep navy blue", "warm cream", "a refined high-contrast italic serif over two lines") },
  { id: "m06-charcoal-typewriter", prompt: P("charcoal grey", "warm white", "a clean typewriter monospace over two lines, like a label") },
  { id: "m07-sand-groovy", prompt: P("warm sand", "terracotta", "a wavy groovy psychedelic 70s display font over two lines") },
  { id: "m08-white-minimal", prompt: P("pure white", "black", "small elegant spaced capitals in a thin modern serif on two lines, very minimal and luxurious") },
  { id: "m09-heather-stamp", prompt: P("heather grey", "dusty blue", "a distressed vintage rubber-stamp style with slightly worn edges, inside a thin oval outline") },
  { id: "m10-skyblue-bubble", prompt: P("light sky blue", "white with a navy outline", "puffy cartoon bubble letters over two lines, playful") },
  { id: "m11-olive-condensed", prompt: P("muted olive", "cream", "tall condensed bold sans-serif capitals stacked over three lines, editorial") },
  { id: "m12-latte-badge", prompt: P("latte brown", "cream", "a circular badge layout with the words curving around the top of a thin circle") },
];

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
