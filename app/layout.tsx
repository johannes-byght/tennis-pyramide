import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Fraunces } from "next/font/google";
import "./globals.css";

const sans = Plus_Jakarta_Sans({
  variable: "--font-sans-app",
  subsets: ["latin"],
  display: "swap",
});

const display = Fraunces({
  variable: "--font-display-app",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "sixseven · Tennis",
  description: "Vereins-Tennis-App: Challenges, Rangliste, Achievements.",
  applicationName: "sixseven",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "sixseven",
    statusBarStyle: "default",
  },
  icons: {
    icon: [{ url: "/icons/icon-192.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icons/icon-192.svg" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#389648",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className={`${sans.variable} ${display.variable}`}>
      <body className="court-bg min-h-svh">{children}</body>
    </html>
  );
}
