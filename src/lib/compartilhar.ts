// Compartilhamento nativo de imagem (Web Share API nível 2).
// No iPhone/PWA abre a folha do iOS → o usuário escolhe WhatsApp e a IMAGEM
// vai junto. Sem isso, o recibo virava um beco sem saída (PNG cru).

export type ResultadoShare = "compartilhado" | "cancelado" | "erro" | "sem-suporte";

export function podeCompartilharArquivo(file: File): boolean {
  return (
    typeof navigator !== "undefined" &&
    !!navigator.canShare &&
    navigator.canShare({ files: [file] })
  );
}

export async function compartilharImagem(file: File): Promise<ResultadoShare> {
  if (!podeCompartilharArquivo(file)) return "sem-suporte";
  try {
    // iOS + WhatsApp: SÓ files (sem title/text/url), senão prioriza o texto
    // e ignora a imagem.
    await navigator.share({ files: [file] });
    return "compartilhado";
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") return "cancelado";
    return "erro";
  }
}

// Busca o PNG da rota protegida (sessão Supabase) e embrulha num File.
// O File precisa estar pronto ANTES do clique p/ preservar o gesto (iOS).
export async function buscaReciboFile(url: string, nomeArquivo: string): Promise<File> {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error("Não consegui gerar o recibo agora.");
  const blob = await res.blob();
  return new File([blob], nomeArquivo, { type: blob.type || "image/png" });
}
