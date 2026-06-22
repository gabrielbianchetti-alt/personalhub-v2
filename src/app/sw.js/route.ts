// Serve o /sw.js com o nome do cache VERSIONADO por build (SHA do commit na
// Vercel). Assim cada deploy muda os bytes do SW → o navegador reinstala → o
// activate purga o cache antigo, e nenhum asset não-hashado congela entre
// versões. (Antes era public/sw.js estático: byte-idêntico em todo deploy, o SW
// nunca reinstalava e o activate virava no-op.)

export const dynamic = "force-static";

const VERSAO = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 8) ?? "dev";

const SW = `// Service worker do PersonalHub (gerado por /sw.js com versão de build).
const CACHE = "personalhub-${VERSAO}";
const ESSENCIAIS = ["/offline", "/icon.svg", "/manifest.webmanifest"];

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
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => respostaOffline()));
    return;
  }

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

  if (/^\\/icon(-\\d+)?\\.(svg|png)$/.test(url.pathname)) {
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
`;

export function GET() {
  return new Response(SW, {
    headers: {
      "Content-Type": "text/javascript; charset=utf-8",
      "Service-Worker-Allowed": "/",
      "Cache-Control": "no-cache",
    },
  });
}
