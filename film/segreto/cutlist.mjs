// IL SEGRETO DI NONNA — edit decision list (EDL).
// Same grammar as Ritorno: cinematic documentary style, invisible editing (straight cuts, one dissolve into
// the end card), A/B track separation with J/L-cut audio bridges, motivated cuts on speaker cadence.
// Dialogue shots get their in-point/duration from the actors' Scribe word timings (cut ~0.4s after the line).
// Run: FILM=segreto node film/segreto/cutlist.mjs → film/segreto/edit.json
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const GEN = path.join(here, "../../assets/gen-segreto");
const P_ = "segreto/"; // public/ namespace
const FPS = 24, DURATION = 90;
const r = (x) => Math.round(x * 1000) / 1000;
const dlg = existsSync(path.join(GEN, "dialogue/dialogue.json")) ? JSON.parse(readFileSync(path.join(GEN, "dialogue/dialogue.json"), "utf8")) : {};
const narr = JSON.parse(readFileSync(path.join(GEN, "audio/narration.json"), "utf8"));
let overrides = {};
try { overrides = JSON.parse(readFileSync(path.join(here, "cut-overrides.json"), "utf8")); } catch {}

// [shot, act, track, in, dur, opts]  — in/dur of dialogue shots are refined from word timings below.
const PIC = [
  ["N01", "act1", "V1", 0.3, 4.2, { pushTo: 0.015, note: "hook; NV01 starts under the pacing" }],
  ["N02", "act1", "V1", 0.3, 4.6, { note: "mirror #1 (rhymes with N11); NV02 on the toss" }],
  ["N03", "act1", "V1", 0, 4.8, { note: "door creak J-cuts in; Rosa's entrance line" }],
  ["N04", "act1", "V1", 0, 4.2, {}],
  ["N04b", "act1", "V1", 0, 3.6, { note: "'You want the secret?' — hold the beat" }],
  ["N05", "act2", "V2", 0.5, 3.6, { note: "drawer opens; NV03 bridges N05→N06 (L-cut)" }],
  ["N06", "act2", "V2", 0.3, 3.0, {}],
  ["N06b", "act2", "V1", 0, 2.2, { note: "'NONNA!' — comedy beat, don't cut early" }],
  ["N06c", "act2", "V1", 0, 3.2, {}],
  ["N07", "act2", "V1", 0, 8.5, { pushTo: 0.012, note: "the heart of the film" }],
  ["N08", "act2", "V1", 0, 3.0, { note: "Lucia eye-roll cameo" }],
  ["N08b", "act2", "V1", 0, 3.4, {}],
  ["N09", "act2", "V1", 0, 6.0, { note: "the box handover" }],
  ["N10", "act3", "V2", 1.0, 4.0, { note: "cut on action: ribbon pull → lace macro" }],
  ["N10b", "act3", "V2", 0.3, 3.0, {}],
  ["N11", "act3", "V1", 0.5, 4.8, { note: "mirror #2 — same framing as N02" }],
  ["N12a", "act3", "V2", 0.3, 2.6, { note: "heels on Bari stone" }],
  ["N12b", "act3", "V1", 0.5, 3.4, {}],
  ["N13", "act3", "V1", 0, 5.0, { note: "'We got it.' / 'Of course you got it.'" }],
  ["N13b", "act3", "V1", 0, 4.2, { note: "'Which colour?' — punchline + laugh" }],
  ["N14", "act3", "V2", 0.3, 3.0, { fadeOut: 0.6 }],
  ["N15", "act3", "V1", 0, 0, { fadeIn: 0.6, note: "end card plate" }],
];

