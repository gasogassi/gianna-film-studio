# Gianna Film Studio: production playbook

Vertical (9:16, 1080×1920, 24 fps) cinematic short-film ads for **Gianna Bellucci** lingerie (giannabellucci.com), produced fully with AI and rendered on Larven's AWS Lambda stacks. This file is the method that got film 01 "Ritorno" to an approved cut (v6). Follow it for every new film. Each rule below came from an explicit client rejection or approval.

---

## 0. Setup and keys

- Keys live in `.env` (gitignored); see `.env.example`. Needed: `ARK_API_KEY` (BytePlus ModelArk), `KIE_AI_API_KEY`, `ELEVEN_LABS_API_KEY`, `AWS_*` + `S3_BUCKET_NAME`, `REMOTION_AWS_*`, `REMOTION_LAMBDA_*`, `HYPERFRAMES_LAMBDA_*`.
- `npm install`. Remotion must stay pinned to **4.0.486** to match Larven's Lambda function `remotion-render-4-0-486-mem3008mb-disk2048mb-240sec` (eu-north-1). `hyperframes` / `@hyperframes/aws-lambda` stay pinned at **0.8.46**.
- Python helpers (Pillow, OpenCV) go in a throwaway venv; run with `python -I`.
- Never print secret values.

## Multi-film layout

Every step takes `FILM=<id>` (default `ritorno`). Per film:
- `film/<id>/`: bible (`shots.json` incl. `sheets`, `audio.json`, `foley.json`, `cutlist.mjs`)
- `assets/gen-<id>/`: generated refs, keyframes, video, audio, dialogue (Ritorno keeps the legacy `assets/gen/`)
- `public/<id>/`: clips, vo, dialogue_sts, foley, audio, as referenced by the film's `edit.json` (`clipDir`)
- Remotion composition = capitalised id (`Ritorno`, `Segreto`), registered in `src/index.ts`
- Outputs: `out/<id>-nocaptions.mp4`, `-mix.wav`, `-final.mp4`, `-master.mp4`
- Use unique shot and line ID prefixes per film (Segreto: `N01…`, `NV01…`, `SF_…`).

Example: `FILM=segreto node pipeline/02-keyframes.mjs --force N07`, then `FILM=segreto node film/segreto/cutlist.mjs`.

## 1. Pre-production

