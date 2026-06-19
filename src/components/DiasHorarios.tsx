"use client";

// Dias da semana COM horário por dia. Marcar um dia revela um seletor de
// hora pra aquele dia (resolve "não fica claro que é horário" + permite
// Felipe seg 06:00 / ter 07:00). value = { diaSemana: "HH:MM" }.

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
}: {
  value: Record<string, string>;
  onChange: (v: Record<string, string>) => void;
}) {
  const selecionados = ORDEM.filter((d) => String(d) in value);

  const toggle = (d: number) => {
    const k = String(d);
    const next = { ...value };
    if (k in next) {
      delete next[k];
    } else {
      // herda a hora do último dia marcado (turma costuma ter mesma hora)
      const ultima = Object.values(value).at(-1) ?? "";
      next[k] = ultima;
    }
    onChange(next);
  };

  const setHora = (d: number, hora: string) => onChange({ ...value, [String(d)]: hora });

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
        <div className="flex flex-col gap-1.5">
          {selecionados.map((d) => (
            <div key={d} className="flex items-center justify-between gap-3">
              <span className="text-sm capitalize text-text-muted">{NOME[d]}</span>
              <input
                type="time"
                value={value[String(d)] ?? ""}
                onChange={(e) => setHora(d, e.target.value)}
                aria-label={`Horário de ${NOME[d]}`}
                className="rounded-xl bg-surface-soft px-2.5 py-1.5 text-sm text-text outline-none"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
