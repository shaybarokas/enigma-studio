import type { MetadataRoute } from "next";

const BASE = process.env.APP_URL ?? "https://enigma-studios.co";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/signup", "/login", "/terms", "/privacy", "/accessibility"].map((p) => ({ url: `${BASE}${p}`, changeFrequency: p ? "monthly" : "weekly", priority: p ? 0.5 : 1 }));
}
