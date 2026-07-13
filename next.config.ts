import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Cache do router no client (perf de navegação): abas e meses pré-
    // carregados servem instantâneo. dynamic=30s cobre Links (viewport);
    // static=180s cobre router.prefetch (carrossel + MesNavegador) — mais
    // curto que o default de 5min porque isto é app de dinheiro. Toda server
    // action revalida o path que muda, purgando este cache na hora; a janela
    // só vale p/ mudança vinda de OUTRO aparelho.
    staleTimes: { dynamic: 30, static: 180 },
  },
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
