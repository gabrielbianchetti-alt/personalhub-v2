import { createClient } from "@/lib/supabase/server";
import { buscaRegistros } from "@/lib/supabase/registros";
import { agoraSP, mesRefIso, nomeMes } from "@/lib/datas";
import { saldoCreditos } from "@/lib/aulas";
import {
  montaItemCreditos,
  montaItemFechamento,
  type CobrancaItemVM,
} from "@/lib/cobranca";
import { CobrancaLista } from "@/components/CobrancaLista";
import type { Fechamento } from "@/lib/tipos";

export default async function CobrancaPage() {
  const supabase = await createClient();
  const sp = agoraSP();
  const mesRef = mesRefIso(sp.year, sp.month);

  const [alunosRes, registros, fechamentosRes, profRes] = await Promise.all([
    supabase
      .from("alunos")
      .select("id, nome, telefone, valor_mensal, modo_cobranca, dias_semana")
      .eq("status", "ativo")
      .order("nome"),
    buscaRegistros(supabase, { de: mesRef, ate: sp.iso }),
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
          sp.year,
          sp.month,
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
  const regsCredito = await Promise.all(
    comPacote.map(({ a, pacote }) =>
      buscaRegistros(supabase, {
        alunoId: a.id,
        depoisDe: pacote.created_at.slice(0, 10),
        ate: sp.iso,
      }),
    ),
  );
  comPacote.forEach(({ a, pacote }, i) => {
    const compraIso = pacote.created_at.slice(0, 10);
    itemPorAluno.set(
      a.id,
      montaItemCreditos(
        a,
        saldoCreditos({
          qtdCompradas: pacote.qtd_aulas,
          diasSemana: a.dias_semana,
          compraIso,
          hojeIso: sp.iso,
          registros: regsCredito[i],
        }),
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
      <p className="relative mt-1 text-sm text-text-muted">
        Fechamento de <span className="font-medium text-text">{nomeMes(sp.month)}</span>
      </p>

      <CobrancaLista
        itens={itens}
        mesRef={mesRef}
        nomeMesAtual={nomeMes(sp.month)}
        template={prof?.template_mensagem ?? null}
        chavePix={prof?.chave_pix ?? null}
        nomeProfessor={prof?.nome ?? null}
      />
    </div>
  );
}
