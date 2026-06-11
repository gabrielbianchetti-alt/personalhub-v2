"use client";

import { X, Check } from "lucide-react";
import type { AlunoHojeVM } from "@/lib/hoje";

export function CheckinCard({
  aluno,
  isPast,
  isNext,
  onToggleFalta,
  onTirarExtra,
}: {
  aluno: AlunoHojeVM;
  isPast: boolean;
  isNext: boolean;
  onToggleFalta: (id: string) => void;
  onTirarExtra: (id: string) => void;
}) {
  const subtitle = aluno.avulso ? "Aula extra" : aluno.horario || "Presumido";
  // Passado não-resolvido lê como "feito": check silencioso (--success), sem dimming.
  const feito = isPast && !aluno.faltou && !aluno.avulso;

  return (
    <article
      className={`flex items-center justify-between rounded-[20px] bg-surface p-4 shadow-soft transition-all duration-200 ${
        aluno.faltou ? "opacity-60" : "opacity-100"
      } ${isNext ? "ring-1 ring-accent/50" : ""} ${aluno.avulso ? "card-in" : ""}`}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p
            className={`truncate text-base font-medium transition-colors duration-200 ${
              aluno.faltou ? "text-text-muted line-through" : "text-text"
            }`}
          >
            {aluno.nome}
          </p>
          {aluno.extras > 0 && (
            <button
              type="button"
              onClick={() => onTirarExtra(aluno.id)}
              aria-label={`Remover uma aula extra de ${aluno.nome}`}
              className="shrink-0 rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent active:opacity-70"
            >
              +{aluno.extras} extra
            </button>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-sm text-text-muted">
          {feito && (
            <Check
              size={14}
              strokeWidth={2.5}
              className="shrink-0 text-success"
              aria-label="feito"
            />
          )}
          <span>{subtitle}</span>
        </div>
      </div>

      {/* Corrigir é sempre possível: o chip "Faltou" permanece mesmo no passado. */}
      <button
        type="button"
        aria-pressed={aluno.faltou}
        onClick={() => onToggleFalta(aluno.id)}
        className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${
          aluno.faltou
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
