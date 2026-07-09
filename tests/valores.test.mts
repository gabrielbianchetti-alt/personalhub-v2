import test from "node:test";
import assert from "node:assert/strict";

import { parseValorBR, valorParaInput } from "../src/lib/valores.ts";

test("parseValorBR: formatos brasileiros comuns", () => {
  assert.equal(parseValorBR("300"), 300);
  assert.equal(parseValorBR("300,50"), 300.5);
  assert.equal(parseValorBR("R$ 80"), 80);
  assert.equal(parseValorBR("1.500"), 1500); // milhar
  assert.equal(parseValorBR("1.234,56"), 1234.56); // milhar + decimal
  assert.equal(parseValorBR(" 45,00 "), 45);
});

test("parseValorBR: ponto decimal do teclado numérico NÃO vira milhar", () => {
  // O bug: "600.50" era lido como 60.050 (100x). Ponto com 2 casas é decimal.
  assert.equal(parseValorBR("600.50"), 600.5);
  assert.equal(parseValorBR("80.5"), 80.5);
  // Grupos de 3 continuam milhar.
  assert.equal(parseValorBR("12.500"), 12500);
});

test("parseValorBR: inválidos viram null", () => {
  assert.equal(parseValorBR(""), null);
  assert.equal(parseValorBR("   "), null);
  assert.equal(parseValorBR("abc"), null);
  assert.equal(parseValorBR("-50"), null);
  assert.equal(parseValorBR("12.34.56"), null);
});

test("valorParaInput: inverso para preencher formulário", () => {
  assert.equal(valorParaInput(600.5), "600,5");
  assert.equal(valorParaInput(300), "300");
  assert.equal(valorParaInput(null), "");
  assert.equal(valorParaInput(undefined), "");
});
