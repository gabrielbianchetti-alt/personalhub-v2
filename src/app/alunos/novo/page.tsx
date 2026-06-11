"use client";

// Cadastro em lote — o onboarding de 2 minutos (§3, §4.2).
// Cada linha = 1 aluno com os 4 dados mínimos. Telefone fica pra cobrança.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { criarAlunosEmLote, type LinhaLote } from "@/app/actions/alunos";
import { DiasSemanaChips } from "@/components/DiasSemanaChips";

function linhaVazia(): LinhaLote {
  return { nome: "", valor: "", modo: "mensalidade", dias: [], horario: "" };
}

export default function NovoAlunosPage() {
  const router = useRouter();
  const [linhas, setLinhas] = useState<LinhaLote[]>([linhaVazia()]);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const muda = (i: number, patch: Partial<LinhaLote>) =>
    setLinhas((prev) => prev.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  const remove = (i: number) =>
    setLinhas((prev) => (prev.length > 1 ? prev.filter((_, j) => j !== i) : prev));

  const preenchidas = linhas.filter((l) => l.nome.trim());

  const salvar = () => {
    setErro(null);
    if (preenchidas.length === 0) {
      setErro("Preencha pelo menos um nome.");
      return;
    }
    const semValor = preenchidas.find((l) => !l.valor.trim());
    if (semValor) {
      setErro(`Falta o valor de ${semValor.nome.trim()}.`);
      return;
    }
    startTransition(async () => {
      try {
        await criarAlunosEmLote(preenchidas);
        router.replace("/alunos");
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Não salvou — tente de novo.");
      }
    });
  };

  return (
    <div className="flex flex-1 flex-col px-5 pt-12 pb-6">
      <div className="flex items-center gap-3">
        <Link
          href="/alunos"
          aria-label="Voltar"
          className="flex size-10 items-center justify-center rounded-full bg-surface text-text-muted shadow-soft"
        >
          <ArrowLeft size={19} />
        </Link>
        {/* título fixo: encolhe a 320px em vez de quebrar/truncar */}
        <h1 className="font-display text-[1.75rem] text-text min-[360px]:text-3xl">
          Cadastrar alunos
        </h1>
      </div>
      <p className="mt-2 text-sm text-text-muted">
        Nome, valor, como cobra e os dias da semana. O resto fica pra depois.
      </p>

      <div className="mt-5 flex flex-col gap-4">
        {linhas.map((l, i) => (
          <div key={i} className="rounded-[20px] bg-surface p-4 shadow-soft">
            <div className="flex items-center gap-2">
              <input
                value={l.nome}
                onChange={(e) => muda(i, { nome: e.target.value })}
                placeholder={`Nome do aluno ${i + 1}`}
                className="w-full bg-transparent text-base font-medium text-text outline-none placeholder:font-normal placeholder:text-text-muted"
              />
              {linhas.length > 1 && (
                // -m/p amplia o alvo de toque p/ ~44px sem mexer no layout
                <button
                  type="button"
                  aria-label="Remover linha"
                  onClick={() => remove(i)}
                  className="-m-3 shrink-0 p-3 text-text-muted active:text-danger"
                >
                  <Trash2 size={17} />
                </button>
              )}
            </div>

            <div className="mt-3 flex items-center gap-2">
              <div className="flex min-w-0 flex-1 items-center gap-1 rounded-xl bg-surface-soft px-3 py-2">
                <span className="text-sm text-text-muted">R$</span>
                <input
                  value={l.valor}
                  onChange={(e) => muda(i, { valor: e.target.value })}
                  placeholder={l.modo === "por_aula" ? "80" : "300"}
                  inputMode="decimal"
                  className="w-full min-w-0 bg-transparent text-[15px] text-text outline-none placeholder:text-text-muted"
                />
                {l.modo === "por_aula" && (
                  <span className="shrink-0 text-xs text-text-muted">/aula</span>
                )}
              </div>
              <input
                type="time"
                value={l.horario}
                onChange={(e) => muda(i, { horario: e.target.value })}
                aria-label="Horário (opcional)"
                className="shrink-0 rounded-xl bg-surface-soft px-2.5 py-1.5 text-sm text-text outline-none"
              />
            </div>

            <div className="mt-3 grid grid-cols-3 rounded-xl bg-surface-soft p-1">
              {(
                [
                  ["mensalidade", "Mensal"],
                  ["por_aula", "Por aula"],
                  ["creditos", "Pacote"],
                ] as const
              ).map(([modo, rotulo]) => (
                <button
                  key={modo}
                  type="button"
                  onClick={() => muda(i, { modo })}
                  className={`whitespace-nowrap rounded-lg px-2 py-1.5 text-sm font-medium transition-colors ${
                    l.modo === modo ? "bg-surface text-text shadow-soft" : "text-text-muted"
                  }`}
                >
                  {rotulo}
                </button>
              ))}
            </div>

            <div className="mt-3">
              <DiasSemanaChips value={l.dias} onChange={(dias) => muda(i, { dias })} />
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setLinhas((prev) => [...prev, linhaVazia()])}
        className="mt-4 flex items-center justify-center gap-2 rounded-[20px] border border-dashed border-accent-soft py-3.5 text-sm font-medium text-accent active:bg-accent-soft/40"
      >
        <Plus size={18} strokeWidth={2.4} />
        mais um aluno
      </button>

      {erro && <p className="mt-3 text-sm text-danger">{erro}</p>}

      <button
        type="button"
        disabled={pending}
        onClick={salvar}
        className="mt-5 rounded-2xl bg-accent py-3.5 font-medium text-white shadow-soft active:opacity-90 disabled:opacity-60"
      >
        {pending
          ? "Salvando…"
          : preenchidas.length > 1
            ? `Salvar ${preenchidas.length} alunos`
            : "Salvar"}
      </button>
    </div>
  );
}
