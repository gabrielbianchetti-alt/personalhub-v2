// Vitrine da landing (pauta 2 da diretoria): mockup VIVO do card de cobrança,
// com as classes reais do app — acompanha claro/escuro pelos tokens, nítido em
// qualquer densidade, zero imagem. ESPELHO VISUAL de CobrancaLista.tsx: mudou
// o card lá, muda cá (/design-review pega no preview).
// Ilustração pura: aria-hidden, nada focável (spans, não buttons).

import { Check } from "lucide-react";

export function VitrineCobranca() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none mx-auto mt-4 flex max-w-[330px] select-none flex-col gap-3"
    >
      {/* Card 1 — PAGO (o átomo da marca: R$ herói + selo carimbado) */}
      <div className="-rotate-1 rounded-[14px] bg-surface p-4 shadow-soft">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-base font-medium text-text">Camila Rocha</p>
            <p className="mt-0.5 truncate text-sm text-text-muted">
              12 aulas · 1 reposição — junho
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end">
            <p className="font-money text-[22px] font-semibold leading-tight text-text">
              R$ 480,00
            </p>
            <span className="mt-1 flex items-baseline gap-1.5">
              <span className="selo text-success">Pago</span>
              <span className="font-money text-[11px] text-text-muted">· 04/jul</span>
            </span>
          </div>
        </div>
      </div>

      {/* Card 2 — aberto, com o verbo do produto (ELE toca; nada é automático) */}
      <div className="rotate-[0.8deg] rounded-[14px] bg-surface p-4 shadow-soft">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-base font-medium text-text">Rafael Pires</p>
            <p className="mt-0.5 truncate text-sm text-text-muted">
              9 aulas · 1 extra — junho
            </p>
          </div>
          <p className="font-money shrink-0 text-[22px] font-semibold leading-tight text-text">
            R$ 720,00
          </p>
        </div>
        <div className="divisor-recibo mt-3 flex items-center gap-2 pt-3">
          <span className="min-w-0 flex-1 whitespace-nowrap rounded-full bg-accent py-2.5 text-center text-sm font-medium text-accent-contrast">
            Cobrar no WhatsApp
          </span>
          <span className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-surface-soft px-4 py-2.5 text-sm font-medium text-text-muted">
            <Check size={16} strokeWidth={2.4} />
            Pago
          </span>
        </div>
      </div>
    </div>
  );
}
