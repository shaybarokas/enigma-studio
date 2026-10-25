import type { Metadata } from "next";
import { Heebo } from "next/font/google";
import { MetaPixel } from "@/components/meta-pixel";
import "./globals.css";

const heebo = Heebo({
  variable: "--font-heebo",
  subsets: ["hebrew", "latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL ?? "https://enigma-studios.co"),
  title: "Enigma Studio",
  description: "סטודיו קריאייטיב עם AI: גרפיקות, מודעות וסרטונים מעוצבים להשקה שלך, בכמה דקות",
  openGraph: { type: "website", locale: "he_IL", siteName: "Enigma Studio", images: [{ url: "/og.jpg", width: 1200, height: 630 }] },
  twitter: { card: "summary_large_image" },
  // The name under the owl when saved to an iPhone home screen.
  appleWebApp: { title: "Enigma Studio", capable: true, statusBarStyle: "default" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="he" dir="rtl" className={`${heebo.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {children}
        <MetaPixel />
      </body>
    </html>
  );
}
