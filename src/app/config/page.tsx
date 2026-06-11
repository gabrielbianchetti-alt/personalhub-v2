import { createClient } from "@/lib/supabase/server";
import { ConfigClient } from "@/components/ConfigClient";

export default async function ConfigPage() {
  const supabase = await createClient();
  const [
    {
      data: { user },
    },
    { data: prof },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("professores").select("nome, template_mensagem").single(),
  ]);

  return (
    <ConfigClient
      email={user?.email ?? ""}
      nome={prof?.nome ?? ""}
      template={prof?.template_mensagem ?? ""}
    />
  );
}
