// Step 9 — Delivery master: two-pass EBU R128 loudness normalisation for social platforms
// (-14 LUFS integrated, -1 dBTP, LRA 11), video stream copied untouched, faststart.
import { execFileSync, spawnSync } from "node:child_process";
import { ROOT, path, OUT } from "./lib.mjs";

const src = OUT("final.mp4");          // picture (with subtitles)
const mix = OUT("mix.wav");            // lossless audio mix
const out = OUT("master.mp4");
const target = "I=-14:TP=-1:LRA=11";

const p1 = spawnSync("ffmpeg", ["-nostats", "-i", mix, "-af", `loudnorm=${target}:print_format=json`, "-f", "null", "-"], { encoding: "utf8" });
const m = JSON.parse(p1.stderr.slice(p1.stderr.lastIndexOf("{"), p1.stderr.lastIndexOf("}") + 1));
const af = `loudnorm=${target}:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true,aresample=48000`;
execFileSync("ffmpeg", ["-v", "error", "-y", "-i", src, "-i", mix, "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy", "-af", af, "-c:a", "aac", "-b:a", "320k", "-movflags", "+faststart", out]);
const p2 = spawnSync("ffmpeg", ["-nostats", "-i", out, "-af", "ebur128=peak=true", "-f", "null", "-"], { encoding: "utf8" });
const summary = p2.stderr.slice(p2.stderr.lastIndexOf("Summary"));
console.log(`input ${m.input_i} LUFS / ${m.input_tp} dBTP  →  output ${summary.match(/I:\s+(-?[\d.]+)/)?.[1]} LUFS / peak ${summary.match(/Peak:\s+(-?[\d.]+)/)?.[1]} dBFS`);
console.log(`✓ ${out}`);
