import React from "react";
import { AbsoluteFill, Sequence, staticFile, useCurrentFrame, useVideoConfig, interpolate, Easing, Img } from "remotion";
import { Video, Audio } from "@remotion/media";
import type { Edit, PictureEvent, SoundEvent } from "./types";
import { loadFont } from "@remotion/google-fonts/Urbanist";

const { fontFamily: urbanist } = loadFont("normal", { weights: ["300", "400"], subsets: ["latin"] });

/**
 * Ritorno — cinematic documentary-style continuity edit.
 *
 * Picture (V1 A-roll, V2 B-roll overlays) and sound (A1 narration, A2 dialogue, A3 production
 * effects, A4 ambience beds, A5 score) are processed as independent tracks. A split edit is simply
 * a sound event whose `at` precedes (J-cut) or outlasts (L-cut) the picture event it belongs to.
 */

const grade: Record<string, string> = {
  act1: "saturate(0.78) contrast(1.04) brightness(0.96) hue-rotate(-4deg)",
  act2: "saturate(1.02) contrast(1.03) sepia(0.06)",
  act3: "saturate(1.08) contrast(1.05) sepia(0.08) brightness(1.02)",
};

const sec = (s: number, fps: number) => Math.round(s * fps);

const Picture: React.FC<{ e: PictureEvent; clipDir: string }> = ({ e, clipDir }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const dur = sec(e.dur, fps);
  // Invisible editing: straight cuts by default; a dissolve only where the EDL asks for one.
  const fadeIn = e.fadeIn ? interpolate(frame, [0, sec(e.fadeIn, fps)], [0, 1], { extrapolateRight: "clamp" }) : 1;
  const fadeOut = e.fadeOut ? interpolate(frame, [dur - sec(e.fadeOut, fps), dur], [1, 0], { extrapolateLeft: "clamp" }) : 1;
  // Slow, motivated push (Ken Burns at 1–3%) only where specified; never kinetic.
  const scale = interpolate(frame, [0, dur], [1 + (e.pushFrom ?? 0), 1 + (e.pushTo ?? 0)], { easing: Easing.inOut(Easing.quad) });
  return (
    <AbsoluteFill style={{ opacity: fadeIn * fadeOut, filter: grade[e.act] ?? "none" }}>
      <Video
        src={staticFile(`${clipDir}/${e.shot}.mp4`)}
        trimBefore={sec(e.in, fps)}
        muted
        style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${scale})` }}
      />
    </AbsoluteFill>
  );
};

const Sound: React.FC<{ e: SoundEvent }> = ({ e }) => {
  const { fps } = useVideoConfig();
  const dur = sec(e.dur, fps);
  const fi = sec(e.fadeIn ?? 0.04, fps);
  const fo = sec(e.fadeOut ?? 0.08, fps);
  const src = e.src.startsWith("clip:") ? staticFile(`clips/${e.src.slice(5)}.mp4`) : staticFile(e.src);
  return (
    <Audio
      src={src}
      trimBefore={sec(e.in ?? 0, fps)}
      volume={(f) => {
        const env = Math.min(
          fi ? interpolate(f, [0, fi], [0, 1], { extrapolateRight: "clamp" }) : 1,
          fo ? interpolate(f, [dur - fo, dur], [1, 0], { extrapolateLeft: "clamp" }) : 1,
        );
        return env * (e.gain ?? 1);
      }}
    />
  );
};

/** Score: a constant, low music bed (no ducking) — the voice sits ~16 LU above it. */
const Score: React.FC<{ edit: Edit }> = ({ edit }) => {
  const { fps } = useVideoConfig();
  const s = edit.score;
  const total = sec(s.dur, fps);
  return (
    <Sequence from={sec(s.at, fps)} durationInFrames={total} name="A5 score">
      <Audio
        src={staticFile(s.src)}
        trimBefore={sec(s.in, fps)}
        volume={(f) => s.gain * Math.min(1, f / (fps * 0.25)) * Math.max(0, Math.min(1, (total - f) / (fps * 3)))}
      />
    </Sequence>
  );
};

const Grain: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "overlay", opacity: 0.16 }}>
      <svg width="100%" height="100%">
        <filter id="g">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={frame % 24} stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#g)" />
      </svg>
    </AbsoluteFill>
  );
};

const Vignette: React.FC = () => (
  <AbsoluteFill style={{ background: "radial-gradient(ellipse 85% 70% at 50% 50%, transparent 55%, rgba(0,0,0,0.45) 100%)" }} />
);

const EndCard: React.FC<{ at: number; dur: number }> = ({ at, dur }) => {
  const { fps } = useVideoConfig();
  return (
    <Sequence from={sec(at, fps)} durationInFrames={sec(dur, fps)} name="End card">
      <EndCardInner />
    </Sequence>
  );
};

const EndCardInner: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const a = (start: number, len = 0.9) =>
    interpolate(frame, [sec(start, fps), sec(start + len, fps)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-start", paddingTop: 360 }}>
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 45%)", opacity: a(0, 1.2) }} />
      <Img src={staticFile("brand/gb-logo-white.svg")} style={{ width: 640, opacity: a(0.3), transform: `translateY(${(1 - a(0.3)) * 14}px)` }} />
      <div style={{ marginTop: 34, color: "rgba(255,255,255,0.92)", fontFamily: urbanist, fontSize: 38, letterSpacing: 3, fontWeight: 300, opacity: a(1.0) }}>
        Designed by women who know women.
      </div>
    </AbsoluteFill>
  );
};

export const Film: React.FC<{ edit: Edit }> = ({ edit }) => {
  const { fps } = useVideoConfig();
  const v1 = edit.picture.filter((p) => p.track === "V1");
  const v2 = edit.picture.filter((p) => p.track === "V2");
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {[...v1, ...v2].map((e, i) => (
        <Sequence key={`p${i}`} from={sec(e.at, fps)} durationInFrames={sec(e.dur, fps)} name={`${e.track} ${e.shot}`}>
          <Picture e={e} clipDir={edit.clipDir ?? "clips"} />
        </Sequence>
      ))}
      <Vignette />
      <Grain />
      <EndCard at={edit.endCard.at} dur={edit.endCard.dur} />
      {edit.sound.map((e, i) => (
        <Sequence key={`s${i}`} from={sec(e.at, fps)} durationInFrames={sec(e.dur, fps)} name={`${e.track} ${e.label ?? e.src}`}>
          <Sound e={e} />
        </Sequence>
      ))}
      <Score edit={edit} />
    </AbsoluteFill>
  );
};
