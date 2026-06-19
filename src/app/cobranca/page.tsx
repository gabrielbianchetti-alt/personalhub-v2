import { createClient } from "@/lib/supabase/server";
import {
  buscaRegistros,
  buscaAulasPacote,
  type RegistroLeve,
} from "@/lib/supabase/registros";
import {
  agoraSP,
  diasNoMes,
  isoDe,
  mesRefIso,
  nomeMes,
  parteIso,
} from "@/lib/datas";
import { progressoPacote } from "@/lib/aulas";
import {
  montaItemCreditos,
  montaItemFechamento,
  type CobrancaItemVM,
} from "@/lib/cobranca";
import { CobrancaLista } from "@/components/CobrancaLista";
import { MesNavegador } from "@/components/MesNavegador";
import type { Fechamento } from "@/lib/tipos";

const MES_RE = /^\d{4}-\d{2}-01$/;

export default async function CobrancaPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const supabase = await createClient();
  const sp = agoraSP();
  const mesAtual = mesRefIso(sp.year, sp.month);

  // Mês em foco: o corrente por padrão; ?mes= permite ver passado/futuro.
  const { mes } = await searchParams;
  const mesRef = mes && MES_RE.test(mes) ? mes : mesAtual;
  const ehMesAtual = mesRef === mesAtual;
  const { year, month } = parteIso(mesRef);
  // Até quando contar exceções: hoje (mês corrente), fim do mês (passado),
  // ou nada (futuro — projeção pura pelos dias fixos).
  const fimMes = isoDe(year, month, diasNoMes(year, month));
  const ateData = ehMesAtual ? sp.iso : mesRef > mesAtual ? mesRef : fimMes;

  const [alunosRes, registros, fechamentosRes, profRes] = await Promise.all([
    supabase
      .from("alunos")
      .select("id, nome, telefone, valor_mensal, modo_cobranca, dias_semana")
      .eq("status", "ativo")
      .order("nome"),
    mesRef > mesAtual
      ? Promise.resolve<RegistroLeve[]>([]) // futuro: projeção pura pelos dias fixos
      : buscaRegistros(supabase, { de: mesRef, ate: ateData }),
    supabase.from("fechamentos").select("*").eq("mes_referencia", mesRef),
    supabase
      .from("professores")
      .select("template_mensagem, nome, chave_pix")
      .single(),
  ]);
  // Pré-migração 0006 (sem chave_pix): segue sem Pix em vez de quebrar.
  const prof = profRes.error
    ? {
        ...(
          await supabase.from("professores").select("template_mensagem, nome").single()
        ).data,
        chave_pix: null,
      }
    : profRes.data;

  const ativos = alunosRes.data ?? [];
  const fechamentos = new Map<string, Fechamento>(
    ((fechamentosRes.data ?? []) as Fechamento[]).map((f) => [f.aluno_id, f]),
  );

  // Mensalidade/por_aula: sem await (fecham mês a partir do que já temos).
  const itemPorAluno = new Map<string, CobrancaItemVM>();
  const creditoAlunos: typeof ativos = [];
  for (const aluno of ativos) {
    if (aluno.modo_cobranca !== "creditos") {
      itemPorAluno.set(
        aluno.id,
        montaItemFechamento(
          aluno,
          registros.filter((r) => r.aluno_id === aluno.id),
          fechamentos.get(aluno.id) ?? null,
          year,
          month,
        ),
      );
    } else {
      creditoAlunos.push(aluno);
    }
  }

  // Créditos: antes era 2 queries SEQUENCIAIS por aluno (waterfall). Agora
  // o pacote mais recente de cada um em paralelo, depois os registros em
  // paralelo — saldo derivado desde a compra.
  const pacotes = await Promise.all(
    creditoAlunos.map((a) =>
      supabase
        .from("pacotes_creditos")
        .select("qtd_aulas, valor, created_at")
        .eq("aluno_id", a.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ),
  );
  const comPacote = creditoAlunos
    .map((a, i) => ({ a, pacote: pacotes[i].data }))
    .filter((x): x is { a: (typeof ativos)[number]; pacote: NonNullable<typeof x.pacote> } => !!x.pacote);
  const aulasCredito = await Promise.all(
    comPacote.map(({ a, pacote }) =>
      buscaAulasPacote(supabase, {
        alunoId: a.id,
        de: pacote.created_at.slice(0, 10),
      }),
    ),
  );
  comPacote.forEach(({ a, pacote }, i) => {
    itemPorAluno.set(
      a.id,
      montaItemCreditos(
        a,
        progressoPacote(pacote.qtd_aulas, aulasCredito[i], ateData),
        { qtd: pacote.qtd_aulas, valor: Number(pacote.valor) },
      ),
    );
  });
  // Créditos sem pacote ainda.
  for (const a of creditoAlunos) {
    if (!itemPorAluno.has(a.id)) itemPorAluno.set(a.id, montaItemCreditos(a, null, null));
  }

  // Reconstrói na ordem original (alfabética do select).
  const itens: CobrancaItemVM[] = ativos
    .map((a) => itemPorAluno.get(a.id))
    .filter((x): x is CobrancaItemVM => !!x);

  return (
    <div className="relative flex flex-1 flex-col px-5 pt-12">
      <div className="camada-ambiente" aria-hidden="true">
        <div className="aura" />
      </div>
      <h1 className="relative font-display text-[2.5rem] leading-[1.05] text-text">Cobrança</h1>
      <MesNavegador
        mesRef={mesRef}
        rotulo={`${nomeMes(month)}${year !== sp.year ? ` ${year}` : ""}`}
        ehMesAtual={ehMesAtual}
      />

      <CobrancaLista
        key={mesRef}
        itens={itens}
        mesRef={mesRef}
        nomeMesAtual={nomeMes(month)}
        somenteLeitura={!ehMesAtual}
        template={prof?.template_mensagem ?? null}
        chavePix={prof?.chave_pix ?? null}
        nomeProfessor={prof?.nome ?? null}
      />
    </div>
  );
}
