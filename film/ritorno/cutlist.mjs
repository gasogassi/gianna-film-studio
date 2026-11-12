// RITORNO — edit decision list (EDL).
// Cinematic documentary style, broadcast-standard rhythm, invisible editing (straight cuts; one
// dip to black at the Act 1/2 turn; a single dissolve into the end card).
// Picture and sound are laid on independent tracks so audio bridges overlap scene changes:
//   J-cut  = sound event starts before its picture (audio precedes the video)
//   L-cut  = sound event outlasts its picture (audio continues while video changes)
// Run: node film/ritorno/cutlist.mjs  → writes film/ritorno/edit.json
import { writeFileSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const FPS = 24;
const DURATION = 90;
const r = (x) => Math.round(x * 1000) / 1000;

// ---------- PICTURE (V1 = A-roll, V2 = B-roll overlays), laid end-to-end ----------
// [shot, act, track, sourceIn, duration, opts]
const PIC = [
  // ACT 1 — the distance (cool, desaturated)
  ["S01",  "act1", "V1", 0.3, 5.7, { pushTo: 0.02, note: "hook; V01 begins under the push-in" }],
  ["S01b", "act1", "V2", 0.8, 3.0, { note: "B-roll overlay carries V01 across the cut (L-cut)" }],
  ["S02",  "act1", "V1", 0.6, 4.4, { note: "'Coffee?' / 'Mm-hm.' — kitchen sound J-cuts in under S01b" }],
  ["S02b", "act1", "V2", 0.9, 3.1, { note: "cut on action: cup set down; V02 over insert" }],
  ["S03",  "act1", "V1", 1.0, 5.0, { note: "restaurant walla J-cut 0.8s ahead of picture" }],
  ["S03b", "act1", "V2", 0.4, 4.0, { note: "eyeline reaction; V03 bridges S03→S03b" }],
  ["S04",  "act1", "V1", 2.0, 4.8, { pushTo: 0.015 }],
  ["S04b", "act1", "V2", 1.0, 1.7, { note: "cut on action: switch pressed → black" }],
  ["BLACK", null, null, 0, 0.7, { note: "dip to black; terrace ambience J-cuts under black" }],
  // ACT 2 — the turn (warm Roman afternoon)
  ["S05",  "act2", "V1", 2.6, 4.8, { note: "Giulia: 'He doesn't see me anymore.' cut 0.4s after line (speaker cadence)" }],
  ["S05b", "act2", "V1", 1.4, 3.3, { note: "Elena sips; 'Cara…' — cut mid-line" }],
  ["S05c", "act2", "V2", 0.6, 3.2, { note: "reaction under '…do you?' (L-cut); Elena's next line J-cuts in" }],
  ["S06",  "act2", "V1", 1.58, 4.5, { note: "in-sync with A2 (lip-sync preserved through the J-cut)" }],
  ["S06b", "act2", "V2", 0.3, 2.9, { note: "'…then everyone notices' over the insert (L-cut hides splice)" }],
  ["S07",  "act2", "V1", 0.3, 4.2, { pushTo: 0.015 }],
  ["S07b", "act2", "V2", 1.6, 3.1, { note: "tap; V06 L-cuts into Act 3" }],
  // ACT 3 — ritorno (golden)
  ["S08",  "act3", "V2", 1.4, 4.4, { note: "score lifts on the lid; cut on action at the reveal" }],
  ["S08b", "act3", "V2", 0.3, 3.0, {}],
  ["S09",  "act3", "V1", 0.3, 4.8, { note: "mirror rhyme with S04; 'Her.' lands on the smile" }],
  ["S10a", "act3", "V2", 0.2, 1.8, { note: "cut on action: hair falls" }],
  ["S10b", "act3", "V2", 0.0, 1.8, {}],
  ["S10c", "act3", "V2", 0.4, 1.9, {}],
  ["S11",  "act3", "V1", 0.8, 2.6, { note: "door/keys J-cut 0.5s ahead" }],
  ["S11b", "act3", "V1", 0.6, 3.0, { note: "'Coffee?' — callback to S02" }],
  ["S11c", "act3", "V1", 0.6, 2.6, { note: "'Wow.' — phone face-down; cut on his step forward" }],
  ["S12",  "act3", "V1", 0.4, 2.9, { fadeOut: 0.6, note: "V10 'He came back…' starts here, finishes over end card (L-cut)" }],
  ["S13",  "act3", "V1", 0.0, 0, { fadeIn: 0.6, note: "end card plate; logo + tagline overlay" }],
];

// Allow per-shot overrides discovered in review (file is optional).
let overrides = {};
try { overrides = JSON.parse(readFileSync(path.join(here, "cut-overrides.json"), "utf8")); } catch {}

const picture = [];
const at = {}; // shot -> timeline start
let t = 0;
for (const [shot, act, track, inp, dur0, opts] of PIC) {
  const o = overrides[shot] ?? {};
  const sIn = o.in ?? inp;
  let dur = o.dur ?? dur0;
  if (shot === "S13") dur = DURATION - t + (opts.fadeIn ?? 0); // end card fills to 90.0s
  if (shot === "S13") t -= opts.fadeIn; // dissolve overlap with S12
  at[shot] = t;
  if (shot !== "BLACK") picture.push({ track, shot, act, at: r(t), in: sIn, dur: r(dur), ...opts });
  t += dur;
}

// ---------- SOUND ----------
const narr = JSON.parse(readFileSync(path.join(here, "../../assets/gen/audio/narration.json"), "utf8"));
const dlg = JSON.parse(readFileSync(path.join(here, "../../assets/gen/dialogue/dialogue.json"), "utf8"));
const P = (shot) => picture.find((p) => p.shot === shot);
const sound = [];

// A1 — narration. Placed against picture, not glued to cuts: lines straddle edits (L/J bridges).
const VO = [
  ["V01", at.S01 + 0.9],
  ["V02", at.S02b + 0.5],
  ["V03", at.S03 + 0.9],          // bridges S03 → S03b
  ["V04", at.S04 + 0.8],          // bridges S04 → S04b
  ["V05", at.S07 + 0.5],
  ["V06", at.S07b + 0.2],         // L-cut into Act 3
  ["V07", at.S08 + 2.5],          // bridges the reveal cut
  ["V08", at.S09 + 2.5],
  ["V09", at.S10a + 0.3],         // runs across the montage
  ["V10", at.S12 + 0.4],         // after Marco's laugh decays; finishes over the end card
];
for (const [id, a] of VO) sound.push({ track: "A1", src: `vo/${id}.wav`, at: r(a), in: 0, dur: r(narr[id].duration + 0.2), gain: 1.0, label: id });

// A2 — dialogue (voice-matched production dialogue). Sync = picture.at - picture.in, unless the
// line is deliberately J/L-cut, in which case `syncTo` keeps lip-sync on the shot that shows the mouth.
function line(shot, speaker, lineId, { from, to, syncShot = shot, gain = 1 }) {
  const p = P(syncShot);
  const offset = p.at - p.in; // timeline = offset + source time
  sound.push({ track: "A2", src: `dialogue/${shot}.${speaker}.wav`, at: r(offset + from), in: from, dur: r(to - from), gain, fadeIn: 0.03, fadeOut: 0.12, label: `${shot}:${speaker}:${lineId}` });
}
// DIALOGUE=seedance → the characters' own Seedance performances (dialogue-isolated + cleaned), timed by Scribe words.
const DIALOGUE = process.env.DIALOGUE ?? "sts"; // default: Seedance performance re-voiced by ElevenLabs Voice Changer
if (DIALOGUE === "seedance" || DIALOGUE === "sts") {
  // "sts": the Seedance performance re-voiced by ElevenLabs Voice Changer into the chosen character voices (44.1 kHz).
  const sts = DIALOGUE === "sts";
  for (const [shot, info] of Object.entries(dlg)) {
    for (const l of info.lines) {
      const span = shot === "S02" ? [info.words[l.speaker === "giulia" ? 0 : 1]] : info.words;
      const single = l.line.split(/\s+/).length < 3;
      const from = Math.max(0, span[0].start - 0.2), to = span.at(-1).end + (single ? 0.45 : 0.35);
      const p = P(shot); const offset = p.at - p.in;
      sound.push({ track: "A2", src: sts ? `dialogue_sts/${shot}.${l.speaker}.wav` : `dialogue_sd/${shot}.wav`, at: r(offset + from), in: from, dur: r(to - from), gain: 1, fadeIn: 0.04, fadeOut: 0.15, label: `${shot}:${l.speaker}:${l.id}` });
    }
  }
} else
// v3 dialogue stems are in clip time: the line starts at its on-screen onset t0 and lasts len.
for (const [shot, info] of Object.entries(dlg)) {
  for (const [lineId, v] of Object.entries(info.v3 ?? {})) {
    const tail = lineId === "D07" ? 0.3 : 0.12;
    line(shot, v.speaker, lineId, { from: Math.max(0, v.t0 - 0.05), to: v.t0 + v.len + tail });
  }
}

// A3 — Foley (clean ElevenLabs effects) spotted to on-screen actions; may J/L-cut across picture edits.
const foley = JSON.parse(readFileSync(path.join(here, "foley.json"), "utf8")).cues;
for (const c of foley) {
  const p = P(c.shot);
  if (!p) continue;
  const sync = p.at - p.in + c.src;
  sound.push({ track: "A3", src: `foley/${c.id}.wav`, at: r(Math.max(0, sync)), in: 0, dur: r(c.sec), gain: c.gain, fadeIn: 0.02, fadeOut: 0.25, label: c.id });
}

// A4 — ambience beds: intentionally none (room-tone beds read as hiss under dialogue; score is the only bed).
// A4 — ambience beds (room tone continuity across cuts; terrace bed J-cuts under the black).
const bed = (id, a, b, gain, fi = 0.8, fo = 1.0) => sound.push({ track: "A4", src: `audio/${id}.mp3`, at: r(a), in: 0, dur: r(b - a), gain, fadeIn: fi, fadeOut: fo, label: id });

const edit = {
  fps: FPS,
  duration: DURATION,
  picture,
  sound,
  score: { src: "audio/score.mp3", at: 0, in: 0.82, dur: DURATION, gain: 0.111 },
  endCard: { at: r(at.S13 + 0.5), dur: r(DURATION - at.S13 - 0.5) },
};
writeFileSync(path.join(here, "edit.json"), JSON.stringify(edit, null, 2));
console.log(`✓ edit.json — ${picture.length} picture events, ${sound.length} sound events, picture ends ${r(t)}s`);
for (const p of picture) console.log(`  ${p.track} ${p.shot.padEnd(5)} ${p.at.toFixed(2).padStart(6)} → ${(p.at + p.dur).toFixed(2).padStart(6)}  in ${p.in}`);
