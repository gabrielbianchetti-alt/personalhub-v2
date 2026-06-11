"use client";

// Único caminho para registrar aula extra; lista o roster com busca
// quando a turma cresce. Usa o Sheet glass compartilhado (Esc + scroll lock).

import { useState } from "react";
import { Search } from "lucide-react";
import type { RosterVM } from "@/lib/hoje";
import { Sheet } from "./Sheet";

export function ExtraSheet({
  open,
  roster,
  esperadosIds,
  onPick,
  onClose,
}: {
  open: boolean;
  roster: RosterVM[];
  esperadosIds: string[];
  onPick: (id: string) => void;
  onClose: () => void;
}) {
  const [busca, setBusca] = useState("");
  const visiveis = busca.trim()
    ? roster.filter((r) =>
        r.nome.toLocaleLowerCase("pt-BR").includes(busca.toLocaleLowerCase("pt-BR").trim()),
      )
    : roster;

  return (
    <Sheet open={open} title="Aula extra" onClose={onClose}>
      {roster.length > 12 && (
        <div className="mb-2 flex items-center gap-2 rounded-2xl bg-surface px-3.5 py-2.5 shadow-soft">
          <Search size={16} className="shrink-0 text-text-muted" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar aluno"
            tabIndex={open ? 0 : -1}
            className="w-full min-w-0 bg-transparent text-[15px] text-text outline-none placeholder:text-text-muted"
          />
        </div>
      )}
      <ul className="flex max-h-[55vh] flex-col gap-0.5 overflow-y-auto pb-1">
        {visiveis.map((r) => (
          <li key={r.id}>
            <button
              type="button"
              tabIndex={open ? 0 : -1}
              onClick={() => onPick(r.id)}
              className="flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left transition-colors active:bg-surface-soft"
            >
              <span className="min-w-0 truncate text-base text-text">{r.nome}</span>
              {esperadosIds.includes(r.id) && (
                <span className="shrink-0 pl-2 text-xs text-text-muted">hoje</span>
              )}
            </button>
          </li>
        ))}
        {visiveis.length === 0 && (
          <li className="px-3 py-6 text-center text-sm text-text-muted">
            Ninguém com esse nome.
          </li>
        )}
      </ul>
    </Sheet>
  );
}
