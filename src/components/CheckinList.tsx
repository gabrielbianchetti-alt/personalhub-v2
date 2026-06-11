"use client";

import { Fragment, useState, useTransition } from "react";
import { Plus } from "lucide-react";
import type { AlunoHojeVM, PendenciaVM, RosterVM } from "@/lib/hoje";
import {
  marcarFalta,
  desmarcarFalta,
  adicionarExtra,
  removerExtra,
} from "@/app/actions/registros";
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
  const [, startTransition] = useTransition();

  const esperadosIds = initial.filter((a) => !a.avulso).map((a) => a.id);

  // Otimista: aplica na hora, persiste por trás; se falhar, desfaz e avisa.
  function persistir(acao: () => Promise<void>, desfazer: () => void) {
    setErro(null);
    startTransition(async () => {
      try {
        await acao();
      } catch (e) {
        desfazer();
        setErro(e instanceof Error ? e.message : "Não salvou — tente de novo.");
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
    persistir(
      () => (marcar ? marcarFalta(id, hojeIso) : desmarcarFalta(id, hojeIso)),
      () => flip(!marcar),
    );
  };

  const addExtra = (rosterId: string) => {
    vibra();
    setSheetOpen(false);
    const existente = alunos.find((a) => a.id === rosterId);
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
    persistir(() => adicionarExtra(rosterId, hojeIso), desfazer);
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
      {pendencias.length > 0 && <Pendencias pendencias={pendencias} />}

      {erro && (
        <p className="mx-5 mb-3 rounded-2xl bg-danger/10 px-4 py-2.5 text-sm text-danger">
          {erro}
        </p>
      )}

      {alunos.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-8 py-24 text-center">
          <p className="font-display text-2xl leading-snug text-text">
            Sem alunos hoje.
            <br />
            Bom descanso 👊
          </p>
        </div>
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

      <ExtraSheet
        open={sheetOpen}
        roster={roster}
        esperadosIds={esperadosIds}
        onPick={addExtra}
        onClose={() => setSheetOpen(false)}
      />
    </>
  );
}
