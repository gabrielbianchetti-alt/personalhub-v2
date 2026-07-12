import Link from "next/link";
import { Settings } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { buscaRegistros, buscaAulasPacote } from "@/lib/supabase/registros";
import { agoraSP, addDias, dataPorExtenso } from "@/lib/datas";
import { montaAlunosHoje, montaPendencias } from "@/lib/hoje";
import { CheckinList } from "@/components/CheckinList";
import { OnboardingBanner } from "@/components/OnboardingBanner";

// Primeiro nome pra saudação. Se o nome ainda é o e-mail (default do trigger
// no signup), usa a parte antes do @ — "gabriel@..." vira "Gabriel".
// Sem nome utilizável, devolve null (a saudação fica só "Boa tarde").
function primeiroNome(nome: string | null): string | null {
  if (!nome) return null;
  const base = nome.includes("@") ? nome.split("@")[0] : nome;
  const primeiro = base.trim().split(/[\s.]+/)[0];
  if (!primeiro) return null;
  return primeiro.charAt(0).toUpperCase() + primeiro.slice(1);
}

export default async function HojePage() {
  const supabase = await createClient();
  const sp = agoraSP(); // fuso América/São_Paulo — nunca o relógio do servidor
  const janelaInicio = addDias(sp.iso, -7);

  const [alunosRes, registros, aulasPacoteHoje, resolvidosRes, profRes, futuras] =
    await Promise.all([
      supabase
        .from("alunos")
        .select("id, nome, horario, horarios, dias_semana, created_at")
        .eq("status", "ativo"),
      // Só as exceções de HOJE — a janela de 7 dias fica p/ dias_resolvidos
      // (montaPendencias decide por dias_resolvidos, não por registros).
      buscaRegistros(supabase, { de: sp.iso, ate: sp.iso }),
      buscaAulasPacote(supabase, { de: sp.iso, ate: sp.iso }), // aulas de pacote de hoje
      supabase.from("dias_resolvidos").select("data").gte("data", janelaInicio),
      supabase.from("professores").select("created_at, nome, chave_pix").single(),
      // Reposições agendadas (ciclo-03): extras com data à frente — alimentam
      // a lista "Agendadas" do sheet (o Hoje do dia D as pega pela busca acima).
      buscaRegistros(supabase, { depoisDe: sp.iso }),
    ]);

  const ativos = alunosRes.data ?? [];
  const nomePorId = new Map(ativos.map((a) => [a.id, a.nome]));
  const agendadas = futuras
    .filter((r) => r.tipo === "extra" && nomePorId.has(r.aluno_id))
    .map((r) => ({
      alunoId: r.aluno_id,
      nome: nomePorId.get(r.aluno_id)!,
      dataIso: r.data,
      horario: r.horario,
    }))
    .sort((a, b) => a.dataIso.localeCompare(b.dataIso) || a.nome.localeCompare(b.nome));

  const alunosHoje = montaAlunosHoje(
    ativos,
    registros,
    sp.dow,
    aulasPacoteHoje.map((a) => ({ id: a.id, aluno_id: a.aluno_id, horario: a.horario })),
  );
  // Se dias_resolvidos ainda não existe (pré-0004), não mostra pendências —
  // melhor que uma pergunta impossível de dispensar.
  const pendencias = resolvidosRes.error
    ? []
    : montaPendencias({
        hojeIso: sp.iso,
        ativos,
        diasResolvidos: (resolvidosRes.data ?? []).map((d) => d.data),
        professorDesdeIso: (profRes.data?.created_at ?? sp.iso).slice(0, 10),
      });

  const periodo = sp.hour < 12 ? "manha" : sp.hour < 18 ? "tarde" : "noite";
  const saudacao =
    periodo === "manha" ? "Bom dia" : periodo === "tarde" ? "Boa tarde" : "Boa noite";
  const nomeRaw = profRes.data?.nome ?? null;
  const nome = primeiroNome(nomeRaw);
  // Onboarding: nome ainda é o e-mail (default do trigger) ou Pix vazio.
  const precisaNome = !nomeRaw || nomeRaw.includes("@");
  const precisaPix = !profRes.data?.chave_pix;

  return (
    <div className="relative flex flex-1 flex-col">
      {/* Orbe em camada de página: o brilho esmaece sozinho, sem corte. */}
      <div className="camada-ambiente" aria-hidden="true">
        <div className={`orbe orbe--${periodo}`} />
      </div>
      {/* pr-16 reserva a área da engrenagem — sem colisão com o título */}
      <header className="relative px-5 pb-7 pr-16 pt-12">
        <Link
          href="/config"
          aria-label="Configurações"
          className="absolute right-5 top-12 flex size-10 items-center justify-center rounded-full bg-surface/70 text-text-muted shadow-soft"
        >
          <Settings size={19} strokeWidth={2.2} />
        </Link>
        <p className="relative text-sm font-medium text-text-muted">
          {saudacao}
          {nome ? `, ${nome}` : ""}
        </p>
        <h1 className="relative mt-1 font-display text-[2.5rem] leading-[1.05] text-text">
          {dataPorExtenso(sp.iso)}
        </h1>
      </header>

      <OnboardingBanner precisaNome={precisaNome} precisaPix={precisaPix} />

      <CheckinList
        hojeIso={sp.iso}
        minDia={addDias(sp.iso, -7)}
        maxDia={addDias(sp.iso, 365)}
        nowMinutes={sp.hour * 60 + sp.minute}
        initial={alunosHoje}
        roster={ativos
          .map((a) => ({ id: a.id, nome: a.nome }))
          .sort((a, b) => a.nome.localeCompare(b.nome))}
        pendencias={pendencias}
        agendadasInitial={agendadas}
      />
    </div>
  );
}
