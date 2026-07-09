import { createClient } from "./server";

// Sessão nas server actions/rotas: getClaims valida o JWT LOCALMENTE (chaves
// assimétricas — mesmo racional do proxy), sem round-trip ao Auth a cada toque.
// Era getUser() copiado em 5 arquivos = ~100-300ms seriais antes de toda query.
// RLS continua sendo a barreira real; aqui só extraímos o professor_id.
export async function professorAtual() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const professorId = typeof data?.claims?.sub === "string" ? data.claims.sub : null;
  if (!professorId) throw new Error("Sessão expirada — entre de novo.");
  return { supabase, professorId };
}
