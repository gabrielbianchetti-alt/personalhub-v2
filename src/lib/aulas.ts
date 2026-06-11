// ─────────────────────────────────────────────────────────────────────────────
// Fonte ÚNICA da conta de aulas (lição da v1, validada lá com 2880 casos).
//
// Hoje, Cobrança e qualquer módulo futuro consomem ESTAS funções — ninguém
// conta do próprio jeito. Fórmula (§5 da SPEC):
//
//   esperadas  = ocorrências de dias_semana no mês
//   realizadas = esperadas − faltas − desmarcadas + extras + ajuste_manual
//   valor      = mensalidade: valor_mensal (falta não desconta — default §5)
//                créditos:    venda de pacote; saldo debita por aula realizada
//
// Datas via Date.UTC: imune ao fuso do servidor.
// ─────────────────────────────────────────────────────────────────────────────

// Import com extensão explícita: o Node roda os testes direto nos .ts
// (type stripping nativo) e exige o caminho completo.
import { diasNoMes, dowDe } from "./datas.ts";
import type { RegistroAula } from "./tipos.ts";

/** Dias do mês (1..N) em que caem os dias_semana do aluno. */
export function ocorrenciasNoMes(
  diasSemana: number[],
  year: number,
  month0: number,
): number[] {
  const total = diasNoMes(year, month0);
  const dias: number[] = [];
  for (let d = 1; d <= total; d++) {
    if (diasSemana.includes(dowDe(year, month0, d))) dias.push(d);
  }
  return dias;
}

/** Ocorrências até um dia-limite inclusivo (créditos: aulas já decorridas). */
export function ocorrenciasAteDia(
  diasSemana: number[],
  year: number,
  month0: number,
  ateDia: number,
): number[] {
  return ocorrenciasNoMes(diasSemana, year, month0).filter((d) => d <= ateDia);
}

export interface ExcecoesMes {
  faltas: number;
  extras: number;
  desmarcadas: number;
}

export const SEM_EXCECOES: ExcecoesMes = { faltas: 0, extras: 0, desmarcadas: 0 };

/** Agrega registros (só exceções) de UM aluno em um mês. */
export function agregaExcecoes(registros: Pick<RegistroAula, "tipo" | "quantidade">[]): ExcecoesMes {
  const agg = { faltas: 0, extras: 0, desmarcadas: 0 };
  for (const r of registros) {
    const q = r.quantidade ?? 1;
    if (r.tipo === "falta") agg.faltas += q;
    else if (r.tipo === "extra") agg.extras += q;
    else agg.desmarcadas += q;
  }
  return agg;
}

export interface ContagemMes {
  esperadas: number;
  realizadas: number;
}

export function contagemMes(
  diasSemana: number[],
  year: number,
  month0: number,
  excecoes: ExcecoesMes = SEM_EXCECOES,
  ajusteManual = 0,
): ContagemMes {
  const esperadas = ocorrenciasNoMes(diasSemana, year, month0).length;
  const realizadas = Math.max(
    0,
    esperadas - excecoes.faltas - excecoes.desmarcadas + excecoes.extras + ajusteManual,
  );
  return { esperadas, realizadas };
}

/**
 * Valor do fechamento no modo mensalidade (default §5: falta não desconta;
 * o ajuste manual mexe na CONTAGEM exibida, não no valor).
 */
export function valorMensalidade(valorMensal: number | null): number {
  return Number(valorMensal ?? 0);
}

/**
 * Valor do fechamento no modo por_aula: aulas realizadas × valor da aula.
 * Aqui falta/desmarcada DESCONTA (não fez, não paga) e o ajuste manual
 * mexe direto no total — tudo via `realizadas`.
 */
export function valorPorAula(valorAula: number | null, realizadas: number): number {
  return Math.max(0, realizadas) * Number(valorAula ?? 0);
}

/** Total do fechamento conforme o modo (créditos não fecha mês — vende pacote). */
export function valorFechamento(
  modo: "mensalidade" | "por_aula",
  valor: number | null,
  realizadas: number,
): number {
  return modo === "por_aula" ? valorPorAula(valor, realizadas) : valorMensalidade(valor);
}

/** "12 aulas · 1 falta · 2 extras" — resumo legível do card de cobrança. */
export function resumoContagem(c: ContagemMes, e: ExcecoesMes, ajuste = 0): string {
  const partes = [`${c.realizadas} ${c.realizadas === 1 ? "aula" : "aulas"}`];
  if (e.faltas > 0) partes.push(`${e.faltas} ${e.faltas === 1 ? "falta" : "faltas"}`);
  if (e.desmarcadas > 0)
    partes.push(`${e.desmarcadas} ${e.desmarcadas === 1 ? "desmarcada" : "desmarcadas"}`);
  if (e.extras > 0) partes.push(`${e.extras} ${e.extras === 1 ? "extra" : "extras"}`);
  if (ajuste !== 0) partes.push(`ajuste ${ajuste > 0 ? "+" : ""}${ajuste}`);
  return partes.join(" · ");
}

/**
 * Saldo de créditos derivado — sem job de débito diário.
 * Conta as aulas realizadas (presumidas + extras − faltas − desmarcadas)
 * desde o dia seguinte à compra do pacote mais recente até hoje, e subtrai
 * do total comprado. Determinístico e sempre em dia com correções retroativas.
 */
export function saldoCreditos(args: {
  qtdCompradas: number;
  diasSemana: number[];
  compraIso: string; // data do pacote mais recente
  hojeIso: string;
  registros: Pick<RegistroAula, "tipo" | "quantidade" | "data">[]; // do período
}): number {
  const { qtdCompradas, diasSemana, compraIso, hojeIso, registros } = args;
  let presumidas = 0;
  // Percorre mês a mês do dia seguinte à compra até hoje. (Dia+1 pode
  // "estourar" o mês — inofensivo: o filtro só pega ocorrências reais.)
  const [y, m, d] = compraIso.split("-").map(Number);
  let cursor = { year: y, month: m - 1, day: d + 1 };
  const [hy, hm, hd] = hojeIso.split("-").map(Number);
  const fim = { year: hy, month: hm - 1, day: hd };
  while (
    cursor.year < fim.year ||
    (cursor.year === fim.year && cursor.month <= fim.month)
  ) {
    const ultimo =
      cursor.year === fim.year && cursor.month === fim.month
        ? fim.day
        : diasNoMes(cursor.year, cursor.month);
    presumidas += ocorrenciasNoMes(diasSemana, cursor.year, cursor.month).filter(
      (dia) => dia >= cursor.day && dia <= ultimo,
    ).length;
    cursor = { year: cursor.month === 11 ? cursor.year + 1 : cursor.year, month: (cursor.month + 1) % 12, day: 1 };
  }
  const e = agregaExcecoes(
    registros.filter((r) => r.data > compraIso && r.data <= hojeIso),
  );
  const realizadas = Math.max(0, presumidas - e.faltas - e.desmarcadas + e.extras);
  return qtdCompradas - realizadas;
}
