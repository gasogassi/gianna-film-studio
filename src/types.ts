export type PictureEvent = {
  track: "V1" | "V2";
  shot: string;
  act: "act1" | "act2" | "act3";
  /** Timeline position (s). */
  at: number;
  /** Source in-point (s). */
  in: number;
  dur: number;
  fadeIn?: number;
  fadeOut?: number;
  pushFrom?: number;
  pushTo?: number;
  note?: string;
};

export type SoundEvent = {
  /** A1 narration · A2 dialogue · A3 production FX · A4 ambience bed */
  track: "A1" | "A2" | "A3" | "A4";
  /** public/ path, or `clip:<shot>` for a clip's production sound. */
  src: string;
  at: number;
  in?: number;
  dur: number;
  gain?: number;
  fadeIn?: number;
  fadeOut?: number;
  label?: string;
};

export type Edit = {
  /** public/ folder holding this film's clips (default "clips"). */
  clipDir?: string;
  fps: number;
  duration: number;
  picture: PictureEvent[];
  sound: SoundEvent[];
  score: { src: string; at: number; in: number; dur: number; gain: number };
  endCard: { at: number; dur: number };
};
