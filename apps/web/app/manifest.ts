import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CrossVal — Orders & Settlements",
    short_name: "CrossVal",
    description:
      "Audit-ready financial workspace for order settlement operations and receivables tracking.",
    start_url: "/orders",
    display: "standalone",
    background_color: "#F8FAFC",
    theme_color: "#090D16",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
