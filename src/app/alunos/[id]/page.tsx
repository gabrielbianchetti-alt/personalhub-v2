import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { buscaRegistros } from "@/lib/supabase/registros";
import { agoraSP } from "@/lib/datas";
import { saldoCreditos } from "@/lib/aulas";
import { AlunoPerfil } from "@/components/AlunoPerfil";

export default async function AlunoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: aluno } = await supabase
    .from("alunos")
    .select(
      "id, nome, valor_mensal, modo_cobranca, dias_semana, horarios, horario, telefone, status, detalhes",
    )
    .eq("id", id)
    .maybeSingle();
  if (!aluno) notFound();

  // Saldo de créditos (derivado — §4.3) só para alunos por pacote.
  let saldo: number | null = null;
  if (aluno.modo_cobranca === "creditos") {
    const { data: pacote } = await supabase
      .from("pacotes_creditos")
      .select("qtd_aulas, created_at")
      .eq("aluno_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (pacote) {
      const compraIso = pacote.created_at.slice(0, 10);
      const hoje = agoraSP().iso;
      const registros = await buscaRegistros(supabase, {
        alunoId: id,
        depoisDe: compraIso,
        ate: hoje,
      });
      saldo = saldoCreditos({
        qtdCompradas: pacote.qtd_aulas,
        diasSemana: aluno.dias_semana,
        compraIso,
        hojeIso: hoje,
        registros,
      });
    }
  }

  return <AlunoPerfil aluno={aluno} saldo={saldo} />;
}
