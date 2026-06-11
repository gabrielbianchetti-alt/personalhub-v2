// Pix "copia e cola" (BR Code EMV estático, padrão BACEN) com valor embutido.
// Sem integração nem webhook — é texto puro anexado à mensagem de cobrança.

const GUI = "br.gov.bcb.pix";

/** CRC16-CCITT (FALSE): poly 0x1021, init 0xFFFF — exigido pelo padrão EMV. */
export function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let b = 0; b < 8; b++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/** Campo TLV: id (2) + tamanho (2) + valor. */
function campo(id: string, valor: string): string {
  return `${id}${String(valor.length).padStart(2, "0")}${valor}`;
}

/** Nome/cidade EMV: sem acento, maiúsculas, só [A-Z0-9 ], limitado. */
export function sanitizaEmv(texto: string, max: number): string {
  return texto
    .normalize("NFD")
    // combinantes de acento (faixa U+0300–U+036F)
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase()
    .slice(0, max)
    .trim();
}

export interface DadosPix {
  chave: string;
  nome: string; // do professor — vira o "merchant name"
  valor?: number; // embutido no código; omitido se ausente/zero
  cidade?: string;
  txid?: string;
}

export function pixCopiaECola({
  chave,
  nome,
  valor,
  cidade = "BRASIL",
  txid = "***",
}: DadosPix): string {
  const conta = campo("00", GUI) + campo("01", chave.trim());
  const corpo =
    campo("00", "01") + // payload format
    campo("26", conta) + // merchant account (Pix)
    campo("52", "0000") + // MCC
    campo("53", "986") + // BRL
    (valor && valor > 0 ? campo("54", valor.toFixed(2)) : "") +
    campo("58", "BR") +
    campo("59", sanitizaEmv(nome, 25) || "PERSONALHUB") +
    campo("60", sanitizaEmv(cidade, 15) || "BRASIL") +
    campo("62", campo("05", txid)) +
    "6304"; // CRC entra no cálculo com o próprio cabeçalho
  return corpo + crc16(corpo);
}
