import { createClient } from "@/lib/supabase/server";
import {
  buscaRegistros,
  buscaAulasPacote,
  type RegistroLeve,
} from "@/lib/supabase/registros";
import {
  addDias,
  addMeses,
  agoraSP,
  diasNoMes,
  isoDe,
  mesRefIso,
  nomeMes,
  parteIso,
} from "@/lib/datas";
import { progressoPacote } from "@/lib/aulas";
import {
  DIVIDA_MESES_RETROATIVOS,
  montaDividas,
  type AlunoParaDivida,
  type FechamentoPassado,
} from "@/lib/dividas";
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
  // Corte do PACOTE (usadas × agendadas): hoje (mês corrente), fim do mês
  // (passado), ou nada (futuro). Os REGISTROS do mês em foco vêm do mês
  // INTEIRO (ciclo-03): reposição agendada é extra com data futura e precisa
  // aparecer na visão ao vivo — o snapshot do envio já lia o mês todo, e a
  // visão cortada em hoje mostraria um valor ≠ do congelado no "enviar".
  const fimMes = isoDe(year, month, diasNoMes(year, month));
  const ateData = ehMesAtual ? sp.iso : mesRef > mesAtual ? mesRef : fimMes;

  const [alunosRes, registros, fechamentosRes, profRes, fechPassadosRes] = await Promise.all([
    supabase
      .from("alunos")
      .select(
        "id, nome, telefone, valor_mensal, valor_dupla, valor_trio, modo_cobranca, dias_semana, turmas, created_at",
      )
      .eq("status", "ativo")
      .order("nome"),
    mesRef > mesAtual
      ? Promise.resolve<RegistroLeve[]>([]) // futuro: projeção pura pelos dias fixos
      : buscaRegistros(supabase, { de: mesRef, ate: fimMes }),
    supabase
      .from("fechamentos")
      .select(
        "id, professor_id, aluno_id, mes_referencia, aulas_esperadas, faltas, extras, ajuste_manual, ajuste_motivo, valor_final, status, enviado_em, pago_em",
      )
      .eq("mes_referencia", mesRef),
    supabase
      .from("professores")
      .select("template_mensagem, template_lembrete, nome, chave_pix")
      .single(),
    // Dívidas (ciclo-02): TODAS as linhas de meses passados — pago só marca
    // cobertura (bloqueia o "mês sem linha" sem virar dívida). Só no corrente.
    ehMesAtual
      ? supabase
          .from("fechamentos")
          .select(
            "aluno_id, mes_referencia, status, valor_final, aulas_esperadas, faltas, extras, ajuste_manual, ajuste_motivo, enviado_em, pago_em",
          )
          .lt("mes_referencia", mesAtual)
      : Promise.resolve({ data: [] as FechamentoPassado[] }),
  ]);
  // Pré-migração: degrada progressivamente (0015 sem lembrete → 0006 sem Pix)
  // em vez de quebrar — e sem perder a chave Pix se só a 0015 faltar.
  let prof: {
    template_mensagem?: string | null;
    template_lembrete?: string | null;
    nome?: string | null;
    chave_pix?: string | null;
  } | null = profRes.data;
  if (profRes.error) {
    const semLembrete = await supabase
      .from("professores")
      .select("template_mensagem, nome, chave_pix")
      .single();
    prof = semLembrete.error
      ? {
          ...(
            await supabase.from("professores").select("template_mensagem, nome").single()
          ).data,
          template_lembrete: null,
          chave_pix: null,
        }
      : { ...semLembrete.data, template_lembrete: null };
  }

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

  // 2º batch — TUDO em paralelo (era um waterfall de até 3 awaits seriais):
  // pacotes e aulas de pacote dependem só de creditoIds; suspensos dependem só
  // de fechamentos+ativos (1º batch). As aulas vêm sem corte de data — o filtro
  // "desde a compra" já é aplicado em JS logo abaixo, por aluno.
  const creditoIds = creditoAlunos.map((a) => a.id);
  const ativosIds = new Set(ativos.map((a) => a.id));
  const suspensosIds = [...fechamentos.keys()].filter((id) => !ativosIds.has(id));

  // Dívidas: donos de linha pendente que não estão nos ativos (suspensos) +
  // janela de registros retroativos p/ derivar valor ao vivo (aberto/sem linha).
  const fechPassados = (fechPassadosRes.data ?? []) as FechamentoPassado[];
  const devedoresForaIds = [
    ...new Set(
      fechPassados
        .filter((f) => f.status !== "pago" && !ativosIds.has(f.aluno_id))
        .map((f) => f.aluno_id),
    ),
  ];
  const foraIds = [...new Set([...suspensosIds, ...devedoresForaIds])];
  const dividaDesde = addMeses(mesAtual, -DIVIDA_MESES_RETROATIVOS);
  const precisaJanelaDivida =
    ehMesAtual &&
    (fechPassados.some(
      (f) => f.status === "aberto" && f.mes_referencia >= dividaDesde,
    ) ||
      ativos.some(
        (a) =>
          a.modo_cobranca !== "creditos" &&
          `${(a.created_at ?? mesAtual).slice(0, 7)}-01` < mesAtual,
      ));

  const [pacotesRes, todasAulas, suspensosRes, vendasRes, registrosDivida] = await Promise.all([
    creditoIds.length
      ? supabase
          .from("pacotes_creditos")
          .select("aluno_id, qtd_aulas, valor, created_at")
          .in("aluno_id", creditoIds)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    creditoIds.length
      ? buscaAulasPacote(supabase, { alunoIds: creditoIds })
      : Promise.resolve([]),
    foraIds.length
      ? supabase
          .from("alunos")
          .select(
            "id, nome, telefone, valor_mensal, valor_dupla, valor_trio, modo_cobranca, dias_semana, turmas, status, created_at",
          )
          .in("id", foraIds)
      : Promise.resolve({ data: [] }),
    // Pacotes VENDIDOS no mês em foco: a receita de créditos é a venda (§4.3),
    // mas o card-herói a ignorava — "quanto entrou" ficava subestimado.
    supabase
      .from("pacotes_creditos")
      .select("valor")
      .gte("created_at", mesRef)
      .lt("created_at", addMeses(mesRef, 1)),
    // Exceções da janela retroativa — derivação ao vivo das dívidas. Fica em
    // busca SEPARADA da do mês em foco de propósito: misturar os ranges faria
    // registros de meses passados vazarem na contagem do mês corrente.
    precisaJanelaDivida
      ? buscaRegistros(supabase, { de: dividaDesde, ate: addDias(mesAtual, -1) })
      : Promise.resolve<RegistroLeve[]>([]),
  ]);
  const vendasPacotes = {
    qtd: (vendasRes.data ?? []).length,
    total: (vendasRes.data ?? []).reduce((s, p) => s + Number(p.valor), 0),
  };

  // Pacote mais recente de cada aluno (ordena desc, 1º por aluno em JS).
  const pacotePorAluno = new Map<
    string,
    { qtd_aulas: number; valor: number; created_at: string }
  >();
  for (const p of pacotesRes.data ?? [])
    if (!pacotePorAluno.has(p.aluno_id)) pacotePorAluno.set(p.aluno_id, p);

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
  // (O select agora traz também devedores fora dos ativos — filtra de volta.)
  const suspensosSet = new Set(suspensosIds);
  const foraAlunos = suspensosRes.data ?? [];
  const itensSuspensos = foraAlunos
    .filter((a) => suspensosSet.has(a.id) && a.modo_cobranca !== "creditos")
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

  // Dívidas de meses anteriores (ciclo-02) — banner só no mês corrente.
  const dividas = ehMesAtual
    ? montaDividas({
        mesAtual,
        alunos: [
          ...ativos.map(
            (a): AlunoParaDivida => ({
              ...a,
              turmas: a.turmas ?? {},
              status: "ativo",
              created_at: a.created_at ?? mesAtual,
            }),
          ),
          ...foraAlunos.map(
            (a): AlunoParaDivida => ({
              ...a,
              turmas: a.turmas ?? {},
              status: a.status ?? "suspenso",
              created_at: a.created_at ?? mesAtual,
            }),
          ),
        ],
        fechamentosPassados: fechPassados,
        registros: registrosDivida,
      })
    : null;

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
        ehPassado={mesRef < mesAtual}
      />

      <CobrancaLista
        key={mesRef}
        itens={itens}
        mesRef={mesRef}
        nomeMesAtual={nomeMes(month)}
        // Mês PASSADO é cobrável (cobrar dia 1-5 o mês que fechou é o caso
        // clássico; pago dia 2 precisa virar "pago"). Só futuro é prévia.
        somenteLeitura={mesRef > mesAtual}
        ehPassado={mesRef < mesAtual}
        template={prof?.template_mensagem ?? null}
        templateLembrete={prof?.template_lembrete ?? null}
        chavePix={prof?.chave_pix ?? null}
        vendasPacotes={vendasPacotes}
        dividas={dividas}
      />
    </div>
  );
}