1. **Study the reference.** Download it and make a 1-frame-per-15 s contact sheet (`ffmpeg -vf fps=1/15,scale=240:-1,tile=6x4`) to read its structure (Ritorno's reference was a narrator story ad: low point → mentor → product → transformation).
2. **Proposal script first**, as Markdown in `scripts/NN-name-proposal.md`: logline, angle, characters, scene-by-scene script with timecodes, full narration text, edit plan, production notes, 30 s and 15 s cut-downs, open questions. Get approval before generating.
3. **Brand-safe angle (Meta).** No body-shaming and no "she wasn't attractive". The story is about confidence: *something beautiful for yourself*. Lingerie is shown in a fashion or mirror context, never sexualised. Brand slogan: *Designed by women who know women.*
4. **Product images.** `giannabellucci.com/products.json` and product pages are rate-limited (429). Use `sitemap_products_1.xml` (it has one image per product) and download from `cdn/shop/files`. Logo: `cdn/shop/files/gb-logo.svg` / `gb-logo-white.svg` → `assets/brand/`. Brand font: Urbanist.
5. **Production bible** in `film/<id>/`:
   - `shots.json`: style string, per-act grades, character descriptions, and shots, each with `keyframe` prompt, `motion` prompt (dialogue written inside it), duration, refs and act.
   - `audio.json`: voices, `ttsModel`, narration lines (with a `max` duration budget each), dialogue lines (shot + speaker), music prompt.
   - `foley.json`: spotting list (`shot` + `src` = clip source time of the sync point).
   - `cutlist.mjs` + `cut-overrides.json`: the EDL.

## 2. Pictures

### 2a. Character turnaround sheets (`pipeline/01-references.mjs`)
- Seedream 5 Pro (`dola-seedream-5-0-pro-260628`, ModelArk) at 2848×1600: **one person shown five times** (front close-up, ¾, profile, full body front, full body back) on a grey studio background, with explicit anatomy wording.
- Make a separate sheet for each costume change (e.g. `giulia` hoodie and `giulia_dress`).
- No prints or lettering on clothes. The model invented an "84" on a hoodie.
- **Review the sheets before going on.**

### 2b. Keyframes (`pipeline/02-keyframes.mjs [--force] [ids]`)
- Seedream 5 Pro, 1440×2560, with the sheets and product photo as references (`@Image1…`).
- Labels say "match face, hair and body; clothing as described in this scene; do NOT copy the sheet layout".
- Every prompt gets the ANATOMY clause: single photograph, two arms and two hands with five fingers, physically plausible objects and liquids.
- **Avoid risky actions in the keyframe itself**, such as pouring. Rewrite the scene so the pot is already standing.

### 2c. Keyframe QA (mandatory)
Build 6-per-row sheets at 330 px width and inspect every frame for: extra or missing limbs, broken hands, impossible liquids and objects, wardrobe continuity (jacket on/off, dress), story beats (e.g. "turned away"), and text on screens. Regenerate failures with `--force <ids>`.

### 2d. Video (`pipeline/03-video.mjs`)
- **Seedance 2.5** `dreamina-seedance-2-5-260628` on ModelArk: first-frame image-to-video, 720p, `generate_audio: true` (needed for the lip-synced performance), `watermark: false`.
- **Do not send `ratio` with a first frame.** ModelArk rejects it, because the output ratio follows the image.
- ModelArk rejects photoreal faces (`InputImageSensitiveContentDetected.PrivacyInformation`). `seedanceAny()` then falls back to **kie.ai `bytedance/seedance-2-5`**: the keyframe is uploaded to S3 with a presigned URL, sent as `reference_image_urls`, and the prompt starts with "Start the video exactly with @Image1…". It takes about 4–7 min per clip; run 6 in parallel.
- The direction suffix requires a single continuous take, the anatomy rules, and liquids that only flow from a spout or bottle neck.

### 2e. Clip QA (mandatory)
Make a 2 fps contact sheet per clip (`fps=2,scale=124:-1,drawtext=…pts,tile=16x1`). Check anatomy and physics in every frame, and note the **cut-on-action frames** and in-points (for example, the moment a light goes off can be found exactly with a `signalstats` YAVG drop).

## 3. Sound (the rules that matter most)

- **Never use raw Seedance audio** in the mix. It's 32 kHz / 128 kbps AAC with almost nothing above 4 kHz, so it sounds hissy and dull. No Seedance production FX either.
- **Narration:** a single narrator on ElevenLabs. The client wants the newest model (`eleven_v4_turbo`, or `eleven_v4`; set it in `audio.json → ttsModel`). v3-style `[tags]` are sent only to v3. Each take is re-rolled (up to 6×) until it fits its `max` duration budget (`pipeline/04-audio.mjs`). Word timestamps come from `/with-timestamps`.
- **Voices:** ElevenLabs Voice Design (`/text-to-voice/design`, model `eleven_ttv_v3`; preview text must be ≥100 chars and the description ≥20 chars). **The client picks by ear.** Save all three previews per character in `assets/gen/voices/`. The client rejected every preview 0, so never auto-pick.
- **Character dialogue = Seedance performance re-voiced by ElevenLabs Voice Changer** (the approved method):
  1. Extract the clip audio → `/audio-isolation` → `<shot>.iso.mp3`.
  2. Scribe (`scribe_v1`, word timestamps) on the isolated audio, for line timing and caption onsets (`pipeline/05-dialogue.mjs`).
  3. `/speech-to-speech/<voice>` with `eleven_multilingual_sts_v2`, `remove_background_noise=true`, **`output_format=pcm_44100`**, into each character's chosen voice → `public/dialogue_sts/<shot>.<speaker>.wav`.
  4. This keeps the acting, timing and lip-sync, and gives 44.1 kHz studio audio. The client preferred it to both raw Seedance voices and TTS laid onto lip timing.
- **Voice finishing** (`pipeline/05b-voice.mjs`): high-pass 85 Hz, gentle de-esser, −2.5 dB at 6.8 kHz, +1.5 dB at 3 kHz, light compression. Then a **static two-pass gain to −16 LUFS**. Never single-pass `loudnorm` on stems: its dynamic mode pumps noise between words. Use `alimiter … level=disabled`.
- **Music:** ElevenLabs `/music` with a **composition plan** (sections with exact `duration_ms`, negatives "silence, long pauses, drums, vocals"). Prompt-only scores came back with 16 s of leading silence, so always check `silencedetect`. Trim the in-point to the first note. **Constant low bed, about 18 LU under the voice. NO ducking or sidechain** ("too aggressive"). Starts audible from frame 0.
- **SFX:** minimal. Three to five discrete sync effects tied to visible actions (light switch, cup, door/keys, box, phone), from ElevenLabs `/sound-generation`, normalised to −20 LUFS (key moments −16). **No ambience or room-tone beds**: they read as hiss and the client found the effects annoying. Make sure no narration line masks a key effect.

## 4. Edit (`film/<id>/cutlist.mjs` → `edit.json`, rendered by `src/Film.tsx`)

- **Grammar:** cinematic documentary style, broadcast-standard rhythm, invisible editing (straight cuts; one dip to black at an act turn; one dissolve into the end card). No hyper-kinetic social pacing.
- **A/B separation:** picture tracks V1 (A-roll) and V2 (B-roll); sound tracks A1 narration, A2 dialogue, A3 Foley, plus the score. Every event has its own timeline position.
  - **J-cut:** a sound event starts before its picture.
  - **L-cut:** a sound event outlasts its picture.
- **Motivated cutting:** cut 0.3–0.4 s after a line ends, mid-line for a reaction (L-cut), and on action (switch press, ribbon pull, hair falling).
- **B-roll overlays** carry narration and dialogue across splices.
- **Mirror rhymes:** use identical framing for before and after shots.
- Narration lines must **never overlap** dialogue or each other. The cut list printout checks this; re-time when take lengths change.
- **Grades** per act (CSS filters), subtle grain and vignette. End card: real SVG logo + tagline in Urbanist.

## 5. Render chain

```
node film/<id>/cutlist.mjs                     # EDL → edit.json (prints the overlap check)
node pipeline/06-lambda.mjs deploy             # Remotion site (re-deploy whenever public/ or src changes)
node pipeline/06-lambda.mjs render             # picture (+AAC) → out/*-nocaptions.mp4, bt709 yuv420p
node pipeline/06-lambda.mjs render-audio       # LOSSLESS WAV mix → out/*-mix.wav
node pipeline/07-captions.mjs                  # HyperFrames subtitle pass (picture only is used)
node pipeline/09-master.mjs                    # video from captions pass + audio from WAV, loudnorm -14 LUFS/-1 dBTP, ONE AAC 320k encode
```

- **Colour:** render with `colorSpace: "bt709", pixelFormat: "yuv420p"`. The default full-range BT.601 output got re-interpreted by HyperFrames and lifted the blacks.
- **Audio generation loss:** never take audio through the HyperFrames pass. Three stacked AAC encodes produced audible hiss behind the voices. The master muxes the lossless mix.
- **Subtitles (HyperFrames):** a phrase-based GSAP timeline; italic narration, upright dialogue; word reveals on spoken onsets; linguistic line breaks (break before prepositions and conjunctions, max 7 words, merge phrases under 0.7 s). Text comes from the script; timing comes from the words. The **scrim** must be `radial-gradient(closest-side, …)` (fading to 0 at every edge) and shown **only while subtitles are on screen**. A static scrim left a hard dark band. Run `hyperframes check` before rendering.
- If the Lambda picture render fails but only audio changed, the previous picture is still valid; say so in the report.

## 6. Mandatory QA before delivery

1. A contact sheet of the master (1 frame / 1.5 s): continuity and the end card.
2. Before/after frames of the caption pass: no scrim when there's no subtitle, no colour shift (compare `signalstats` YAVG).
3. Loudness: master −14 LUFS; voice sections about −12.5; music-only sections far below the voice.
4. Spectrogram of one narration line in the master against the clean stem (`showspectrumpic`): no smeared noise between the harmonics.
5. All files (picture, mix, master) exactly the same duration.
6. Be honest about what can't be verified (I can't listen); ask the client to review audio by ear.

