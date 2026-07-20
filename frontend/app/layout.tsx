import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AirIntel Malaysia",
  description:
    "Predictive haze safety windows for Malaysia, on your phone and in Telegram.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "AirIntel",
  },
};

export const viewport = {
  themeColor: "#209CEE",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body className="bg-panel text-ink font-body antialiased">
        {children}
      </body>
    </html>
  );
}
