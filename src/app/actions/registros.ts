"use server";

// Ações do check-in (Hoje + pendências retroativas).
// registros_aula guarda SÓ exceções (§2.2) — presença é derivada.
// Erro esperado volta como {ok:false, erro} (lib/resultado) — em produção o
// Next mascara throws de action e a mensagem pt-BR não chegava ao professor.

import { revalidatePath } from "next/cache";
import { professorAtual } from "@/lib/supabase/sessao";
import { executa, type Resultado } from "@/lib/resultado";
import { addDias, agoraSP } from "@/lib/datas";
import type { RegistroOrigem } from "@/lib/tipos";

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

// Coluna `quantidade` vem da migração 0004 — erro claro se ela faltar.
function checaMigracao(message: string): never {
  if (message.includes("quantidade"))
    throw new Error(
      "Banco desatualizado: rode a migração 0004 no SQL Editor do Supabase.",
    );
  throw new Error(message);
}

// Toda exceção nasce dentro da janela de correção: hoje ou últimos 7 dias.
async function validar(dataIso: string) {
  if (!ISO_RE.test(dataIso)) throw new Error("Data inválida.");
  const hoje = agoraSP().iso;
  if (dataIso > hoje || dataIso < addDias(hoje, -7))
    throw new Error("Fora da janela de correção (7 dias).");
  return professorAtual();
}

export async function marcarFalta(
  alunoId: string,
  dataIso: string,
  origem: RegistroOrigem = "checkin",
): Promise<Resultado> {
  return executa(async () => {
    const { supabase, professorId } = await validar(dataIso);
    const { error } = await supabase.from("registros_aula").insert({
      professor_id: professorId,
      aluno_id: alunoId,
      data: dataIso,
      tipo: "falta",
      origem,
    });
    // 23505 = já marcada (outro aparelho/toque duplo) — idempotente.
    if (error && error.code !== "23505") throw new Error(error.message);
    revalidatePath("/");
  });
}

export async function desmarcarFalta(
  alunoId: string,
  dataIso: string,
): Promise<Resultado> {
  return executa(async () => {
    const { supabase } = await validar(dataIso);
    const { error } = await supabase
      .from("registros_aula")
      .delete()
      .eq("aluno_id", alunoId)
      .eq("data", dataIso)
      .eq("tipo", "falta");
    if (error) throw new Error(error.message);
    revalidatePath("/");
  });
}

export async function adicionarExtra(
  alunoId: string,
  dataIso: string,
  origem: RegistroOrigem = "checkin",
  // Aula extra esporádica pode ter preço próprio (migração 0012); null/omitido
  // = valor solo. O motor (valorPorAulaDetalhado) já soma e.valor ?? solo.
  valor: number | null = null,
): Promise<Resultado> {
  return executa(async () => {
    if (valor !== null && (!Number.isFinite(valor) || valor < 0 || valor > 100_000))
      throw new Error("Valor da aula inválido.");
    const { supabase, professorId } = await validar(dataIso);
    // Insert primeiro: o unique (aluno, data, tipo) resolve a corrida do toque
    // duplo — o perdedor cai no 23505 e vira incremento (antes estourava erro).
    const { error: insErr } = await supabase.from("registros_aula").insert({
      professor_id: professorId,
      aluno_id: alunoId,
      data: dataIso,
      tipo: "extra",
      origem,
      ...(valor !== null ? { valor } : {}),
    });
    if (!insErr) {
      revalidatePath("/");
      return;
    }
    if (insErr.code !== "23505") checaMigracao(insErr.message);

    const { data: existente, error: selErr } = await supabase
      .from("registros_aula")
      .select("id, quantidade")
      .eq("aluno_id", alunoId)
      .eq("data", dataIso)
      .eq("tipo", "extra")
      .maybeSingle();
    if (selErr) checaMigracao(selErr.message);
    if (!existente) throw new Error("Não salvou — tente de novo.");
    // O dia agrega extras numa linha só (unique) — valor informado vence.
    const { error } = await supabase
      .from("registros_aula")
      .update({
        quantidade: existente.quantidade + 1,
        ...(valor !== null ? { valor } : {}),
      })
      .eq("id", existente.id);
    if (error) throw new Error(error.message);
    revalidatePath("/");
  });
}

export async function removerExtra(
  alunoId: string,
  dataIso: string,
): Promise<Resultado> {
  return executa(async () => {
    const { supabase } = await validar(dataIso);
    const { data: existente, error: selErr } = await supabase
      .from("registros_aula")
      .select("id, quantidade")
      .eq("aluno_id", alunoId)
      .eq("data", dataIso)
      .eq("tipo", "extra")
      .maybeSingle();
    if (selErr) checaMigracao(selErr.message);
    if (!existente) return;

    const { error } =
      existente.quantidade > 1
        ? await supabase
            .from("registros_aula")
            .update({ quantidade: existente.quantidade - 1 })
            .eq("id", existente.id)
        : await supabase.from("registros_aula").delete().eq("id", existente.id);
    if (error) throw new Error(error.message);
    revalidatePath("/");
  });
}

/** Confirma um dia pendente ("todos fizeram") — a pergunta não volta. */
export async function confirmarDia(dataIso: string): Promise<Resultado> {
  return executa(async () => {
    const { supabase, professorId } = await validar(dataIso);
    const { error } = await supabase
      .from("dias_resolvidos")
      .insert({ professor_id: professorId, data: dataIso });
    if (error && error.code !== "23505") throw new Error(error.message);
    revalidatePath("/");
  });
}

/** Resolve um dia pendente corrigindo faltas pontuais (origem retroativo). */
export async function resolverDiaComFaltas(
  dataIso: string,
  alunoIds: string[],
): Promise<Resultado> {
  return executa(async () => {
    const { supabase, professorId } = await validar(dataIso);
    if (alunoIds.length > 0) {
      const { error } = await supabase.from("registros_aula").insert(
        alunoIds.map((alunoId) => ({
          professor_id: professorId,
          aluno_id: alunoId,
          data: dataIso,
          tipo: "falta" as const,
          origem: "retroativo" as const,
        })),
      );
      if (error && error.code !== "23505") throw new Error(error.message);
    }
    const { error } = await supabase
      .from("dias_resolvidos")
      .insert({ professor_id: professorId, data: dataIso });
    if (error && error.code !== "23505") throw new Error(error.message);
    revalidatePath("/");
  });
}
