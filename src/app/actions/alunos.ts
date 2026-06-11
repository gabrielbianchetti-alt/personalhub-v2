"use server";

// Ações de Alunos: cadastro em lote (o onboarding §3), edição e suspensão.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ModoCobranca } from "@/lib/tipos";

export interface LinhaLote {
  nome: string;
  valor: string; // "300" ou "300,00" — parse aqui
  modo: ModoCobranca;
  dias: number[]; // 0=dom … 6=sáb
  horario: string; // "HH:MM" ou ""
}

export interface CamposAluno {
  nome: string;
  valor: string;
  modo: ModoCobranca;
  dias: number[];
  horario: string;
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

function validaDias(dias: number[]): number[] {
  return [...new Set(dias)].filter((d) => d >= 0 && d <= 6).sort();
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
    return {
      professor_id: professorId,
      nome: l.nome.trim(),
      valor_mensal: valor,
      modo_cobranca: l.modo,
      dias_semana: validaDias(l.dias),
      horario: l.horario || null,
      status: "ativo" as const,
    };
  });

  const { error } = await supabase.from("alunos").insert(rows);
  if (error) throw new Error(traduzErroModo(error.message));
  revalidatePath("/alunos");
  revalidatePath("/");
}

// O valor 'por_aula' do enum vem da migração 0005 — erro claro se faltar.
function traduzErroModo(message: string): string {
  return message.includes("invalid input value for enum")
    ? "Banco desatualizado: rode a migração 0005 no SQL Editor para usar o modo Por aula."
    : message;
}

export async function atualizarAluno(id: string, campos: CamposAluno) {
  const { supabase } = await professorAtual();
  const valor = parseValorBR(campos.valor);
  if (!campos.nome.trim()) throw new Error("Nome é obrigatório.");
  if (valor === null) throw new Error("Valor inválido.");

  const { error } = await supabase
    .from("alunos")
    .update({
      nome: campos.nome.trim(),
      valor_mensal: valor,
      modo_cobranca: campos.modo,
      dias_semana: validaDias(campos.dias),
      horario: campos.horario || null,
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