const shotSpec = Object.fromEntries(JSON.parse(readFileSync(path.join(here, "shots.json"), "utf8")).shots.map((x) => [x.id, x]));
const LEAD = 0.7, TAIL = 0.45; // dialogue shots: first word lands ~0.7s in, cut ~0.45s after the last word
const picture = [], at = {};
let t = 0;
for (const [shot, act, track, inp, dur0, opts] of PIC) {
  let sIn = inp, dur = dur0;
  const d = dlg[shot];
  const clipLen = (shotSpec[shot]?.duration ?? 99) - 0.08;
  if (d?.words?.length) {
    const first = d.words[0].start, last = d.words.at(-1).end;
    dur = Math.min(clipLen, Math.max(dur0, last + TAIL - Math.max(0, first - LEAD)));
    sIn = Math.max(0, Math.min(first - LEAD, clipLen - dur)); // never run past the clip's last frame
  }
  const o = overrides[shot] ?? {};
  sIn = o.in ?? sIn; dur = o.dur ?? dur;
  if (shot === "N15") { t -= opts.fadeIn; dur = DURATION - t; }
  at[shot] = t;
  picture.push({ track, shot, act, at: r(t), in: r(sIn), dur: r(dur), ...opts });
  t += dur;
}
const P = (s) => picture.find((p) => p.shot === s);
const sound = [];

// A1 — single narrator (Sofia), lines placed against picture and allowed to straddle cuts.
const VO = [
  ["NV01", at.N01 + 0.5], ["NV02", at.N02 + 3.4], ["NV03", at.N05 + 0.4], ["NV04", at.N10 + 0.6],
  ["NV05", at.N11 + 1.0], ["NV06", at.N12b + 0.4], ["NV07", at.N14 + 0.3],
];
for (const [id, a] of VO) sound.push({ track: "A1", src: `${P_}vo/${id}.wav`, at: r(a), in: 0, dur: r(narr[id].duration + 0.2), gain: 1, label: id });

// A2 — dialogue: Seedance performance re-voiced by ElevenLabs Voice Changer, windowed per line.
for (const [shot, info] of Object.entries(dlg)) {
  const p = P(shot); if (!p) continue;
  const offset = p.at - p.in;
  for (const l of info.lines) {
    const [a, b] = info.ranges[l.id];
    const single = l.line.split(/\s+/).length < 3;
    const from = Math.max(0, info.words[a].start - 0.2), to = info.words[b].end + (single ? 0.45 : 0.35);
    sound.push({ track: "A2", src: `${P_}dialogue_sts/${shot}.${l.speaker}.wav`, at: r(offset + from), in: r(from), dur: r(to - from), gain: 1, fadeIn: 0.04, fadeOut: 0.15, label: `${shot}:${l.speaker}:${l.id}` });
  }
}

// A3 — minimal Foley.
for (const c of JSON.parse(readFileSync(path.join(here, "foley.json"), "utf8")).cues) {
  const p = P(c.shot); if (!p) continue;
  sound.push({ track: "A3", src: `${P_}foley/${c.id}.wav`, at: r(Math.max(0, p.at - p.in + c.src)), in: 0, dur: r(c.sec), gain: c.gain, fadeIn: 0.02, fadeOut: 0.25, label: c.id });
}

const edit = {
  clipDir: `${P_}clips`, fps: FPS, duration: DURATION, picture, sound,
  // constant low score, no ducking; in-point trimmed to the first note (0.49s lead-in measured)
  score: { src: `${P_}audio/score.mp3`, at: 0, in: 0.5, dur: DURATION, gain: 0.11 },
  endCard: { at: r(at.N15 + 0.5), dur: r(DURATION - at.N15 - 0.5) },
};
writeFileSync(path.join(here, "edit.json"), JSON.stringify(edit, null, 2));
const sp = sound.filter((s) => s.track !== "A3").map((s) => [s.at, s.at + s.dur, s.label]).sort((a, b) => a[0] - b[0]);
const clashes = sp.slice(1).filter((s, i) => s[0] < sp[i][1] - 0.05).map((s, i) => `${sp[i][2]} × ${s[2]}`);
console.log(`✓ edit.json — ${picture.length} picture, ${sound.length} sound events · picture ends ${r(t)}s · end card ${r(DURATION - at.N15)}s`);
console.log(clashes.length ? `⚠ speech overlaps: ${clashes.join(", ")}` : "no speech overlaps");
for (const p of picture) console.log(`  ${p.track} ${p.shot.padEnd(5)} ${p.at.toFixed(2).padStart(6)} → ${(p.at + p.dur).toFixed(2).padStart(6)}  in ${p.in}`);
