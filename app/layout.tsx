/**
 * Ahoy! This be the grand architecture of our vessel.
 * It provides the hull and the rigging (fonts and metadata) for the entire fleet.
 */
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aus Export Tracker — Australia's Natural Resource Exports",
  description:
    "Interactive map visualising Australia's LNG and iron ore export flows, trade routes, volumes, and government revenue.",
  openGraph: {
    title: "Aus Export Tracker",
    description: "Visualise Australia's natural resource export flows.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Space+Grotesk:wght@500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
