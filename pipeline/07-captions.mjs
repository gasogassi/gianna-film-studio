// Step 7 — HyperFrames subtitle pass (Larven's HyperFrames Lambda, eu-north-1).
// Builds a HyperFrames composition (conformed film + GSAP caption layer) from word timings, renders it.
// Usage: node pipeline/07-captions.mjs [--local-preview]
import { ROOT, FILM, GEN, path, ensure, readFileSync, writeFileSync, download, OUT } from "./lib.mjs";
import { copyFileSync } from "node:fs";

const edit = JSON.parse(readFileSync(path.join(FILM, "edit.json"), "utf8"));
const narr = JSON.parse(readFileSync(path.join(GEN, "audio/narration.json"), "utf8"));
const dlg = JSON.parse(readFileSync(path.join(GEN, "dialogue/dialogue.json"), "utf8"));

// ---- 1. Global word timeline (narration + dialogue), from the A1/A2 events on the edit ----
const phrases = [];
const chunk = (words, kind) => {
  // Phrase-based subtitling: break on punctuation / ellipses, max 5 words, never orphan a word.
  // Linguistic line breaks: punctuation first; an over-long clause breaks *before* a preposition /
  // conjunction (never leaving one dangling at the end of a subtitle).
  const MAX = 7;
  const BREAK_BEFORE = /^(in|at|on|for|to|and|but|with|of|then|so|because|like)$/i;
  const punct = (w) => /[.,?!…]$/.test(w.text);
  const clauses = [];
  let cur = [];
  words.forEach((w) => { cur.push(w); if (punct(w)) { clauses.push(cur); cur = []; } });
  if (cur.length) clauses.push(cur);
  for (const c of clauses) {
    let rest = c;
    while (rest.length > MAX) {
      let cut = -1;
      for (let i = Math.min(MAX, rest.length - 2); i >= 2; i--) if (BREAK_BEFORE.test(rest[i].text)) { cut = i; break; }
      if (cut < 0) cut = Math.ceil(rest.length / 2);
      phrases.push({ kind, words: rest.slice(0, cut) });
      rest = rest.slice(cut);
    }
    if (rest.length === 1 && phrases.length && phrases.at(-1).kind === kind && phrases.at(-1).words.length < MAX &&
        rest[0].start - phrases.at(-1).words.at(-1).end < 0.3) phrases.at(-1).words.push(rest[0]); // no orphans
    else phrases.push({ kind, words: rest });
  }
};
for (const e of edit.sound) {
  const off = e.at - (e.in ?? 0);
  const inWin = (w) => w.start >= (e.in ?? 0) - 0.05 && w.start < (e.in ?? 0) + e.dur;
  if (e.track === "A1") {
    const id = e.label;
    chunk(narr[id].words.filter(inWin).map((w) => ({ text: w.text, start: w.start + off, end: w.end + off })), "vo");
  } else if (e.track === "A2" && e.label) {
    // label = "<shot>:<speaker>:<lineId>". Subtitle text comes from the script (ASR can mishear),
    // timing comes from the transcript's word onsets.
    const [shot, , lineId] = e.label.split(":");
    const heard = dlg[shot].words.filter(inWin);
    const line = dlg[shot].lines.find((l) => l.id === lineId)?.line;
    if (!heard.length || !line) continue;
    const script = line.split(/\s+/);
    const t0 = heard[0].start, t1 = heard.at(-1).end;
    const words = script.map((text, i) =>
      script.length === heard.length
        ? { text, start: heard[i].start + off, end: heard[i].end + off }
        : { text, start: t0 + ((t1 - t0) * i) / script.length + off, end: t0 + ((t1 - t0) * (i + 1)) / script.length + off },
    );
    chunk(words, "dlg");
  }
}
phrases.sort((a, b) => a.words[0].start - b.words[0].start);
// Minimum reading time: a phrase spoken in < 0.7s merges with the next phrase of the same speaker.
for (let i = 0; i < phrases.length - 1; i++) {
  const a = phrases[i], b = phrases[i + 1];
  if (a.kind === b.kind && a.words.at(-1).end - a.words[0].start < 0.7 && b.words[0].start - a.words.at(-1).end < 0.5 && a.words.length + b.words.length <= 7) {
    a.words.push(...b.words); phrases.splice(i + 1, 1); i--;
  }
}
for (let i = 0; i < phrases.length; i++) {
  const p = phrases[i];
  p.start = p.words[0].start - 0.08;
  const next = phrases[i + 1]?.words[0].start ?? Infinity;
  p.end = Math.min(p.words.at(-1).end + 0.45, next - 0.1); // hold for reading, never overlap
}

// ---- 2. HyperFrames composition ----
const W = 1080, H = 1920, FPS = edit.fps, D = edit.duration;
const dir = ensure(path.join(GEN, "hyperframes"));
copyFileSync(OUT("nocaptions.mp4"), path.join(dir, "film.mp4"));

