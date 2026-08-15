import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import { QueryProvider } from "../components/providers/query-provider";
import "./globals.css";

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  "https://crossval-orders-and-settlements-web.vercel.app";

export const viewport: Viewport = {
  themeColor: "#090D16",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "CrossVal — Orders & Settlements",
    template: "%s | CrossVal",
  },
  description:
    "Audit-ready financial workspace for order settlement operations, receivables management, and idempotent payment processing.",
  applicationName: "CrossVal Orders & Settlements",
  keywords: [
    "CrossVal",
    "Orders",
    "Settlements",
    "Receivables",
    "B2B Finance",
    "Financial Operations",
    "Invoicing",
    "Payments",
  ],
  authors: [{ name: "CrossVal" }],
  creator: "CrossVal",
  publisher: "CrossVal",
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: "CrossVal",
    title: "CrossVal — Orders & Settlements",
    description:
      "Audit-ready financial workspace for order settlement operations, receivables management, and idempotent payment processing.",
  },
  twitter: {
    card: "summary_large_image",
    title: "CrossVal — Orders & Settlements",
    description:
      "Audit-ready financial workspace for order settlement operations, receivables management, and idempotent payment processing.",
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/apple-icon" }],
  },
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
