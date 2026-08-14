import type { Metadata } from "next";
import type { ReactNode } from "react";

import { QueryProvider } from "../components/providers/query-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "CrossVal Orders & Settlements",
  description: "A reliable workspace for order settlement operations.",
};

type RootLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
