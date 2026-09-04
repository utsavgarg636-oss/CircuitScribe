import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CircuitScribe | Autonomous Voice-to-Architecture & Docker Compiler",
  description:
    "Convert spoken engineering discussions into interactive React Flow diagrams, audit with NetworkX graph linter, and compile into production docker-compose.yml files.",
  keywords: [
    "Architecture as Code",
    "Voice to Code",
    "React Flow",
    "Docker Compose Generator",
    "System Design",
    "NetworkX Linter",
    "Cloud Architecture"
  ],
  authors: [{ name: "CircuitScribe Team" }],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-[#080c14] text-slate-100 min-h-screen antialiased selection:bg-sky-500/30 selection:text-sky-200">
        {children}
      </body>
    </html>
  );
}
