/**
 * Traduz erros da API de negociação (códigos + mensagens técnicas) em
 * mensagens claras para o utilizador, em pt-MZ, com orientação de acção.
 * Puro e testado em apps/web/tests/negotiation-error.test.ts.
 */

const RULES: { match: RegExp; message: string }[] = [
  {
    match: /CONTACT_SHARING_BLOCKED|an[oó]nima|contactos?\s*(directos|pessoais)?/i,
    message:
      "Mensagem bloqueada: parece conter um contacto (telefone, email ou link). A negociação é anónima até à adjudicação — remove os contactos e tenta de novo.",
  },
  {
    match: /THREAD_CLOSED|negocia[çc][aã]o encerrada/i,
    message: "Esta negociação já foi encerrada — já não é possível enviar mensagens.",
  },
  {
    match: /OWN_OFFER|pr[óo]pria contraproposta/i,
    message: "Não podes responder à tua própria contraproposta — aguarda a resposta do outro lado.",
  },
  {
    match: /OFFER_ALREADY_ANSWERED|j[áa] foi respondida/i,
    message: "Esta contraproposta já foi respondida. Actualiza a conversa para ver o estado actual.",
  },
  {
    match: /PROPOSAL_NOT_NEGOTIABLE|contra-negociada|negoci[aá]vel/i,
    message: "Esta proposta já não está disponível para negociação (foi adjudicada, recusada ou retirada).",
  },
  {
    match: /OFFER_WITHOUT_PRICE|sem valor/i,
    message: "Esta contraproposta não tem valor — combine os termos por mensagem antes de aceitar.",
  },
  {
    match: /RATE_LIMIT|demasiados? pedidos|aguarda/i,
    message: "Estás a enviar depressa demais. Aguarda uns segundos e tenta de novo.",
  },
  {
    match: /timeout/i,
    message: "O pedido está a demorar mais do que o esperado. Tenta novamente.",
  },
  {
    match: /UNAUTHORIZED|sess[ãa]o/i,
    message: "A tua sessão expirou. Inicia sessão de novo para continuar a negociar.",
  },
  {
    match: /FORBIDDEN|permiss[aã]o/i,
    message: "Não tens permissão para esta acção na negociação.",
  },
];

/** Mensagem de API em bruto → mensagem clara para o utilizador. */
export function toUserNegotiationError(raw: unknown): string {
  const text = raw instanceof Error ? raw.message : String(raw ?? "");
  for (const rule of RULES) {
    if (rule.match.test(text)) return rule.message;
  }
  const clean = text.replace(/^Error:\s*/, "").trim();
  if (!clean) return "Falha na negociação. Tenta novamente.";
  return clean.length > 220 ? "Falha na negociação. Tenta novamente." : clean;
}
