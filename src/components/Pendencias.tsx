"use client";

// Pendências retroativas (§4.1): dias recentes sem nenhuma interação.
// Discreto, uma pergunta por vez — "ontem: todos fizeram?".

import { useState, useTransition } from "react";
import { Check, X } from "lucide-react";
import type { PendenciaVM } from "@/lib/hoje";
import { confirmarDia, resolverDiaComFaltas } from "@/app/actions/registros";
import { dataCurta } from "@/lib/datas";
import { vibra } from "@/lib/haptico";

export function Pendencias({ pendencias }: { pendencias: PendenciaVM[] }) {
  const [fila, setFila] = useState(pendencias);
  const [corrigindo, setCorrigindo] = useState(false);
  const [faltosos, setFaltosos] = useState<Set<string>>(new Set());
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const atual = fila[0];
  if (!atual) return null;

  function resolver(acao: () => Promise<void>) {
    vibra();
    const anterior = fila;
    setFila((f) => f.slice(1));
    setCorrigindo(false);
    setFaltosos(new Set());
    setErro(null);
    startTransition(async () => {
      try {
        await acao();
      } catch (e) {
        setFila(anterior);
        setErro(e instanceof Error ? e.message : "Não salvou — tente de novo.");
      }
    });
  }

  const toggleFaltoso = (id: string) =>
    setFaltosos((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <section className="mx-5 mb-4 rounded-[20px] bg-surface-soft p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
        Dias anteriores{fila.length > 1 ? ` · ${fila.length}` : ""}
      </p>
      <p className="mt-1.5 text-[15px] text-text">
        <span className="font-medium">{dataCurta(atual.dataIso)}</span> — todos
        fizeram?
      </p>

      {erro && <p className="mt-2 text-sm text-danger">{erro}</p>}

      {!corrigindo ? (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => resolver(() => confirmarDia(atual.dataIso))}
            className="flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-surface py-2.5 text-sm font-medium text-success shadow-soft active:opacity-80 disabled:opacity-60"
          >
            <Check size={16} strokeWidth={2.4} className="shrink-0" />
            Todos fizeram
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => setCorrigindo(true)}
            className="flex-1 whitespace-nowrap rounded-full py-2.5 text-sm font-medium text-text-muted active:bg-surface disabled:opacity-60"
          >
            Corrigir
          </button>
        </div>
      ) : (
        <div className="mt-3">
          <p className="mb-2 text-sm text-text-muted">Quem faltou nesse dia?</p>
          <div className="flex flex-wrap gap-2">
            {atual.esperados.map((a) => {
              const marcado = faltosos.has(a.id);
              return (
                <button
                  key={a.id}
                  type="button"
                  aria-pressed={marcado}
                  onClick={() => toggleFaltoso(a.id)}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition-colors ${
                    marcado
                      ? "bg-danger text-white"
                      : "bg-surface text-text shadow-soft"
                  }`}
                >
                  {marcado && <X size={14} strokeWidth={2.6} />}
                  {a.nome.split(" ")[0]}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              resolver(() => resolverDiaComFaltas(atual.dataIso, [...faltosos]))
            }
            className="mt-3 w-full rounded-full bg-accent py-2.5 text-sm font-medium text-white active:opacity-90 disabled:opacity-60"
          >
            Salvar
          </button>
        </div>
      )}
    </section>
  );
}
