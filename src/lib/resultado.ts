// Erro esperado como VALOR de retorno das server actions. Motivo: em produção
// o Next mascara `throw new Error(...)` de Server Action (vira parágrafo
// genérico em inglês) — nenhuma mensagem pt-BR chegava ao professor.
// As actions continuam lançando internamente; `executa` converte na borda.

export type Resultado = { ok: true } | { ok: false; erro: string };

export async function executa(fn: () => Promise<void>): Promise<Resultado> {
  try {
    await fn();
    return { ok: true };
  } catch (e) {
    // redirect()/notFound() do Next viajam como exceção — deixa passar.
    if (
      e &&
      typeof e === "object" &&
      "digest" in e &&
      String((e as { digest: unknown }).digest).startsWith("NEXT_")
    )
      throw e;
    return {
      ok: false,
      erro: e instanceof Error ? e.message : "Não salvou — tente de novo.",
    };
  }
}
