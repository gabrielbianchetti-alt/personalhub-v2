"use client";

import { X } from "lucide-react";
import type { AlunoHoje } from "@/lib/mock";

export function CheckinCard({
  aluno,
  onToggleFalta,
}: {
  aluno: AlunoHoje;
  onToggleFalta: (id: string) => void;
}) {
  const faltou = aluno.status === "faltou";
  const subtitle = aluno.avulso ? "Aula extra" : aluno.horario || "Presumido";

  return (
    <article
      className={`flex items-center justify-between rounded-[20px] bg-surface p-4 shadow-soft transition-all duration-200 ${
        faltou ? "opacity-60" : "opacity-100"
      } ${aluno.avulso ? "card-in" : ""}`}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p
            className={`truncate text-base font-medium transition-colors duration-200 ${
              faltou ? "text-text-muted line-through" : "text-text"
            }`}
          >
            {aluno.nome}
          </p>
          {aluno.extras > 0 && (
            <span className="shrink-0 rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent">
              +{aluno.extras} extra
            </span>
          )}
        </div>
        <p className="text-sm text-text-muted">{subtitle}</p>
      </div>

      {/* Aluno esperado tem uma única ação: chip "Faltou" (toca de novo desfaz). */}
      <button
        type="button"
        aria-pressed={faltou}
        onClick={() => onToggleFalta(aluno.id)}
        className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${
          faltou
            ? "bg-danger text-white"
            : "bg-surface-soft text-text-muted active:bg-danger/10"
        }`}
      >
        <X size={16} strokeWidth={2.4} />
        Faltou
      </button>
    </article>
  );
}
