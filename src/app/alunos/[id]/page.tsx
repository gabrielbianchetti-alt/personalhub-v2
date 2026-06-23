import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { buscaAulasPacote, buscaRegistros } from "@/lib/supabase/registros";
import { agoraSP, mesRefIso, nomeMes } from "@/lib/datas";
import {
  agregaExcecoes,
  contagemMes,
  progressoPacote,
  type ProgressoPacote,
} from "@/lib/aulas";
import {
  AlunoPerfil,
  type AulaPacoteVM,
  type HistoricoVM,
} from "@/components/AlunoPerfil";

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
      "id, nome, valor_mensal, valor_dupla, valor_trio, modo_cobranca, dias_semana, horarios, turmas, horario, telefone, status, detalhes, created_at",
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

  // Mini-histórico (mensalidade/por_aula): frequência do mês + últimas faltas.
  let historico: HistoricoVM | null = null;
  if (aluno.modo_cobranca !== "creditos") {
    const sp = agoraSP();
    const mesRef = mesRefIso(sp.year, sp.month);
    const regs = await buscaRegistros(supabase, { alunoId: id, de: mesRef, ate: sp.iso });
    const exc = agregaExcecoes(regs);
    const cont = contagemMes(aluno.dias_semana, sp.year, sp.month, exc);
    const ultimasFaltas = regs
      .filter((r) => r.tipo === "falta")
      .map((r) => r.data)
      .sort()
      .reverse()
      .slice(0, 3)
      .map((d) => `${d.slice(8, 10)}/${d.slice(5, 7)}`);
    const desdeIso = aluno.detalhes?.data_inicio || aluno.created_at?.slice(0, 10) || null;
    const desde = desdeIso
      ? `${nomeMes(Number(desdeIso.slice(5, 7)) - 1)} de ${desdeIso.slice(0, 4)}`
      : null;
    historico = {
      nomeMes: nomeMes(sp.month),
      realizadas: cont.realizadas,
      faltas: exc.faltas,
      extras: exc.extras,
      ultimasFaltas,
      desde,
    };
  }

  return (
    <AlunoPerfil
      aluno={aluno}
      progresso={progresso}
      aulasPacote={aulas}
      temPacote={temPacote}
      historico={historico}
    />
  );
}
