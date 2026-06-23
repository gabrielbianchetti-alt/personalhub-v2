// Suíte do motor de contagem (herdeira da verificação de 2880 casos da v1).
// Roda direto nos .ts com o type stripping nativo do Node 24:
//   npm test  →  node --test tests/
//
// Estratégia: um ORÁCULO independente (conta dia a dia com Date puro, código
// que não compartilha nada com o motor) + casos literais conferíveis à mão
// + matriz de combinações para a fórmula do fechamento.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  ocorrenciasNoMes,
  ocorrenciasAteDia,
  contagemMes,
  agregaExcecoes,
  resumoContagem,
  saldoCreditos,
  precoDoDia,
  valorPorAulaDetalhado,
} from "../src/lib/aulas.ts";
import {
  addDias,
  diffDias,
  dowDeIso,
  dataPorExtenso,
  dataCurta,
  mesRefIso,
  horarioCurto,
  agoraSP,
} from "../src/lib/datas.ts";
import {
  renderMensagem,
  telefoneWa,
  waLink,
  TEMPLATE_PADRAO,
} from "../src/lib/whatsapp.ts";

// ── Oráculo independente ────────────────────────────────────────────
function oraculoOcorrencias(diasSemana: number[], year: number, month0: number): number[] {
  const out: number[] = [];
  for (let d = 1; d <= 31; d++) {
    const dt = new Date(Date.UTC(year, month0, d, 12));
    if (dt.getUTCMonth() !== month0) break; // estourou o mês
    if (diasSemana.includes(dt.getUTCDay())) out.push(d);
  }
  return out;
}

const MESES: Array<[number, number]> = [
  ...Array.from({ length: 12 }, (_, m) => [2026, m] as [number, number]),
  [2024, 1], // fevereiro bissexto
  [2025, 1],
  [2025, 11],
  [2028, 1], // bissexto futuro
];

const DIAS_SETS: number[][] = [
  [],
  [1],
  [0],
  [6],
  [1, 3, 5],
  [2, 4],
  [1, 2, 3, 4, 5],
  [0, 1, 2, 3, 4, 5, 6],
  [3, 6],
];

test("ocorrenciasNoMes bate com o oráculo em toda a matriz", () => {
  let casos = 0;
  for (const [year, month] of MESES) {
    for (const dias of DIAS_SETS) {
      const motor = ocorrenciasNoMes(dias, year, month);
      const oraculo = oraculoOcorrencias(dias, year, month);
      assert.deepEqual(motor, oraculo, `(${year}-${month + 1}) dias=${dias}`);
      casos++;
    }
  }
  assert.equal(casos, MESES.length * DIAS_SETS.length);
});

test("casos literais conferidos à mão", () => {
  // Fev/2026: 28 dias começando num domingo → cada dia da semana cai 4x.
  assert.equal(ocorrenciasNoMes([1, 3, 5], 2026, 1).length, 12);
  assert.equal(ocorrenciasNoMes([0], 2026, 1).length, 4);
  // Jun/2026: 30 dias começando numa segunda → seg e ter caem 5x.
  assert.equal(ocorrenciasNoMes([1], 2026, 5).length, 5);
  assert.equal(ocorrenciasNoMes([2], 2026, 5).length, 5);
  assert.equal(ocorrenciasNoMes([5], 2026, 5).length, 4);
  assert.equal(ocorrenciasNoMes([1, 3, 5], 2026, 5).length, 13);
  // Fev/2024 bissexto: 29 dias começando numa quinta → só qui cai 5x.
  assert.equal(ocorrenciasNoMes([4], 2024, 1).length, 5);
  assert.equal(ocorrenciasNoMes([3], 2024, 1).length, 4);
  // Dias exatos: seg/qua/sex de jun/2026.
  assert.deepEqual(
    ocorrenciasNoMes([1, 3, 5], 2026, 5).slice(0, 6),
    [1, 3, 5, 8, 10, 12],
  );
});