## 7. Delivery (mandatory after every completed film or version)

**Always, as the last step of every completed film or revision: upload the master to Larven and file it in the library of the "Gianna Bellucci" brand in the Larven "maj" organization**, named `<Title> — short film 1:30 (vN)`, with a poster frame. Don't wait to be asked. A version isn't delivered until it's in that library.


How: upload the master and a poster frame to the media bucket (`S3_BUCKET_NAME`) and file it into the client's media library. The exact, internal delivery procedure (library IDs, production script runner) is kept in the local, gitignored `CLAUDE.local.md`.

## 8. Merch and gift mockups (`gifts/`)

- kie.ai **`gpt-image-2-image-to-image`** (best at printed text) with a reference product photo uploaded to S3 with a presigned URL; `aspect_ratio: "3:4"`.
- **Real logo:** never trust AI lettering for the brand. `gifts/onesie/apply_logo.py` finds the AI brand line inside the garment, samples its ink colour, inpaints it out (OpenCV TELEA) and composites the rasterised `gb-logo.svg` (resvg-js) at the same position, with width capped at 50% of the image.
- `montage.py <logo> <dir> <out> spec.json` builds a team-shareable board with the logo header and numbered captions; keep captions short.
- Merch ideas must link back to the brand ("Mommy wore Gianna Bellucci", slogan plays, care-label prints) and stay playful and tasteful for a baby.

## 9. Films

| # | Title | Status |
|---|---|---|
| 01 | Ritorno | v6 delivered, voice-changer dialogue |
| 02 | Il Segreto di Nonna | v1 delivered: Puglia, red Palmira, v4 Turbo narrator (Sofia p3), Rosa p1, Lucia p1 |
