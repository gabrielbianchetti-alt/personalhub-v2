"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { diaSemanaCurto, formatBRL } from "@/lib/datas";
import type { ModoCobranca, AlunoStatus } from "@/lib/tipos";

export interface AlunoListaItem {
  id: string;
  nome: string;
  valor_mensal: number | null;
  modo_cobranca: ModoCobranca;
  dias_semana: number[];
  status: AlunoStatus;
}

const ORDEM_DIAS = [1, 2, 3, 4, 5, 6, 0];

function rotuloDias(dias: number[]): string {
  if (dias.length === 0) return "sem dias fixos";
  if (dias.length === 7) return "todos os dias";
  return ORDEM_DIAS.filter((d) => dias.includes(d))
    .map((d) => diaSemanaCurto(d))
    .join(" · ");
}

export function AlunosLista({ alunos }: { alunos: AlunoListaItem[] }) {
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<AlunoStatus>("ativo");

  const suspensos = alunos.filter((a) => a.status === "suspenso").length;
  const visiveis = alunos.filter(
    (a) =>
      a.status === filtro &&
      a.nome.toLocaleLowerCase("pt-BR").includes(busca.toLocaleLowerCase("pt-BR").trim()),
  );

  return (
    <div className="flex flex-1 flex-col">
      <div className="mt-4 flex items-center gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-2xl bg-surface px-3.5 py-2.5 shadow-soft">
          <Search size={17} className="shrink-0 text-text-muted" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar aluno"
            className="w-full min-w-0 bg-transparent text-[15px] text-text outline-none placeholder:text-text-muted"
          />
        </div>
        <Link
          href="/alunos/novo"
          aria-label="Cadastrar alunos"
          className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-accent text-white shadow-soft active:opacity-90"
        >
          <Plus size={22} strokeWidth={2.4} />
        </Link>
      </div>

      {suspensos > 0 && (
        <div className="mt-3 flex gap-2">
          {(["ativo", "suspenso"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFiltro(s)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                filtro === s
                  ? "bg-text text-bg"
                  : "bg-surface-soft text-text-muted"
              }`}
            >
              {s === "ativo" ? "Ativos" : `Suspensos · ${suspensos}`}
            </button>
          ))}
        </div>
      )}

      {visiveis.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-8 py-20 text-center">
          <p className="font-display text-2xl leading-snug text-text">
            {alunos.length === 0 ? (
              <>
                Nenhum aluno ainda.
                <br />
                Cadastre a turma em 2 minutos 👇
              </>
            ) : (
              "Ninguém com esse nome por aqui."
            )}
          </p>
          {alunos.length === 0 && (
            <Link
              href="/alunos/novo"
              className="mt-6 rounded-full bg-accent px-6 py-3 font-medium text-white shadow-soft active:opacity-90"
            >
              Cadastrar alunos
            </Link>
          )}
        </div>
      ) : (
        <ul className="mt-4 flex flex-col gap-2.5 pb-4">
          {visiveis.map((a) => (
            <li key={a.id}>
              <Link
                href={`/alunos/${a.id}`}
                className="flex items-center justify-between rounded-[20px] bg-surface p-4 shadow-soft active:opacity-80"
              >
                <div className="min-w-0">
                  <p className="truncate text-base font-medium text-text">{a.nome}</p>
                  <p className="mt-0.5 truncate text-sm text-text-muted">
                    {rotuloDias(a.dias_semana)}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-display text-lg text-text tabular-nums">
                    {formatBRL(Number(a.valor_mensal ?? 0))}
                  </p>
                  <p className="text-xs text-text-muted">
                    {a.modo_cobranca === "mensalidade"
                      ? "mensal"
                      : a.modo_cobranca === "por_aula"
                        ? "por aula"
                        : "pacote"}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
