"use client";

import { X, Plus } from "lucide-react";
import type { AlunoHoje, StatusHoje } from "@/lib/mock";

const SUBTITLE: Record<StatusHoje, (a: AlunoHoje) => string> = {
  presumido: (a) => a.horario || "Presumido",
  faltou: () => "Faltou",
  extra: (a) => (a.avulso ? "Aula extra" : `${a.horario || ""} · extra`.trim().replace(/^· /, "")),
};

export function CheckinCard({
  aluno,
  onStatus,
}: {
  aluno: AlunoHoje;
  onStatus: (id: string, status: StatusHoje) => void;
}) {
  const faltou = aluno.status === "faltou";
  const extra = aluno.status === "extra";

  const toggle = (target: StatusHoje) =>
    onStatus(aluno.id, aluno.status === target ? "presumido" : target);

  return (
    <article
      className={`flex items-center justify-between rounded-[20px] bg-surface p-4 shadow-soft transition-all duration-200 ${
        faltou ? "opacity-60" : "opacity-100"
      } ${aluno.avulso ? "card-in" : ""}`}
    >
      <div className="min-w-0">
        <p
          className={`truncate text-base font-medium transition-colors duration-200 ${
            faltou ? "text-text-muted line-through" : "text-text"
          }`}
        >
          {aluno.nome}
        </p>
        <p
          className={`text-sm transition-colors duration-200 ${
            extra ? "text-accent" : "text-text-muted"
          }`}
        >
          {SUBTITLE[aluno.status](aluno)}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2 pl-3">
        <button
          type="button"
          aria-pressed={faltou}
          aria-label="Marcar falta"
          onClick={() => toggle("faltou")}
          className={`flex size-11 items-center justify-center rounded-full transition-colors ${
            faltou
              ? "bg-danger text-white"
              : "bg-surface-soft text-text-muted active:bg-danger/10"
          }`}
        >
          <X size={20} strokeWidth={2.4} />
        </button>
        <button
          type="button"
          aria-pressed={extra}
          aria-label="Marcar aula extra"
          onClick={() => toggle("extra")}
          className={`flex size-11 items-center justify-center rounded-full transition-colors ${
            extra
              ? "bg-accent text-white"
              : "bg-surface-soft text-text-muted active:bg-accent/10"
          }`}
        >
          <Plus size={20} strokeWidth={2.4} />
        </button>
      </div>
    </article>
  );
}
