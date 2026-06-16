import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    // Páginas de autenticação nunca podem vir de cache: um build antigo
    // cacheado (ex.: deploy quebrado) deixaria o login servindo JS velho.
    // no-store força o navegador/edge a sempre buscar a versão atual.
    return [
      {
        source: "/login",
        headers: [{ key: "Cache-Control", value: "no-store, must-revalidate" }],
      },
      {
        source: "/atualizar-senha",
        headers: [{ key: "Cache-Control", value: "no-store, must-revalidate" }],
      },
    ];
  },
};

export default nextConfig;
