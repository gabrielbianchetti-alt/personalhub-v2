// Testes do modo por_aula e do view-model da Cobrança.
// Junho/2026 (seg começa o mês): seg+qui = 9 ocorrências (5 seg + 4 qui).

import { test } from "node:test";
import assert from "node:assert/strict";

import { valorPorAula, valorFechamento } from "../src/lib/aulas.ts";
import {
  montaItemFechamento,
  montaItemCreditos,
  montaSnapshotFechamento,
  resumoMes,
} from "../src/lib/cobranca.ts";
import { listaDatas } from "../src/lib/datas.ts";
import type { Fechamento } from "../src/lib/tipos.ts";

const ALUNO_BASE = {
  id: "a1",
  nome: "Marina Lopes",
  telefone: null,
  valor_mensal: 80,
  dias_semana: [1, 4], // seg + qui
};

function fechamentoCongelado(patch: Partial<Fechamento>): Fechamento {
  return {
    id: "f1",
    professor_id: "p1",
    aluno_id: "a1",
    mes_referencia: "2026-06-01",
    aulas_esperadas: 9,
    faltas: 0,
    extras: 0,
    ajuste_manual: 0,
    ajuste_motivo: null,
    valor_final: 0,
    status: "enviado",
    enviado_em: null,
    pago_em: null,
    ...patch,
  };
}

test("valorPorAula = realizadas × valor da aula (clamp ≥ 0)", () => {
  assert.equal(valorPorAula(80, 13), 1040);
  assert.equal(valorPorAula(80, 0), 0);
  assert.equal(valorPorAula(80, -2), 0);
  assert.equal(valorPorAula(null, 5), 0);
  assert.equal(valorFechamento("por_aula", 80, 9), 720);
  // Mensalidade ignora a contagem no valor.
  assert.equal(valorFechamento("mensalidade", 300, 9), 300);
  assert.equal(valorFechamento("mensalidade", 300, 0), 300);
});

test("por_aula aberto: falta desconta, extra soma, ajuste mexe no total", () => {
  const aluno = { ...ALUNO_BASE, modo_cobranca: "por_aula" as const };

  const semExcecao = montaItemFechamento(aluno, [], null, 2026, 5);
  assert.equal(semExcecao.realizadas, 9);
  assert.equal(semExcecao.valor, 720);
  assert.equal(semExcecao.valorAula, 80);
  assert.equal(semExcecao.modo, "por_aula");

  const comFalta = montaItemFechamento(
    aluno,
    [{ tipo: "falta", quantidade: 1 }],
    null,
    2026,
    5,
  );
  assert.equal(comFalta.realizadas, 8);
  assert.equal(comFalta.valor, 640);
  assert.ok(comFalta.resumo.includes("1 falta"));

  const comExtra = montaItemFechamento(
    aluno,
    [{ tipo: "extra", quantidade: 2 }],
    null,
    2026,
    5,
  );
  assert.equal(comExtra.valor, 11 * 80);

  const comAjuste = montaItemFechamento(
    aluno,
    [],
    fechamentoCongelado({ status: "aberto", ajuste_manual: -3 }) as Fechamento,
    2026,
    5,
  );
  assert.equal(comAjuste.realizadas, 6);
  assert.equal(comAjuste.valor, 480);
});

test("mensalidade aberto: valor fixo independe de faltas/extras", () => {
  const aluno = {
    ...ALUNO_BASE,
    valor_mensal: 300,
    modo_cobranca: "mensalidade" as const,
  };
  const comFalta = montaItemFechamento(
    aluno,
    [{ tipo: "falta", quantidade: 2 }],
    null,
    2026,
    5,
  );
  assert.equal(comFalta.valor, 300);
  assert.equal(comFalta.realizadas, 7);
  assert.equal(comFalta.valorAula, null);
});

test("fechamento congelado (enviado/pago) ignora registros novos", () => {
  const aluno = { ...ALUNO_BASE, modo_cobranca: "por_aula" as const };
  const item = montaItemFechamento(
    aluno,
    [{ tipo: "falta", quantidade: 5 }], // chegaram DEPOIS do envio
    fechamentoCongelado({ valor_final: 720, aulas_esperadas: 9 }),
    2026,
    5,
  );
  assert.equal(item.valor, 720); // snapshot manda
  assert.equal(item.status, "enviado");
});

