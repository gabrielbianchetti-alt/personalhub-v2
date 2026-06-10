"use client";

import { X } from "lucide-react";
import type { RosterAluno } from "@/lib/mock";

// Bottom sheet glass (§6.4 — sheets são local sancionado de glass).
// Único caminho para registrar aula extra; lista todo o roster.
export function ExtraSheet({
  open,
  roster,
  esperadosIds,
  onPick,
  onClose,
}: {
  open: boolean;
  roster: RosterAluno[];
  esperadosIds: string[];
  onPick: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <div
      className={`fixed inset-0 z-[60] ${open ? "" : "pointer-events-none"}`}
      aria-hidden={!open}
    >
      {/* backdrop */}
      <button
        type="button"
        aria-label="Fechar"
        tabIndex={open ? 0 : -1}
        onClick={onClose}
        className={`absolute inset-0 bg-black/30 transition-opacity duration-200 ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* painel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Adicionar aula extra"
        className={`absolute inset-x-0 bottom-0 mx-auto w-full max-w-[430px] transition-transform duration-300 ease-out ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="glass rounded-t-3xl border-t border-white/40 px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3 shadow-soft">
          <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-text-muted/30" />

          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-display text-2xl text-text">Aula extra</h2>
            <button
              type="button"
              aria-label="Fechar"
              tabIndex={open ? 0 : -1}
              onClick={onClose}
              className="flex size-9 items-center justify-center rounded-full bg-surface-soft text-text-muted"
            >
              <X size={18} strokeWidth={2.4} />
            </button>
          </div>

          <ul className="flex max-h-[55vh] flex-col gap-0.5 overflow-y-auto pb-1">
            {roster.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  tabIndex={open ? 0 : -1}
                  onClick={() => onPick(r.id)}
                  className="flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left transition-colors active:bg-surface-soft"
                >
                  <span className="text-base text-text">{r.nome}</span>
                  {esperadosIds.includes(r.id) && (
                    <span className="text-xs text-text-muted">hoje</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
