import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "SpinEarn — Earn while your AI thinks",
  description:
    "Monetize your VS Code AI tool usage. Earn revenue from sponsored messages shown in Claude Code spinners. 50% CPM share, paid directly to developers.",
  keywords: ["VS Code", "extension", "monetization", "Claude Code", "developer earnings", "passive income"],
  metadataBase: new URL("https://spinearn.in"),
  openGraph: {
    title: "SpinEarn — Turn AI thinking time into passive income",
    description:
      "SpinEarn shows 1-line sponsor messages in Claude Code spinners. Developers earn 50% CPM revenue — passively, while they code.",
    url: "https://spinearn.in",
    siteName: "SpinEarn",
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "SpinEarn" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "SpinEarn — Turn AI thinking time into passive income",
    description: "Passive income for developers. Earn 50% CPM from sponsored messages in Claude Code spinners.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <body className="font-sans antialiased bg-[#0a0a0a] text-white">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
