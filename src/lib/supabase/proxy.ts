import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Rotas públicas (não exigem sessão). /offline é o fallback do service worker:
// precisa ser público pra o precache gravar a página certa (e não a de login).
// Assets de identidade também: /opengraph-image (crawler do WhatsApp não tem
// cookie), /manifest.webmanifest (o browser busca SEM credenciais por padrão —
// gated quebrava o manifest do PWA), /apple-icon e /sw.js (update do SW não
// pode receber redirect). Nenhum expõe dado; são gerados do brand.
const PUBLIC_PATHS = [
  "/login",
  "/atualizar-senha",
  "/offline",
  "/opengraph-image",
  "/manifest.webmanifest",
  "/apple-icon",
  "/sw.js",
  // Fundação #8/#4 (ciclo 3b): landing + páginas legais — o estranho precisa
  // entender o produto e ler termos/privacidade SEM conta.
  "/conhecer",
  "/termos",
  "/privacidade",
];

// Renova a sessão a cada request e protege as rotas do app.
// Padrão @supabase/ssr para App Router (adaptado a proxy.ts / Next 16).
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANTE: não inserir lógica entre criar o client e a verificação.
  // getClaims (não getUser): com chaves JWT assimétricas valida o token
  // LOCALMENTE — sem ida à rede em toda request (proxy roda em tudo). Com
  // simétricas, cai no mesmo caminho do getUser (sem regressão). Refresca a
  // sessão igual e só precisamos da existência do usuário pra proteger rotas.
  const { data: claims } = await supabase.auth.getClaims();
  const user = claims?.claims ?? null;

  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => path === p || path.startsWith(`${p}/`));

  // Sem sessão em rota protegida → o "/" (porta de entrada de estranho) vai
  // pra LANDING; deep links (PWA, favoritos) continuam indo pro login.
  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = path === "/" ? "/conhecer" : "/login";
    const redirect = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  }

  // Já logado tentando ver o login → manda pra Hoje.
  if (user && path === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    const redirect = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  }

  // IMPORTANTE: retornar supabaseResponse para manter os cookies em sincronia.
  return supabaseResponse;
}
