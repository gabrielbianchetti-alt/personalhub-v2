// Parse/format de dinheiro digitado (pt-BR) — fonte única, usada pelo client
// (PacoteSheet, formulários) e pelas actions. Lição do bug "600.50 → 60.050":
// ponto pode ser decimal OU milhar; a regra precisa viver num lugar só, testada.

/**
 * "300" | "300,50" | "1.500" | "R$ 80" | "600.50" → número em reais.
 * Com vírgula, ela é o decimal e pontos são milhar ("1.234,56").
 * Sem vírgula, ponto só é milhar se formar grupos de 3 ("1.500");
 * senão é decimal ("600.50" — teclado numérico de iPhone/Android mostra ponto).
 * Inválido/negativo → null.
 */
export function parseValorBR(v: string): number | null {
  let s = v.trim().replace(/[R$\s]/g, "");
  if (!s) return null;
  if (s.includes(",")) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (/^\d{1,3}(?:\.\d{3})+$/.test(s)) {
    s = s.replace(/\./g, ""); // "1.500" = mil e quinhentos
  }
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** Número → texto de input ("600,5" → "600,50" fica a cargo de quem exibe BRL). */
export function valorParaInput(v: number | null | undefined): string {
  if (v === null || v === undefined) return "";
  return String(v).replace(".", ",");
}
