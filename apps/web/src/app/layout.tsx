import type { Metadata } from "next";
import type React from "react";
import "@fontsource-variable/figtree";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Sitter Ranking Playground",
  description:
    "Unofficial Sittsy application demo: explainable ranking, local price evidence and a complete boarding request. All data is fake.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
