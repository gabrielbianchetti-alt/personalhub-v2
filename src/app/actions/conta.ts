"use server";

// Configurações da conta (template de mensagem, nome).

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function salvarConta(nome: string, template: string, chavePix: string) {
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
      chave_pix: chavePix.trim() || null,
    })
    .eq("id", user.id);
  if (error)
    throw new Error(
      error.message.includes("chave_pix")
        ? "Banco desatualizado: rode a migração 0006 no SQL Editor do Supabase."
        : error.message,
    );
  revalidatePath("/config");
  revalidatePath("/cobranca");
}