test("ocorrenciasAteDia é o prefixo correto", () => {
  for (const [year, month] of MESES) {
    for (const dias of DIAS_SETS) {
      for (const ate of [1, 10, 15, 28]) {
        const motor = ocorrenciasAteDia(dias, year, month, ate);
        const oraculo = oraculoOcorrencias(dias, year, month).filter((d) => d <= ate);
        assert.deepEqual(motor, oraculo);
      }
    }
  }
});

test("contagemMes: fórmula realizadas = esperadas − faltas − desmarcadas + extras + ajuste (≥0)", () => {
  let casos = 0;
  for (const [year, month] of MESES) {
    for (const dias of DIAS_SETS) {
      const esperadas = oraculoOcorrencias(dias, year, month).length;
      for (const faltas of [0, 1, 2])
        for (const extras of [0, 1, 2])
          for (const desmarcadas of [0, 1])
            for (const ajuste of [-2, 0, 3]) {
              const c = contagemMes(dias, year, month, { faltas, extras, desmarcadas }, ajuste);
              assert.equal(c.esperadas, esperadas);
              assert.equal(
                c.realizadas,
                Math.max(0, esperadas - faltas - desmarcadas + extras + ajuste),
              );
              casos++;
            }
    }
  }
  // Garantia de volume: a matriz cobre milhares de combinações.
  assert.ok(casos >= 7000, `só ${casos} casos`);
});

test("agregaExcecoes soma quantidades por tipo", () => {
  const agg = agregaExcecoes([
    { tipo: "falta", quantidade: 1 },
    { tipo: "extra", quantidade: 2 },
    { tipo: "extra", quantidade: 1 },
    { tipo: "desmarcada", quantidade: 1 },
  ]);
  assert.deepEqual(agg, { faltas: 1, extras: 3, desmarcadas: 1 });
});

test("resumoContagem legível", () => {
  assert.equal(
    resumoContagem({ esperadas: 13, realizadas: 12 }, { faltas: 1, extras: 0, desmarcadas: 0 }),
    "12 aulas · 1 falta",
  );
  assert.equal(
    resumoContagem({ esperadas: 13, realizadas: 14 }, { faltas: 1, extras: 2, desmarcadas: 0 }),
    "14 aulas · 1 falta · 2 extras",
  );
  assert.equal(
    resumoContagem({ esperadas: 4, realizadas: 1 }, { faltas: 0, extras: 0, desmarcadas: 0 }, -3),
    "1 aula · ajuste -3",
  );
});

// ── saldoCreditos: cenários conferidos à mão ────────────────────────
test("saldoCreditos debita aulas presumidas, faltas e extras", () => {
  const base = {
    qtdCompradas: 10,
    diasSemana: [1, 3, 5], // seg/qua/sex
    compraIso: "2026-05-31", // domingo
    hojeIso: "2026-06-14",
  };
  // Jun/2026 (começa segunda): 1,3,5,8,10,12 ≤ 14 → 6 presumidas.
  assert.equal(saldoCreditos({ ...base, registros: [] }), 4);
  // 1 falta devolve 1 crédito.
  assert.equal(
    saldoCreditos({
      ...base,
      registros: [{ tipo: "falta", quantidade: 1, data: "2026-06-03" }],
    }),
    5,
  );
  // 2 extras debitam 2 a mais.
  assert.equal(
    saldoCreditos({
      ...base,
      registros: [{ tipo: "extra", quantidade: 2, data: "2026-06-06" }],
    }),
    2,
  );
  // Registro fora do período (antes da compra) é ignorado.
  assert.equal(
    saldoCreditos({
      ...base,
      registros: [{ tipo: "extra", quantidade: 5, data: "2026-05-20" }],
    }),
    4,
  );
});

