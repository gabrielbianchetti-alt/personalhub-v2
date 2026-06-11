"use server";

// Configurações da conta (template de mensagem, nome).

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function salvarConta(nome: string, template: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sessão expirada — entre de novo.");

  const { error } = await supabase
    .from("professores")
    .update({
      nome: nome.trim() || null,
      template_mensagem: template.trim() || null,
    })
    .eq("id", user.id);
  if (error) throw new Error(error.message);
  revalidatePath("/config");
  revalidatePath("/cobranca");
}
