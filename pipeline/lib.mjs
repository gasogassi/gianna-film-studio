// Shared helpers: env, ModelArk (Seedream / Seedance 2.5), ElevenLabs, file IO.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const FILM_ID = process.env.FILM ?? "ritorno";
export const FILM = path.join(ROOT, "film", FILM_ID);
export const GEN = path.join(ROOT, FILM_ID === "ritorno" ? "assets/gen" : `assets/gen-${FILM_ID}`);
/** Remotion public/ subfolder for this film's media ("" for ritorno = legacy root). */
export const PUB_PREFIX = FILM_ID === "ritorno" ? "" : `${FILM_ID}/`;
export const COMPOSITION = FILM_ID[0].toUpperCase() + FILM_ID.slice(1);
export const OUT = (suffix) => path.join(ROOT, "out", `${FILM_ID}-${suffix}`);
export const PUBLIC = path.join(ROOT, "public");

for (const line of readFileSync(path.join(ROOT, ".env"), "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

export const ARK = "https://ark.ap-southeast.bytepluses.com/api/v3";
export const SEEDANCE_25 = "dreamina-seedance-2-5-260628";
export const SEEDREAM_5_PRO = "dola-seedream-5-0-pro-260628";

export const shots = () => JSON.parse(readFileSync(path.join(FILM, "shots.json"), "utf8"));
export const ensure = (d) => (mkdirSync(d, { recursive: true }), d);
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function fill(template, spec) {
  return template.replace(/\{(\w+)\}/g, (_, k) => spec.characters[k] ?? `{${k}}`);
}

export function dataUri(file) {
  const ext = path.extname(file).slice(1).replace("jpg", "jpeg");
  return `data:image/${ext};base64,${readFileSync(file).toString("base64")}`;
}

async function ark(pathname, body, method = "POST") {
  const res = await fetch(`${ARK}${pathname}`, {
    method,
    headers: { Authorization: `Bearer ${process.env.ARK_API_KEY}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`ARK ${res.status} ${pathname}: ${JSON.stringify(json).slice(0, 600)}`);
  return json;
}

export async function download(url, file) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download ${res.status} ${url}`);
  ensure(path.dirname(file));
  writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  return file;
}

/** Seedream 5 Pro still. `images` = local reference files (sent inline as base64). */
export async function seedream({ prompt, images = [], size = "1440x2560", out, seed }) {
  const body = { model: SEEDREAM_5_PRO, prompt, size, response_format: "url", watermark: false };
  if (images.length) body.image = images.length === 1 ? dataUri(images[0]) : images.map(dataUri);
  if (seed != null) body.seed = seed;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const r = await ark("/images/generations", body);
      return download(r.data[0].url, out);
    } catch (e) {
      if (attempt === 3) throw e;
      console.warn(`  seedream retry ${attempt}: ${e.message.slice(0, 200)}`);
      await sleep(4000 * attempt);
    }
  }
}

// ---------------- S3 (public-ish presigned URLs for providers that need a URL) ----------------
let _s3;
export async function presign(file, key = `gianna-film/${path.basename(file)}`) {
  const { S3Client, PutObjectCommand, GetObjectCommand } = await import("@aws-sdk/client-s3");
  const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
  _s3 ??= new S3Client({ region: process.env.AWS_REGION });
  const Bucket = process.env.S3_BUCKET_NAME;
  const ext = path.extname(file).slice(1).toLowerCase();
  const ContentType = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", mp4: "video/mp4", mp3: "audio/mpeg", wav: "audio/wav" }[ext];
  await _s3.send(new PutObjectCommand({ Bucket, Key: key, Body: readFileSync(file), ContentType }));
  return getSignedUrl(_s3, new GetObjectCommand({ Bucket, Key: key }), { expiresIn: 6 * 3600 });
}

// ---------------- kie.ai Seedance 2.5 gateway (fallback when ModelArk rejects faces) ----------------
const KIE = "https://api.kie.ai/api/v1";
export async function seedanceKie({ prompt, firstFrame, duration, audio = true, out }) {
  const url = await presign(firstFrame, `gianna-film/keyframes/${path.basename(firstFrame)}`);
  const headers = { Authorization: `Bearer ${process.env.KIE_AI_API_KEY}`, "Content-Type": "application/json" };
  const create = await fetch(`${KIE}/jobs/createTask`, {
    method: "POST", headers,
    body: JSON.stringify({
      model: "bytedance/seedance-2-5",
      input: {
        prompt: `Start the video exactly with @Image1 as the first frame, same framing, people and lighting. ${prompt}`,
        reference_image_urls: [url], duration, resolution: "720p", aspect_ratio: "9:16", generate_audio: audio,
      },
    }),
  }).then((r) => r.json());
  const taskId = create?.data?.taskId;
  if (!taskId) throw new Error(`kie create failed: ${JSON.stringify(create).slice(0, 400)}`);
  const t0 = Date.now();
  for (;;) {
    await sleep(10000);
    const r = await fetch(`${KIE}/jobs/recordInfo?taskId=${taskId}`, { headers }).then((x) => x.json());
    const d = r.data ?? {};
    if (d.state === "success") return download(JSON.parse(d.resultJson).resultUrls[0], out);
    if (d.state === "fail") throw new Error(`kie fail: ${d.failMsg ?? JSON.stringify(d).slice(0, 300)}`);
    if (Date.now() - t0 > 25 * 60_000) throw new Error(`kie timeout ${taskId}`);
  }
}

/** Seedance 2.5 image-to-video from a first frame: ModelArk first, kie.ai on face/content rejection. */
export async function seedanceAny(opts) {
  try {
    return await seedance(opts);
  } catch (e) {
    if (!/SensitiveContent|PrivacyInformation|real person/i.test(e.message)) throw e;
    console.log(`  ↪ ${path.basename(opts.out)}: ModelArk face rejection → kie.ai Seedance 2.5`);
    return seedanceKie(opts);
  }
}

/** Seedance 2.5 image-to-video from a first frame. Returns the local mp4 path. */
export async function seedance({ prompt, firstFrame, duration, audio = true, out, ratio = "9:16" }) {
  const content = [{ type: "text", text: prompt }];
  if (firstFrame) content.push({ type: "image_url", image_url: { url: dataUri(firstFrame) }, role: "first_frame" });
  // With a first frame, the output ratio must follow the image (ark rejects an explicit ratio).
  const body = { model: SEEDANCE_25, content, duration, resolution: "720p", generate_audio: audio, watermark: false };
  if (!firstFrame) body.ratio = ratio;
  const task = await ark("/contents/generations/tasks", body);
  const t0 = Date.now();
  for (;;) {
    await sleep(8000);
    const r = await ark(`/contents/generations/tasks/${task.id}`, null, "GET");
    const s = (r.status || "").toLowerCase();
    if (s === "succeeded") return download(r.content.video_url, out);
    if (["failed", "cancelled", "expired"].includes(s)) throw new Error(`seedance ${s}: ${JSON.stringify(r.error ?? r).slice(0, 400)}`);
    if (Date.now() - t0 > 20 * 60_000) throw new Error(`seedance timeout ${task.id}`);
  }
}

// ---------------- ElevenLabs ----------------
const XI = "https://api.elevenlabs.io/v1";
const xiHeaders = () => ({ "xi-api-key": process.env.ELEVEN_LABS_API_KEY });

export async function xiJson(pathname, body) {
  const res = await fetch(`${XI}${pathname}`, {
    method: "POST", headers: { ...xiHeaders(), "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`XI ${res.status} ${pathname}: ${(await res.text()).slice(0, 400)}`);
  return res;
}

export async function xiForm(pathname, form) {
  const res = await fetch(`${XI}${pathname}`, { method: "POST", headers: xiHeaders(), body: form });
  if (!res.ok) throw new Error(`XI ${res.status} ${pathname}: ${(await res.text()).slice(0, 400)}`);
  return res;
}

export async function xiGet(pathname) {
  const res = await fetch(`${XI}${pathname}`, { headers: xiHeaders() });
  if (!res.ok) throw new Error(`XI ${res.status} ${pathname}: ${(await res.text()).slice(0, 300)}`);
  return res.json();
}

/** Run async jobs with a concurrency cap. */
export async function pool(items, limit, fn) {
  const results = [];
  let i = 0;
  await Promise.all(
    Array.from({ length: limit }, async () => {
      while (i < items.length) {
        const idx = i++;
        try { results[idx] = await fn(items[idx], idx); }
        catch (e) { console.error(`✗ ${items[idx].id ?? idx}: ${e.message}`); results[idx] = null; }
      }
    }),
  );
  return results;
}

export { existsSync, readFileSync, writeFileSync, path };
