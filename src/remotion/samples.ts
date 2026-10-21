// Sample kits used to develop and test templates. Assets live in public/dev (not committed).
import { staticFile } from "remotion";
import type { CinematicPosterProps } from "../engine/templates/cinematic-poster";

export const brickBoss: CinematicPosterProps = {
  brand: {
    palette: { bg: "#050d13", ink: "#eef3f6", muted: "#93a7b4", accent: "#f2b54a" },
    displayFont: "Playfair Display",
    bodyFont: "Heebo",
  },
  wordmark: ["BRICK", "BOSS"],
  kicker: "ללוות ולהרוויח",
  subtitle: "קריירה בתור מלווה משקיעי נדל״ן",
  background: staticFile("dev/brick-bg-16x9.jpg"),
  backgroundTall: staticFile("dev/brick-bg-9x16.jpg"),
  subject: staticFile("dev/brick-subject.png"),
  subjectAspect: 613 / 986,
  subjectSide: "left",
  overrides: {},
};
