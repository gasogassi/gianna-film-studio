// Step 4b — Clean Foley (ElevenLabs sound effects) from the spotting list, replacing generator audio.
// Usage: node pipeline/04b-foley.mjs [--force]
import { execFileSync } from "node:child_process";
import { FILM, GEN, ROOT, path, existsSync, ensure, readFileSync, writeFileSync, xiJson, pool, PUB_PREFIX } from "./lib.mjs";

const { cues } = JSON.parse(readFileSync(path.join(FILM, "foley.json"), "utf8"));
const dir = ensure(path.join(GEN, "foley"));
const pub = ensure(path.join(ROOT, "public", PUB_PREFIX, "foley"));
const force = process.argv.includes("--force");

await pool(cues, 4, async (c) => {
  const raw = path.join(dir, `${c.id}.mp3`);
  if (!existsSync(raw) || force) {
    const res = await xiJson("/sound-generation?output_format=mp3_44100_192", { text: c.prompt, duration_seconds: Math.max(0.5, c.sec), prompt_influence: 0.6 });
    writeFileSync(raw, Buffer.from(await res.arrayBuffer()));
  }
  // Clean + consistent: remove sub-rumble, tame fizz, normalise each effect to -24 LUFS before mix gain.
  execFileSync("ffmpeg", ["-v", "error", "-y", "-i", raw, "-af", `highpass=f=50,lowpass=f=15000,loudnorm=I=${c.lufs ?? -20}:TP=-2,aresample=48000`, path.join(pub, `${c.id}.wav`)]);
  console.log(`✓ ${c.id}`);
});
