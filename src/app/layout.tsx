import type { Metadata } from "next";
import { Atkinson_Hyperlegible, Newsreader, Public_Sans } from "next/font/google";
import { themeInitScript } from "@/components/ThemeToggle";
import { a11yInitScript } from "@/lib/a11y";
import "./globals.css";

const publicSans = Public_Sans({ subsets: ["latin"], variable: "--font-public" });
const newsreader = Newsreader({ subsets: ["latin"], style: ["normal", "italic"], variable: "--font-newsreader" });
// Used by the "Readable font" accessibility setting.
const atkinson = Atkinson_Hyperlegible({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-atkinson" });

export const metadata: Metadata = {
  title: "InternAgent",
  description: "An honest AI agent that finds internships you fit and helps you close the gaps.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${publicSans.variable} ${newsreader.variable} ${atkinson.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript + a11yInitScript }} />
      </head>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
