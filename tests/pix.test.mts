// Testes do BR Code Pix. O CRC é validado por uma implementação ESPELHO
// independente (por tabela, diferente da bitwise da lib) e a estrutura TLV
// é percorrida campo a campo.

import { test } from "node:test";
import assert from "node:assert/strict";

import { pixCopiaECola, crc16, sanitizaEmv } from "../src/lib/pix.ts";

// ── espelho independente do CRC16-CCITT (por tabela) ───────────────
const TABELA: number[] = [];
for (let i = 0; i < 256; i++) {
  let c = i << 8;
  for (let b = 0; b < 8; b++) c = c & 0x8000 ? ((c << 1) ^ 0x1021) & 0xffff : (c << 1) & 0xffff;
  TABELA.push(c);
}
function crcEspelho(s: string): string {
  let crc = 0xffff;
  for (let i = 0; i < s.length; i++) {
    crc = ((crc << 8) & 0xffff) ^ TABELA[((crc >> 8) ^ s.charCodeAt(i)) & 0xff];
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/** Percorre o payload TLV e devolve um mapa id → valor (raso). */
function parseTlv(payload: string): Map<string, string> {
  const out = new Map<string, string>();
  let i = 0;
  while (i < payload.length) {
    const id = payload.slice(i, i + 2);
    const len = Number(payload.slice(i + 2, i + 4));
    assert.ok(Number.isInteger(len) && len >= 0, `tamanho inválido em ${id}`);
    const valor = payload.slice(i + 4, i + 4 + len);
    assert.equal(valor.length, len, `campo ${id} truncado`);
    out.set(id, valor);
    i += 4 + len;
  }
  assert.equal(i, payload.length, "sobra de bytes no payload");
  return out;
}

test("crc16 bate com a implementação espelho", () => {
  for (const s of ["000201", "12345", "br.gov.bcb.pix", "A", ""]) {
    assert.equal(crc16(s), crcEspelho(s));
  }
});

test("payload estático com valor: estrutura TLV íntegra", () => {
  const p = pixCopiaECola({
    chave: "11987654321",
    nome: "João D'Ávila",
    valor: 300,
  });
  assert.ok(p.startsWith("000201"));
  // CRC confere (calculado sobre tudo até '6304', inclusive).
  const corpo = p.slice(0, -4);
  assert.ok(corpo.endsWith("6304"));
  assert.equal(p.slice(-4), crcEspelho(corpo));

  const tlv = parseTlv(p);
  assert.equal(tlv.get("00"), "01");
  assert.equal(tlv.get("52"), "0000");
  assert.equal(tlv.get("53"), "986");
  assert.equal(tlv.get("54"), "300.00");
  assert.equal(tlv.get("58"), "BR");
  assert.equal(tlv.get("59"), "JOAO D AVILA"); // sanitizado
  assert.equal(tlv.get("60"), "BRASIL");

  const conta = parseTlv(tlv.get("26")!);
  assert.equal(conta.get("00"), "br.gov.bcb.pix");
  assert.equal(conta.get("01"), "11987654321");
  const adicional = parseTlv(tlv.get("62")!);
  assert.equal(adicional.get("05"), "***");
});

test("sem valor (ou zero) o campo 54 não entra", () => {
  const p = pixCopiaECola({ chave: "a@b.com", nome: "Ana" });
  assert.ok(!parseTlv(p).has("54"));
  const z = pixCopiaECola({ chave: "a@b.com", nome: "Ana", valor: 0 });
  assert.ok(!parseTlv(z).has("54"));
});

test("centavos e chaves longas", () => {
  const p = pixCopiaECola({
    chave: "f0e1d2c3-b4a5-9687-7869-5a4b3c2d1e0f",
    nome: "Um Nome Exageradamente Comprido Para Caber",
    valor: 1234.5,
  });
  const tlv = parseTlv(p);
  assert.equal(tlv.get("54"), "1234.50");
  assert.ok(tlv.get("59")!.length <= 25);
  assert.equal(p.slice(-4), crcEspelho(p.slice(0, -4)));
});

test("sanitizaEmv remove acento/símbolo, limita e cai no fallback", () => {
  assert.equal(sanitizaEmv("João D'Ávila", 25), "JOAO D AVILA");
  assert.equal(sanitizaEmv("  ", 25), "");
  assert.equal(sanitizaEmv("ção-ção!", 15), "CAO CAO");
  const p = pixCopiaECola({ chave: "x", nome: "!!!" });
  assert.equal(parseTlv(p).get("59"), "PERSONALHUB");
});
