// Banner "quem me deve?" (ciclo-02): dívidas de meses anteriores, no topo da
// Cobrança do mês corrente. Tom de alerta — nunca verde, não compete com o
// accent do card-herói (§6.5). Cada mês é uma linha que leva ao mês devido,
// onde reabrir/ajustar/cobrar/marcar pago já existem.

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { formatBRL, nomeMes, parteIso } from "@/lib/datas";
import type { DividasVM } from "@/lib/dividas";

/** "Marina" de "Marina Lopes" — sem depender do lib/whatsapp no server. */
function primeiroNomeDe(nome: string): string {
  return nome.trim().split(/\s+/)[0] ?? nome;
}

export function DividasBanner({
  dividas,
  anoAtual,
}: {
  dividas: DividasVM;
  anoAtual: number;
}) {
  if (dividas.itens.length === 0) return null;
  return (
    <section
      aria-label="Cobranças em aberto de meses anteriores"
      className="mt-4 divide-y divide-danger/15 overflow-hidden rounded-[14px] border border-danger/25 bg-danger/10"
    >
      {dividas.meses.map((mes) => {
        const doMes = dividas.itens.filter((i) => i.mesRef === mes);
        const total = doMes.reduce((s, i) => s + (i.valor ?? 0), 0);
        const semValor = doMes.filter((i) => i.valor === null).length;
        const { year, month } = parteIso(mes);
        const rotulo = `${nomeMes(month)}${year !== anoAtual ? ` ${year}` : ""}`;
        const nomes = [...new Set(doMes.map((i) => primeiroNomeDe(i.nome)))];
        return (
          <Link
            key={mes}
            href={`/cobranca?mes=${mes}`}
            className="flex items-center gap-3 px-4 py-3 active:bg-danger/15"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-danger">
                {total > 0 ? (
                  <>
                    <span className="font-money">{formatBRL(total)}</span> em
                    aberto de {rotulo}
                  </>
                ) : (
                  <>Em aberto de {rotulo}</>
                )}
              </p>
              <p className="mt-0.5 truncate text-xs text-text-muted">
                {nomes.length === 1 ? "1 aluno" : `${nomes.length} alunos`} ·{" "}
                {nomes.join(", ")}
                {semValor > 0 && " · valor ao abrir o mês"}
              </p>
            </div>
            <ChevronRight size={18} className="shrink-0 text-danger" />
          </Link>
        );
      })}
    </section>
  );
}
