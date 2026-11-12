// Step 4 — ElevenLabs stems: narration (per-line, word timestamps), score, ambience beds.
// Usage: node pipeline/04-audio.mjs [--force] [narration|music|ambience]
import { FILM, GEN, path, existsSync, ensure, readFileSync, writeFileSync, xiJson, xiGet, pool } from "./lib.mjs";

const cfg = JSON.parse(readFileSync(path.join(FILM, "audio.json"), "utf8"));
const dir = ensure(path.join(GEN, "audio"));
const args = process.argv.slice(2);
const force = args.includes("--force");
const parts = args.filter((a) => !a.startsWith("--"));
const want = (p) => !parts.length || parts.includes(p);

/** Shared-library voices must be added to the account before TTS can use them. */
export async function ensureVoices() {
  const mine = await xiGet("/voices");
  const have = new Set(mine.voices.map((v) => v.voice_id));
  for (const [key, v] of Object.entries(cfg.voices)) {
    if (have.has(v.id)) continue;
    const shared = await xiGet(`/shared-voices?search=${encodeURIComponent(v.name.split(" ")[0])}&page_size=30`);
    const hit = shared.voices.find((s) => s.voice_id === v.id);
    if (!hit) throw new Error(`shared voice ${v.id} not found`);
    const res = await xiJson(`/voices/add/${hit.public_owner_id}/${v.id}`, { new_name: `Ritorno ${key}` });
    const { voice_id } = await res.json();
    v.id = voice_id;
    console.log(`+ added voice ${key} -> ${voice_id}`);
  }
  writeFileSync(path.join(FILM, "audio.json"), JSON.stringify(cfg, null, 2));
}

async function narration() {
  const voice = cfg.voices[cfg.narrator ?? "giulia"].id;
  const timing = {};
  const tPath = path.join(dir, "narration.json");
  if (existsSync(tPath)) Object.assign(timing, JSON.parse(readFileSync(tPath, "utf8")));
  for (const line of cfg.narration) {
    const out = path.join(dir, `${line.id}.mp3`);
    if (existsSync(out) && timing[line.id] && !force) { console.log(`= ${line.id}`); continue; }
    // v3 is non-deterministic: re-roll a take (up to 6x) until it fits the line's timing budget.
    let j, best;
    for (let take = 1; take <= 6; take++) {
      const res = await xiJson(`/text-to-speech/${voice}/with-timestamps?output_format=mp3_44100_192`, {
        // ElevenLabs v3 (most expressive model) with performance tags, custom v3-designed voice.
        text: (cfg.ttsModel ?? "eleven_v3") === "eleven_v3" ? line.text : line.text.replace(/\[[^\]]*\]\s*/g, ""),
        model_id: cfg.ttsModel ?? "eleven_v3",
        voice_settings: { stability: 0.5, similarity_boost: 0.8, use_speaker_boost: true },
      });
      const cand = await res.json();
      const d = (cand.normalized_alignment ?? cand.alignment).character_end_times_seconds.at(-1);
      if (!best || d < best.d) best = { cand, d };
      if (!line.max || d <= line.max) break;
      console.log(`  ${line.id} take ${take}: ${d.toFixed(2)}s > ${line.max}s, re-rolling`);
    }
    j = best.cand;
    writeFileSync(out, Buffer.from(j.audio_base64, "base64"));
    // Characters -> words (drop [audio tags]).
    const a = j.normalized_alignment ?? j.alignment;
    const words = [];
    let cur = null;
    a.characters.forEach((ch, i) => {
      if (/\s/.test(ch)) { if (cur) words.push(cur); cur = null; return; }
      if (!cur) cur = { text: "", start: a.character_start_times_seconds[i], end: 0 };
      cur.text += ch;
      cur.end = a.character_end_times_seconds[i];
    });
    if (cur) words.push(cur);
    timing[line.id] = {
      words: words.filter((w) => !/^\[.*\]$/.test(w.text)).map((w) => ({ ...w, text: w.text.replace(/^\[[^\]]*\]/, "") })).filter((w) => w.text),
      duration: a.character_end_times_seconds.at(-1),
    };
    console.log(`✓ ${line.id} ${timing[line.id].duration.toFixed(2)}s`);
  }
  writeFileSync(tPath, JSON.stringify(timing, null, 2));
}

async function music() {
  const out = path.join(dir, "score.mp3");
  if (existsSync(out) && !force) return console.log("= score");
  // Composition plan (exact section lengths) when given — prompt-only scores came back with long leading silence.
  const body = cfg.music.plan
    ? { composition_plan: cfg.music.plan, model_id: "music_v1" }
    : { prompt: cfg.music.prompt, music_length_ms: cfg.music.lengthMs, model_id: "music_v1", force_instrumental: true };
  const res = await xiJson("/music?output_format=mp3_44100_192", body);
  writeFileSync(out, Buffer.from(await res.arrayBuffer()));
  const { spawnSync } = await import("node:child_process");
  const sd = spawnSync("ffmpeg", ["-i", out, "-af", "silencedetect=n=-45dB:d=0.3", "-f", "null", "-"], { encoding: "utf8" }).stderr;
  const lead = /silence_start: 0\b[\s\S]*?silence_end: ([\d.]+)/.exec(sd)?.[1];
  console.log(`✓ score${lead ? ` (leading silence ${(+lead).toFixed(2)}s — trim the in-point to it)` : ""}`);
}

async function ambience() {
  await pool(cfg.ambience, 4, async (a) => {
    const out = path.join(dir, `${a.id}.mp3`);
    if (existsSync(out) && !force) return console.log(`= ${a.id}`);
    const res = await xiJson("/sound-generation?output_format=mp3_44100_192", {
      text: a.prompt, duration_seconds: a.seconds, prompt_influence: 0.5, loop: true,
    });
    writeFileSync(out, Buffer.from(await res.arrayBuffer()));
    console.log(`✓ ${a.id}`);
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await ensureVoices();
  await Promise.all([want("narration") && narration(), want("music") && music(), want("ambience") && ambience()]);
}
