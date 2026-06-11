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

  // 7 chips numa linha até em 320px: 7×32 + 6×4 = 248px (largura útil exata).
  const dim =
    size === "md"
      ? "size-8 text-xs min-[375px]:size-9 min-[375px]:text-sm"
      : "size-7 text-xs";

  return (
    <div className="flex flex-wrap gap-1 min-[375px]:gap-1.5">
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
