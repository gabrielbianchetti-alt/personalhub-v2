import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { buscaAulasPacote } from "@/lib/supabase/registros";
import { agoraSP } from "@/lib/datas";
import { progressoPacote, type ProgressoPacote } from "@/lib/aulas";
import { AlunoPerfil, type AulaPacoteVM } from "@/components/AlunoPerfil";

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

  // Pacote (modo creditos): progresso (usadas/qtd) + aulas marcadas (p/ cancelar).
  let progresso: ProgressoPacote | null = null;
  let aulas: AulaPacoteVM[] = [];
  let temPacote = false;
  if (aluno.modo_cobranca === "creditos") {
    const { data: pacote } = await supabase
      .from("pacotes_creditos")
      .select("qtd_aulas, created_at")
      .eq("aluno_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (pacote) {
      temPacote = true;
      const compraIso = pacote.created_at.slice(0, 10);
      const hoje = agoraSP().iso;
      const marcadas = await buscaAulasPacote(supabase, { alunoId: id, de: compraIso });
      progresso = progressoPacote(pacote.qtd_aulas, marcadas, hoje);
      aulas = marcadas.map((a) => ({
        id: a.id,
        data: a.data,
        horario: a.horario ? a.horario.slice(0, 5) : "",
      }));
    }
  }

  return (
    <AlunoPerfil
      aluno={aluno}
      progresso={progresso}
      aulasPacote={aulas}
      temPacote={temPacote}
    />
  );
}
