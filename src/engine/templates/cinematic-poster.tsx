// "Cinematic poster": the lecturer as hero against a graded scene, a metallic brand wordmark and a
// Hebrew promise. Derived from Enigma's course covers (BRICK BOSS, CODE TO CODE, איתותים שקטים).
import { fitText } from "@remotion/layout-utils";
import { AbsoluteFill, Img, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { z } from "zod";
import { fontFamily, type FontName } from "../fonts";
import { formatFromSize, STORY_SAFE, type FormatId } from "../formats";
import { alpha, Glow, Grain, Vignette } from "../fx";
import { brandSchema, transformSchema, type Transform } from "../types";

export const cinematicPosterSchema = z.object({
  brand: brandSchema,
  wordmark: z.array(z.string()).min(1).max(3), // brand-name lines, often English: ["BRICK", "BOSS"]
  kicker: z.string(), // short line above the promise
  subtitle: z.string(), // the Hebrew promise
  background: z.string(), // wide scene
  backgroundTall: z.string().optional(), // tall scene for 3:4 and story
  subject: z.string(), // lecturer cut-out, cropped tight
  subjectAspect: z.number(), // width / height of the cut-out
  subjectSide: z.enum(["left", "right"]).default("left"),
  overrides: z.record(z.string(), transformSchema.partial()).default({}),
});
export type CinematicPosterProps = z.infer<typeof cinematicPosterSchema>;

type Box = { left: number; top: number; width: number; height: number };
type Layout = {
  subject: Box;
  wordmark: Box & { align: "center" | "end" };
  subtitle: Box & { align: "center" | "end" };
  sideFade: number; // 0 = none; otherwise how far the text-side gradient reaches (fraction of width)
  bottomFade: number; // fraction of height
  maxWordmark: number; // px cap for the wordmark size
};

// Every format gets its own composition, not a crop of the landscape one.
function layoutFor(format: FormatId, W: number, H: number, ar: number, side: "left" | "right"): Layout {
  const mirror = (b: Box): Box => (side === "left" ? b : { ...b, left: W - b.left - b.width });
  if (format === "landscape") {
    const h = H * 0.97;
    const w = h * ar;
    const textW = W * 0.46;
    const textLeft = side === "left" ? W - W * 0.06 - textW : W * 0.06;
    return {
      subject: mirror({ left: W * 0.07, top: H - h, width: w, height: h }),
      wordmark: { left: textLeft, top: H * 0.13, width: textW, height: H * 0.42, align: "end" },
      subtitle: { left: textLeft, top: H * 0.62, width: textW, height: H * 0.28, align: "end" },
      sideFade: 0.62,
      bottomFade: 0.35,
      maxWordmark: H * 0.2,
    };
  }
  if (format === "square") {
    const h = H * 0.8;
    const w = h * ar;
    const textW = W * 0.56;
    const textLeft = side === "left" ? W - W * 0.06 - textW : W * 0.06;
    return {
      subject: mirror({ left: W * 0.02, top: H - h, width: w, height: h }),
      wordmark: { left: W * 0.06, top: H * 0.07, width: W * 0.88, height: H * 0.3, align: "end" },
      subtitle: { left: textLeft, top: H * 0.6, width: textW, height: H * 0.32, align: "end" },
      sideFade: 0.7,
      bottomFade: 0.45,
      maxWordmark: H * 0.16,
    };
  }
  // Tall formats: wordmark on top, hero centred, promise over a deep bottom fade.
  // The hero's height is settled later, once the wordmark's real size is known (see fitTall).
  const story = format === "story";
  const top = story ? H * (STORY_SAFE.top + 0.01) : H * 0.06;
  const subtitleBottom = story ? H * (1 - STORY_SAFE.bottom) : H * 0.95;
  const subtitleH = H * (story ? 0.2 : 0.22);
  return {
    subject: { left: 0, top: 0, width: 0, height: 0 },
    wordmark: { left: W * 0.07, top, width: W * 0.86, height: H * 0.24, align: "center" },
    subtitle: { left: W * 0.07, top: subtitleBottom - subtitleH, width: W * 0.86, height: subtitleH, align: "center" },
    sideFade: 0,
    bottomFade: story ? 0.55 : 0.5,
    maxWordmark: W * 0.24,
  };
}

// Tall formats: the head tucks just under the wordmark (magazine-cover depth), never over its middle.
function fitTall(L: Layout, W: number, H: number, ar: number, lines: number, markSize: number): Box {
  const markBottom = L.wordmark.top + lines * markSize * 0.95;
  const top = Math.max(markBottom - markSize * 0.3, H * 0.24);
  // Big and close: the hero runs off the bottom edge (chest crop) instead of shrinking to fit.
  const w = Math.max(W * 0.86, (H - top) * ar);
  return { left: (W - w) / 2, top, width: w, height: w / ar };
}

const Placed: React.FC<{ box: Box; t?: Partial<Transform>; style?: React.CSSProperties; children: React.ReactNode }> = ({
  box,
  t,
  style,
  children,
}) => {
  if (t?.hidden) return null;
  return (
    <div
      style={{
        position: "absolute",
        ...box,
        transform: `translate(${t?.x ?? 0}px, ${t?.y ?? 0}px) scale(${t?.scale ?? 1}) rotate(${t?.rotate ?? 0}deg)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export const CinematicPoster: React.FC<CinematicPosterProps> = (p) => {
  const frame = useCurrentFrame();
  const { width: W, height: H, fps, durationInFrames } = useVideoConfig();
  const format = formatFromSize(W, H);
  const tall = format === "portrait" || format === "story";
  const L = layoutFor(format, W, H, p.subjectAspect, p.subjectSide);
  const { bg, ink, muted, accent } = p.brand.palette;
  const display = fontFamily(p.brand.displayFont as FontName);
  const body = fontFamily(p.brand.bodyFont as FontName);
  const o = p.overrides;

  // Wordmark size: the largest that fits the widest line, capped so it never shouts over the face.
  const longest = p.wordmark.reduce((a, b) => (b.length > a.length ? b : a), "");
  const markSize = Math.min(
    L.maxWordmark,
    fitText({ text: longest, withinWidth: L.wordmark.width, fontFamily: display, fontWeight: 900 }).fontSize,
  );
  if (tall) L.subject = fitTall(L, W, H, p.subjectAspect, p.wordmark.length, markSize);
  const base = format === "landscape" ? H : W;
  const subtitleSize = Math.round(base * (format === "landscape" ? 0.052 : format === "story" ? 0.074 : 0.064));
  const kickerSize = Math.round(subtitleSize * 0.6);
  const justify = (a: "center" | "end") => (a === "center" ? "center" : "flex-start");
  // Scene light comes from the text side; the hero's far side falls into shadow.
  const lightFromRight = p.subjectSide === "left";

  // Motion: the same component is the promo's opening shot; stills are its last frame.
  const enter = (delay: number) => spring({ frame: frame - delay, fps, config: { damping: 200 }, durationInFrames: 30 });
  const push = interpolate(frame, [0, durationInFrames], [1.14, 1.04]);
  const sceneIn = interpolate(frame, [0, 14], [0, 1], { extrapolateRight: "clamp" });
  const subjectIn = enter(6);
  const markIn = enter(14);
  const subIn = enter(24);
  const sweep = interpolate(frame, [34, 70], [-60, 160], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const subjectMask = `url("${p.subject}")`;

  return (
    <AbsoluteFill style={{ background: bg, overflow: "hidden", direction: "rtl" }}>
      {/* Scene, slowly pushing in, graded toward the brand's darkest tone. */}
      <AbsoluteFill style={{ opacity: sceneIn, transform: `scale(${push})` }}>
        <Img
          src={tall && p.backgroundTall ? p.backgroundTall : p.background}
          style={{ width: "100%", height: "100%", objectFit: "cover", filter: "saturate(0.85) brightness(0.8)" }}
        />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: bg, mixBlendMode: "multiply", opacity: 0.4 }} />
      {L.sideFade > 0 && (
        <AbsoluteFill
          style={{
            background: `linear-gradient(${lightFromRight ? "to left" : "to right"}, ${bg}${alpha(0.9)} 0%, ${bg}${alpha(0.55)} ${L.sideFade * 55}%, transparent ${L.sideFade * 100}%)`,
          }}
        />
      )}

      {/* Brand wordmark sits behind the hero: metallic, tracking in, then a light sweep. */}
      <Placed
        box={L.wordmark}
        t={o.wordmark}
        style={{ display: "flex", flexDirection: "column", alignItems: justify(L.wordmark.align), direction: "ltr" }}
      >
        {p.wordmark.map((line, i) => (
          <div
            key={i}
            style={{
              fontFamily: display,
              fontWeight: 900,
              fontSize: markSize,
              lineHeight: 0.95,
              letterSpacing: `${interpolate(markIn, [0, 1], [0.25, 0.02])}em`,
              opacity: markIn,
              textTransform: "uppercase",
              whiteSpace: "nowrap",
              backgroundImage: `linear-gradient(100deg, transparent ${sweep - 20}%, #ffffff ${sweep}%, transparent ${sweep + 20}%), linear-gradient(180deg, #ffffff 0%, ${ink} 42%, ${muted} 58%, #ffffff 100%)`,
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
              filter: `drop-shadow(0 ${markSize * 0.06}px ${markSize * 0.18}px #000000${alpha(0.55)})`,
              alignSelf: L.wordmark.align === "center" ? "center" : "flex-end",
            }}
          >
            {line}
          </div>
        ))}
      </Placed>

      {/* Hero: backlit, shaded on the far side, rim-lit on the near side, melting into the floor. */}
      <Glow
        x={L.subject.left + L.subject.width / 2}
        y={L.subject.top + L.subject.height * 0.3}
        size={L.subject.width * 1.5}
        color={accent}
        opacity={0.2 * subjectIn}
      />
      <Placed
        box={L.subject}
        t={o.subject}
        style={{ opacity: subjectIn, translate: `0 ${(1 - subjectIn) * H * 0.05}px` }}
      >
        <Img
          src={p.subject}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            filter: `brightness(0.9) contrast(1.1) saturate(0.82) drop-shadow(0 ${H * 0.02}px ${H * 0.05}px #000000${alpha(0.7)})`,
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            maskImage: subjectMask,
            maskSize: "100% 100%",
            WebkitMaskImage: subjectMask,
            WebkitMaskSize: "100% 100%",
            background: `linear-gradient(${lightFromRight ? "to left" : "to right"}, ${accent}${alpha(0.28)} 0%, transparent 22%, transparent 55%, ${bg}${alpha(0.62)} 100%)`,
            mixBlendMode: "soft-light",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            maskImage: `linear-gradient(to top, black 0%, transparent 30%), ${subjectMask}`,
            maskComposite: "intersect",
            maskSize: "100% 100%",
            WebkitMaskImage: subjectMask,
            WebkitMaskSize: "100% 100%",
            background: `linear-gradient(to top, ${bg} 0%, ${bg}${alpha(0.8)} 10%, transparent 34%)`,
          }}
        />
      </Placed>

      <AbsoluteFill
        style={{
          background: `linear-gradient(to top, ${bg} 0%, ${bg}${alpha(0.85)} ${L.bottomFade * 40}%, transparent ${L.bottomFade * 100}%)`,
        }}
      />

      {/* The promise, in Hebrew. */}
      <Placed
        box={L.subtitle}
        t={o.subtitle}
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          alignItems: justify(L.subtitle.align),
          textAlign: L.subtitle.align === "center" ? "center" : "right",
          opacity: subIn,
          translate: `0 ${(1 - subIn) * 30}px`,
        }}
      >
        <div
          style={{
            fontFamily: body,
            fontWeight: 700,
            fontSize: kickerSize,
            color: accent,
            letterSpacing: "0.04em",
            marginBottom: kickerSize * 0.35,
          }}
        >
          {p.kicker}
        </div>
        <div
          style={{
            width: interpolate(subIn, [0, 1], [0, kickerSize * 3.2]),
            height: Math.max(3, kickerSize * 0.12),
            background: accent,
            borderRadius: 4,
            marginBottom: kickerSize * 0.55,
            boxShadow: `0 0 ${kickerSize}px ${accent}${alpha(0.7)}`,
          }}
        />
        <div
          style={{
            fontFamily: body,
            fontWeight: 800,
            fontSize: subtitleSize,
            lineHeight: 1.15,
            color: ink,
            textShadow: `0 4px 24px #000000${alpha(0.75)}`,
            textWrap: "balance",
          }}
        >
          {p.subtitle}
        </div>
      </Placed>

      <Vignette strength={0.5} />
      <Grain opacity={0.12} />
    </AbsoluteFill>
  );
};
