// Testes do motor de dívidas (ciclo-02: "quem me deve?").
// Mês corrente = julho/2026; junho (seg começa o mês): seg+qui = 9 ocorrências.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  montaDividas,
  DIVIDA_MESES_RETROATIVOS,
  type AlunoParaDivida,
  type FechamentoPassado,
} from "../src/lib/dividas.ts";

const MES_ATUAL = "2026-07-01";

function aluno(patch: Partial<AlunoParaDivida>): AlunoParaDivida {
  return {
    id: "a1",
    nome: "Marina Lopes",
    telefone: null,
    modo_cobranca: "mensalidade",
    dias_semana: [1, 4], // seg + qui
    turmas: {},
    valor_mensal: 300,
    valor_dupla: null,
    valor_trio: null,
    status: "ativo",
    created_at: "2026-06-10T12:00:00Z",
    ...patch,
  };
}

function linha(patch: Partial<FechamentoPassado>): FechamentoPassado {
  return {
    aluno_id: "a1",
    mes_referencia: "2026-06-01",
    status: "aberto",
    aulas_esperadas: 9,
    faltas: 0,
    extras: 0,
    ajuste_manual: 0,
    ajuste_motivo: null,
    valor_final: 0,
    enviado_em: null,
    pago_em: null,
    ...patch,
  };
}

test("mês corrente não conta como dívida", () => {
  const vm = montaDividas({
    mesAtual: MES_ATUAL,
    alunos: [aluno({ created_at: "2026-07-02T12:00:00Z" })],
    fechamentosPassados: [linha({ mes_referencia: MES_ATUAL, status: "aberto" })],
    registros: [],
  });
  assert.equal(vm.itens.length, 0);
  assert.equal(vm.total, 0);
});

test("enviado de mês passado vira dívida com o valor CONGELADO do envio", () => {
  const vm = montaDividas({
    mesAtual: MES_ATUAL,
    alunos: [aluno({})],
    fechamentosPassados: [linha({ status: "enviado", valor_final: 280 })],
    registros: [],
  });
  assert.equal(vm.itens.length, 1);
  assert.equal(vm.itens[0].origem, "enviado");
  assert.equal(vm.itens[0].valor, 280); // o que o aluno recebeu, não recalcula
});

test("aberto de mês passado deriva AO VIVO (snapshot morto é ignorado)", () => {
  const vm = montaDividas({
    mesAtual: MES_ATUAL,
    alunos: [aluno({ valor_mensal: 300 })],
    // valor_final=999 no snapshot morto: se aparecer, a derivação quebrou.
    fechamentosPassados: [linha({ status: "aberto", valor_final: 999 })],
    registros: [],
  });
  assert.equal(vm.itens.length, 1);
  assert.equal(vm.itens[0].origem, "aberto");
  assert.equal(vm.itens[0].valor, 300);
});

test("mês que virou SEM linha nenhuma é dívida (o caso da Marina)", () => {
  const vm = montaDividas({
    mesAtual: MES_ATUAL,
    alunos: [aluno({ created_at: "2026-06-05T12:00:00Z" })],
    fechamentosPassados: [],
    registros: [],
  });
  assert.equal(vm.itens.length, 1);
  assert.equal(vm.itens[0].origem, "sem_fechamento");
  assert.equal(vm.itens[0].mesRef, "2026-06-01");
  assert.equal(vm.itens[0].valor, 300);
});

test("aluno criado no mês corrente não deve nada", () => {
  const vm = montaDividas({
    mesAtual: MES_ATUAL,
    alunos: [aluno({ created_at: "2026-07-03T12:00:00Z" })],
    fechamentosPassados: [],
    registros: [],
  });
  assert.equal(vm.itens.length, 0);
});

test("pago de mês passado não é dívida E bloqueia o sem_fechamento", () => {
  const vm = montaDividas({
    mesAtual: MES_ATUAL,
    alunos: [aluno({ created_at: "2026-06-05T12:00:00Z" })],
    fechamentosPassados: [
      linha({ status: "pago", valor_final: 300, pago_em: "2026-07-02T10:00:00Z" }),
    ],
    registros: [],
  });
  assert.equal(vm.itens.length, 0);
});