const html = `<!doctype html>
<html lang="en"><head><meta charset="UTF-8" />
<meta name="viewport" content="width=${W}, height=${H}" />
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Urbanist:ital,wght@0,500;0,600;1,400;1,500&display=block" />
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${W}px;height:${H}px;overflow:hidden;background:#000}
#root{position:absolute;inset:0}
#film{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
/* Subtitles sit in the safe zone above platform UI (Reels/TikTok bottom ~22%). */
#scrim{position:absolute;left:-60px;right:-60px;top:1150px;height:560px;opacity:0;pointer-events:none;background:radial-gradient(closest-side,rgba(0,0,0,.40) 0%,rgba(0,0,0,.22) 45%,rgba(0,0,0,0) 100%)}
#subs{position:absolute;left:90px;right:90px;top:1270px;height:300px;display:flex;align-items:flex-start;justify-content:center}
.ph{position:absolute;left:0;right:0;text-align:center;opacity:0;font-family:Urbanist,sans-serif;font-size:58px;line-height:1.22;color:#fff;
  text-shadow:0 2px 22px rgba(0,0,0,.8),0 1px 4px rgba(0,0,0,.9),0 0 2px rgba(0,0,0,.6);letter-spacing:.2px}
.ph.vo{font-style:italic;font-weight:500}
.ph.dlg{font-weight:600}
.w{display:inline-block;opacity:.55;transform:translateY(6px);will-change:opacity,transform}
.w.on{color:#fff}
.ph.dlg .w.hl{color:#f3d9c4}
</style>
<script>window.__SUBS__=${JSON.stringify(phrases)};</script>
</head><body>
<div id="root" data-composition-id="main" data-start="0" data-duration="${D}" data-width="${W}" data-height="${H}">
  <video id="film" class="clip" src="film.mp4" muted playsinline data-start="0" data-duration="${D}" data-track-index="0"></video>
  <audio id="mix" src="film.mp4" data-start="0" data-duration="${D}" data-track-index="2" data-volume="1"></audio>
  <div id="scrim"></div>
  <div id="subs"></div>
</div>
<script>
(function(){
  window.__timelines = window.__timelines || {};
  var tl = gsap.timeline({ paused: true });
  function build(){
    var subs = document.getElementById('subs');
    window.__SUBS__.forEach(function(p, i){
      var el = document.createElement('div');
      el.className = 'ph ' + p.kind;
      p.words.forEach(function(w, j){
        var s = document.createElement('span'); s.className = 'w'; s.textContent = w.text;
        el.appendChild(s); if (j < p.words.length - 1) el.appendChild(document.createTextNode(' '));
      });
      subs.appendChild(el);
      var spans = el.querySelectorAll('.w');
      // Calm, broadcast-paced reveal: the phrase fades in, each word settles exactly on its spoken onset.
      tl.to(el, { opacity: 1, duration: 0.22, ease: 'power1.out' }, p.start);
      p.words.forEach(function(w, j){
        tl.to(spans[j], { opacity: 1, y: 0, duration: 0.18, ease: 'power2.out' }, Math.max(p.start, w.start - 0.04));
      });
      tl.to(el, { opacity: 0, duration: 0.25, ease: 'power1.in' }, Math.max(p.start + 0.3, p.end - 0.25));
    });
    // Scrim only while subtitles are on screen; phrases < 0.8s apart share one scrim (no flicker).
    var spans = [];
    window.__SUBS__.forEach(function(p){
      var last = spans[spans.length - 1];
      if (last && p.start - last[1] < 0.8) last[1] = p.end; else spans.push([p.start, p.end]);
    });
    spans.forEach(function(sp){
      tl.to('#scrim', { opacity: 1, duration: 0.35, ease: 'power1.out' }, Math.max(0, sp[0] - 0.1));
      tl.to('#scrim', { opacity: 0, duration: 0.45, ease: 'power1.in' }, sp[1] - 0.2);
    });
    tl.set({}, {}, ${D});
  }
  document.fonts.load('italic 500 58px "Urbanist"').then(function(){ return document.fonts.load('600 58px "Urbanist"'); })
    .catch(function(){}).then(function(){ build(); window.__timelines['main'] = tl; });
})();
</script>
</body></html>`;
writeFileSync(path.join(dir, "index.html"), html);
writeFileSync(path.join(dir, "subs.json"), JSON.stringify(phrases, null, 2));
console.log(`✓ composition: ${phrases.length} phrases`);

// ---- 3. Render on HyperFrames Lambda ----
if (!process.argv.includes("--local-preview")) {
  process.env.AWS_ACCESS_KEY_ID = process.env.REMOTION_AWS_ACCESS_KEY_ID;
  process.env.AWS_SECRET_ACCESS_KEY = process.env.REMOTION_AWS_SECRET_ACCESS_KEY;
  const { renderToLambda, getRenderProgress } = await import("@hyperframes/aws-lambda/sdk");
  const region = process.env.HYPERFRAMES_LAMBDA_REGION;
  const h = await renderToLambda({
    projectDir: dir, bucketName: process.env.HYPERFRAMES_LAMBDA_BUCKET, stateMachineArn: process.env.HYPERFRAMES_LAMBDA_STATE_MACHINE_ARN, region,
    config: { width: W, height: H, fps: FPS, format: "mp4", codec: "h264", quality: "high", chunkSize: 240, maxParallelChunks: 12 },
  });
  console.log(`  hyperframes render ${h.renderId}`);
  for (;;) {
    await new Promise((r) => setTimeout(r, 6000));
    const p = await getRenderProgress({ executionArn: h.executionArn, region, defaultMemorySizeMb: Number(process.env.HYPERFRAMES_LAMBDA_MEMORY_MB) });
    if (p.fatalErrorEncountered || ["FAILED", "TIMED_OUT", "ABORTED"].includes(p.status)) throw new Error(JSON.stringify(p.errors?.[0] ?? p.status));
    if (p.status === "SUCCEEDED" && p.outputFile) {
      const m = /^s3:\/\/([^/]+)\/(.+)$/.exec(p.outputFile.s3Uri);
      const { S3Client, GetObjectCommand } = await import("@aws-sdk/client-s3");
      const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
      const url = await getSignedUrl(new S3Client({ region }), new GetObjectCommand({ Bucket: m[1], Key: m[2] }), { expiresIn: 3600 });
      const out = OUT("final.mp4");
      await download(url, out);
      console.log(`✓ ${out} (hyperframes cost ~$${p.costs?.accruedSoFarUsd ?? "?"})`);
      break;
    }
  }
}
