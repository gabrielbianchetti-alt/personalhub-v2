import { createClient } from "@/lib/supabase/server";
import { AlunosLista } from "@/components/AlunosLista";

export default async function AlunosPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("alunos")
    .select("id, nome, valor_mensal, modo_cobranca, dias_semana, status")
    .order("nome");

  return (
    <div className="flex flex-1 flex-col px-5 pt-12">
      <h1 className="font-display text-[2.5rem] leading-[1.05] text-text">Alunos</h1>
      <AlunosLista alunos={data ?? []} />
    </div>
  );
}
