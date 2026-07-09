"use client";

import { Fragment, useState, useTransition } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import type { AlunoHojeVM, PendenciaVM, RosterVM } from "@/lib/hoje";
import {
  marcarFalta,
  desmarcarFalta,
  adicionarExtra,
  removerExtra,
} from "@/app/actions/registros";
import { cancelarAulaPacote } from "@/app/actions/pacote";
import type { Resultado } from "@/lib/resultado";
import { CheckinCard } from "./CheckinCard";
import { ExtraSheet } from "./ExtraSheet";
import { Pendencias } from "./Pendencias";
import { vibra } from "@/lib/haptico";

function toMinutes(horario: string): number | null {
  if (!horario) return null;
  const [hh, mm] = horario.split(":").map(Number);
  return hh * 60 + mm;
}

export function CheckinList({
  hojeIso,
  nowMinutes,
  initial,
  roster,
  pendencias,
}: {
  hojeIso: string;
  nowMinutes: number;
  initial: AlunoHojeVM[];
  roster: RosterVM[];
  pendencias: PendenciaVM[];
}) {
  const [alunos, setAlunos] = useState<AlunoHojeVM[]>(initial);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  // Anúncio pro leitor de tela: o check-in (a tese do app) precisava confirmar
  // SUCESSO, não só erro. Repetir a mesma msg acrescenta um caractere invisível
  // pra forçar o reanúncio (aria-live só dispara se o texto muda).
  const [anuncio, setAnuncio] = useState("");
  const anunciar = (msg: string) =>
    setAnuncio((prev) => (prev.replace(/​+$/, "") === msg ? `${msg}​` : msg));
  const [, startTransition] = useTransition();

  const esperadosIds = initial.filter((a) => !a.avulso).map((a) => a.id);

  // Otimista: aplica na hora, persiste por trás; se falhar, desfaz e avisa.
  // A action devolve {ok:false, erro} para erro esperado (mensagem pt-BR chega
  // até em produção); o catch cobre só falha de rede/inesperada.
  function persistir(acao: () => Promise<Resultado>, desfazer: () => void) {
    setErro(null);
    startTransition(async () => {
      try {
        const r = await acao();
        if (!r.ok) {
          desfazer();
          setErro(r.erro);
        }
      } catch {
        desfazer();
        setErro("Não salvou — tente de novo.");
      }
    });
  }

  const toggleFalta = (id: string) => {
    const atual = alunos.find((a) => a.id === id);
    if (!atual) return;
    vibra();
    const marcar = !atual.faltou;
    const flip = (v: boolean) =>
      setAlunos((prev) => prev.map((a) => (a.id === id ? { ...a, faltou: v } : a)));
    flip(marcar);
    anunciar(marcar ? `Falta de ${atual.nome} marcada` : `${atual.nome} de volta`);
    persistir(
      () => (marcar ? marcarFalta(id, hojeIso) : desmarcarFalta(id, hojeIso)),
      () => flip(!marcar),
    );
  };

  const addExtra = (rosterId: string, valor: number | null) => {
    vibra();
    setSheetOpen(false);
    const existente = alunos.find((a) => a.id === rosterId);
    anunciar(
      `Aula extra de ${existente?.nome ?? roster.find((x) => x.id === rosterId)?.nome ?? "aluno"}`,
    );
    const desfazer = () =>
      setAlunos((prev) =>
        existente
          ? prev.map((a) =>
              a.id === rosterId ? { ...a, extras: a.extras - 1 } : a,
            )
          : prev.filter((a) => a.id !== rosterId),
      );
    setAlunos((prev) => {
      if (prev.some((a) => a.id === rosterId)) {
        return prev.map((a) =>
          a.id === rosterId ? { ...a, extras: a.extras + 1 } : a,
        );
      }
      const r = roster.find((x) => x.id === rosterId);
      if (!r) return prev;
      return [
        ...prev,
        { id: r.id, nome: r.nome, horario: "", faltou: false, extras: 1, avulso: true },
      ];
    });
    persistir(() => adicionarExtra(rosterId, hojeIso, "checkin", valor), desfazer);
  };

  // Aula de pacote lançada por engano: cancelar devolve o crédito, sem sair do Hoje.
  const cancelarPacote = (registroId: string, alunoId: string) => {
    const atual = alunos.find((a) => a.pacoteRegistroId === registroId);
    if (!atual) return;
    vibra();
    setAlunos((prev) => prev.filter((a) => a.pacoteRegistroId !== registroId));
    anunciar(`Aula de pacote de ${atual.nome} cancelada`);
    persistir(
      () => cancelarAulaPacote(registroId, alunoId),
      () => setAlunos((prev) => [...prev, atual]),
    );
  };

  const tirarExtra = (id: string) => {
    const atual = alunos.find((a) => a.id === id);
    if (!atual || atual.extras === 0) return;
    const eraAvulsoComUm = atual.avulso && atual.extras === 1;
    setAlunos((prev) =>
      eraAvulsoComUm
        ? prev.filter((a) => a.id !== id)
        : prev.map((a) => (a.id === id ? { ...a, extras: a.extras - 1 } : a)),
    );
    anunciar(`Aula extra de ${atual.nome} removida`);
    persistir(
      () => removerExtra(id, hojeIso),
      () =>
        setAlunos((prev) =>
          eraAvulsoComUm
            ? [...prev, atual]
            : prev.map((a) => (a.id === id ? { ...a, extras: a.extras + 1 } : a)),
        ),
    );
  };

  const itens = alunos.map((aluno) => {
    const minutes = toMinutes(aluno.horario);
    return { aluno, minutes, isPast: minutes !== null && minutes < nowMinutes };
  });
  const divisorIdx = itens.findIndex((i) => !i.isPast);
  const proximoIdx = itens.findIndex((i) => !i.isPast && i.minutes !== null);

  return (
    <>
      {/* Anúncio invisível de sucesso pro leitor de tela (VoiceOver/TalkBack). */}
      <p className="sr-only" role="status" aria-live="polite">
        {anuncio}
      </p>

      {pendencias.length > 0 && <Pendencias pendencias={pendencias} />}

      {erro && (
        <p
          role="alert"
          className="mx-5 mb-3 rounded-2xl bg-danger/10 px-4 py-2.5 text-sm text-danger"
        >
          {erro}
        </p>
      )}

      {alunos.length === 0 ? (
        roster.length === 0 ? (
          // Conta nova, zero alunos: onboarding (não mente "bom descanso").
          <div className="flex flex-1 flex-col items-center justify-center px-8 py-20 text-center">
            <p className="font-display text-2xl leading-snug text-text">
              Comece cadastrando
              <br />
              seus alunos 👊
            </p>
            <Link
              href="/alunos/novo"
              className="mt-6 rounded-full bg-accent px-6 py-3 font-medium text-accent-contrast shadow-soft active:opacity-90"
            >
              Cadastrar alunos
            </Link>
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center px-8 py-24 text-center">
            <p className="font-display text-2xl leading-snug text-text">
              Sem alunos hoje.
              <br />
              Bom descanso 👊
            </p>
          </div>
        )
      ) : (
        <section className="flex flex-col gap-3 px-5">
          {itens.map((item, i) => (
            <Fragment key={item.aluno.id}>
              {i === divisorIdx && (
                <div className="flex items-center gap-3 py-1" aria-hidden="true">
                  <span className="size-1.5 rounded-full bg-accent" />
                  <span className="text-xs font-medium uppercase tracking-wider text-accent">
                    agora
                  </span>
                  <span className="h-px flex-1 bg-accent/20" />
                </div>
              )}
              <CheckinCard
                aluno={item.aluno}
                isPast={item.isPast}
                isNext={i === proximoIdx}
                onToggleFalta={toggleFalta}
                onTirarExtra={tirarExtra}
                onCancelarPacote={cancelarPacote}
              />
            </Fragment>
          ))}
        </section>
      )}

      <section className="px-5 pt-3">
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-[14px] border border-dashed border-accent-soft py-3.5 text-sm font-medium text-accent transition-colors active:bg-accent-soft/40"
        >
          <Plus size={18} strokeWidth={2.4} />
          aula extra
        </button>
      </section>

      {/* Montado só quando aberto: o Sheet fechado mantinha um overlay fixed
          com backdrop-filter vivo (custo de compositor em TODA rolagem do Hoje). */}
      {sheetOpen && (
        <ExtraSheet
          open
          roster={roster}
          esperadosIds={esperadosIds}
          onPick={addExtra}
          onClose={() => setSheetOpen(false)}
        />
      )}
    </>
  );
}
