import type { Metadata } from "next";
import "./fes.css";

export const metadata: Metadata = {
  title: "Fugitive Emission Studies & Instant Quotes | Power-Link",
  description: "Upload P&IDs, confirm your process-building scope and get a fugitive emission study quote. Leakage and ventilation assessment from Power-Link Technologies.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
