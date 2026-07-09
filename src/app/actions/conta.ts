"use server";

// Configurações da conta (template de mensagem, nome).
// Erro esperado volta como {ok:false, erro} (lib/resultado).

import { revalidatePath } from "next/cache";
import { professorAtual } from "@/lib/supabase/sessao";
import { executa, type Resultado } from "@/lib/resultado";

export async function salvarConta(
  nome: string,
  template: string,
  chavePix: string,
  templateLembrete = "",
): Promise<Resultado> {
  return executa(async () => {
    if (nome.trim().length > 80) throw new Error("Nome muito longo (máx. 80).");
    if (template.length > 2000 || templateLembrete.length > 2000)
      throw new Error("Modelo de mensagem muito longo (máx. 2000).");
    if (chavePix.trim().length > 140)
      throw new Error("Chave Pix muito longa (máx. 140).");
    const { supabase, professorId } = await professorAtual();

    const base = {
      nome: nome.trim() || null,
      template_mensagem: template.trim() || null,
      chave_pix: chavePix.trim() || null,
    };
    const { error } = await supabase
      .from("professores")
      .update({ ...base, template_lembrete: templateLembrete.trim() || null })
      .eq("id", professorId);
    if (error) {
      // Pré-migração 0015: salva o resto e avisa, em vez de perder tudo.
      if (error.message.includes("template_lembrete")) {
        const { error: retryErr } = await supabase
          .from("professores")
          .update(base)
          .eq("id", professorId);
        if (retryErr) throw new Error(retryErr.message);
        revalidatePath("/config");
        revalidatePath("/cobranca");
        throw new Error(
          "Salvo — mas o modelo de lembrete precisa da migração 0015 no SQL Editor.",
        );
      }
      throw new Error(
        error.message.includes("chave_pix")
          ? "Banco desatualizado: rode a migração 0006 no SQL Editor do Supabase."
          : error.message,
      );
    }
    revalidatePath("/config");
    revalidatePath("/cobranca");
  });
}
