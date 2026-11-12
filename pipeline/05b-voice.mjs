// Step 5b — Dialogue/VO finishing + production-sound cleanup (ffmpeg), written into public/ for the edit.
//   VO / dialogue chain: high-pass → light broadband de-noise → de-esser → sibilance-band dip →
//   presence lift → gentle compression → per-stem loudness match (-16 LUFS, -2 dBTP).
//   Production FX (Seedance clip audio): de-noise + low-pass to remove the generator's hiss floor.
import { execFileSync, spawnSync } from "node:child_process";
import { readdirSync, existsSync, readFileSync } from "node:fs";
import { GEN, ROOT, FILM, path, ensure, PUB_PREFIX } from "./lib.mjs";

const ff = (args) => execFileSync("ffmpeg", ["-v", "error", "-y", ...args]);
// Static (linear) level match to -16 LUFS: measure after the chain, then apply one fixed gain.
// (loudnorm's single-pass dynamic mode would pump the noise floor up between words.)
const process1 = (src, chain, out) => {
  const tmp = out + ".tmp.wav";
  ff(["-i", src, "-af", chain.join(","), tmp]);
  const r = spawnSync("ffmpeg", ["-nostats", "-i", tmp, "-af", "ebur128", "-f", "null", "-"], { encoding: "utf8" }).stderr;
  const I = parseFloat((r.slice(r.lastIndexOf("Integrated")).match(/I:\s+(-?[\d.]+)/) ?? [])[1] ?? "-16");
  ff(["-i", tmp, "-af", `volume=${(-16 - I).toFixed(2)}dB,alimiter=limit=0.79:level=disabled`, out]);
  execFileSync("rm", ["-f", tmp]);
};

const VOICE = [
  "highpass=f=85",
    "deesser=i=0.4:m=0.5:f=0.5:s=o",
  "equalizer=f=6800:t=q:w=1.4:g=-2.5",   // sibilance band
  "equalizer=f=9500:t=q:w=1.0:g=-1.5", // air hiss
  "equalizer=f=3000:t=q:w=1.0:g=1.5",  // presence / intelligibility
  "lowpass=f=15500",
  "acompressor=threshold=-24dB:ratio=2.5:attack=8:release=150:makeup=1",
  "aresample=48000",
];
// Elena: un-muffle — cut boxy low-mids, more presence, then the common chain.
const ELENA = VOICE; // designed v3 voice: no corrective EQ needed

const voDir = ensure(path.join(ROOT, "public", PUB_PREFIX, "vo"));
const narrIds = JSON.parse(readFileSync(path.join(FILM, "audio.json"), "utf8")).narration.map((n) => n.id);
for (const f of narrIds.map((id) => `${id}.mp3`).filter((f) => existsSync(path.join(GEN, "audio", f)))) {
  process1(path.join(GEN, "audio", f), VOICE, path.join(voDir, f.replace(".mp3", ".wav")));
}
console.log("✓ narration stems");

const dlgDir = ensure(path.join(ROOT, "public", PUB_PREFIX, "dialogue"));
for (const f of (existsSync(path.join(GEN, "dialogue")) ? readdirSync(path.join(GEN, "dialogue")) : []).filter((f) => /^S\w+\.(giulia|elena|marco)\.wav$/.test(f))) {
  const chain = f.includes(".elena.") ? ELENA : VOICE;
  process1(path.join(GEN, "dialogue", f), chain, path.join(dlgDir, f));
}
console.log("✓ dialogue stems");

// Generator (Seedance) production audio is no longer used — replaced by clean Foley (04b-foley.mjs).
