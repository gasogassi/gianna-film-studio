// 12 variations of the chosen "SEED ROUND: SUCCESSFUL." seedling design.
const SANS = "a clean modern geometric sans-serif typeface like Onest SemiBold";
const LARVEN = 'the brand logo: the exact "Larven" wordmark from @Image2 (capital L with a long flat base, rounded geometric letters), reproduced faithfully in dark charcoal #2B2B2B (or white on dark fabric), no icon';
const P = (ink, typo, sprout) =>
  `a cute small seedling icon: ${sprout}; below it "SEED ROUND:" and "SUCCESSFUL." over two lines in ${typo}, ${ink}; below that small ${LARVEN}. The only text is exactly "SEED ROUND: SUCCESSFUL." and the Larven wordmark`;
export const SV = [
  { id: "sv01-powderblue-classic", color: "powder blue", print: P("charcoal", `bold ${SANS}`, "two rounded leaves in Larven blue on a small charcoal soil mound") },
  { id: "sv02-white-blue", color: "white", print: P('charcoal, with the word "SUCCESSFUL." in Larven blue', `bold ${SANS}`, "two Larven-blue leaves on a charcoal soil mound") },
  { id: "sv03-charcoal-glow", color: "charcoal", print: P("white", `bold ${SANS}`, "two bright sky-blue leaves on a white soil mound") + ". The Larven wordmark MUST be printed in SOLID BRIGHT WHITE ink, clearly visible on the dark fabric, never charcoal or dark grey" },
  { id: "sv04-ice-outline", color: "ice blue", print: P("charcoal", "an outlined stroke-only bold geometric sans-serif", "a minimal single-line outline drawing of a sprout in Larven blue") },
  { id: "sv05-sage-natural", color: "soft sage green", print: P("deep forest green", "bold rounded sans-serif", "a sprout with three leaves in leaf green growing from a small terracotta pot") },
  { id: "sv06-navy-pixel", color: "deep navy blue", print: P("white", "a retro 8-bit pixel font", "a pixel-art sprout in sky blue and green") },
  { id: "sv07-cream-handdrawn", color: "natural cream", print: P("charcoal", "playful hand-drawn marker lettering", "a cute doodle sprout with a tiny smiling face and Larven-blue leaves") },
  { id: "sv08-skyblue-badge", color: "light sky blue", print: P("charcoal", "bold condensed capitals arranged inside a circular badge outline", "a Larven-blue sprout centred inside the badge") },
  { id: "sv09-heather-chart", color: "heather grey", print: P("charcoal", `bold ${SANS}`, "a sprout whose stem turns into a rising line-chart arrow, Larven blue") },
  { id: "sv10-white-terminal", color: "white", print: P("charcoal", "a monospace code font with a blinking cursor block after the period", "a tiny pixel sprout in Larven blue") },
  { id: "sv11-mint-bubble", color: "pale mint", print: P("deep navy", "puffy rounded bubble letters", "a chubby cartoon sprout with two big Larven-blue leaves") },
  { id: "sv12-charcoal-gradient", color: "charcoal", print: P('white, with "SUCCESSFUL." in a blue-to-sky-blue gradient', `bold ${SANS}`, "two leaves with a blue-to-sky gradient on a white soil mound") + ". The Larven wordmark MUST be printed in SOLID BRIGHT WHITE ink, clearly visible on the dark fabric, never charcoal or dark grey" },
];
