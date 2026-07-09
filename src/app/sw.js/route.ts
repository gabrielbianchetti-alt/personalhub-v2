// Serve o /sw.js com o nome do cache VERSIONADO por build (SHA do commit na
// Vercel). Assim cada deploy muda os bytes do SW → o navegador reinstala.
//
// Ciclo de vida (lição da análise de 09/jul): o activate NÃO purga mais o
// cache antigo na hora — com o app aberto durante um deploy, a página velha
// ainda vai lazy-carregar chunks da versão dela (o caches.match global acha no
// cache anterior). A limpeza acontece depois da primeira NAVEGAÇÃO bem-sucedida
// sob o SW novo (documento novo = chunks novos), e o RegistraSW recarrega a
// página no controllerchange.

export const dynamic = "force-static";

const VERSAO = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 8) ?? "dev";

const SW = `// Service worker do PersonalHub (gerado por /sw.js com versão de build).
const CACHE = "personalhub-${VERSAO}";
const ESSENCIAIS = ["/icon.svg", "/manifest.webmanifest"];

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

// Purga caches de versões antigas — chamada SÓ depois de uma navegação ok
// sob o SW novo (documento novo no ar; os chunks velhos não servem mais).
const limpaCachesAntigos = async () => {
  const chaves = await caches.keys();
  await Promise.all(
    chaves
      .filter((k) => k.startsWith("personalhub-") && k !== CACHE)
      .map((k) => caches.delete(k)),
  );
};

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await Promise.allSettled(ESSENCIAIS.map((url) => cache.add(url)));
      // /offline + os chunks que ELE referencia — senão o fallback offline
      // renderiza sem estilo logo após instalar/deployar.
      try {
        const res = await fetch("/offline");
        if (res.ok) {
          await cache.put("/offline", res.clone());
          const html = await res.text();
          const assets = [...html.matchAll(/["'](\\/_next\\/static\\/[^"']+)["']/g)].map(
            (m) => m[1],
          );
          await Promise.allSettled([...new Set(assets)].map((u) => cache.add(u)));
        }
      } catch {}
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  // Sem purge aqui (de propósito): a página antiga ainda pode precisar dos
  // chunks dela. A limpeza roda após a 1ª navegação ok da versão nova.
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        // Timeout de 6s: em lie-fi (conectado sem banda) o fetch não rejeita —
        // pendia 30s+ de tela branca antes de qualquer fallback.
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 6000);
        try {
          const res = await fetch(request, { signal: ctrl.signal });
          limpaCachesAntigos(); // navegação ok na versão nova → agora sim
          return res;
        } catch {
          return respostaOffline();
        } finally {
          clearTimeout(t);
        }
      })(),
    );
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
