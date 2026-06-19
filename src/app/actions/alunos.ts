"use server";

// Ações de Alunos: cadastro em lote (o onboarding §3), edição e suspensão.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ModoCobranca } from "@/lib/tipos";

export interface LinhaLote {
  nome: string;
  valor: string; // "300" ou "300,00" — parse aqui
  modo: ModoCobranca;
  horarios: Record<string, string>; // diaSemana(0..6) -> "HH:MM" (hora opcional)
}

export interface CamposAluno {
  nome: string;
  valor: string;
  modo: ModoCobranca;
  horarios: Record<string, string>;
  telefone: string;
  observacoes: string;
  dataInicio: string; // "YYYY-MM-DD" ou ""
}

function parseValorBR(v: string): number | null {
  const limpo = v.trim().replace(/[R$\s.]/g, "").replace(",", ".");
  if (!limpo) return null;
  const n = Number(limpo);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

// Sanitiza o mapa dia->hora: só dias 0..6 e horas "HH:MM" (hora pode ser "").
// Devolve {dias ordenados, horarios limpo}.
function sanitizaHorarios(horarios: Record<string, string>): {
  dias: number[];
  horarios: Record<string, string>;
} {
  const limpo: Record<string, string> = {};
  for (const [k, v] of Object.entries(horarios ?? {})) {
    const d = Number(k);
    if (!Number.isInteger(d) || d < 0 || d > 6) continue;
    limpo[String(d)] = /^\d{2}:\d{2}$/.test(v) ? v : "";
  }
  const dias = Object.keys(limpo).map(Number).sort((a, b) => a - b);
  return { dias, horarios: limpo };
}

async function professorAtual() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sessão expirada — entre de novo.");
  return { supabase, professorId: user.id };
}

export async function criarAlunosEmLote(linhas: LinhaLote[]) {
  const { supabase, professorId } = await professorAtual();
  const validas = linhas.filter((l) => l.nome.trim());
  if (validas.length === 0) throw new Error("Nenhum aluno para cadastrar.");

  const rows = validas.map((l) => {
    const valor = parseValorBR(l.valor);
    if (valor === null)
      throw new Error(`Valor inválido para ${l.nome.trim()}.`);
    const { dias, horarios } = sanitizaHorarios(l.horarios);
    return {
      professor_id: professorId,
      nome: l.nome.trim(),
      valor_mensal: valor,
      modo_cobranca: l.modo,
      dias_semana: dias,
      horarios,
      status: "ativo" as const,
    };
  });

  const { error } = await supabase.from("alunos").insert(rows);
  if (error) throw new Error(traduzErroModo(error.message));
  revalidatePath("/alunos");
  revalidatePath("/");
}

// Erros de "banco desatualizado" (migrações não rodadas) com mensagem clara.
function traduzErroModo(message: string): string {
  if (message.includes("invalid input value for enum"))
    return "Banco desatualizado: rode a migração 0005 no SQL Editor para usar o modo Por aula.";
  if (message.includes("horarios"))
    return "Banco desatualizado: rode a migração 0007 no SQL Editor (horário por dia).";
  return message;
}

export async function atualizarAluno(id: string, campos: CamposAluno) {
  const { supabase } = await professorAtual();
  const valor = parseValorBR(campos.valor);
  if (!campos.nome.trim()) throw new Error("Nome é obrigatório.");
  if (valor === null) throw new Error("Valor inválido.");

  const { dias, horarios } = sanitizaHorarios(campos.horarios);
  const { error } = await supabase
    .from("alunos")
    .update({
      nome: campos.nome.trim(),
      valor_mensal: valor,
      modo_cobranca: campos.modo,
      dias_semana: dias,
      horarios,
      telefone: campos.telefone.trim() || null,
      detalhes: {
        ...(campos.observacoes.trim() ? { observacoes: campos.observacoes.trim() } : {}),
        ...(campos.dataInicio ? { data_inicio: campos.dataInicio } : {}),
      },
    })
    .eq("id", id);
  if (error) throw new Error(traduzErroModo(error.message));
  revalidatePath("/alunos");
  revalidatePath(`/alunos/${id}`);
  revalidatePath("/");
}

export async function mudarStatusAluno(id: string, status: "ativo" | "suspenso") {
  const { supabase } = await professorAtual();
  const { error } = await supabase.from("alunos").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/alunos");
  revalidatePath(`/alunos/${id}`);
  revalidatePath("/");
  revalidatePath("/cobranca");
}

/** Pedido inline na primeira cobrança (§4.2). */
export async function salvarTelefone(id: string, telefone: string) {
  const { supabase } = await professorAtual();
  const { error } = await supabase
    .from("alunos")
    .update({ telefone: telefone.trim() || null })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/cobranca");
  revalidatePath(`/alunos/${id}`);
}