test("suspenso com linha aberta passada CONTA; suspenso sem linha não gera sem_fechamento", () => {
  const suspenso = aluno({
    id: "a2",
    nome: "Bruno Reis",
    status: "suspenso",
    created_at: "2026-05-01T12:00:00Z",
  });
  const vm = montaDividas({
    mesAtual: MES_ATUAL,
    alunos: [suspenso],
    fechamentosPassados: [linha({ aluno_id: "a2", status: "aberto" })],
    registros: [],
  });
  // Só a linha aberta de junho — maio (sem linha) NÃO aparece (suspenso).
  assert.equal(vm.itens.length, 1);
  assert.equal(vm.itens[0].origem, "aberto");
  assert.equal(vm.itens[0].mesRef, "2026-06-01");
});

test("aluno de créditos não gera sem_fechamento (receita dele é a venda)", () => {
  const vm = montaDividas({
    mesAtual: MES_ATUAL,
    alunos: [aluno({ modo_cobranca: "creditos", created_at: "2026-05-01T12:00:00Z" })],
    fechamentosPassados: [],
    registros: [],
  });
  assert.equal(vm.itens.length, 0);
});

test("fora da janela retroativa: aberto antigo aparece SEM valor; sem_fechamento antigo não aparece", () => {
  const vm = montaDividas({
    mesAtual: MES_ATUAL,
    alunos: [aluno({ created_at: "2025-11-01T12:00:00Z" })],
    fechamentosPassados: [linha({ mes_referencia: "2026-01-01", status: "aberto" })],
    registros: [],
  });
  const antigo = vm.itens.find((i) => i.mesRef === "2026-01-01");
  assert.ok(antigo);
  assert.equal(antigo.valor, null); // existe, mas sem derivação cara
  assert.equal(vm.semValor, 1);
  // sem_fechamento só dentro da janela (abr, mai, jun p/ julho corrente).
  const mesesSemLinha = vm.itens
    .filter((i) => i.origem === "sem_fechamento")
    .map((i) => i.mesRef);
  assert.deepEqual(mesesSemLinha, ["2026-04-01", "2026-05-01", "2026-06-01"]);
  assert.equal(mesesSemLinha.length, DIVIDA_MESES_RETROATIVOS);
});

test("por_aula: falta datada desconta no valor derivado da dívida", () => {
  // Junho/2026 seg+qui = 9 ocorrências × R$ 80 = 720; 1 falta (qui 04/jun) = 640.
  const vm = montaDividas({
    mesAtual: MES_ATUAL,
    alunos: [
      aluno({
        modo_cobranca: "por_aula",
        valor_mensal: 80,
        created_at: "2026-06-01T12:00:00Z",
      }),
    ],
    fechamentosPassados: [],
    registros: [
      { aluno_id: "a1", data: "2026-06-04", tipo: "falta", quantidade: 1, valor: null },
    ],
  });
  assert.equal(vm.itens.length, 1);
  assert.equal(vm.itens[0].valor, 640);
});

test("valor 0 sem linha não vira dívida (ruído)", () => {
  const vm = montaDividas({
    mesAtual: MES_ATUAL,
    alunos: [aluno({ valor_mensal: null, created_at: "2026-06-01T12:00:00Z" })],
    fechamentosPassados: [],
    registros: [],
  });
  assert.equal(vm.itens.length, 0);
});

test("total soma só valores conhecidos; ordenação por mês e nome", () => {
  const vm = montaDividas({
    mesAtual: MES_ATUAL,
    alunos: [
      aluno({ id: "a1", nome: "Marina", created_at: "2026-06-01T12:00:00Z" }),
      aluno({ id: "a2", nome: "Bruno", created_at: "2026-06-01T12:00:00Z" }),
    ],
    fechamentosPassados: [
      linha({ aluno_id: "a1", mes_referencia: "2026-05-01", status: "enviado", valor_final: 250 }),
      linha({ aluno_id: "a2", mes_referencia: "2026-01-01", status: "aberto" }), // sem valor
    ],
    registros: [],
  });
  // jan (Bruno, null) < mai (Marina, 250) < jun (Bruno 300, Marina 300 sem linha)
  assert.deepEqual(
    vm.itens.map((i) => [i.mesRef, i.nome, i.valor]),
    [
      ["2026-01-01", "Bruno", null],
      ["2026-05-01", "Marina", 250],
      ["2026-06-01", "Bruno", 300],
      ["2026-06-01", "Marina", 300],
    ],
  );
  assert.equal(vm.total, 850);
  assert.equal(vm.semValor, 1);
  assert.deepEqual(vm.meses, ["2026-01-01", "2026-05-01", "2026-06-01"]);
});
