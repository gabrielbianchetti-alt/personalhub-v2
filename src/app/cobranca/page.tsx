import { createClient } from "@/lib/supabase/server";
import { buscaRegistros } from "@/lib/supabase/registros";
import { agoraSP, mesRefIso, nomeMes } from "@/lib/datas";
import { saldoCreditos } from "@/lib/aulas";
import {
  montaItemCreditos,
  montaItemMensalidade,
  resumoMes,
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
    supabase.from("professores").select("template_mensagem").single(),
  ]);

  const ativos = alunosRes.data ?? [];
  const fechamentos = new Map<string, Fechamento>(
    ((fechamentosRes.data ?? []) as Fechamento[]).map((f) => [f.aluno_id, f]),
  );

  const itens: CobrancaItemVM[] = [];
  for (const aluno of ativos) {
    if (aluno.modo_cobranca === "mensalidade") {
      itens.push(
        montaItemMensalidade(
          aluno,
          registros.filter((r) => r.aluno_id === aluno.id),
          fechamentos.get(aluno.id) ?? null,
          sp.year,
          sp.month,
        ),
      );
    } else {
      // Créditos: saldo derivado desde o pacote mais recente.
      const { data: pacote } = await supabase
        .from("pacotes_creditos")
        .select("qtd_aulas, valor, created_at")
        .eq("aluno_id", aluno.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      let saldo: number | null = null;
      if (pacote) {
        const compraIso = pacote.created_at.slice(0, 10);
        const regsDesde = await buscaRegistros(supabase, {
          alunoId: aluno.id,
          depoisDe: compraIso,
          ate: sp.iso,
        });
        saldo = saldoCreditos({
          qtdCompradas: pacote.qtd_aulas,
          diasSemana: aluno.dias_semana,
          compraIso,
          hojeIso: sp.iso,
          registros: regsDesde,
        });
      }
      itens.push(
        montaItemCreditos(
          aluno,
          saldo,
          pacote ? { qtd: pacote.qtd_aulas, valor: Number(pacote.valor) } : null,
        ),
      );
    }
  }

  return (
    <div className="flex flex-1 flex-col px-5 pt-12">
      <h1 className="font-display text-[2.5rem] leading-[1.05] text-text">Cobrança</h1>
      <p className="mt-1 text-sm text-text-muted">
        Fechamento de <span className="font-medium text-text">{nomeMes(sp.month)}</span>
      </p>

      <CobrancaLista
        itens={itens}
        resumo={resumoMes(itens)}
        mesRef={mesRef}
        nomeMesAtual={nomeMes(sp.month)}
        template={profRes.data?.template_mensagem ?? null}
      />
    </div>
  );
}
