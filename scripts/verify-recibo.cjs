// Smoke do recibo-cartão: loga com a conta de teste e baixa o PNG da rota.
// Uso: node scripts/verify-recibo.cjs <email> <senha> <alunoId> [mes]
const { createServerClient } = require("@supabase/ssr");
const fs = require("fs");

const env = fs.readFileSync(".env.local", "utf8");
const URL_SB = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)[1].trim();
const KEY = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)/)[1].trim();
const [email, password, alunoId, mes] = process.argv.slice(2);

(async () => {
  const jar = {};
  const supabase = createServerClient(URL_SB, KEY, {
    cookies: {
      getAll: () => Object.entries(jar).map(([name, value]) => ({ name, value })),
      setAll: (list) => list.forEach(({ name, value }) => (jar[name] = value)),
    },
  });
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    console.log("LOGIN_ERROR:", error.message);
    process.exit(1);
  }
  const cookie = Object.entries(jar)
    .map(([n, v]) => `${n}=${encodeURIComponent(v)}`)
    .join("; ");
  // 127.0.0.1 explícito: o dev server não escuta em ::1 (IPv6).
  const alvo = `http://127.0.0.1:3000/recibo/${alunoId}${mes ? `?mes=${mes}` : ""}`;
  const r = await fetch(alvo, { headers: { cookie } });
  const buf = Buffer.from(await r.arrayBuffer());
  const png = buf.subarray(0, 8).toString("hex") === "89504e470d0a1a0a";
  console.log("STATUS:", r.status, "| content-type:", r.headers.get("content-type"));
  console.log("PNG válido:", png, "| tamanho:", Math.round(buf.length / 1024), "KB");
  if (r.status === 200 && png) {
    fs.writeFileSync("recibo-smoke.png", buf);
    console.log("Salvo em recibo-smoke.png");
  } else if (!png) {
    console.log("Corpo:", buf.toString("utf8").slice(0, 300));
  }
  process.exit(r.status === 200 && png ? 0 : 1);
})();
