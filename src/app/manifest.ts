import type { MetadataRoute } from "next";

// PWA-ready (§7): instalável na home screen — uso primário é mobile.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "PersonalHub",
    short_name: "PersonalHub",
    description: "Organização como subproduto de gestos preguiçosos.",
    lang: "pt-BR",
    dir: "ltr",
    start_url: "/",
    display: "standalone",
    background_color: "#F6F7F9",
    theme_color: "#F6F7F9",
    // Atalhos do long-press no ícone — direto pras outras 2 telas.
    shortcuts: [
      {
        name: "Cobrança",
        url: "/cobranca",
        icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Alunos",
        url: "/alunos",
        icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
    ],
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