test("saldoCreditos atravessa meses e respeita compra no meio do mês", () => {
  // Compra qui 2026-05-28; mai 29..31: sex 29 → 1; jun 1..3: seg 1, qua 3 → 2.
  assert.equal(
    saldoCreditos({
      qtdCompradas: 8,
      diasSemana: [1, 3, 5],
      compraIso: "2026-05-28",
      hojeIso: "2026-06-03",
      registros: [],
    }),
    5,
  );
  // Compra sex 2026-06-05: conta de 6 em diante → 8, 10, 12 ≤ 14 → 3.
  assert.equal(
    saldoCreditos({
      qtdCompradas: 10,
      diasSemana: [1, 3, 5],
      compraIso: "2026-06-05",
      hojeIso: "2026-06-14",
      registros: [],
    }),
    7,
  );
});

// ── datas ───────────────────────────────────────────────────────────
test("addDias atravessa mês, ano e fevereiro bissexto", () => {
  assert.equal(addDias("2026-12-31", 1), "2027-01-01");
  assert.equal(addDias("2024-02-28", 1), "2024-02-29");
  assert.equal(addDias("2025-02-28", 1), "2025-03-01");
  assert.equal(addDias("2026-06-11", -11), "2026-05-31");
  assert.equal(addDias("2026-01-01", -1), "2025-12-31");
});

test("diffDias atravessa mês e ano", () => {
  assert.equal(diffDias("2026-06-08", "2026-06-11"), 3);
  assert.equal(diffDias("2026-06-11", "2026-06-11"), 0);
  assert.equal(diffDias("2026-05-30", "2026-06-02"), 3);
  assert.equal(diffDias("2025-12-31", "2026-01-01"), 1);
  assert.equal(diffDias("2026-06-11", "2026-06-08"), -3);
});

test("dowDeIso em datas conhecidas", () => {
  assert.equal(dowDeIso("2026-01-01"), 4); // quinta
  assert.equal(dowDeIso("2026-06-01"), 1); // segunda
  assert.equal(dowDeIso("2024-02-29"), 4); // quinta
  assert.equal(dowDeIso("2026-02-01"), 0); // domingo
});

test("rótulos PT-BR independem de fuso/locale", () => {
  assert.equal(dataPorExtenso("2026-06-10"), "Quarta, 10 de junho");
  assert.equal(dataCurta("2026-06-09"), "ter, 9 de junho");
  assert.equal(mesRefIso(2026, 5), "2026-06-01");
  assert.equal(horarioCurto("06:30:00"), "06:30");
  assert.equal(horarioCurto(null), "");
});

test("agoraSP devolve data coerente em São Paulo", () => {
  // 2026-06-11T02:30Z = 23:30 de 10/jun em SP (UTC−3): o dia NÃO pode virar.
  const sp = agoraSP(new Date("2026-06-11T02:30:00Z"));
  assert.equal(sp.iso, "2026-06-10");
  assert.equal(sp.hour, 23);
  assert.equal(sp.minute, 30);
  assert.equal(sp.dow, 3); // quarta
  // Meio-dia UTC → 9h em SP, mesmo dia.
  const meio = agoraSP(new Date("2026-06-11T12:00:00Z"));
  assert.equal(meio.iso, "2026-06-11");
  assert.equal(meio.hour, 9);
});

// ── whatsapp ────────────────────────────────────────────────────────
test("telefoneWa normaliza formatos brasileiros", () => {
  assert.equal(telefoneWa("11 98765-4321"), "5511987654321");
  assert.equal(telefoneWa("(11) 8765-4321"), "551187654321");
  assert.equal(telefoneWa("+55 11 98765-4321"), "5511987654321");
  assert.equal(telefoneWa("011 98765 4321"), "5511987654321");
  assert.equal(telefoneWa("123"), null);
  assert.equal(telefoneWa(null), null);
  assert.equal(telefoneWa(""), null);
});

