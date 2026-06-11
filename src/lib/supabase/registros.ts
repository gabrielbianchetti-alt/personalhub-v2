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

  const completo = await monta("aluno_id, data, tipo, quantidade");
  if (!completo.error) return (completo.data ?? []) as unknown as RegistroLeve[];

  const reduzido = await monta("aluno_id, data, tipo");
  if (reduzido.error) throw new Error(reduzido.error.message);
  return ((reduzido.data ?? []) as unknown as Omit<RegistroLeve, "quantidade">[]).map(
    (r) => ({ ...r, quantidade: 1 }),
  );
}
