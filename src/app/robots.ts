import type { MetadataRoute } from "next";

const BASE = process.env.APP_URL ?? "https://enigma-studios.co";

export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: "/", disallow: ["/studio", "/api", "/auth", "/reset"] }, sitemap: `${BASE}/sitemap.xml` };
}