test("montaSnapshotFechamento congela esperadas/faltas/extras/valor (mensalidade)", () => {
  const snap = montaSnapshotFechamento({
    professorId: "p1",
    alunoId: "a1",
    mesRef: "2026-06-01",
    year: 2026,
    month0: 5,
    diasSemana: [1, 4], // seg+qui = 9 ocorrências
    valorMensal: 300,
    modo: "mensalidade",
    registros: [
      { tipo: "falta", quantidade: 1 },
      { tipo: "desmarcada", quantidade: 1 },
      { tipo: "extra", quantidade: 2 },
    ],
    ajuste: 0,
    motivo: null,
  });
  assert.equal(snap.aulas_esperadas, 9);
  assert.equal(snap.faltas, 2); // falta + desmarcada
  assert.equal(snap.extras, 2);
  assert.equal(snap.valor_final, 300); // mensalidade ignora a contagem
});

test("montaSnapshotFechamento por_aula = realizadas × valor da aula", () => {
  const snap = montaSnapshotFechamento({
    professorId: "p1",
    alunoId: "a1",
    mesRef: "2026-06-01",
    year: 2026,
    month0: 5,
    diasSemana: [1, 4],
    valorMensal: 80,
    modo: "por_aula",
    registros: [{ tipo: "falta", quantidade: 1 }],
    ajuste: 0,
    motivo: null,
  });
  assert.equal(snap.valor_final, 640); // (9 − 1) × 80
});

test("resumoMes soma mensalidade + por_aula e deixa créditos de fora", () => {
  const mensal = montaItemFechamento(
    { ...ALUNO_BASE, valor_mensal: 300, modo_cobranca: "mensalidade" as const },
    [],
    null,
    2026,
    5,
  );
  const porAula = montaItemFechamento(
    { ...ALUNO_BASE, id: "a2", modo_cobranca: "por_aula" as const },
    [],
    null,
    2026,
    5,
  );
  const creditos = montaItemCreditos(
    { id: "a3", nome: "Pedro", telefone: null },
    { qtd: 10, usadas: 6, agendadas: 0, restantes: 4 },
    { qtd: 10, valor: 600 },
  );
  const r = resumoMes([mensal, porAula, creditos]);
  assert.equal(r.totalPrevisto, 300 + 720);
  assert.equal(r.abertos, 2);
  assert.equal(r.pagos, 0);
  assert.equal(r.totalRecebido, 0);
});

test("diasAula = dias de aula no mês de referência (ter+qui jun/2026)", () => {
  const item = montaItemFechamento(
    { ...ALUNO_BASE, dias_semana: [2, 4], modo_cobranca: "mensalidade" as const },
    [],
    null,
    2026,
    5,
  );
  assert.deepEqual(item.diasAula, [
    "02/06", "04/06", "09/06", "11/06", "16/06", "18/06", "23/06", "25/06", "30/06",
  ]);
  assert.equal(
    listaDatas(item.diasAula),
    "02/06, 04/06, 09/06, 11/06, 16/06, 18/06, 23/06, 25/06 e 30/06",
  );
});

test("resumoMes.totalRecebido soma só os fechamentos pagos", () => {
  const pago = montaItemFechamento(
    { ...ALUNO_BASE, valor_mensal: 300, modo_cobranca: "mensalidade" as const },
    [],
    fechamentoCongelado({ status: "pago", valor_final: 300 }),
    2026,
    5,
  );
  const aberto = montaItemFechamento(
    { ...ALUNO_BASE, id: "a2", valor_mensal: 250, modo_cobranca: "mensalidade" as const },
    [],
    null,
    2026,
    5,
  );
  const r = resumoMes([pago, aberto]);
  assert.equal(r.totalPrevisto, 300 + 250);
  assert.equal(r.totalRecebido, 300); // só o pago
  assert.equal(r.pagos, 1);
});
