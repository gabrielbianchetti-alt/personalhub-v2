"use server";

// Ações de Alunos: cadastro em lote (o onboarding §3), edição e suspensão.
// Erro esperado volta como {ok:false, erro} (lib/resultado).

import { revalidatePath } from "next/cache";
import { professorAtual } from "@/lib/supabase/sessao";
import { executa, type Resultado } from "@/lib/resultado";
import { parseValorBR } from "@/lib/valores";
import type { ModoCobranca, TurmaDia } from "@/lib/tipos";

export interface LinhaLote {
  nome: string;
  valor: string; // "300" ou "300,00" — parse na lib (no pacote = valor do pacote)
  valorDupla: string; // só por_aula: R$/aula nos dias de dupla (opcional)
  valorTrio: string; // só por_aula: R$/aula nos dias de trio (opcional)
  modo: ModoCobranca;
  horarios: Record<string, string>; // diaSemana(0..6) -> "HH:MM" (não usado no pacote)
  turmas: Record<string, TurmaDia>; // diaSemana -> dupla/trio + nome (ausente = solo)
  qtd: string; // só pacote: quantidade de aulas do pacote
}

export interface CamposAluno {
  nome: string;
  valor: string;
  valorDupla: string;
  valorTrio: string;
  modo: ModoCobranca;
  horarios: Record<string, string>;
  turmas: Record<string, TurmaDia>;
  telefone: string;
  observacoes: string;
  dataInicio: string; // "YYYY-MM-DD" ou ""
}

// Limites de sanidade: strings persistidas direto no banco (repo público,
// endpoint aberto a qualquer sessão) não podem ser ilimitadas.
function checaTextos(nome: string, telefone = "", observacoes = "") {
  if (nome.trim().length > 80) throw new Error("Nome muito longo (máx. 80).");
  if (telefone.length > 25) throw new Error("Telefone muito longo.");
  if (observacoes.length > 500)
    throw new Error("Observações muito longas (máx. 500).");
}

