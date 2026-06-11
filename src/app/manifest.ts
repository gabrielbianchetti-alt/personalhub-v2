import type { MetadataRoute } from "next";

// PWA-ready (§7): instalável na home screen — uso primário é mobile.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PersonalHub",
    short_name: "PersonalHub",
    description: "Organização como subproduto de gestos preguiçosos.",
    start_url: "/",
    display: "standalone",
    background_color: "#FAF6F1",
    theme_color: "#FAF6F1",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
