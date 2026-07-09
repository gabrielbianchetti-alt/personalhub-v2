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
  const sp = agoraSP();
  const mesRef = mesRefIso(sp.year, sp.month);

  // 1 round-trip: as 4 queries dependem só do id da rota (era um waterfall de
  // 3 awaits). Pacote/registros são especulativos — o braço que o modo_cobranca
  // não usar custou uma query barata coberta por índice, e o TTFB caiu 2 RTTs.
  const [alunoRes, pacoteRes, marcadasTodas, regs] = await Promise.all([
    supabase
      .from("alunos")
      .select(
        "id, nome, valor_mensal, valor_dupla, valor_trio, modo_cobranca, dias_semana, horarios, turmas, horario, telefone, status, detalhes, created_at",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("pacotes_creditos")
      .select("qtd_aulas, created_at")
      .eq("aluno_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    buscaAulasPacote(supabase, { alunoId: id }),
    buscaRegistros(supabase, { alunoId: id, de: mesRef, ate: sp.iso }),
  ]);
  const aluno = alunoRes.data;
  if (!aluno) notFound();

  // Pacote (modo creditos): progresso (usadas/qtd) + aulas marcadas (p/ cancelar).
  let progresso: ProgressoPacote | null = null;
  let aulas: AulaPacoteVM[] = [];
  let temPacote = false;
  if (aluno.modo_cobranca === "creditos") {
    const pacote = pacoteRes.data;
    if (pacote) {
      temPacote = true;
      const compraIso = pacote.created_at.slice(0, 10);
      const marcadas = marcadasTodas.filter((a) => a.data >= compraIso);
      progresso = progressoPacote(pacote.qtd_aulas, marcadas, sp.iso);
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
