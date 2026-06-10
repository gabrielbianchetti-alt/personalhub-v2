import { alunosHoje } from "@/lib/mock";
import { CheckinList } from "@/components/CheckinList";

// Data por extenso em PT-BR: "Quarta, 10 de junho".
function dataPorExtenso(now: Date): string {
  const semana = new Intl.DateTimeFormat("pt-BR", { weekday: "long" })
    .format(now)
    .replace(/-feira$/, "");
  const dia = now.getDate();
  const mes = new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(now);
  const semanaCap = semana.charAt(0).toUpperCase() + semana.slice(1);
  return `${semanaCap}, ${dia} de ${mes}`;
}

export default function HojePage() {
  const now = new Date();
  const periodo = now.getHours() < 12 ? "manha" : "tarde";

  return (
    <div className="flex flex-1 flex-col">
      <header className="relative overflow-hidden px-5 pb-7 pt-12">
        <div className={`orbe orbe--${periodo}`} aria-hidden="true" />
        <p className="relative text-sm font-medium text-text-muted">Hoje</p>
        <h1 className="relative mt-1 font-display text-[2.5rem] leading-[1.05] text-text">
          {dataPorExtenso(now)}
        </h1>
      </header>

      <CheckinList initial={alunosHoje} />
    </div>
  );
}
