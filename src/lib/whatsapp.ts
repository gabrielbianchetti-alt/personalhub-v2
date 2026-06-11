// Template de cobrança + link wa.me (§4.3 — sem API oficial na v2.0).

export const TEMPLATE_PADRAO =
  "Oi {nome}! Fechando {mes}: {aulas} no total — {valor}. " +
  "Qualquer coisa me chama. Obrigado! 💪";

// Venda de pacote (alunos por créditos). Fixo na v2.0; configurável depois.
export const TEMPLATE_PACOTE =
  "Oi {nome}! Bora renovar: pacote de {qtd} aulas por {valor}. " +
  "Confirmando, já deixo agendado. 💪";

// Follow-up de cobrança enviada e ainda não paga — o lembrete educado
// que tira do professor o desconforto de cobrar de novo.
export const TEMPLATE_LEMBRETE =
  "Oi {nome}! Passando só pra confirmar o fechamento de {mes} ({valor}). " +
  "Qualquer coisa me fala 👍";

export interface DadosMensagem {
  nome: string;
  valor: string; // já formatado em BRL
  mes: string; // "junho"
  aulas: string; // "12 aulas · 1 falta · 2 extras"
  pix?: string; // chave Pix do professor — placeholder {pix}
}

export function renderMensagem(template: string | null, dados: DadosMensagem): string {
  const t = template?.trim() ? template : TEMPLATE_PADRAO;
  return t
    .replaceAll("{nome}", primeiroNome(dados.nome))
    .replaceAll("{valor}", dados.valor)
    .replaceAll("{mes}", dados.mes)
    .replaceAll("{aulas}", dados.aulas)
    .replaceAll("{pix}", dados.pix ?? "");
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
