"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import type { AlunoHoje } from "@/lib/mock";
import { todosAlunos } from "@/lib/mock";
import { CheckinCard } from "./CheckinCard";
import { ExtraSheet } from "./ExtraSheet";

export function CheckinList({ initial }: { initial: AlunoHoje[] }) {
  const [alunos, setAlunos] = useState<AlunoHoje[]>(initial);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Quem era esperado hoje — só para o hint "hoje" no sheet (segunda aula).
  const esperadosIds = initial.map((a) => a.id);

  const toggleFalta = (id: string) =>
    setAlunos((prev) =>
      prev.map((a) =>
        a.id === id
          ? { ...a, status: a.status === "faltou" ? "presumido" : "faltou" }
          : a,
      ),
    );

  const addExtra = (rosterId: string) => {
    setAlunos((prev) => {
      // Já está na lista (esperado ou avulso já adicionado): soma no card.
      if (prev.some((a) => a.id === rosterId)) {
        return prev.map((a) =>
          a.id === rosterId ? { ...a, extras: a.extras + 1 } : a,
        );
      }
      // Fora do dia: entra como card avulso com badge "+1 extra".
      const r = todosAlunos.find((x) => x.id === rosterId);
      if (!r) return prev;
      return [
        ...prev,
        {
          id: r.id,
          nome: r.nome,
          horario: "",
          status: "presumido",
          extras: 1,
          avulso: true,
        },
      ];
    });
    setSheetOpen(false);
  };

  // Estado vazio com voz humana (§4.1)
  if (alunos.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-8 py-24 text-center">
        <p className="font-display text-2xl leading-snug text-text">
          Sem alunos hoje.
          <br />
          Bom descanso 👊
        </p>
      </div>
    );
  }

  return (
    <>
      <section className="flex flex-col gap-3 px-5">
        {alunos.map((aluno) => (
          <CheckinCard key={aluno.id} aluno={aluno} onToggleFalta={toggleFalta} />
        ))}

        {/* Único caminho para extras: abre o sheet com todo o roster. */}
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="mt-1 flex items-center justify-center gap-2 rounded-[20px] border border-dashed border-accent-soft py-3.5 text-sm font-medium text-accent transition-colors active:bg-accent-soft/40"
        >
          <Plus size={18} strokeWidth={2.4} />
          aula extra
        </button>
      </section>

      <ExtraSheet
        open={sheetOpen}
        roster={todosAlunos}
        esperadosIds={esperadosIds}
        onPick={addExtra}
        onClose={() => setSheetOpen(false)}
      />
    </>
  );
}
