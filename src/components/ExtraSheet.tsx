"use client";

// Único caminho para registrar aula extra — e, desde o ciclo-03, reposição
// agendada (extra com data futura). Usa o Sheet glass compartilhado.
// Valor próprio opcional (0012): vazio = valor normal do aluno.
// Dia default = hoje (gesto padrão intacto, 2 toques); dia futuro = reposição.
// Modo "Repor" (chip do card com falta): aluno fixo e Dia VAZIO — a data da
// reposição é decisão combinada, não default (julgador F2 do ciclo-03).

import { useState } from "react";
import { Search, X } from "lucide-react";
import type { AgendadaVM, RosterVM } from "@/lib/hoje";
import { dataCurta, horarioCurto } from "@/lib/datas";
import { parseValorBR } from "@/lib/valores";
import { Sheet } from "./Sheet";

export function ExtraSheet({
  open,
  roster,
  esperadosIds,
  hojeIso,
  minDia,
  maxDia,
  alunoPre = null,
  agendadas = [],
  onPick,
  onCancelarAgendada,
  onClose,
}: {
  open: boolean;
  roster: RosterVM[];
  esperadosIds: string[];
  hojeIso: string;
  minDia: string;
  maxDia: string;
  /** modo "Repor": aluno já escolhido, Dia nasce vazio */
  alunoPre?: RosterVM | null;
  /** reposições futuras já agendadas (p/ listar e cancelar) */
  agendadas?: AgendadaVM[];
  onPick: (id: string, valor: number | null, diaIso: string, horario: string | null) => void;
  onCancelarAgendada?: (alunoId: string, dataIso: string) => void;
  onClose: () => void;
}) {
  const [busca, setBusca] = useState("");
  const [valor, setValor] = useState("");
  const [dia, setDia] = useState(alunoPre ? "" : hojeIso);
  const [hora, setHora] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const visiveis = busca.trim()
    ? roster.filter((r) =>
        r.nome.toLocaleLowerCase("pt-BR").includes(busca.toLocaleLowerCase("pt-BR").trim()),
      )
    : roster;
  const diaFuturo = dia !== "" && dia > hojeIso;

  const escolher = (id: string) => {
    setErro(null);
    if (!dia) {
      setErro("Escolha o dia da reposição.");
      return;
    }
    if (dia < minDia || dia > maxDia) {
      setErro("Dia fora da janela (7 dias atrás até 1 ano à frente).");
      return;
    }
    let v: number | null = null;
    if (valor.trim()) {
      v = parseValorBR(valor);
      if (v === null || v <= 0) {
        setErro("Valor inválido — deixe vazio para usar o valor normal.");
        return;
      }
    }
    onPick(id, v, dia, hora || null);
  };

  return (
    <Sheet
      open={open}
      title={alunoPre ? `Repor aula · ${alunoPre.nome.split(" ")[0]}` : "Aula extra"}
      onClose={onClose}
    >
      {/* Dia + hora: dia = hoje mantém o gesto atual; futuro agenda a reposição. */}
      <div className="mb-2 flex gap-2">
        <label className="flex flex-1 items-center gap-2 rounded-2xl bg-surface px-3.5 py-2.5 shadow-soft">
          <span className="shrink-0 text-sm text-text-muted">Dia</span>
          <input
            type="date"
            value={dia}
            min={minDia}
            max={maxDia}
            onChange={(e) => setDia(e.target.value)}
            tabIndex={open ? 0 : -1}
            className="w-full min-w-0 bg-transparent text-[15px] text-text outline-none"
          />
        </label>
        <label className="flex items-center gap-2 rounded-2xl bg-surface px-3.5 py-2.5 shadow-soft">
          <span className="shrink-0 text-sm text-text-muted">Hora</span>
          <input
            type="time"
            value={hora}
            onChange={(e) => setHora(e.target.value)}
            tabIndex={open ? 0 : -1}
            className="w-full min-w-0 bg-transparent text-[15px] text-text outline-none"
          />
        </label>
      </div>
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

      {alunoPre ? (
        // Modo "Repor": aluno fixo — só confirmar (com dia obrigatório).
        <button
          type="button"
          tabIndex={open ? 0 : -1}
          onClick={() => escolher(alunoPre.id)}
          className="mt-1 w-full rounded-full bg-accent py-3 text-sm font-medium text-accent-contrast active:opacity-90"
        >
          Agendar reposição
        </button>
      ) : (
        <>
          {diaFuturo && (
            <p className="mb-2 px-1 text-xs text-text-muted">
              Agendando reposição para <strong>{dataCurta(dia)}</strong> — toque no
              aluno.
            </p>
          )}
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
          <ul className="flex max-h-[45vh] flex-col gap-0.5 overflow-y-auto pb-1">
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

          {agendadas.length > 0 && (
            <div className="mt-2 border-t border-glass-border pt-2">
              <p className="px-1 text-xs font-medium uppercase tracking-wider text-text-muted">
                Agendadas
              </p>
              <ul className="mt-1 flex max-h-[22vh] flex-col gap-0.5 overflow-y-auto pb-1">
                {agendadas.map((g) => (
                  <li
                    key={`${g.alunoId}|${g.dataIso}`}
                    className="flex items-center justify-between rounded-2xl px-3 py-2"
                  >
                    <span className="min-w-0 truncate text-sm text-text">
                      {g.nome}
                      <span className="text-text-muted">
                        {" "}
                        · {dataCurta(g.dataIso)}
                        {g.horario ? ` · ${horarioCurto(g.horario)}` : ""}
                      </span>
                    </span>
                    {onCancelarAgendada && (
                      <button
                        type="button"
                        tabIndex={open ? 0 : -1}
                        onClick={() => onCancelarAgendada(g.alunoId, g.dataIso)}
                        aria-label={`Cancelar reposição de ${g.nome} em ${dataCurta(g.dataIso)}`}
                        className="-my-1 shrink-0 rounded-full p-2 text-text-muted active:bg-danger/10 active:text-danger"
                      >
                        <X size={15} strokeWidth={2.6} />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </Sheet>
  );
}
