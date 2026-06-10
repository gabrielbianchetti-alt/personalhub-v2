"use client";

import { useRef, useState } from "react";
import { Plus } from "lucide-react";
import type { AlunoHoje, StatusHoje } from "@/lib/mock";
import { CheckinCard } from "./CheckinCard";

export function CheckinList({ initial }: { initial: AlunoHoje[] }) {
  const [alunos, setAlunos] = useState<AlunoHoje[]>(initial);
  const extraSeq = useRef(0);

  const setStatus = (id: string, status: StatusHoje) =>
    setAlunos((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));

  const addExtra = () => {
    extraSeq.current += 1;
    setAlunos((prev) => [
      ...prev,
      {
        id: `extra-${extraSeq.current}`,
        nome: "Aula extra",
        horario: "",
        status: "extra",
        avulso: true,
      },
    ]);
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
    <section className="flex flex-col gap-3 px-5">
      {alunos.map((aluno) => (
        <CheckinCard key={aluno.id} aluno={aluno} onStatus={setStatus} />
      ))}

      <button
        type="button"
        onClick={addExtra}
        className="mt-1 flex items-center justify-center gap-2 rounded-[20px] border border-dashed border-accent-soft py-3.5 text-sm font-medium text-accent transition-colors active:bg-accent-soft/40"
      >
        <Plus size={18} strokeWidth={2.4} />
        aula extra
      </button>
    </section>
  );
}
