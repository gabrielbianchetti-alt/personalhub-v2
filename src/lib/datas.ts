// Datas com fuso fixo America/Sao_Paulo.
//
// O servidor (Vercel) roda em UTC: `new Date()` cru às 21h de Brasília já é
// "amanhã". Todo conceito de "hoje" do app passa por aqui. Aritmética de
// calendário usa Date.UTC — imune ao fuso do processo.

const TZ = "America/Sao_Paulo";

export interface AgoraSP {
  iso: string; // "YYYY-MM-DD"
  year: number;
  month: number; // 0-based
  day: number;
  dow: number; // 0=dom … 6=sáb
  hour: number;
  minute: number;
}

export function agoraSP(now: Date = new Date()): AgoraSP {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const year = get("year");
  const month = get("month") - 1;
  const day = get("day");
  return {
    iso: isoDe(year, month, day),
    year,
    month,
    day,
    dow: dowDe(year, month, day),
    hour: get("hour") % 24, // Intl pode emitir "24" à meia-noite
    minute: get("minute"),
  };
}

export function isoDe(year: number, month0: number, day: number): string {
  const m = String(month0 + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

export function parteIso(iso: string): { year: number; month: number; day: number } {
  const [y, m, d] = iso.split("-").map(Number);
  return { year: y, month: m - 1, day: d };
}

export function dowDe(year: number, month0: number, day: number): number {
  return new Date(Date.UTC(year, month0, day)).getUTCDay();
}

export function dowDeIso(iso: string): number {
  const { year, month, day } = parteIso(iso);
  return dowDe(year, month, day);
}

export function addDias(iso: string, n: number): string {
  const { year, month, day } = parteIso(iso);
  const d = new Date(Date.UTC(year, month, day + n));
  return isoDe(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

export function diasNoMes(year: number, month0: number): number {
  return new Date(Date.UTC(year, month0 + 1, 0)).getUTCDate();
}

/** Dias corridos entre duas datas ISO (b − a). */
export function diffDias(aIso: string, bIso: string): number {
  const a = parteIso(aIso);
  const b = parteIso(bIso);
  return Math.round(
    (Date.UTC(b.year, b.month, b.day) - Date.UTC(a.year, a.month, a.day)) / 86400000,
  );
}

/** "YYYY-MM-01" do mês — chave de fechamentos. */
export function mesRefIso(year: number, month0: number): string {
  return isoDe(year, month0, 1);
}

/** Soma n meses a um "YYYY-MM-01" (navegação de meses na Cobrança). */
export function addMeses(mesRefIso: string, n: number): string {
  const { year, month } = parteIso(mesRefIso);
  const d = new Date(Date.UTC(year, month + n, 1));
  return isoDe(d.getUTCFullYear(), d.getUTCMonth(), 1);
}

// ── Rótulos PT-BR (sem depender do fuso/locale do runtime) ─────────

const SEMANA_LONGA = [
  "Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado",
];
const SEMANA_CURTA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

/** "Quarta, 10 de junho" */
export function dataPorExtenso(iso: string): string {
  const { year, month, day } = parteIso(iso);
  return `${SEMANA_LONGA[dowDe(year, month, day)]}, ${day} de ${MESES[month]}`;
}

/** "ter, 9 de junho" — usado nas pendências retroativas. */
export function dataCurta(iso: string): string {
  const { year, month, day } = parteIso(iso);
  return `${SEMANA_CURTA[dowDe(year, month, day)]}, ${day} de ${MESES[month]}`;
}

export function nomeMes(month0: number): string {
  return MESES[month0];
}

export function diaSemanaCurto(dow: number): string {
  return SEMANA_CURTA[dow];
}

/** "06:30" a partir do time do Postgres ("06:30:00"). */
export function horarioCurto(horario: string | null): string {
  if (!horario) return "";
  return horario.slice(0, 5);
}

/** Hora do aluno NAQUELE dia da semana (0..6); cai no horário único legado. */
export function horarioDoDia(
  a: { horarios?: Record<string, string> | null; horario: string | null },
  dow: number,
): string {
  const h = a.horarios?.[String(dow)];
  if (h) return h.slice(0, 5);
  return horarioCurto(a.horario);
}

export function formatBRL(valor: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
}

/** "02/06, 04/06 e 09/06" — lista legível de datas (placeholder {dias}). */
export function listaDatas(datas: string[]): string {
  if (datas.length === 0) return "";
  if (datas.length === 1) return datas[0];
  return `${datas.slice(0, -1).join(", ")} e ${datas[datas.length - 1]}`;
}
