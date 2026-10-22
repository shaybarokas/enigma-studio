import type { MetadataRoute } from "next";

// "Add to home screen" on Android and Chrome: the Enigma owl, not a blank tile.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Enigma Studio",
    short_name: "Enigma Studio",
    description: "סטודיו קריאייטיב עם סוכן AI: גרפיקות, מודעות וסרטונים להשקה שלך",
    start_url: "/studio",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0b0b14",
    lang: "he",
    dir: "rtl",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
