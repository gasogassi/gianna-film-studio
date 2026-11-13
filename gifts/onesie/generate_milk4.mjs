// G24 "bold stacked" — more detailed, 6 colour combinations (kie.ai GPT Image 2, image-to-image from the chosen design).
import { presign, download, sleep, path, ROOT, pool } from "../../pipeline/lib.mjs";
const here = path.join(ROOT, "gifts/onesie");
const out = path.join(here, "milk4");
const KIE = "https://api.kie.ai/api/v1";
const headers = { Authorization: `Bearer ${process.env.KIE_AI_API_KEY}`, "Content-Type": "application/json" };

const BASE = (onesie, text, accent, bra) =>
  `Recreate the baby onesie design in @Image1 with EXACTLY the same layout, composition, proportions and typography: huge stacked bold condensed sans-serif capitals "I KNOW" / "WHERE" / "THE MILK" / "IS." with the bra icon to the right of "IS." and the "GIANNA BELLUCCI" logo (engraved roman serif as in @Image2) centred below. ` +
  `Change only the colours and add refinement and detail: onesie fabric ${onesie}; main lettering ${text}; the word "MILK" in ${accent}; logo in ${text}. ` +
  `Make the bra icon more detailed and premium: a fine illustrated balconette bra based on @Image3 with delicate visible floral lace pattern, scalloped lace edge, underwire lines, thin straps and a tiny bow, drawn in ${bra}. ` +
  `Give the print a soft, high-quality screen-printed texture. Same flat-lay e-commerce product photo, white background, soft light. The only words are "I KNOW WHERE THE MILK IS." and "GIANNA BELLUCCI", perfectly spelled.`;
const DESIGNS = [
  { id: "b1-charcoal-blush", prompt: BASE("charcoal grey", "warm white", "soft blush pink", "warm white line art") },
  { id: "b2-black-gold", prompt: BASE("deep black", "ivory", "shiny metallic gold foil", "shiny metallic gold foil line art") },
  { id: "b3-ivory-rose", prompt: BASE("ivory", "black", "dusty rose", "black line art") },
  { id: "b4-navy-sky", prompt: BASE("deep navy blue", "cream", "soft sky blue", "cream line art") },
  { id: "b5-powderblue-navy", prompt: BASE("powder blue", "deep navy", "white", "deep navy line art") },
  { id: "b6-sand-espresso", prompt: BASE("warm sand", "espresso brown", "blush pink", "espresso brown line art") },
];
const refs = [
  await presign(path.join(here, "milk2/final/n12-stacked-bold.png"), "gianna-film/gifts/g24-base.png"),
  await presign(path.join(here, "milk/reference-logo.png"), "gianna-film/gifts/gb-logo-ref.png"),
  await presign(path.join(here, "milk/reference-bra.png"), "gianna-film/gifts/gb-bra-ref.png"),
];
await pool(DESIGNS, 6, async (d) => {
  for (let attempt = 1; attempt <= 2; attempt++) {
    const create = await fetch(`${KIE}/jobs/createTask`, { method: "POST", headers,
      body: JSON.stringify({ model: "gpt-image-2-image-to-image", input: { prompt: d.prompt, input_urls: refs, aspect_ratio: "3:4", output_format: "png" } }) }).then((r) => r.json());
    const taskId = create?.data?.taskId; if (!taskId) throw new Error(`${d.id}: ${JSON.stringify(create).slice(0, 200)}`);
    for (let i = 0; i < 100; i++) {
      await sleep(6000);
      const r = await fetch(`${KIE}/jobs/recordInfo?taskId=${taskId}`, { headers }).then((x) => x.json());
      if (r.data?.state === "success") { await download(JSON.parse(r.data.resultJson).resultUrls[0], path.join(out, `${d.id}.png`)); return console.log(`✓ ${d.id}`); }
      if (r.data?.state === "fail") { console.log(`  retry ${d.id}: ${r.data.failMsg?.slice(0, 80)}`); break; }
    }
  }
  console.log(`✗ ${d.id}`);
});
