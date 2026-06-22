// Testes do render da mensagem de cobrança (placeholders + limpeza).

import { test } from "node:test";
import assert from "node:assert/strict";

import { renderMensagem, TEMPLATE_PADRAO } from "../src/lib/whatsapp.ts";

const dados = (extra: Partial<Parameters<typeof renderMensagem>[1]> = {}) => ({
  nome: "Marina Lopes",
  valor: "R$ 300,00",
  mes: "junho",
  aulas: "12 aulas",
  ...extra,
});

test("substitui placeholders e usa só o primeiro nome", () => {
  const msg = renderMensagem(TEMPLATE_PADRAO, dados({ dias: "02/06 e 04/06" }));
  assert.ok(msg.includes("Oi Marina!"));
  assert.ok(msg.includes("R$ 300,00"));
  assert.ok(msg.includes("Dias de aula: 02/06 e 04/06"));
  assert.ok(!msg.includes("{")); // nenhum placeholder solto
});

test("dias vazio remove a linha-rótulo pendurada", () => {
  const msg = renderMensagem(TEMPLATE_PADRAO, dados({ dias: "" }));
  assert.ok(!msg.includes("Dias de aula:"));
  assert.ok(!/\n{3,}/.test(msg)); // sem buraco de linhas em branco
  assert.ok(msg.includes("Qualquer coisa me chama"));
});

test("template nulo cai no padrão", () => {
  const msg = renderMensagem(null, dados({ dias: "02/06" }));
  assert.ok(msg.startsWith("Oi Marina!"));
});
