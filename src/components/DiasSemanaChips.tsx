"use client";

// Chips S T Q Q S S D (§4.2) — seleção dos dias fixos do aluno.

const ORDEM = [1, 2, 3, 4, 5, 6, 0]; // seg → dom
const LETRA: Record<number, string> = {
  1: "S", 2: "T", 3: "Q", 4: "Q", 5: "S", 6: "S", 0: "D",
};
const NOME: Record<number, string> = {
  1: "segunda", 2: "terça", 3: "quarta", 4: "quinta", 5: "sexta", 6: "sábado", 0: "domingo",
};

export function DiasSemanaChips({
  value,
  onChange,
  size = "md",
}: {
  value: number[];
  onChange: (dias: number[]) => void;
  size?: "md" | "sm";
}) {
  const toggle = (d: number) =>
    onChange(value.includes(d) ? value.filter((x) => x !== d) : [...value, d]);

  const dim = size === "md" ? "size-9 text-sm" : "size-7 text-xs";

  return (
    <div className="flex gap-1.5">
      {ORDEM.map((d) => {
        const ativo = value.includes(d);
        return (
          <button
            key={d}
            type="button"
            aria-label={NOME[d]}
            aria-pressed={ativo}
            onClick={() => toggle(d)}
            className={`${dim} rounded-full font-medium transition-colors ${
              ativo
                ? "bg-accent text-white"
                : "bg-surface-soft text-text-muted active:bg-accent-soft"
            }`}
          >
            {LETRA[d]}
          </button>
        );
      })}
    </div>
  );
}
