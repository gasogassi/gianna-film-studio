// Funny Gianna Bellucci baby onesie mockups (gift for the boss) — kie.ai GPT Image 2, image-to-image.
import { presign, download, sleep, path, ROOT, pool } from "../../pipeline/lib.mjs";

const here = path.join(ROOT, "gifts/onesie");
const KIE = "https://api.kie.ai/api/v1";
const headers = { Authorization: `Bearer ${process.env.KIE_AI_API_KEY}`, "Content-Type": "application/json" };

const BASE = (color) =>
  `Clean e-commerce product photo of a plain ${color} cotton baby boy onesie (bodysuit) with short sleeves and snap buttons, ` +
  "flat lay on a pure white background, same garment shape, angle and soft even lighting as the reference image. " +
  "Replace the printed graphic with a new screen-print centred on the chest. All lettering must be crisp, perfectly spelled, with no extra words. ";
// The brand line stays a simple single-colour serif so it can be swapped for the real logo afterwards.
const STYLE = (top, brandColor, art) =>
  `Print layout: ${top}; directly below, "GIANNA BELLUCCI" on ONE single line in a thin elegant serif with wide letter-spacing, solid ${brandColor}; ` +
  `below that ${art}. Generous spacing, perfectly centred, playful but premium.`;
const DESIGNS = [
  { id: "h1-lock-up-your-daughters", color: "deep navy blue", text: STYLE('first line "LOCK UP" and second line "YOUR DAUGHTERS" in bold rounded hand-drawn capitals, warm white; third line "KAN IS HERE" in bold rounded hand-drawn capitals, bright red', "warm white", "a tiny cute red heart illustration") },
  { id: "h2-hide-your-daughters", color: "powder blue", text: STYLE('first line "HIDE YOUR" and second line "DAUGHTERS" in bold rounded hand-drawn capitals, deep navy; third line "KAN HAS ARRIVED" in bold rounded hand-drawn capitals, tomato red', "deep navy", "a tiny cute navy pair of sunglasses illustration") },
  { id: "h3-dads-warn-your-daughters", color: "light heather grey-blue", text: STYLE('first line "DADS, WARN" and second line "YOUR DAUGHTERS" in bold rounded hand-drawn capitals, deep navy; third line "KAN IS COMING" in bold rounded hand-drawn capitals, mustard yellow', "deep navy", "a tiny cute red heart illustration") },
  { id: "h4-future-heartbreaker", color: "soft sage green", text: STYLE('first line "FUTURE" and second line "HEARTBREAKER" in bold rounded hand-drawn capitals, each letter a different cheerful colour (navy, mustard yellow, tomato red, sky blue); third line "KAN" very large in bold rounded hand-drawn capitals, deep navy', "deep navy", "a tiny cute broken red heart illustration") },
  { id: "h5-ladies-man", color: "light sky blue", text: STYLE('first line "LADIES\' MAN" in bold rounded hand-drawn capitals, deep navy; second line "KAN" very large in bold rounded hand-drawn capitals, tomato red; third line "EST. 2026" small in navy spaced capitals', "deep navy", "a tiny cute red-and-navy striped bow tie illustration") },
  { id: "h6-sorry-ladies", color: "deep navy blue", text: STYLE('first line "SORRY LADIES" in bold rounded hand-drawn capitals, mustard yellow; second line "KAN\'S SCHEDULE" and third line "IS FULL" in bold rounded hand-drawn capitals, warm white', "warm white", "a tiny cute mustard heart illustration") },
  { id: "h7-too-cute-for-one-girl", color: "soft sage green", text: STYLE('first line "TOO CUTE FOR" and second line "JUST ONE GIRL" in bold rounded hand-drawn capitals, deep navy; third line "KAN" very large in bold rounded hand-drawn capitals, tomato red', "deep navy", "a tiny cute pair of small hearts illustration") },
  { id: "h8-heartbreaker-in-training", color: "powder blue", text: STYLE('first line "HEARTBREAKER" and second line "IN TRAINING" in bold rounded hand-drawn capitals, deep navy and tomato red; third line "KAN" very large in bold rounded hand-drawn capitals, deep navy', "deep navy", "a tiny cute navy pair of sunglasses illustration") },
];

const ref = await presign(path.join(here, "reference.png"), "gianna-film/gifts/onesie-reference.png");
await pool(DESIGNS, 4, async (d) => {
  const create = await fetch(`${KIE}/jobs/createTask`, {
    method: "POST", headers,
    body: JSON.stringify({ model: "gpt-image-2-image-to-image", input: { prompt: BASE(d.color) + d.text, input_urls: [ref], aspect_ratio: "3:4", output_format: "png" } }),
  }).then((r) => r.json());
  const taskId = create?.data?.taskId;
  if (!taskId) throw new Error(`${d.id}: ${JSON.stringify(create).slice(0, 300)}`);
  for (let i = 0; i < 90; i++) {
    await sleep(6000);
    const r = await fetch(`${KIE}/jobs/recordInfo?taskId=${taskId}`, { headers }).then((x) => x.json());
    if (r.data?.state === "success") { await download(JSON.parse(r.data.resultJson).resultUrls[0], path.join(here, `${d.id}.png`)); return console.log(`✓ ${d.id}`); }
    if (r.data?.state === "fail") throw new Error(`${d.id}: ${r.data.failMsg}`);
  }
  throw new Error(`${d.id}: timeout`);
});
