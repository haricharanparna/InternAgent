import type { Metadata } from "next";
import { Atkinson_Hyperlegible, Plus_Jakarta_Sans } from "next/font/google";
import { themeInitScript } from "@/components/ThemeToggle";
import { a11yInitScript } from "@/lib/a11y";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta" });
// Used by the "Readable font" accessibility setting.
const atkinson = Atkinson_Hyperlegible({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-atkinson" });

export const metadata: Metadata = {
  title: "InternAgent",
  description: "An honest AI agent that finds internships you fit and helps you close the gaps.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${jakarta.variable} ${atkinson.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript + a11yInitScript }} />
      </head>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
