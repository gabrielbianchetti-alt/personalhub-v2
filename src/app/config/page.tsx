import { createClient } from "@/lib/supabase/server";
import { ConfigClient } from "@/components/ConfigClient";

export default async function ConfigPage() {
  const supabase = await createClient();
  const [
    {
      data: { user },
    },
    profRes,
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from("professores")
      .select("nome, template_mensagem, chave_pix")
      .single(),
  ]);
  // Pré-migração 0006 (sem chave_pix): não deixa a tela vir vazia.
  const prof = profRes.error
    ? {
        ...(
          await supabase.from("professores").select("nome, template_mensagem").single()
        ).data,
        chave_pix: null,
      }
    : profRes.data;

  return (
    <ConfigClient
      email={user?.email ?? ""}
      nome={prof?.nome ?? ""}
      template={prof?.template_mensagem ?? ""}
      chavePix={prof?.chave_pix ?? ""}
    />
  );
}
