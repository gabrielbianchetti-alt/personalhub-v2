"use client";

// Único caminho para registrar aula extra; lista o roster com busca
// quando a turma cresce. Usa o Sheet glass compartilhado (Esc + scroll lock).
// Valor próprio opcional (migração 0012): vazio = valor normal do aluno —
// o gesto padrão continua sendo 2 toques.

import { useState } from "react";
import { Search } from "lucide-react";
import type { RosterVM } from "@/lib/hoje";
import { parseValorBR } from "@/lib/valores";
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
  onPick: (id: string, valor: number | null) => void;
  onClose: () => void;
}) {
  const [busca, setBusca] = useState("");
  const [valor, setValor] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const visiveis = busca.trim()
    ? roster.filter((r) =>
        r.nome.toLocaleLowerCase("pt-BR").includes(busca.toLocaleLowerCase("pt-BR").trim()),
      )
    : roster;

  const escolher = (id: string) => {
    setErro(null);
    if (!valor.trim()) {
      onPick(id, null);
      return;
    }
    const v = parseValorBR(valor);
    if (v === null || v <= 0) {
      setErro("Valor inválido — deixe vazio para usar o valor normal.");
      return;
    }
    onPick(id, v);
  };

  return (
    <Sheet open={open} title="Aula extra" onClose={onClose}>
      <div className="mb-2 flex items-center gap-1 rounded-2xl bg-surface px-3.5 py-2.5 shadow-soft">
        <span className="shrink-0 text-sm text-text-muted">R$</span>
        <input
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          placeholder="valor normal do aluno"
          inputMode="decimal"
          tabIndex={open ? 0 : -1}
          className="w-full min-w-0 bg-transparent text-[15px] text-text outline-none placeholder:text-text-muted"
        />
      </div>
      {erro && <p className="mb-2 text-sm text-danger">{erro}</p>}
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
              onClick={() => escolher(r.id)}
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
