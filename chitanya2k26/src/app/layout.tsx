import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono, Pixelify_Sans } from "next/font/google";
import { ToastProvider } from "@/components/ui";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

const pixelifySans = Pixelify_Sans({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-pixel",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Edge Case · Coding Contest Platform", template: "%s · Edge Case" },
  description: "Join coding contests, solve algorithmic problems and compete on a live leaderboard.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#ffffff" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${plusJakartaSans.variable} ${jetbrainsMono.variable} ${pixelifySans.variable}`}>
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}

