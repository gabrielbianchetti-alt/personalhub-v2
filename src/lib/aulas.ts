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
import { diasNoMes, dowDe, isoDe } from "./datas.ts";
import type { RegistroAula, TurmaDia } from "./tipos.ts";

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
    else if (r.tipo === "desmarcada") agg.desmarcadas += q;
    // tipo 'aula' (pacote) não entra na conta de mensalidade/por_aula.
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

/** Preço de uma aula conforme o tipo da turma daquele dia (fallback no solo). */
export function precoDoDia(
  turma: TurmaDia | undefined,
  valorSolo: number,
  valorDupla: number | null,
  valorTrio: number | null,
): number {
  if (turma?.tipo === "dupla") return Number(valorDupla ?? valorSolo);
  if (turma?.tipo === "trio") return Number(valorTrio ?? valorSolo);
  return valorSolo;
}

export interface ValorDetalhado {
  valor: number;
  realizadas: number;
}

/**
 * por_aula com preço POR DIA (dupla/trio). Soma o preço de cada aula que
 * aconteceu: ocorrências do mês − faltas (cada falta no preço do SEU dia, via
 * data) + extras (cada uma no seu valor; null = solo) + ajuste manual (em nº de
 * aulas, no valor solo). Sem turmas e sem valor nas extras, dá o mesmo que
 * `realizadas × valor` (é uma generalização do valorPorAula).
 */
export function valorPorAulaDetalhado(args: {
  diasSemana: number[];
  turmas: Record<string, TurmaDia>;
  valorSolo: number | null;
  valorDupla: number | null;
  valorTrio: number | null;
  year: number;
  month0: number;
  faltasIso: string[]; // datas de falta + desmarcada (YYYY-MM-DD)
  extras: { valor: number | null; quantidade?: number }[];
  ajuste?: number;
}): ValorDetalhado {
  const solo = Number(args.valorSolo ?? 0);
  const faltou = new Set(args.faltasIso);
  let valor = 0;
  let realizadas = 0;
  for (const dia of ocorrenciasNoMes(args.diasSemana, args.year, args.month0)) {
    if (faltou.has(isoDe(args.year, args.month0, dia))) continue; // não aconteceu
    const turma = args.turmas[String(dowDe(args.year, args.month0, dia))];
    valor += precoDoDia(turma, solo, args.valorDupla, args.valorTrio);
    realizadas += 1;
  }
  for (const e of args.extras) {
    const q = e.quantidade ?? 1;
    valor += Number(e.valor ?? solo) * q;
    realizadas += q;
  }
  const ajuste = args.ajuste ?? 0;
  valor += ajuste * solo;
  realizadas += ajuste;
  return { valor: Math.max(0, valor), realizadas: Math.max(0, realizadas) };
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

export interface ProgressoPacote {
  qtd: number;
  usadas: number; // aulas já realizadas (data <= hoje)
  agendadas: number; // marcadas pra frente (data > hoje)
  restantes: number; // livres p/ marcar
}

/**
 * Progresso do pacote: pacote agora é "aulas marcadas" (não agenda fixa).
 * Cada aula marcada consome 1 (no-show paga; cancelar devolve = remover a aula).
 */
export function progressoPacote(
  qtd: number,
  aulas: { data: string }[],
  hojeIso: string,
): ProgressoPacote {
  let usadas = 0;
  let agendadas = 0;
  for (const a of aulas) {
    if (a.data <= hojeIso) usadas++;
    else agendadas++;
  }
  return { qtd, usadas, agendadas, restantes: Math.max(0, qtd - usadas - agendadas) };
}

// saldoCreditos e ocorrenciasAteDia (modelo antigo de "aulas presumidas por
// agenda fixa") foram REMOVIDAS: o pacote virou "aulas marcadas" e o saldo real
// vem de progressoPacote + o count em actions/pacote.ts. Eram código morto com
// testes verdes — armadilha pra quem fosse mexer no saldo.
