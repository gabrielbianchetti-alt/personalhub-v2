"use client";

// Dias da semana COM horário por dia. Marcar um dia revela um seletor de
// hora pra aquele dia. value = { diaSemana: "HH:MM" }.
// Opcional (turmas): cada dia marcado pode ser solo/dupla/trio + nome do
// parceiro — no por_aula isso muda o preço daquele dia; no mensal é só rótulo.

import type { TipoTurma, TurmaDia } from "@/lib/tipos";

const ORDEM = [1, 2, 3, 4, 5, 6, 0]; // seg → dom
const LETRA: Record<number, string> = {
  1: "S", 2: "T", 3: "Q", 4: "Q", 5: "S", 6: "S", 0: "D",
};
const NOME: Record<number, string> = {
  1: "segunda", 2: "terça", 3: "quarta", 4: "quinta", 5: "sexta", 6: "sábado", 0: "domingo",
};

export function DiasHorarios({
  value,
  onChange,
  turmas,
  onTurmasChange,
}: {
  value: Record<string, string>;
  onChange: (v: Record<string, string>) => void;
  turmas?: Record<string, TurmaDia>;
  onTurmasChange?: (v: Record<string, TurmaDia>) => void;
}) {
  const selecionados = ORDEM.filter((d) => String(d) in value);
  const t = turmas ?? {};

  const toggle = (d: number) => {
    const k = String(d);
    const next = { ...value };
    if (k in next) {
      delete next[k];
      // tirou o dia: tira a turma junto.
      if (onTurmasChange && k in t) {
        const nt = { ...t };
        delete nt[k];
        onTurmasChange(nt);
      }
    } else {
      const ultima = Object.values(value).at(-1) ?? "";
      next[k] = ultima;
    }
    onChange(next);
  };

  const setHora = (d: number, hora: string) => onChange({ ...value, [String(d)]: hora });

  const setTipo = (d: number, tipo: TipoTurma | "solo") => {
    if (!onTurmasChange) return;
    const k = String(d);
    const next = { ...t };
    if (tipo === "solo") delete next[k];
    else next[k] = { tipo, ...(next[k]?.nome ? { nome: next[k]!.nome } : {}) };
    onTurmasChange(next);
  };

  const setNome = (d: number, nome: string) => {
    if (!onTurmasChange) return;
    const k = String(d);
    const atual = t[k];
    if (!atual) return;
    onTurmasChange({ ...t, [k]: { ...atual, nome } });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-1 min-[375px]:gap-1.5">
        {ORDEM.map((d) => {
          const ativo = String(d) in value;
          return (
            <button
              key={d}
              type="button"
              aria-label={NOME[d]}
              aria-pressed={ativo}
              onClick={() => toggle(d)}
              className={`size-8 rounded-full text-xs font-medium transition-colors min-[375px]:size-9 min-[375px]:text-sm ${
                ativo
                  ? "bg-accent text-accent-contrast"
                  : "bg-surface-soft text-text-muted active:bg-accent-soft"
              }`}
            >
              {LETRA[d]}
            </button>
          );
        })}
      </div>

      {selecionados.length > 0 && (
        <div className="flex flex-col gap-2">
          {selecionados.map((d) => {
            const tipo = t[String(d)]?.tipo; // dupla/trio; undefined = solo
            return (
              <div key={d} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm capitalize text-text-muted">{NOME[d]}</span>
                  <input
                    type="time"
                    step={300}
                    value={value[String(d)] ?? ""}
                    onChange={(e) => setHora(d, e.target.value)}
                    aria-label={`Horário de ${NOME[d]}`}
                    className="rounded-xl bg-surface-soft px-2.5 py-1.5 text-sm text-text outline-none"
                  />
                </div>
                {onTurmasChange && (
                  <div className="flex items-center gap-2 pl-1">
                    <div className="flex rounded-lg bg-surface-soft p-0.5">
                      {(["solo", "dupla", "trio"] as const).map((op) => {
                        const ativo = op === "solo" ? !tipo : tipo === op;
                        return (
                          <button
                            key={op}
                            type="button"
                            onClick={() => setTipo(d, op)}
                            className={`rounded-md px-2 py-1 text-xs font-medium capitalize transition-colors ${
                              ativo ? "bg-surface text-text shadow-soft" : "text-text-muted"
                            }`}
                          >
                            {op}
                          </button>
                        );
                      })}
                    </div>
                    {tipo && (
                      <input
                        value={t[String(d)]?.nome ?? ""}
                        onChange={(e) => setNome(d, e.target.value)}
                        placeholder={`nome da ${tipo}`}
                        aria-label={`Nome da ${tipo} de ${NOME[d]}`}
                        className="min-w-0 flex-1 rounded-lg bg-surface-soft px-2.5 py-1 text-xs text-text outline-none placeholder:text-text-muted"
                      />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
