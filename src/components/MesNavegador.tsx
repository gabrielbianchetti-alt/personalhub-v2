"use client";

// Navegação de meses na Cobrança: ‹ mês › pra ver prévia de passados/futuros.
// "Hoje" volta pro mês corrente. Mês ≠ corrente mostra etiqueta "prévia".

import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addMeses } from "@/lib/datas";

export function MesNavegador({
  mesRef,
  rotulo,
  ehMesAtual,
}: {
  mesRef: string;
  rotulo: string;
  ehMesAtual: boolean;
}) {
  const router = useRouter();
  const ir = (delta: number) =>
    router.push(`/cobranca?mes=${addMeses(mesRef, delta)}`, { scroll: false });

  return (
    <div className="relative mt-1 flex items-center justify-between">
      <button
        type="button"
        aria-label="Mês anterior"
        onClick={() => ir(-1)}
        className="flex size-9 items-center justify-center rounded-full text-text-muted active:bg-surface-soft"
      >
        <ChevronLeft size={20} />
      </button>

      <button
        type="button"
        onClick={() => router.push("/cobranca", { scroll: false })}
        className="flex items-center gap-2"
      >
        <span className="text-sm capitalize text-text-muted">
          {ehMesAtual ? "Fechamento de " : ""}
          <span className="font-medium text-text">{rotulo}</span>
        </span>
        {!ehMesAtual && (
          <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-accent">
            prévia
          </span>
        )}
      </button>

      <button
        type="button"
        aria-label="Próximo mês"
        onClick={() => ir(1)}
        className="flex size-9 items-center justify-center rounded-full text-text-muted active:bg-surface-soft"
      >
        <ChevronRight size={20} />
      </button>
    </div>
  );
}
