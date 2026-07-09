import { createClient } from "@/lib/supabase/server";
import { ConfigClient } from "@/components/ConfigClient";

export default async function ConfigPage() {
  const supabase = await createClient();
  const [claimsRes, profRes] = await Promise.all([
    supabase.auth.getClaims(), // valida local — só precisamos do e-mail
    supabase
      .from("professores")
      .select("nome, template_mensagem, template_lembrete, chave_pix")
      .single(),
  ]);
  // Pré-migração: degrada progressivamente (0015 sem lembrete → 0006 sem Pix)
  // sem deixar a tela vir vazia nem perder a chave Pix se só a 0015 faltar.
  let prof: {
    nome?: string | null;
    template_mensagem?: string | null;
    template_lembrete?: string | null;
    chave_pix?: string | null;
  } | null = profRes.data;
  if (profRes.error) {
    const semLembrete = await supabase
      .from("professores")
      .select("nome, template_mensagem, chave_pix")
      .single();
    prof = semLembrete.error
      ? {
          ...(
            await supabase.from("professores").select("nome, template_mensagem").single()
          ).data,
          template_lembrete: null,
          chave_pix: null,
        }
      : { ...semLembrete.data, template_lembrete: null };
  }

  const email =
    typeof claimsRes.data?.claims?.email === "string" ? claimsRes.data.claims.email : "";

  return (
    <ConfigClient
      email={email}
      nome={prof?.nome ?? ""}
      template={prof?.template_mensagem ?? ""}
      templateLembrete={prof?.template_lembrete ?? ""}
      chavePix={prof?.chave_pix ?? ""}
    />
  );
}
