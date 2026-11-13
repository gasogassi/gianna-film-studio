// High-res, isolated, flat line-art sources for vector tracing.
import { presign, download, sleep, path, ROOT, pool } from "../../pipeline/lib.mjs";
const here = path.join(ROOT, "gifts/print/src");
const KIE = "https://api.kie.ai/api/v1";
const headers = { Authorization: `Bearer ${process.env.KIE_AI_API_KEY}`, "Content-Type": "application/json" };
const P = (p) => presign(path.join(ROOT, p), "gianna-film/print/" + path.basename(p));
const jobs = [
  { id: "gianna-bra-lineart", ratio: "1:1", refs: [await P("gifts/onesie/milk4/final/b5-powderblue-navy.png"), await P("gifts/onesie/milk/reference-bra.png")],
    prompt: "Redraw ONLY the bra illustration from @Image1 (based on the lace balconette bra in @Image2) as a clean, crisp, high-contrast vector-style line drawing in pure solid black on a pure white background: perfectly symmetrical, centred, filling most of the square, balconette cups with delicate floral lace pattern drawn with clean solid lines, scalloped lace top edge, underwire lines, thin straps and a tiny bow at the centre. Solid black shapes only, no grey, no shading, no gradients, no texture, no text, no fabric." },
  { id: "larven-sprout-art", ratio: "3:4", refs: [await P("gifts/larven/sv07-cream-handdrawn.png")],
    prompt: "Extract and redraw ONLY the printed artwork from the onesie in @Image1 as clean flat vector-style artwork on a pure white background, no onesie, no fabric, no shadows: the cute doodle sprout with a smiling face (leaves in flat solid blue #2F5BFF, outlines and face in solid charcoal #2B2B2B, little motion lines in charcoal) and below it the hand-drawn marker lettering \"SEED ROUND:\" and \"SUCCESSFUL.\" in solid charcoal #2B2B2B exactly as in @Image1. Do NOT include the Larven logo. Only two flat solid colours (charcoal and that blue), crisp edges, no gradients, no texture, large and centred." },
];
await pool(jobs, 2, async (j) => {
  const c = await fetch(`${KIE}/jobs/createTask`, { method: "POST", headers, body: JSON.stringify({ model: "gpt-image-2-image-to-image", input: { prompt: j.prompt, input_urls: j.refs, aspect_ratio: j.ratio, output_format: "png" } }) }).then((r) => r.json());
  const id = c?.data?.taskId; if (!id) throw new Error(JSON.stringify(c));
  for (let i = 0; i < 100; i++) { await sleep(6000); const r = await fetch(`${KIE}/jobs/recordInfo?taskId=${id}`, { headers }).then((x) => x.json());
    if (r.data?.state === "success") { await download(JSON.parse(r.data.resultJson).resultUrls[0], path.join(here, j.id + ".png")); return console.log("✓", j.id); }
    if (r.data?.state === "fail") throw new Error(j.id + " " + r.data.failMsg); }
});
