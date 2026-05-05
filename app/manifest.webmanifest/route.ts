import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    name: "Tennis Pyramide",
    short_name: "Pyramide",
    description: "Vereins-Tennis-App: Challenges, Rangliste, Achievements.",
    start_url: "/",
    display: "standalone",
    background_color: "#fbf7ee",
    theme_color: "#389648",
    orientation: "portrait",
    icons: [
      { src: "/icons/icon-192.svg", sizes: "192x192", type: "image/svg+xml", purpose: "any maskable" },
      { src: "/icons/icon-512.svg", sizes: "512x512", type: "image/svg+xml", purpose: "any maskable" },
    ],
    categories: ["sports", "social", "lifestyle"],
    lang: "de",
  });
}
