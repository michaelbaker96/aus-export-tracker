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
    <html lang="en" style={{ height: "100%" }}>
      <body style={{ height: "100%", margin: 0 }}>{children}</body>
    </html>
  );
}
