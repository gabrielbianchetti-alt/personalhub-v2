// Busca de registros_aula com fallback pré-migração 0004: se a coluna
// `quantidade` ainda não existir no banco, cada linha vale 1. Assim o app
// não quebra entre o deploy e o SQL rodado no editor do Supabase.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { RegistroTipo } from "@/lib/tipos";

export interface RegistroLeve {
  aluno_id: string;
  data: string;
  tipo: RegistroTipo;
  quantidade: number;
  valor: number | null; // extra: valor cobrado (null = valor solo) — migração 0012
  horario: string | null; // reposição/aula com hora ("HH:MM:SS") — migração 0009
}

export async function buscaRegistros(
  supabase: SupabaseClient,
  f: { alunoId?: string; de?: string; ate?: string; depoisDe?: string },
): Promise<RegistroLeve[]> {
  const monta = (cols: string) => {
    let q = supabase.from("registros_aula").select(cols);
    if (f.alunoId) q = q.eq("aluno_id", f.alunoId);
    if (f.de) q = q.gte("data", f.de);
    if (f.ate) q = q.lte("data", f.ate);
    if (f.depoisDe) q = q.gt("data", f.depoisDe);
    return q;
  };

  // Tenta o completo (com horario, pós-0009+0012); degrada degrau a degrau —
  // sem-horario (pós-0012), sem-valor (pós-0004), sem-quantidade (pré-0004).
  // O app não quebra entre deploy e migração.
  const completo = await monta("aluno_id, data, tipo, quantidade, valor, horario");
  if (!completo.error) return (completo.data ?? []) as unknown as RegistroLeve[];

  const semHorario = await monta("aluno_id, data, tipo, quantidade, valor");
  if (!semHorario.error)
    return (
      (semHorario.data ?? []) as unknown as Omit<RegistroLeve, "horario">[]
    ).map((r) => ({ ...r, horario: null }));

  const semValor = await monta("aluno_id, data, tipo, quantidade");
  if (!semValor.error)
    return (
      (semValor.data ?? []) as unknown as Omit<RegistroLeve, "valor" | "horario">[]
    ).map((r) => ({ ...r, valor: null, horario: null }));

  const reduzido = await monta("aluno_id, data, tipo");
  if (reduzido.error) throw new Error(reduzido.error.message);
  return (
    (reduzido.data ?? []) as unknown as Omit<
      RegistroLeve,
      "quantidade" | "valor" | "horario"
    >[]
  ).map((r) => ({ ...r, quantidade: 1, valor: null, horario: null }));
}

// Aulas marcadas de PACOTE (tipo 'aula'), com hora e id (p/ cancelar).
// Tolerante a pré-migração (0009/0010): se a coluna/tipo não existir, [].
export interface AulaPacote {
  id: string;
  aluno_id: string;
  data: string;
  horario: string | null;
}

export async function buscaAulasPacote(
  supabase: SupabaseClient,
  f: { alunoId?: string; alunoIds?: string[]; de?: string; ate?: string },
): Promise<AulaPacote[]> {
  let q = supabase
    .from("registros_aula")
    .select("id, aluno_id, data, horario")
    .eq("tipo", "aula");
  if (f.alunoId) q = q.eq("aluno_id", f.alunoId);
  if (f.alunoIds) q = q.in("aluno_id", f.alunoIds);
  if (f.de) q = q.gte("data", f.de);
  if (f.ate) q = q.lte("data", f.ate);
  const { data, error } = await q.order("data");
  if (error) return []; // banco pré-0009/0010: pacote ainda não disponível
  return (data ?? []) as unknown as AulaPacote[];
}
