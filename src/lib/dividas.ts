// Dívidas entre meses (ciclo-02: "quem me deve?"). A Cobrança do mês corrente
// aponta o que ficou para trás — a coluna vermelha da planilha.
//
// Dívida tem DUAS origens (o julgador do ciclo 1 pegou a segunda):
//  1. linha de `fechamentos` parada em aberto/enviado num mês passado;
//  2. o caso mais comum: o mês que VIROU sem linha NENHUMA — fechamento só
//     nasce em salvarAjuste/marcarEnviado/marcarPago, então "nunca fechei
//     junho" não deixa rastro em `fechamentos`.
//
// Valor: `enviado` usa o snapshot congelado (o que o aluno recebeu); `aberto`
// e mês-sem-linha são derivados AO VIVO pela fonte única (montaItemFechamento
// → lib/aulas) — snapshot de aberto é morto (invariante do CLAUDE.md).

import { montaItemFechamento, type FechamentoDados } from "./cobranca.ts";
import { addMeses, parteIso } from "./datas.ts";
import type { AlunoStatus, ModoCobranca, TurmaDia } from "./tipos.ts";

/** Janela de derivação ao vivo (e de detecção de mês-sem-linha). Linhas
 * aberto/enviado MAIS antigas ainda aparecem — enviado com o valor congelado,
 * aberto sem valor (conta no aviso; o valor aparece ao abrir o mês). Limita
 * só a parte cara (registros retroativos), não a existência da dívida. */
export const DIVIDA_MESES_RETROATIVOS = 3;

/** Campos de aluno que a derivação ao vivo precisa (mesmos do view-model). */
export interface AlunoParaDivida {
  id: string;
  nome: string;
  telefone: string | null;
  modo_cobranca: ModoCobranca;
  dias_semana: number[];
  turmas: Record<string, TurmaDia>;
  valor_mensal: number | null;
  valor_dupla: number | null;
  valor_trio: number | null;
  status: AlunoStatus;
  created_at: string; // timestamptz ISO — 1º mês que pode dever
}

/** Linha de fechamento passado (QUALQUER status: pago só marca cobertura). */
export interface FechamentoPassado extends FechamentoDados {
  aluno_id: string;
  mes_referencia: string;
}

export interface RegistroDivida {
  aluno_id: string;
  data: string; // "YYYY-MM-DD"
  tipo: "falta" | "extra" | "desmarcada" | "aula";
  quantidade: number;
  valor: number | null;
}

export interface DividaItem {
  alunoId: string;
  nome: string;
  mesRef: string; // mês devido ("YYYY-MM-01")
  origem: "aberto" | "enviado" | "sem_fechamento";
  /** null = fora da janela de derivação (aparece na contagem, sem valor) */
  valor: number | null;
}

export interface DividasVM {
  /** ordenado por mês asc, nome asc */
  itens: DividaItem[];
  /** soma dos valores conhecidos */
  total: number;
  /** quantos itens estão sem valor derivável (fora da janela) */
  semValor: number;
  /** meses distintos com dívida, asc */
  meses: string[];
}

/**
 * Monta as dívidas de meses ANTERIORES a `mesAtual` — PURO e testável.
 * `fechamentosPassados` deve trazer TODAS as linhas com mes < mesAtual
 * (inclusive pagas — elas bloqueiam o "mês sem linha" sem virar dívida).
 * `registros` cobre a janela retroativa (derivação do por_aula/ajustes).
 */
export function montaDividas(args: {
  mesAtual: string; // "YYYY-MM-01"
  alunos: AlunoParaDivida[]; // ativos + donos de linha pendente (suspensos)
  fechamentosPassados: FechamentoPassado[];
  registros: RegistroDivida[];
}): DividasVM {
  const alunoPorId = new Map(args.alunos.map((a) => [a.id, a]));
  const derivarDesde = addMeses(args.mesAtual, -DIVIDA_MESES_RETROATIVOS);
  const itens: DividaItem[] = [];

  const registrosDe = (alunoId: string, mesRef: string) => {
    const fim = addMeses(mesRef, 1);
    return args.registros.filter(
      (r) => r.aluno_id === alunoId && r.data >= mesRef && r.data < fim,
    );
  };

  // Derivação ao vivo = exatamente o que a Cobrança daquele mês mostraria.
  const derivaValor = (
    aluno: AlunoParaDivida,
    mesRef: string,
    fechamento: FechamentoDados | null,
  ): number => {
    const { year, month } = parteIso(mesRef);
    return montaItemFechamento(
      aluno,
      registrosDe(aluno.id, mesRef),
      fechamento,
      year,
      month,
    ).valor;
  };

  // 1) Linhas paradas em meses passados (qualquer status marca cobertura).
  const comLinha = new Set<string>();
  for (const f of args.fechamentosPassados) {
    if (f.mes_referencia >= args.mesAtual) continue; // mês corrente não é dívida
    comLinha.add(`${f.aluno_id}|${f.mes_referencia}`);
    if (f.status === "pago") continue;
    const aluno = alunoPorId.get(f.aluno_id);
    if (f.status === "enviado") {
      itens.push({
        alunoId: f.aluno_id,
        nome: aluno?.nome ?? "Aluno",
        mesRef: f.mes_referencia,
        origem: "enviado",
        valor: Number(f.valor_final), // congelado no envio — o que o aluno viu
      });
    } else {
      const derivavel = aluno && f.mes_referencia >= derivarDesde;
      itens.push({
        alunoId: f.aluno_id,
        nome: aluno?.nome ?? "Aluno",
        mesRef: f.mes_referencia,
        origem: "aberto",
        valor: derivavel ? derivaValor(aluno, f.mes_referencia, f) : null,
      });
    }
  }

  // 2) Meses que viraram SEM linha — só alunos ativos com agenda de fechamento
  // (créditos não fecha mês: a receita dele é a venda de pacote).
  for (const aluno of args.alunos) {
    if (aluno.status !== "ativo" || aluno.modo_cobranca === "creditos") continue;
    const mesEntrada = `${aluno.created_at.slice(0, 7)}-01`;
    let m = mesEntrada > derivarDesde ? mesEntrada : derivarDesde;
    for (; m < args.mesAtual; m = addMeses(m, 1)) {
      if (comLinha.has(`${aluno.id}|${m}`)) continue;
      const valor = derivaValor(aluno, m, null);
      if (valor <= 0) continue; // sem valor a cobrar não é dívida (ruído)
      itens.push({
        alunoId: aluno.id,
        nome: aluno.nome,
        mesRef: m,
        origem: "sem_fechamento",
        valor,
      });
    }
  }

  itens.sort(
    (a, b) => a.mesRef.localeCompare(b.mesRef) || a.nome.localeCompare(b.nome),
  );
  return {
    itens,
    total: itens.reduce((s, i) => s + (i.valor ?? 0), 0),
    semValor: itens.filter((i) => i.valor === null).length,
    meses: [...new Set(itens.map((i) => i.mesRef))],
  };
}
