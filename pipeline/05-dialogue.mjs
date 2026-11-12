// Step 5 — Character dialogue (approved method): the Seedance performance, re-voiced.
//   clip audio → ElevenLabs dialogue isolation → Scribe word timestamps (timing + captions)
//   → ElevenLabs Voice Changer (speech-to-speech, eleven_multilingual_sts_v2, PCM 44.1 kHz) into each
//     character's chosen voice → voice finishing → static gain to -16 LUFS
//   → public/<film>/dialogue_sts/<shot>.<speaker>.wav (clip time, so cutlist in/at maths stay in source time).
// Multi-speaker shots: Scribe words are assigned to the shot's lines in order, by word count.
// Usage: FILM=<id> node pipeline/05-dialogue.mjs [--force] [shot ...]
import { execFileSync, spawnSync } from "node:child_process";
import { FILM, GEN, ROOT, PUB_PREFIX, path, existsSync, ensure, readFileSync, writeFileSync, xiForm } from "./lib.mjs";

const cfg = JSON.parse(readFileSync(path.join(FILM, "audio.json"), "utf8"));
const vdir = path.join(GEN, "video");
const dir = ensure(path.join(GEN, "dialogue"));
const pub = ensure(path.join(ROOT, "public", PUB_PREFIX, "dialogue_sts"));
const args = process.argv.slice(2);
const force = args.includes("--force");
const only = args.filter((a) => !a.startsWith("--"));

const blob = (file, type) => new Blob([readFileSync(file)], { type });
const ff = (a) => execFileSync("ffmpeg", ["-v", "error", "-y", ...a]);
const CHAIN = ["highpass=f=85", "deesser=i=0.35:m=0.5:f=0.5:s=o", "equalizer=f=6800:t=q:w=1.4:g=-2", "equalizer=f=3000:t=q:w=1:g=1.5",
  "acompressor=threshold=-24dB:ratio=2.5:attack=8:release=150:makeup=1", "aresample=48000"];

function finish(srcPcm, out) {
  const tmp = out + ".tmp.wav";
  ff(["-f", "s16le", "-ar", "44100", "-ac", "1", "-i", srcPcm, "-af", CHAIN.join(","), tmp]);
  const r = spawnSync("ffmpeg", ["-nostats", "-i", tmp, "-af", "ebur128", "-f", "null", "-"], { encoding: "utf8" }).stderr;
  const I = parseFloat(r.slice(r.lastIndexOf("Integrated")).match(/I:\s+(-?[\d.]+)/)[1]);
  ff(["-i", tmp, "-af", `volume=${(-16 - I).toFixed(2)}dB,alimiter=limit=0.79:level=disabled`, out]);
  execFileSync("rm", ["-f", tmp]);
}

async function stt(file) {
  const fd = new FormData();
  fd.append("model_id", "scribe_v1");
  fd.append("timestamps_granularity", "word");
  fd.append("language_code", "en");
  fd.append("file", blob(file, "audio/mpeg"), path.basename(file));
  const j = await (await xiForm("/speech-to-text", fd)).json();
  return j.words.filter((w) => w.type === "word").map((w) => ({ text: w.text, start: w.start, end: w.end }));
}

const tPath = path.join(dir, "dialogue.json");
const timing = existsSync(tPath) ? JSON.parse(readFileSync(tPath, "utf8")) : {};
const shotIds = [...new Set(cfg.dialogue.map((d) => d.shot))].filter((s) => !only.length || only.includes(s));

for (const shot of shotIds) {
  const clip = path.join(vdir, `${shot}.mp4`);
  if (!existsSync(clip)) { console.log(`… ${shot} clip missing`); continue; }
  if (timing[shot] && !force) { console.log(`= ${shot}`); continue; }
  const lines = cfg.dialogue.filter((d) => d.shot === shot);

  const raw = path.join(dir, `${shot}.raw.mp3`);
  ff(["-i", clip, "-vn", "-ac", "1", "-ar", "44100", "-b:a", "192k", raw]);
  const fdIso = new FormData();
  fdIso.append("audio", blob(raw, "audio/mpeg"), `${shot}.mp3`);
  const iso = path.join(dir, `${shot}.iso.mp3`);
  writeFileSync(iso, Buffer.from(await (await xiForm("/audio-isolation", fdIso)).arrayBuffer()));

  const words = await stt(iso);
  // Assign words to lines in order by script word count (last line takes the remainder).
  const ranges = {};
  let k = 0;
  lines.forEach((l, i) => {
    const n = i === lines.length - 1 ? words.length - k : Math.min(l.line.split(/\s+/).length, Math.max(1, words.length - k - (lines.length - 1 - i)));
    ranges[l.id] = [k, Math.max(k, k + n - 1)];
    k += n;
  });

  for (const sp of [...new Set(lines.map((l) => l.speaker))]) {
    const fd = new FormData();
    fd.append("model_id", "eleven_multilingual_sts_v2");
    fd.append("remove_background_noise", "true");
    fd.append("voice_settings", JSON.stringify({ stability: 0.5, similarity_boost: 0.9, style: 0.3, use_speaker_boost: true }));
    fd.append("audio", blob(iso, "audio/mpeg"), `${shot}.mp3`);
    const pcm = path.join(dir, `${shot}.${sp}.pcm`);
    writeFileSync(pcm, Buffer.from(await (await xiForm(`/speech-to-speech/${cfg.voices[sp].id}?output_format=pcm_44100`, fd)).arrayBuffer()));
    finish(pcm, path.join(pub, `${shot}.${sp}.wav`));
  }
  timing[shot] = { words, lines, ranges };
  writeFileSync(tPath, JSON.stringify(timing, null, 2));
  console.log(`✓ ${shot}: ${words.map((w) => `${w.text}@${w.start.toFixed(2)}`).join(" ")}`);
}
