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
      .select(
        "id, nome, telefone, valor_mensal, valor_dupla, valor_trio, modo_cobranca, dias_semana, turmas",
      )
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

  // Créditos: 2 queries no total (antes eram 2×N round-trips). 1) o pacote mais
  // recente de CADA aluno (ordena desc, pega o 1º por aluno em JS); 2) todas as
  // aulas de pacote desde a compra mais antiga — agrupadas e filtradas por aluno.
  const creditoIds = creditoAlunos.map((a) => a.id);
  const { data: pacotesData } = creditoIds.length
    ? await supabase
        .from("pacotes_creditos")
        .select("aluno_id, qtd_aulas, valor, created_at")
        .in("aluno_id", creditoIds)
        .order("created_at", { ascending: false })
    : { data: [] };
  const pacotePorAluno = new Map<
    string,
    { qtd_aulas: number; valor: number; created_at: string }
  >();
  for (const p of pacotesData ?? [])
    if (!pacotePorAluno.has(p.aluno_id)) pacotePorAluno.set(p.aluno_id, p);

  const compras = [...pacotePorAluno.values()].map((p) => p.created_at.slice(0, 10)).sort();
  const todasAulas = compras.length
    ? await buscaAulasPacote(supabase, { de: compras[0] })
    : [];
  const aulasPorAluno = new Map<string, { data: string }[]>();
  for (const aula of todasAulas) {
    const arr = aulasPorAluno.get(aula.aluno_id) ?? [];
    arr.push(aula);
    aulasPorAluno.set(aula.aluno_id, arr);
  }

  for (const a of creditoAlunos) {
    const pacote = pacotePorAluno.get(a.id);
    if (!pacote) {
      itemPorAluno.set(a.id, montaItemCreditos(a, null, null));
      continue;
    }
    const compraIso = pacote.created_at.slice(0, 10);
    const aulas = (aulasPorAluno.get(a.id) ?? []).filter((x) => x.data >= compraIso);
    itemPorAluno.set(
      a.id,
      montaItemCreditos(a, progressoPacote(pacote.qtd_aulas, aulas, ateData), {
        qtd: pacote.qtd_aulas,
        valor: Number(pacote.valor),
      }),
    );
  }

  // Reconstrói na ordem original (alfabética do select).
  const itens: CobrancaItemVM[] = ativos
    .map((a) => itemPorAluno.get(a.id))
    .filter((x): x is CobrancaItemVM => !!x);

  // Suspensos que ainda têm fechamento neste mês: não somem da Cobrança nem do
  // "Recebido" — dinheiro já trabalhado/quitado não pode evaporar ao suspender.
  const ativosIds = new Set(ativos.map((a) => a.id));
  const suspensosIds = [...fechamentos.keys()].filter((id) => !ativosIds.has(id));
  if (suspensosIds.length > 0) {
    const { data: susp } = await supabase
      .from("alunos")
      .select(
        "id, nome, telefone, valor_mensal, valor_dupla, valor_trio, modo_cobranca, dias_semana, turmas",
      )
      .in("id", suspensosIds);
    const itensSuspensos = (susp ?? [])
      .filter((a) => a.modo_cobranca !== "creditos")
      .map((a) => ({
        ...montaItemFechamento(
          a,
          registros.filter((r) => r.aluno_id === a.id),
          fechamentos.get(a.id) ?? null,
          year,
          month,
        ),
        suspenso: true,
      }))
      .sort((a, b) => a.nome.localeCompare(b.nome));
    itens.push(...itensSuspensos);
  }

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
        ehPassado={mesRef < mesAtual}
        template={prof?.template_mensagem ?? null}
        chavePix={prof?.chave_pix ?? null}
        nomeProfessor={prof?.nome ?? null}
      />
    </div>
  );
}
