import type { MetadataRoute } from "next";

// PWA-ready (§7): instalável na home screen — uso primário é mobile.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PersonalHub",
    short_name: "PersonalHub",
    description: "Organização como subproduto de gestos preguiçosos.",
    start_url: "/",
    display: "standalone",
    background_color: "#F6F7F9",
    theme_color: "#F6F7F9",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      // PNGs raster: iOS/Android ignoram SVG no install (placeholder cinza).
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
