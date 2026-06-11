import Link from "next/link";
import { Settings } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { buscaRegistros } from "@/lib/supabase/registros";
import { agoraSP, addDias, dataPorExtenso } from "@/lib/datas";
import { montaAlunosHoje, montaPendencias } from "@/lib/hoje";
import { CheckinList } from "@/components/CheckinList";

export default async function HojePage() {
  const supabase = await createClient();
  const sp = agoraSP(); // fuso América/São_Paulo — nunca o relógio do servidor
  const janelaInicio = addDias(sp.iso, -7);

  const [alunosRes, registros, resolvidosRes, profRes] = await Promise.all([
    supabase
      .from("alunos")
      .select("id, nome, horario, dias_semana, created_at")
      .eq("status", "ativo"),
    buscaRegistros(supabase, { de: janelaInicio, ate: sp.iso }),
    supabase.from("dias_resolvidos").select("data").gte("data", janelaInicio),
    supabase.from("professores").select("created_at").single(),
  ]);

  const ativos = alunosRes.data ?? [];

  const alunosHoje = montaAlunosHoje(
    ativos,
    registros.filter((r) => r.data === sp.iso),
    sp.dow,
  );
  // Se dias_resolvidos ainda não existe (pré-0004), não mostra pendências —
  // melhor que uma pergunta impossível de dispensar.
  const pendencias = resolvidosRes.error
    ? []
    : montaPendencias({
        hojeIso: sp.iso,
        ativos,
        registrosJanela: registros.filter((r) => r.data < sp.iso),
        diasResolvidos: (resolvidosRes.data ?? []).map((d) => d.data),
        professorDesdeIso: (profRes.data?.created_at ?? sp.iso).slice(0, 10),
      });

  const periodo = sp.hour < 12 ? "manha" : sp.hour < 18 ? "tarde" : "noite";

  return (
    <div className="flex flex-1 flex-col">
      {/* pr-16 reserva a área da engrenagem — sem colisão com o título */}
      <header className="relative overflow-hidden px-5 pb-7 pr-16 pt-12">
        <div className={`orbe orbe--${periodo}`} aria-hidden="true" />
        <Link
          href="/config"
          aria-label="Configurações"
          className="absolute right-5 top-12 flex size-10 items-center justify-center rounded-full bg-surface/70 text-text-muted shadow-soft"
        >
          <Settings size={19} strokeWidth={2.2} />
        </Link>
        <p className="relative text-sm font-medium text-text-muted">Hoje</p>
        <h1 className="relative mt-1 font-display text-[2.5rem] leading-[1.05] text-text">
          {dataPorExtenso(sp.iso)}
        </h1>
      </header>

      <CheckinList
        hojeIso={sp.iso}
        nowMinutes={sp.hour * 60 + sp.minute}
        initial={alunosHoje}
        roster={ativos
          .map((a) => ({ id: a.id, nome: a.nome }))
          .sort((a, b) => a.nome.localeCompare(b.nome))}
        pendencias={pendencias}
      />
    </div>
  );
}
