import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Infrastructure Calculator — LLM Hardware Sizing",
  description:
    "Estimate the VRAM, RAM, KV cache, tokens/sec, GPU and cost required to run any Large Language Model locally or on a server.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body>
        <div className="app-bg" />
        {children}
      </body>
    </html>
  );
}
