// ── Registo de templates de mensagem ───────────────────────────────
// Um só sítio para saber QUE template usar em cada envio — sem adivinhar.
// WhatsApp: templates aprovados no Zernio (nome exacto + parâmetros).
// Email: subjects/HTML vivem no código indicado (função ou builder inline).

export type TemplateChannel = "whatsapp" | "email" | "sms";

export interface MessageTemplate {
  /** Nome exacto do template (Zernio) ou chave lógica (email). */
  key: string;
  channel: TemplateChannel;
  /** Descrição curta: quando usar. */
  description: string;
  /** Parâmetros por ordem ({{1}}, {{2}} …) ou variáveis do builder. */
  params: string[];
  /** Env que troca o nome sem mexer no código (só WhatsApp). */
  envOverride?: string;
  /** Onde é usado (ficheiros). */
  usedIn: string[];
}

export const WHATSAPP_TEMPLATES: MessageTemplate[] = [
  {
    key: "workdeal_introduction",
    channel: "whatsapp",
    description: "Apresentação do Workdeal — enviada SEMPRE primeiro, seguida do onboarding_request (par). Não recebe parâmetros.",
    params: [],
    envOverride: "WHATSAPP_INTRODUCTION_TEMPLATE",
    usedIn: ["services/pre-register-notifications.service.ts (sendWhatsApp, 1º do par)"],
  },
  {
    key: "onboarding_request",
    channel: "whatsapp",
    description: "Convite para completar o registo após o pré-registo. Enviada SEMPRE depois do workdeal_introduction.",
    params: ["{{1}} nome da empresa", "{{2}} link de conclusão"],
    envOverride: "WHATSAPP_PREREGISTER_TEMPLATE",
    usedIn: ["services/pre-register-notifications.service.ts (sendWhatsApp, 2º do par)"],
  },
  {
    key: "quote_request",
    channel: "whatsapp",
    description: "Avisa a empresa que recebeu um pedido de cotação.",
    params: ["{{1}} nome da empresa que recebe", "{{2}} nome do serviço"],
    envOverride: "WHATSAPP_QUOTE_TEMPLATE",
    usedIn: ["shared/lib/email-templates.ts (quoteReceivedHtml) + quotes.service.ts"],
  },
  {
    key: "tasks_cta",
    channel: "whatsapp",
    description: "Chamada às empresas para publicarem/verem requisições (disparo em massa).",
    params: ["{{1}} nome da empresa"],
    envOverride: "WHATSAPP_TASKS_CTA_TEMPLATE",
    usedIn: ["packages/db/src/send-tasks-cta.ts"],
  },
  {
    key: "new_tenders",
    channel: "whatsapp",
    description: "Convida empresas sobre concursos públicos (disparo em massa). NOTA: params assumidos {{1}} = nome da empresa — confirmar contra o template aprovado no Zernio.",
    params: ["{{1}} nome da empresa"],
    envOverride: "WHATSAPP_NEW_TENDERS_TEMPLATE",
    usedIn: ["packages/db/src/send-new-tenders.ts"],
  },
];

