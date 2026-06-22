// Service worker mínimo do PersonalHub (PWA-ready, §7).
// Objetivo: abrir o app instalado sem rede e dar um fallback honesto — NÃO é
// fila de sincronização (fase 2). Princípios:
//   - Navegações (HTML): network-first; sem rede → página /offline. NUNCA
//     cacheia a resposta de navegação (são páginas autenticadas com dados do
//     aluno — não podem ficar em cache).
//   - Assets imutáveis (/_next/static, ícones): cache-first (hash no nome).
//   - Só GET e só same-origin. Requests ao Supabase (outra origem) passam direto.
const CACHE = "personalhub-v2";
const ESSENCIAIS = ["/offline", "/icon.svg", "/manifest.webmanifest"];

// Fallback de último recurso se /offline não estiver no cache (precache falhou):
// melhor um aviso honesto que a tela de erro do navegador.
const OFFLINE_HTML =
  '<!doctype html><meta charset="utf-8">' +
  '<meta name="viewport" content="width=device-width,initial-scale=1">' +
  "<title>Sem conexão</title>" +
  '<body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;' +
  'font-family:system-ui,sans-serif;background:#0E1116;color:#E7ECF2;text-align:center">' +
  '<div style="padding:2rem"><p style="font-size:1.4rem;font-weight:700;margin:0">Sem conexão</p>' +
  '<p style="opacity:.7;margin:.5rem 0 0">Tente de novo quando a internet voltar.</p></div>';

const respostaOffline = async () =>
  (await caches.match("/offline")) ??
  new Response(OFFLINE_HTML, { headers: { "Content-Type": "text/html; charset=utf-8" } });

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      // allSettled: um asset indisponível não impede a instalação.
      await Promise.allSettled(ESSENCIAIS.map((url) => cache.add(url)));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const chaves = await caches.keys();
      await Promise.all(chaves.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // Supabase etc. passam direto

  // Navegação: network-first, fallback /offline. Sem cache da resposta
  // (são páginas autenticadas com dados do aluno).
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => respostaOffline()));
    return;
  }

  // Chunks do Next: nome com hash = imutável → cache-first.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        const res = await fetch(request);
        if (res.ok) (await caches.open(CACHE)).put(request, res.clone());
        return res;
      })(),
    );
    return;
  }

  // Ícones (sem hash na URL): stale-while-revalidate — rápido do cache, mas
  // atualiza em segundo plano pra não congelar a arte entre deploys.
  if (/^\/icon(-\d+)?\.(svg|png)$/.test(url.pathname)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE);
        const cached = await cache.match(request);
        const rede = fetch(request)
          .then((res) => {
            if (res.ok) cache.put(request, res.clone());
            return res;
          })
          .catch(() => cached);
        return cached || rede;
      })(),
    );
  }
});
