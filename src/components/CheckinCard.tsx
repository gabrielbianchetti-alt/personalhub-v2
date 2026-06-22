"use client";

import { X, Check } from "lucide-react";
import type { AlunoHojeVM } from "@/lib/hoje";

export function CheckinCard({
  aluno,
  isPast,
  isNext,
  onToggleFalta,
  onTirarExtra,
  onCancelarPacote,
}: {
  aluno: AlunoHojeVM;
  isPast: boolean;
  isNext: boolean;
  onToggleFalta: (id: string) => void;
  onTirarExtra: (id: string) => void;
  onCancelarPacote?: (registroId: string, alunoId: string) => void;
}) {
  const subtitle = aluno.pacote
    ? aluno.horario || "Aula do pacote"
    : aluno.avulso
      ? "Aula extra"
      : aluno.horario || "Presumido";
  // Passado não-resolvido lê como "feito": check silencioso (--success), sem dimming.
  const feito = isPast && !aluno.faltou && !aluno.avulso;

  return (
    <article
      className={`flex items-center justify-between rounded-[14px] bg-surface p-4 shadow-soft transition-all duration-200 ${
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
          {aluno.pacote && (
            <span className="shrink-0 rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent">
              pacote
            </span>
          )}
          {aluno.extras > 0 && (
            // O × deixa claro que o chip remove; -m/p amplia o alvo de toque.
            <button
              type="button"
              onClick={() => onTirarExtra(aluno.id)}
              aria-label={`Remover uma aula extra de ${aluno.nome}`}
              className="-my-2 shrink-0 py-2 active:opacity-70"
            >
              <span className="flex items-center gap-1 rounded-full bg-accent-soft py-0.5 pl-2 pr-1.5 text-xs font-medium text-accent">
                +{aluno.extras} extra
                <X size={11} strokeWidth={2.8} />
              </span>
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

      {/* Pacote: aula já consumiu o crédito (no-show paga) — sem "Faltou", mas
          dá pra cancelar (lançou por engano) e devolver o crédito sem sair do Hoje. */}
      {aluno.pacote && aluno.pacoteRegistroId && onCancelarPacote && (
        <button
          type="button"
          onClick={() => onCancelarPacote(aluno.pacoteRegistroId!, aluno.id)}
          aria-label={`Cancelar aula de pacote de ${aluno.nome}`}
          className="flex shrink-0 items-center gap-1.5 rounded-full bg-surface-soft px-3.5 py-2.5 text-sm font-medium text-text-muted active:bg-danger/10 active:text-danger"
        >
          <X size={16} strokeWidth={2.4} />
          Cancelar
        </button>
      )}

      {/* Demais: corrigir é sempre possível, o chip permanece mesmo no passado. */}
      {!aluno.pacote && (
        <button
          type="button"
          aria-pressed={aluno.faltou}
          onClick={() => onToggleFalta(aluno.id)}
          className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2.5 text-sm font-medium transition-colors ${
            aluno.faltou
              ? "bg-danger text-white"
              : "bg-surface-soft text-text-muted active:bg-danger/10"
          }`}
        >
          <X size={16} strokeWidth={2.4} />
          Faltou
        </button>
      )}
    </article>
  );
}
