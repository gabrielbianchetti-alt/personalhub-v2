// Anel de progresso do pacote: quantas aulas já foram × total. Teal CARIMBO.
export function ProgressRing({
  usadas,
  qtd,
  size = 44,
}: {
  usadas: number;
  qtd: number;
  size?: number;
}) {
  const stroke = 4;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const frac = qtd > 0 ? Math.min(1, usadas / qtd) : 0;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--accent-soft)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - frac)}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-money text-[11px] font-semibold leading-none text-text">
          {usadas}/{qtd}
        </span>
      </div>
    </div>
  );
}
