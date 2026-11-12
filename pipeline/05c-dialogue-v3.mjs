// Step 5c — Dialogue on ElevenLabs v3 (replaces generator audio entirely).
// Each line is performed with v3 TTS (with-timestamps) in the character's designed voice, trimmed to
// exactly the spoken words via the character alignment (non-verbal tag fills are cut away), and placed
// so the first word lands on the actor's on-screen first-word onset (Scribe). Lines of 3+ words are
// gently time-fitted (atempo 0.9–1.15) to the on-screen span; short lines keep natural timing.
// Writes stems in clip time (silence before onset) + dialogue.json `v3` entries for the cutlist.
import { execFileSync } from "node:child_process";
import { FILM, GEN, path, ensure, readFileSync, writeFileSync, xiJson } from "./lib.mjs";

const cfg = JSON.parse(readFileSync(path.join(FILM, "audio.json"), "utf8"));
const dlgPath = path.join(GEN, "dialogue/dialogue.json");
const dlg = JSON.parse(readFileSync(dlgPath, "utf8"));
const dir = ensure(path.join(GEN, "dialogue"));

const TAGS = { D01: "[softly]", D02: "[distracted]", D03: "[quietly, hurt]", D04: "[gently]", D05: "[warm, knowing]", D06: "[playful]", D07: "[amazed, quietly]" };
const ff = (args) => execFileSync("ffmpeg", ["-v", "error", "-y", ...args]);

for (const [shot, info] of Object.entries(dlg)) {
  info.v3 = {};
  const words = info.words;
  for (const l of info.lines) {
    const span = shot === "S02" ? [words[l.speaker === "giulia" ? 0 : 1]] : words;
    const t0 = span[0].start, t1 = span.at(-1).end;
    const tag = TAGS[l.id] ?? "";
    const res = await xiJson(`/text-to-speech/${cfg.voices[l.speaker].id}/with-timestamps?output_format=mp3_44100_192`, {
      text: ((cfg.ttsModel ?? "eleven_v3") === "eleven_v3" ? `${tag} ${l.line}` : l.line).trim(), model_id: cfg.ttsModel ?? "eleven_v3",
      voice_settings: { stability: 0.5, similarity_boost: 0.8, use_speaker_boost: true },
    });
    const j = await res.json();
    const raw = path.join(dir, `${l.id}.v3raw.mp3`);
    writeFileSync(raw, Buffer.from(j.audio_base64, "base64"));
    // Spoken-word range from the alignment: skip the [tag] characters, first/last letter of the line.
    const a = j.alignment;
    const chars = a.characters.join("");
    const lineStart = chars.indexOf(l.line.slice(0, 3));
    const idx = [...a.characters.keys()].filter((i) => i >= lineStart && /[A-Za-z]/.test(a.characters[i]));
    const s0 = Math.max(0, a.character_start_times_seconds[idx[0]] - 0.03);
    const s1 = Math.min(a.character_end_times_seconds.at(-1) + 0.3, a.character_end_times_seconds[idx.at(-1)] + (l.line.split(/\s+/).length < 3 ? 0.3 : 0.18));
    const have = s1 - s0;
    const nWords = l.line.split(/\s+/).length;
    const tempo = nWords >= 3 ? Math.min(1.15, Math.max(0.9, have / Math.max(0.3, t1 - t0 + 0.15))) : 1;
    const len = have / tempo;
    const out = path.join(dir, `${shot}.${l.speaker}.wav`);
    ff(["-ss", s0.toFixed(3), "-t", have.toFixed(3), "-i", raw, "-af",
      `afade=t=in:d=0.02,afade=t=out:st=${Math.max(0, have - 0.08).toFixed(3)}:d=0.08,atempo=${tempo.toFixed(3)},adelay=${Math.round(t0 * 1000)}:all=1`,
      "-ar", "48000", out]);
    info.v3[l.id] = { speaker: l.speaker, t0, len: +len.toFixed(3) };
    console.log(`✓ ${l.id} ${shot}/${l.speaker} "${l.line}" spoken ${have.toFixed(2)}s, atempo ${tempo.toFixed(2)} → ${len.toFixed(2)}s @ ${t0.toFixed(2)}s (on-screen span ${(t1 - t0).toFixed(2)}s)`);
  }
}
writeFileSync(dlgPath, JSON.stringify(dlg, null, 2));