test("renderMensagem preenche placeholders e usa primeiro nome", () => {
  const msg = renderMensagem("Oi {nome}, {mes}: {aulas} = {valor}", {
    nome: "Marina Lopes",
    valor: "R$ 300,00",
    mes: "junho",
    aulas: "12 aulas · 1 falta",
  });
  assert.equal(msg, "Oi Marina, junho: 12 aulas · 1 falta = R$ 300,00");
  // Template vazio/null cai no padrão.
  const padrao = renderMensagem(null, {
    nome: "Marina",
    valor: "R$ 300,00",
    mes: "junho",
    aulas: "12 aulas",
  });
  assert.ok(padrao.includes("Marina"));
  assert.ok(TEMPLATE_PADRAO.includes("{nome}"));
});

test("waLink codifica a mensagem", () => {
  const link = waLink("5511987654321", "Oi! Fechando junho: R$ 300,00");
  assert.ok(link.startsWith("https://wa.me/5511987654321?text="));
  assert.ok(!link.includes(" "));
  assert.ok(decodeURIComponent(link.split("text=")[1]).includes("R$ 300,00"));
});

// ── Aula em dupla/trio: preço por dia (por_aula) ────────────────────────────
// Junho/2026 (month0=5): seg = 1,8,15,22,29 (5×) · qua = 3,10,17,24 (4×).

test("precoDoDia: solo, dupla, trio e fallback no solo", () => {
  assert.equal(precoDoDia(undefined, 80, 50, 40), 80); // sem turma = solo
  assert.equal(precoDoDia({ tipo: "dupla" }, 80, 50, 40), 50);
  assert.equal(precoDoDia({ tipo: "trio" }, 80, 50, 40), 40);
  assert.equal(precoDoDia({ tipo: "dupla" }, 80, null, null), 80); // sem valor = solo
});

test("valorPorAulaDetalhado: sem turmas = realizadas × solo (generalização)", () => {
  const r = valorPorAulaDetalhado({
    diasSemana: [1], // seg, 5× em junho
    turmas: {},
    valorSolo: 80,
    valorDupla: null,
    valorTrio: null,
    year: 2026,
    month0: 5,
    faltasIso: [],
    extras: [],
  });
  assert.equal(r.realizadas, 5);
  assert.equal(r.valor, 400);
});

test("valorPorAulaDetalhado: seg solo (80) + qua dupla (50)", () => {
  const r = valorPorAulaDetalhado({
    diasSemana: [1, 3],
    turmas: { "3": { tipo: "dupla", nome: "Carlos" } },
    valorSolo: 80,
    valorDupla: 50,
    valorTrio: null,
    year: 2026,
    month0: 5,
    faltasIso: [],
    extras: [],
  });
  assert.equal(r.realizadas, 9); // 5 seg + 4 qua
  assert.equal(r.valor, 5 * 80 + 4 * 50); // 400 + 200 = 600
});

test("valorPorAulaDetalhado: falta numa qua-dupla desconta o preço DAQUELE dia", () => {
  const r = valorPorAulaDetalhado({
    diasSemana: [1, 3],
    turmas: { "3": { tipo: "dupla" } },
    valorSolo: 80,
    valorDupla: 50,
    valorTrio: null,
    year: 2026,
    month0: 5,
    faltasIso: ["2026-06-10"], // uma quarta
    extras: [],
  });
  assert.equal(r.realizadas, 8);
  assert.equal(r.valor, 600 - 50); // tira 50 (preço da dupla), não 80
});

test("valorPorAulaDetalhado: extra com valor próprio + ajuste no solo", () => {
  const r = valorPorAulaDetalhado({
    diasSemana: [1],
    turmas: {},
    valorSolo: 80,
    valorDupla: 50,
    valorTrio: null,
    year: 2026,
    month0: 5,
    faltasIso: [],
    extras: [{ valor: 50 }, { valor: null }], // 1 dupla avulsa + 1 extra solo
    ajuste: 1,
  });
  // 5×80 (seg) + 50 (extra dupla) + 80 (extra solo) + 1×80 (ajuste) = 400+50+80+80
  assert.equal(r.valor, 610);
  assert.equal(r.realizadas, 5 + 2 + 1);
});
