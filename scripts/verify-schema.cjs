// Verificação temporária: schema + trigger + RLS no projeto novo.
const { createServerClient } = require("@supabase/ssr");
const fs = require("fs");

const env = fs.readFileSync(".env.local", "utf8");
const URL = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)[1].trim();
const KEY = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)/)[1].trim();
const [email, password] = process.argv.slice(2);

(async () => {
  const jar = {};
  const supabase = createServerClient(URL, KEY, {
    cookies: {
      getAll: () => Object.entries(jar).map(([name, value]) => ({ name, value })),
      setAll: (list) => list.forEach(({ name, value }) => (jar[name] = value)),
    },
  });

  const { data: su, error: suErr } = await supabase.auth.signUp({ email, password });
  if (suErr) {
    console.log("SIGNUP_ERROR:", suErr.message);
    process.exit(1);
  }
  console.log("SIGNUP_OK user:", su.user?.id, "| session:", !!su.session);

  if (!su.session) {
    console.log("SEM SESSÃO (confirmação de email provavelmente ligada) — não dá pra checar RLS autenticado.");
    process.exit(0);
  }

  // Trigger: deve existir exatamente 1 linha em professores (a própria).
  const prof = await supabase.from("professores").select("id, nome, preferencias");
  console.log("PROFESSORES:", JSON.stringify(prof.data), "err:", prof.error?.message || "none");

  // alunos: tabela existe e RLS deixa ler (vazio, sem erro).
  const al = await supabase.from("alunos").select("id").limit(1);
  console.log("ALUNOS select ->", "rows:", al.data?.length, "err:", al.error?.message || "none");

  // insert respeitando RLS (professor_id = self) deve passar.
  const ins = await supabase
    .from("alunos")
    .insert({ professor_id: su.user.id, nome: "Teste RLS", modo_cobranca: "mensalidade" })
    .select("id, nome, status, modo_cobranca");
  console.log("ALUNOS insert ->", JSON.stringify(ins.data), "err:", ins.error?.message || "none");

  // insert com professor_id de outro (uuid aleatório) deve ser BLOQUEADO pelo RLS.
  const bad = await supabase
    .from("alunos")
    .insert({ professor_id: "00000000-0000-0000-0000-000000000000", nome: "Invasor" })
    .select("id");
  console.log("ALUNOS insert alheio (espera erro RLS) ->", "err:", bad.error?.message || "PASSOU (RUIM!)");

  // fechamentos (ciclo-02, critério f): a query de dívidas varre meses passados
  // SEM filtro de professor no client — a policy é quem isola. Uma conta nova
  // não pode ver linha NENHUMA (as de outros professores existem no banco).
  const fech = await supabase
    .from("fechamentos")
    .select("aluno_id, mes_referencia, status")
    .lt("mes_referencia", "2100-01-01");
  const vazou = (fech.data ?? []).length;
  console.log(
    "FECHAMENTOS select cross-tenant (espera 0 linhas) ->",
    "rows:", vazou,
    "err:", fech.error?.message || "none",
    vazou === 0 ? "| RLS OK" : "| VAZOU (RUIM!)",
  );
})();
