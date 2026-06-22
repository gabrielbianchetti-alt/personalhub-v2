// Testes do view-model do Hoje: pendências (janela 7 dias) e montagem do dia.
// Junho/2026 começa numa segunda: 06-01 seg … 06-04 qui.

import { test } from "node:test";
import assert from "node:assert/strict";

import { montaPendencias, montaAlunosHoje } from "../src/lib/hoje.ts";

const PROF_DESDE = "2026-01-01";
const alunoP = (id: string, dias: number[]) => ({
  id,
  nome: id,
  dias_semana: dias,
  created_at: "2026-01-01T00:00:00Z",
});

test("pendência: dia esperado e NÃO confirmado aparece (regressão do furo de fechamento)", () => {
  // Mesmo que já exista uma falta avulsa marcada nesse dia, ele só sai da
  // pergunta via dias_resolvidos — senão os outros faltantes virariam presentes.
  const p = montaPendencias({
    hojeIso: "2026-06-04", // quinta
    ativos: [alunoP("Joao", [1, 3])], // seg + qua
    diasResolvidos: [],
    professorDesdeIso: PROF_DESDE,
  });
  assert.ok(p.some((x) => x.dataIso === "2026-06-03")); // quarta = esperado, pendente
});

test("pendência: dia confirmado (dias_resolvidos) não reaparece", () => {
  const p = montaPendencias({
    hojeIso: "2026-06-04",
    ativos: [alunoP("Joao", [1, 3])],
    diasResolvidos: ["2026-06-03"],
    professorDesdeIso: PROF_DESDE,
  });
  assert.ok(!p.some((x) => x.dataIso === "2026-06-03"));
});

test("pendência: não pergunta de dias anteriores ao início do professor", () => {
  const p = montaPendencias({
    hojeIso: "2026-06-04",
    ativos: [alunoP("Joao", [1, 3])],
    diasResolvidos: [],
    professorDesdeIso: "2026-06-04", // começou hoje
  });
  assert.equal(p.length, 0);
});

test("montaAlunosHoje: esperado com falta + avulso com extra", () => {
  const lista = montaAlunosHoje(
    [
      { id: "A", nome: "Ana", horario: "07:00", horarios: {}, dias_semana: [4] },
      { id: "B", nome: "Bia", horario: "", horarios: {}, dias_semana: [1] },
    ],
    [
      { aluno_id: "A", tipo: "falta" as const, quantidade: 1 },
      { aluno_id: "B", tipo: "extra" as const, quantidade: 1 },
    ],
    4, // quinta
  );
  assert.equal(lista.find((x) => x.id === "A")?.faltou, true);
  const b = lista.find((x) => x.id === "B");
  assert.equal(b?.avulso, true);
  assert.equal(b?.extras, 1);
});

test("montaAlunosHoje: aula de pacote vira card de pacote com id do registro", () => {
  const lista = montaAlunosHoje(
    [{ id: "C", nome: "Gina", horario: "", horarios: {}, dias_semana: [] }],
    [],
    4,
    [{ id: "reg1", aluno_id: "C", horario: "18:00" }],
  );
  const c = lista.find((x) => x.id === "C");
  assert.equal(c?.pacote, true);
  assert.equal(c?.pacoteRegistroId, "reg1");
});