export const EMAIL_TEMPLATES: MessageTemplate[] = [
  {
    key: "otp",
    channel: "email",
    description: "Código de verificação de contacto (6 dígitos).",
    params: ["to", "code", "brandName?"],
    usedIn: ["services/email.service.ts (sendOtpEmail)"],
  },
  {
    key: "contact",
    channel: "email",
    description: "Relay de contacto entre utilizadores via perfil (com replyTo).",
    params: ["to", "fromName", "fromEmail", "message", "profileName?"],
    usedIn: ["services/email.service.ts (sendContactEmail)"],
  },
  {
    key: "welcome_account",
    channel: "email",
    description: "Boas-vindas após criar conta.",
    params: ["to", "name", "ctaUrl?"],
    usedIn: ["services/email.service.ts (sendWelcomeAccountEmail)"],
  },
  {
    key: "welcome_company",
    channel: "email",
    description: "Boas-vindas após publicar o perfil da empresa.",
    params: ["to", "name", "companyName", "profileSlug?", "profileId?"],
    usedIn: ["services/email.service.ts (sendWelcomeCompanyEmail)"],
  },
  {
    key: "reset_password",
    channel: "email",
    description: "Link para redefinir palavra-passe.",
    params: ["to", "name?", "resetUrl"],
    usedIn: ["services/email.service.ts (sendResetPasswordEmail)"],
  },
  {
    key: "subscription_invoice",
    channel: "email",
    description: "Factura de subscrição (emitente Codebaz SU, Lda).",
    params: ["to", "invoiceNumber", "planName", "…"],
    usedIn: ["services/email.service.ts (sendSubscriptionInvoiceEmail)"],
  },
  {
    key: "subscription_receipt",
    channel: "email",
    description: "Recibo após validação do pagamento.",
    params: ["to", "receiptNumber", "…"],
    usedIn: ["services/email.service.ts (sendSubscriptionReceiptEmail)"],
  },
  {
    key: "subscription_notice",
    channel: "email",
    description: "Aviso administrativo (ex: pagamento por confirmar).",
    params: ["to", "subject", "customerName", "planName", "amount", "message"],
    usedIn: ["services/email.service.ts (sendSubscriptionNoticeEmail)", "services/billing.service.ts (notifyCompanyAsAdmin)"],
  },
  {
    key: "pre_register_company",
    channel: "email",
    description: "Convite para completar o registo após o pré-registo.",
    params: ["to", "companyName", "contactName", "completionUrl"],
    usedIn: ["services/pre-register-notifications.service.ts (sendEmail, 2º do par)"],
  },
  {
    key: "workdeal_introduction",
    channel: "email",
    description: "Apresentação do Workdeal — enviada SEMPRE primeiro, seguida do convite (par).",
    params: ["to", "companyName?", "contactName?", "ctaUrl?"],
    usedIn: ["services/pre-register-notifications.service.ts (sendEmail, 1º do par)"],
  },
  {
    key: "verification_requested",
    channel: "email",
    description: "Pedido de verificação recebido (SLA 24–48h).",
    params: ["to", "companyName", "level", "url"],
    usedIn: ["shared/lib/email-templates.ts (verificationRequestedHtml) + verifications.service.ts"],
  },
  {
    key: "verification_decision",
    channel: "email",
    description: "Decisão do pedido: empresa verificada ou não aprovada (+motivo).",
    params: ["to", "approved", "companyName", "level", "reviewNote?", "url"],
    usedIn: ["shared/lib/email-templates.ts (verificationDecisionHtml) + verifications.service.ts"],
  },
  {
    key: "negotiation_message",
    channel: "email",
    description: "Nova mensagem/contraproposta na negociação.",
    params: ["to", "senderName", "preview", "url"],
    usedIn: ["shared/lib/email-templates.ts (negotiationMessageHtml) + negotiation-notifications.service.ts"],
  },
  {
    key: "negotiation_offer",
    channel: "email",
    description: "Contraproposta aceite/recusada.",
    params: ["to", "terms", "decision", "url"],
    usedIn: ["shared/lib/email-templates.ts (negotiationOfferHtml) + negotiation-notifications.service.ts"],
  },
  {
    key: "proposal_received",
    channel: "email",
    description: "Solicitante recebe nova proposta numa tarefa.",
    params: ["to", "taskTitle", "url"],
    usedIn: ["shared/lib/email-templates.ts (proposalReceivedHtml) + tasks.service.ts"],
  },
  {
    key: "bid_awarded",
    channel: "email",
    description: "Fornecedor vence adjudicação.",
    params: ["to", "taskTitle", "price", "url"],
    usedIn: ["shared/lib/email-templates.ts (bidAwardedHtml) + tasks.service.ts"],
  },
  {
    key: "event_registered",
    channel: "email",
    description: "Organizador recebe nova inscrição num evento.",
    params: ["to", "userName", "eventTitle", "url"],
    usedIn: ["shared/lib/email-templates.ts (eventRegistrationHtml) + events.service.ts"],
  },
  {
    key: "event_interest",
    channel: "email",
    description: "Organizador recebe manifestação de interesse (evento sem data).",
    params: ["to", "userName", "eventTitle", "url"],
    usedIn: ["shared/lib/email-templates.ts (eventRegistrationHtml) + events.service.ts"],
  },
  {
    key: "support_reply",
    channel: "email",
    description: "Utilizador recebe resposta da equipa ao pedido de suporte.",
    params: ["to", "ticketSubject", "url"],
    usedIn: ["shared/lib/email-templates.ts (supportReplyHtml) + support.service.ts"],
  },
];

export const MESSAGE_TEMPLATES: MessageTemplate[] = [...WHATSAPP_TEMPLATES, ...EMAIL_TEMPLATES];

export function findTemplate(key: string, channel?: TemplateChannel): MessageTemplate | undefined {
  return MESSAGE_TEMPLATES.find((t) => t.key === key && (!channel || t.channel === channel));
}
