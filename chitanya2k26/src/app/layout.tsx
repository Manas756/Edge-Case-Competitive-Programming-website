import type { Metadata, Viewport } from "next";
import { ToastProvider } from "@/components/ui";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Edge Case · Coding Contest Platform", template: "%s · Edge Case" },
  description: "Join coding contests, solve algorithmic problems and compete on a live leaderboard.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#ffffff" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Bitcount+Single:wght@100..900&display=swap" rel="stylesheet" />
      </head>
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}

