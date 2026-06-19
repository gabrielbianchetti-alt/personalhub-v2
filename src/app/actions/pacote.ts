"use server";

// Aulas de PACOTE: marcar/agendar (consome 1 crédito) e cancelar (devolve).
// Pacote não tem agenda fixa — cada aula é um evento tipo 'aula' com data+hora.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { agoraSP, addDias } from "@/lib/datas";

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;
const HORA_RE = /^\d{2}:\d{2}$/;

async function professorAtual() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sessão expirada — entre de novo.");
  return { supabase, professorId: user.id };
}

/** Marca/agenda uma aula do pacote. data pode ser hoje ou futuro. */
export async function agendarAulaPacote(
  alunoId: string,
  dataIso: string,
  horario: string,
) {
  if (!ISO_RE.test(dataIso)) throw new Error("Data inválida.");
  const hoje = agoraSP().iso;
  if (dataIso < addDias(hoje, -7)) throw new Error("Data muito antiga.");
  const hora = HORA_RE.test(horario) ? horario : null;

  const { supabase, professorId } = await professorAtual();

  // Confere saldo: qtd do último pacote − aulas já marcadas depois da compra.
  const { data: pacote } = await supabase
    .from("pacotes_creditos")
    .select("qtd_aulas, created_at")
    .eq("aluno_id", alunoId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!pacote) throw new Error("Esse aluno ainda não tem um pacote. Venda um na Cobrança.");

  const { count } = await supabase
    .from("registros_aula")
    .select("id", { count: "exact", head: true })
    .eq("aluno_id", alunoId)
    .eq("tipo", "aula")
    .gte("data", pacote.created_at.slice(0, 10));
  if ((count ?? 0) >= pacote.qtd_aulas)
    throw new Error("Pacote esgotado — venda um novo pacote.");

  const { error } = await supabase.from("registros_aula").insert({
    professor_id: professorId,
    aluno_id: alunoId,
    data: dataIso,
    tipo: "aula",
    origem: "checkin",
    horario: hora,
  });
  if (error) {
    if (error.code === "23505") throw new Error("Já tem uma aula marcada nesse dia.");
    if (error.message.includes("horario") || error.message.includes("invalid input value"))
      throw new Error("Banco desatualizado: rode as migrações 0009 e 0010 no SQL Editor.");
    throw new Error(error.message);
  }
  revalidatePath("/");
  revalidatePath(`/alunos/${alunoId}`);
  revalidatePath("/cobranca");
}

/** Cancela uma aula marcada do pacote (devolve o crédito). */
export async function cancelarAulaPacote(registroId: string, alunoId: string) {
  const { supabase } = await professorAtual();
  const { error } = await supabase
    .from("registros_aula")
    .delete()
    .eq("id", registroId)
    .eq("tipo", "aula");
  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath(`/alunos/${alunoId}`);
  revalidatePath("/cobranca");
}
