# Gianna Film Studio

Vertical (9:16) cinematic short-film ads for Gianna Bellucci.

## Films
| # | Title | Length | Status | Deliverable |
|---|-------|--------|--------|-------------|
| 02 | Il Segreto di Nonna | 1:30 | Proposal script v1 (`scripts/02-il-segreto-proposal.md`) | — |
| 01 | Ritorno | 1:30 | Delivered | `out/ritorno-master.mp4` |

## Pipeline (`film/ritorno/` = production bible, `pipeline/` = steps, all re-runnable)
1. `01-references.mjs` — character sheets + gift box (Seedream 5 Pro, ModelArk)
2. `02-keyframes.mjs [--force] [S01 …]` — first frames per shot with identity/product refs
3. `03-video.mjs` — Seedance 2.5 i2v (ModelArk; kie.ai Seedance 2.5 fallback on face rejection)
4. `04-audio.mjs` — ElevenLabs: narration (v3, word timestamps), score (music_v1), ambience beds
5. `05-dialogue.mjs` — production dialogue → isolation → speech-to-speech (character voice continuity) → Scribe timings
6. `node film/ritorno/cutlist.mjs` — EDL → `edit.json` (A/B tracks, J/L-cuts, motivated cuts); trims in `cut-overrides.json`
7. `06-lambda.mjs deploy|render` — Remotion Lambda (Larven, eu-north-1) → `out/ritorno-nocaptions.mp4`
8. `07-captions.mjs` — HyperFrames subtitle pass (Larven HyperFrames Lambda) → `out/ritorno-final.mp4`
9. `09-master.mjs` — two-pass loudnorm −14 LUFS / −1 dBTP → `out/ritorno-master.mp4`
10. Delivery: upload + library filing (internal procedure in local `CLAUDE.local.md`)

Keys live in `.env` (gitignored; see `.env.example`). Preview the edit: `npm run studio`.