// Só dias 0..6, tipo dupla/trio, nome aparado. Solo = ausência (não guarda).
function sanitizaTurmas(turmas: Record<string, TurmaDia>): Record<string, TurmaDia> {
  const limpo: Record<string, TurmaDia> = {};
  for (const [k, v] of Object.entries(turmas ?? {})) {
    const d = Number(k);
    if (!Number.isInteger(d) || d < 0 || d > 6) continue;
    if (v?.tipo !== "dupla" && v?.tipo !== "trio") continue;
    const nome = v.nome?.trim().slice(0, 60);
    limpo[String(d)] = { tipo: v.tipo, ...(nome ? { nome } : {}) };
  }
  return limpo;
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

export async function criarAlunosEmLote(linhas: LinhaLote[]): Promise<Resultado> {
  return executa(async () => {
    if (linhas.length > 100) throw new Error("Máximo de 100 alunos por lote.");
    const { supabase, professorId } = await professorAtual();
    const validas = linhas.filter((l) => l.nome.trim());
    if (validas.length === 0) throw new Error("Nenhum aluno para cadastrar.");

    const rows = validas.map((l) => {
      checaTextos(l.nome);
      const valor = parseValorBR(l.valor);
      if (valor === null)
        throw new Error(`Valor inválido para ${l.nome.trim()}.`);
      // Pacote não tem agenda fixa — dias/horários/turmas vazios.
      const { dias, horarios } =
        l.modo === "creditos" ? { dias: [], horarios: {} } : sanitizaHorarios(l.horarios);
      // Dupla/trio só faz preço no por_aula (mensalidade é valor fechado; lá a
      // turma é só rótulo, mas guardamos igual pro contexto aparecer).
      const turmas = l.modo === "creditos" ? {} : sanitizaTurmas(l.turmas);
      return {
        professor_id: professorId,
        nome: l.nome.trim(),
        valor_mensal: valor,
        valor_dupla: l.modo === "por_aula" ? parseValorBR(l.valorDupla) : null,
        valor_trio: l.modo === "por_aula" ? parseValorBR(l.valorTrio) : null,
        modo_cobranca: l.modo,
        dias_semana: dias,
        horarios,
        turmas,
        status: "ativo" as const,
      };
    });

    const { data: criados, error } = await supabase
      .from("alunos")
      .insert(rows)
      .select("id, nome");
    if (error) throw new Error(traduzErroModo(error.message));

    // Pacote: cria o pacote inicial com a quantidade informada no cadastro.
    const pacotes = validas
      .map((l, i) => ({ l, aluno: criados?.[i] }))
      .filter(({ l }) => l.modo === "creditos")
      .map(({ l, aluno }) => {
        const qtd = parseInt(l.qtd, 10);
        const valor = parseValorBR(l.valor) ?? 0;
        return {
          professor_id: professorId,
          aluno_id: aluno!.id,
          qtd_aulas: Number.isInteger(qtd) && qtd > 0 ? qtd : 10,
          valor,
          saldo: Number.isInteger(qtd) && qtd > 0 ? qtd : 10,
        };
      });
    if (pacotes.length > 0) {
      const { error: pErr } = await supabase.from("pacotes_creditos").insert(pacotes);
      if (pErr) throw new Error(pErr.message);
    }

    revalidatePath("/alunos");
    revalidatePath("/");
    revalidatePath("/cobranca");
  });
}

// Erros de "banco desatualizado" (migrações não rodadas) com mensagem clara.
function traduzErroModo(message: string): string {
  if (message.includes("invalid input value for enum"))
    return "Banco desatualizado: rode a migração 0005 no SQL Editor para usar o modo Por aula.";
  if (message.includes("horarios"))
    return "Banco desatualizado: rode a migração 0007 no SQL Editor (horário por dia).";
  return message;
}

export async function atualizarAluno(
  id: string,
  campos: CamposAluno,
): Promise<Resultado> {
  return executa(async () => {
    const { supabase } = await professorAtual();
    if (!campos.nome.trim()) throw new Error("Nome é obrigatório.");
    checaTextos(campos.nome, campos.telefone, campos.observacoes);
    const valor = parseValorBR(campos.valor);
    if (valor === null) throw new Error("Valor inválido.");

    const { dias, horarios } = sanitizaHorarios(campos.horarios);
    const turmas = campos.modo === "creditos" ? {} : sanitizaTurmas(campos.turmas);
    const { error } = await supabase
      .from("alunos")
      .update({
        nome: campos.nome.trim(),
        valor_mensal: valor,
        valor_dupla: campos.modo === "por_aula" ? parseValorBR(campos.valorDupla) : null,
        valor_trio: campos.modo === "por_aula" ? parseValorBR(campos.valorTrio) : null,
        modo_cobranca: campos.modo,
        dias_semana: dias,
        horarios,
        turmas,
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
    // valor_mensal/dias_semana/modo alimentam a Cobrança — sem isto a tela do
    // dinheiro podia servir card velho até a próxima navegação dura.
    revalidatePath("/cobranca");
  });
}

export async function mudarStatusAluno(
  id: string,
  status: "ativo" | "suspenso",
): Promise<Resultado> {
  return executa(async () => {
    const { supabase } = await professorAtual();
    const { error } = await supabase.from("alunos").update({ status }).eq("id", id);
    if (error) throw new Error(error.message);
    revalidatePath("/alunos");
    revalidatePath(`/alunos/${id}`);
    revalidatePath("/");
    revalidatePath("/cobranca");
  });
}

/** Pedido inline na primeira cobrança (§4.2). */
export async function salvarTelefone(
  id: string,
  telefone: string,
): Promise<Resultado> {
  return executa(async () => {
    if (telefone.length > 25) throw new Error("Telefone muito longo.");
    const { supabase } = await professorAtual();
    const { error } = await supabase
      .from("alunos")
      .update({ telefone: telefone.trim() || null })
      .eq("id", id);
    if (error) throw new Error(error.message);
    revalidatePath("/cobranca");
    revalidatePath(`/alunos/${id}`);
  });
}
