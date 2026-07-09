// Template de cobrança + link wa.me (§4.3 — sem API oficial na v2.0).

export const TEMPLATE_PADRAO =
  "Oi {nome}! Fechando {mes}: {aulas} no total — {valor}.\n\n" +
  "Dias de aula: {dias}\n\n" +
  "Qualquer coisa me chama. Obrigado! 💪";

// Venda de pacote (alunos por créditos). Fixo na v2.0; configurável depois.
export const TEMPLATE_PACOTE =
  "Oi {nome}! Bora renovar: pacote de {qtd} aulas por {valor}. " +
  "Confirmando, já deixo agendado. 💪";

// Lembrete de cobrança já enviada (follow-up "enviada · 3d"). Tom mais leve
// que a cobrança — reenviar o texto do fechamento soava como spam.
export const TEMPLATE_LEMBRETE =
  "Oi {nome}! Passando pra lembrar do fechamento de {mes} — {valor}.\n\n" +
  "Qualquer coisa me chama 🙏";

export interface DadosMensagem {
  nome: string;
  valor: string; // já formatado em BRL
  mes: string; // "junho"
  aulas: string; // "12 aulas · 1 falta · 2 extras"
  pix?: string; // chave Pix do professor — placeholder {pix}
  dias?: string; // "2, 4, 9 … e 30" — dias de aula no mês, placeholder {dias}
}

export function renderMensagem(template: string | null, dados: DadosMensagem): string {
  const t = template?.trim() ? template : TEMPLATE_PADRAO;
  return (
    t
      .replaceAll("{nome}", primeiroNome(dados.nome))
      .replaceAll("{valor}", dados.valor)
      .replaceAll("{mes}", dados.mes)
      .replaceAll("{aulas}", dados.aulas)
      .replaceAll("{pix}", dados.pix ?? "")
      .replaceAll("{dias}", dados.dias ?? "")
      // Placeholder vazio (ex.: aluno sem dias fixos) deixa "Rótulo:" pendurado —
      // remove a linha-rótulo sem valor e colapsa as quebras que sobraram.
      .replace(/^[^\n]*:[ \t]*$/gm, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}

export function primeiroNome(nome: string): string {
  return nome.trim().split(/\s+/)[0] ?? nome;
}

/**
 * Normaliza telefone BR para o formato do wa.me (dígitos com DDI).
 * "11 98765-4321" → "5511987654321". Retorna null se não parecer telefone.
 */
export function telefoneWa(telefone: string | null): string | null {
  if (!telefone) return null;
  let dig = telefone.replace(/\D/g, "");
  if (dig.startsWith("0")) dig = dig.replace(/^0+/, "");
  if (dig.length === 10 || dig.length === 11) dig = `55${dig}`;
  if (dig.length < 12 || dig.length > 13) return null;
  return dig;
}

export function waLink(telefone: string, mensagem: string): string {
  return `https://wa.me/${telefone}?text=${encodeURIComponent(mensagem)}`;
}
