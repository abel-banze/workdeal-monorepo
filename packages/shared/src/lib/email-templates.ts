// Sistema visual dos emails Workdeal — shell única para todos os envios.
// Tokens: tinta #0F1A2E · laranja primário #FF3B1F (CTAs) · verde #0B5E56
// (confiança/secundário) · creme #F6F3EE (fundo) · areia #D9D2C2 (bordos).
// O cabeçalho usa o logótipo oficial com fallback de texto (alt).

const BRAND = "Workdeal";
const WEB_URL = "https://workdeal.co.mz";
const LOGO_URL = "https://workdeal.co.mz/logo.png";

const INK = "#0F1A2E";
const ORANGE = "#FF3B1F";
const GREEN = "#0B5E56";
const CREAM = "#F6F3EE";
const SAND = "#D9D2C2";

function baseLayout(title: string, eyebrow: string, innerHtml: string, preheader?: string, accentBar = false): string {
  return `<!DOCTYPE html>
<html lang="pt-MZ">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:${CREAM};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</div>` : ""}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${CREAM};padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">
          <tr>
            <td align="center" style="padding-bottom:28px;">
              <a href="${WEB_URL}" style="text-decoration:none;">
                <img src="${LOGO_URL}" alt="${BRAND}" width="148" style="display:block;border:0;max-width:148px;height:auto;" />
              </a>
              <p style="margin:10px 0 0;font-size:10px;font-weight:700;letter-spacing:0.22em;color:${GREEN};text-transform:uppercase;">Onde os negócios se encontram</p>
            </td>
          </tr>
          <tr>
            <td>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:20px;border:1px solid ${SAND};overflow:hidden;">
                ${accentBar ? `<tr><td style="height:6px;line-height:6px;font-size:0;background-color:${ORANGE};">&nbsp;</td></tr>` : ""}
                <tr>
                  <td style="padding:36px 32px 32px;">
                    <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:0.14em;color:${GREEN};text-transform:uppercase;">${eyebrow}</p>
                    ${innerHtml}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:24px 20px 0;">
              <p style="margin:0;font-size:11px;color:${INK};opacity:0.5;">
                <a href="${WEB_URL}" style="color:${GREEN};text-decoration:none;font-weight:600;">workdeal.co.mz</a>
                <span style="color:${SAND};margin:0 6px;">·</span>
                Onde os negócios se encontram
              </p>
              <p style="margin:8px 0 0;font-size:11px;color:${INK};opacity:0.35;">Se não tens conta no Workdeal, podes ignorar esta mensagem.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Botão primário (laranja) ou secundário (tinta). */
function ctaButton(href: string, label: string, secondary = false): string {
  const bg = secondary ? INK : ORANGE;
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
      <tr>
        <td align="center" style="background-color:${bg};border-radius:999px;">
          <a href="${href}" style="display:inline-block;padding:14px 28px;font-size:14px;font-weight:800;color:#ffffff;text-decoration:none;">${label}</a>
        </td>
      </tr>
    </table>`;
}

function infoBox(inner: string): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
      <tr><td style="background:${CREAM};border:1px solid ${SAND};border-radius:12px;padding:16px;">${inner}</td></tr>
    </table>`;
}

export function welcomeAccountHtml(params: { name: string; ctaUrl: string }): string {
  const { name, ctaUrl } = params;
  const safeName = escapeHtml(name);
  const inner = `
    <h1 style="margin:0 0 12px;font-size:22px;font-weight:900;color:${INK};line-height:1.1;">Bem-vindo ao Workdeal, ${safeName}!</h1>
    <p style="margin:0 0 16px;font-size:14px;color:${INK};opacity:0.7;line-height:1.6;">
      A tua conta foi criada com sucesso. Estás a um passo de colocar a tua empresa no ecossistema onde negócios sérios se encontram, ganham visibilidade e crescem juntos.
    </p>
    ${infoBox(`
      <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:${INK};">Próximo passo</p>
      <p style="margin:0;font-size:13px;color:${INK};opacity:0.65;line-height:1.5;">Cria o perfil da tua empresa — nome, serviços, localização e contactos verificados. Leva cerca de 5 minutos e o perfil fica activo de imediato.</p>
    `)}
    ${ctaButton(ctaUrl, "Criar perfil da empresa →")}
    <p style="margin:20px 0 0;font-size:12px;color:${INK};opacity:0.45;line-height:1.5;">Dica: prepara o logótipo, NUIT e uma breve descrição do que a empresa faz — acelera a verificação.</p>
  `;
  return baseLayout("Bem-vindo ao Workdeal", "CONTA CRIADA", inner, `Bem-vindo, ${name} — cria o perfil da tua empresa em 5 minutos.`);
}

export function welcomeCompanyHtml(params: { name: string; companyName: string; profileUrl: string; dashboardUrl: string }): string {
  const { name, companyName, profileUrl, dashboardUrl } = params;
  const safeName = escapeHtml(name);
  const safeCompany = escapeHtml(companyName);
  const steps: { n: number; color: string; text: string }[] = [
    { n: 1, color: GREEN, text: "Completa a verificação para ganhar o selo Workdeal — transmite confiança e aumenta conversões." },
    { n: 2, color: INK, text: "Adiciona serviços e portfólio — perfis completos recebem até 3× mais contactos." },
    { n: 3, color: ORANGE, text: "Partilha o perfil com clientes e nas redes — quanto mais visível, mais oportunidades." },
  ];
  const inner = `
    <h1 style="margin:0 0 12px;font-size:22px;font-weight:900;color:${INK};line-height:1.1;">${safeCompany} está no ar! 🎉</h1>
    <p style="margin:0 0 16px;font-size:14px;color:${INK};opacity:0.7;line-height:1.6;">
      Olá ${safeName}, o perfil da tua empresa foi publicado com sucesso no Workdeal. A partir de agora, quem procura o que fazes — perto de ti — pode encontrar-te e contactar-te directamente.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
      <tr><td style="background:${GREEN};border-radius:12px;padding:16px;">
        <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:0.12em;color:rgba(255,255,255,0.7);text-transform:uppercase;">PERFIL PÚBLICO</p>
        <p style="margin:0 0 12px;font-size:15px;font-weight:800;color:#ffffff;">${safeCompany}</p>
        <a href="${profileUrl}" style="display:inline-block;background:#ffffff;color:${GREEN};padding:10px 18px;border-radius:999px;font-size:13px;font-weight:700;text-decoration:none;">Ver perfil público</a>
      </td></tr>
    </table>
    <p style="margin:0 0 16px;font-size:13px;color:${INK};opacity:0.65;line-height:1.6;"><strong style="color:${INK};">O que fazer agora:</strong></p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
      ${steps.map((s) => `
      <tr><td style="padding:0 0 8px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
          <td style="width:28px;vertical-align:top;"><span style="display:inline-block;width:24px;height:24px;line-height:24px;text-align:center;border-radius:999px;background:${s.color};color:#fff;font-size:12px;font-weight:700;">${s.n}</span></td>
          <td style="font-size:13px;color:${INK};opacity:0.75;line-height:1.5;">${s.text}</td>
        </tr></table>
      </td></tr>`).join("")}
    </table>
    ${ctaButton(dashboardUrl, "Ir para o painel →")}
  `;
  return baseLayout("Empresa publicada — Workdeal", "PERFIL CRIADO", inner, `${companyName} já está no ar — vê o perfil público.`);
}

export function otpEmailHtml(code: string, brandName: string): string {
  const digits = code.split("");

  return `<!DOCTYPE html>
<html lang="pt-MZ">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Código de verificação</title>
</head>
<body style="margin:0;padding:0;background-color:${CREAM};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${CREAM};padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <a href="${WEB_URL}" style="text-decoration:none;">
                <img src="${LOGO_URL}" alt="${BRAND}" width="148" style="display:block;border:0;max-width:148px;height:auto;" />
              </a>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:20px;border:1px solid ${SAND};overflow:hidden;">
                <tr>
                  <td style="padding:40px 36px 36px;">

                    <!-- Eyebrow -->
                    <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:0.14em;color:${GREEN};text-transform:uppercase;">Verificação de conta</p>

                    <!-- Heading -->
                    <h1 style="margin:0 0 12px;font-size:22px;font-weight:900;color:${INK};line-height:1.1;letter-spacing:-0.02em;">O teu código de verificação</h1>

                    <!-- Body text -->
                    <p style="margin:0 0 32px;font-size:14px;color:${INK};line-height:1.6;">
                      Olá! Usa o código abaixo para verificar a tua conta <strong>${brandName}</strong> no Workdeal.
                    </p>

                    <!-- OTP Code -->
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td align="center" style="padding:0 0 24px;">
                          <table role="presentation" cellpadding="0" cellspacing="6">
                            <tr>
                              ${digits.map((d) => `
                              <td style="background-color:${CREAM};border:1px solid ${SAND};border-radius:10px;width:48px;height:56px;text-align:center;vertical-align:middle;">
                                <span style="font-size:24px;font-weight:700;color:${INK};font-family:'Helvetica Neue',Arial,sans-serif;line-height:56px;">${d}</span>
                              </td>`).join("")}
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <!-- Divider -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="border-top:1px solid ${SAND};"></td>
                      </tr>
                    </table>

                    <!-- Expiry notice -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:20px 0 0;">
                          <p style="margin:0;font-size:13px;color:${INK};line-height:1.5;">
                            <strong style="color:${ORANGE};">⏱ Expira em 15 minutos.</strong> Não partilhes este código com ninguém.
                          </p>
                        </td>
                      </tr>
                    </table>

                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding:28px 20px 0;">
              <p style="margin:0 0 8px;font-size:12px;color:${INK};line-height:1.5;">
                Se não solicitaste este código, podes ignorar esta mensagem.
              </p>
              <p style="margin:0;font-size:11px;color:${INK};line-height:1.5;">
                <a href="https://workdeal.co.mz" style="color:${GREEN};text-decoration:none;font-weight:600;">workdeal.co.mz</a>
                <span style="color:${SAND};margin:0 6px;">·</span>
                Ecossistema de negócios de Moçambique
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function resetPasswordHtml(params: { name: string; resetUrl: string }): string {
  const { name, resetUrl } = params;
  const safeName = escapeHtml(name || "lá");
  const inner = `
    <h1 style="margin:0 0 12px;font-size:22px;font-weight:900;color:${INK};line-height:1.1;">Redefine a tua palavra-passe</h1>
    <p style="margin:0 0 16px;font-size:14px;color:${INK};opacity:0.7;line-height:1.6;">
      Olá ${safeName}, recebemos um pedido para redefinir a palavra-passe da tua conta Workdeal. Clica no botão abaixo para escolher uma nova — o link é válido por 1 hora.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 20px;">
      <tr>
        <td align="center" style="background-color:${ORANGE};border-radius:999px;">
          <a href="${resetUrl}" style="display:inline-block;padding:14px 28px;font-size:14px;font-weight:800;color:#ffffff;text-decoration:none;">Redefinir palavra-passe →</a>
        </td>
      </tr>
    </table>
    <p style="margin:0 0 8px;font-size:12px;color:${INK};opacity:0.5;line-height:1.5;">Se o botão não funcionar, copia e cola este link no navegador:</p>
    <p style="margin:0 0 20px;font-size:12px;word-break:break-all;"><a href="${resetUrl}" style="color:${GREEN};text-decoration:underline;">${resetUrl}</a></p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="border-top:1px solid ${SAND};padding-top:16px;">
      <p style="margin:0;font-size:12px;color:${INK};opacity:0.5;line-height:1.5;">Não pediste esta alteração? Ignora este email — a tua palavra-passe actual continua válida e segura. Se suspeitares de actividade estranha, responde a este email.</p>
    </td></tr></table>
  `;
  return baseLayout(`Redefine a tua palavra-passe — ${BRAND}`, "SEGURANÇA DA CONTA", inner);
}

export function preRegisterCompanyHtml(params: {
  companyName: string;
  contactName: string;
  promoterName?: string;
  completionUrl: string;
  formattedAddress?: string | null;
}): string {
  const { companyName, contactName, promoterName, completionUrl, formattedAddress } = params;
  const safeCompany = escapeHtml(companyName);
  const safeContact = escapeHtml(contactName);
  const safePromoter = promoterName ? escapeHtml(promoterName) : "a nossa equipa";
  const addressHtml = formattedAddress ? `<p style="margin:0 0 16px;font-size:14px;color:${INK};opacity:0.7;line-height:1.6;">📍 <strong>${escapeHtml(formattedAddress)}</strong></p>` : "";
  const inner = `
    <h1 style="margin:0 0 12px;font-size:22px;font-weight:900;color:${INK};line-height:1.1;">${safeCompany} no Workdeal</h1>
    <p style="margin:0 0 16px;font-size:14px;color:${INK};opacity:0.7;line-height:1.6;">
      Olá ${safeContact}, durante o nosso contacto (${safePromoter}) registámos a ${safeCompany} para fazer parte do Workdeal — o ecossistema onde os negócios de Moçambique se encontram.
    </p>
    ${addressHtml}
    ${infoBox(`
      <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:${INK};">Falta só um passo</p>
      <p style="margin:0;font-size:13px;color:${INK};opacity:0.65;line-height:1.5;">Cria a tua conta, completa os dados da empresa e o teu perfil fica disponível para milhares de pessoas recomendarem, encontrarem e contactarem o teu negócio.</p>
    `)}
    ${ctaButton(completionUrl, "Completar registo →")}
    <p style="margin:20px 0 8px;font-size:12px;color:${INK};opacity:0.5;line-height:1.5;">Se o botão não funcionar, copia e cola este link:</p>
    <p style="margin:0;font-size:12px;word-break:break-all;"><a href="${completionUrl}" style="color:${GREEN};text-decoration:underline;">${completionUrl}</a></p>
  `;
  return baseLayout(`Registo da ${companyName} no Workdeal`, "REGISTO INICIADO", inner, `${companyName}: completa o teu registo no Workdeal.`);
}

export function escapeHtml(str: string): string {
  return str.replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]!));
}

// ── Facturação de subscrições (emitente: Codebaz SU, Lda) ─────────────

export interface SubscriptionInvoiceEmailParams {
  customerName: string;
  invoiceNumber: string;
  planName: string;
  intervalLabel: string;
  amount: string;
  dueDate: string;
  issuerName: string;
  issuerNuit: string;
  bankName: string;
  nib: string;
  accountNumber: string;
}

export function subscriptionInvoiceHtml(params: SubscriptionInvoiceEmailParams): string {
  const p = Object.fromEntries(Object.entries(params).map(([k, v]) => [k, escapeHtml(v)]));
  const inner = `
    <h1 style="margin:0 0 12px;font-size:22px;font-weight:900;color:${INK};line-height:1.1;">Factura ${p.invoiceNumber}</h1>
    <p style="margin:0 0 16px;font-size:14px;color:${INK};opacity:0.7;line-height:1.6;">
      Olá ${p.customerName}, segue a factura da subscrição <strong>${p.planName}</strong> (${p.intervalLabel}) no Workdeal.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;background:${CREAM};border:1px solid ${SAND};border-radius:12px;">
      <tr><td style="padding:16px;">
        <p style="margin:0 0 4px;font-size:13px;color:${INK};">Subscrição ${p.planName} — ${p.intervalLabel}</p>
        <p style="margin:0;font-size:18px;font-weight:900;color:${INK};">${p.amount}</p>
        <p style="margin:8px 0 0;font-size:12px;color:${INK};opacity:0.6;">Vencimento: ${p.dueDate}</p>
      </td></tr>
    </table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;">
      <tr><td style="background:#ffffff;border:1px solid ${SAND};border-radius:12px;padding:16px;">
        <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:0.14em;color:${GREEN};text-transform:uppercase;">Emitente</p>
        <p style="margin:0;font-size:13px;color:${INK};"><strong>${p.issuerName}</strong> · NUIT ${p.issuerNuit}</p>
        <p style="margin:12px 0 8px;font-size:11px;font-weight:700;letter-spacing:0.14em;color:${GREEN};text-transform:uppercase;">Dados para transferência</p>
        <p style="margin:0;font-size:13px;color:${INK};font-family:monospace;">Banco: <strong>${p.bankName}</strong><br/>NIB: <strong>${p.nib}</strong><br/>Conta: <strong>${p.accountNumber}</strong></p>
      </td></tr>
    </table>
    <p style="margin:0;font-size:13px;color:${INK};opacity:0.65;line-height:1.5;">Após a transferência, anexa o comprovativo na página da subscrição. A activação é concluída quando o pagamento for confirmado.</p>
  `;
  return baseLayout(`Factura ${params.invoiceNumber} — Workdeal`, "FACTURA", inner, undefined, true);
}

export interface SubscriptionReceiptEmailParams {
  customerName: string;
  receiptNumber: string;
  invoiceNumber: string;
  planName: string;
  amount: string;
  paidAt: string;
  issuerName: string;
  issuerNuit: string;
}

export function subscriptionReceiptHtml(params: SubscriptionReceiptEmailParams): string {
  const p = Object.fromEntries(Object.entries(params).map(([k, v]) => [k, escapeHtml(v)]));
  const inner = `
    <h1 style="margin:0 0 12px;font-size:22px;font-weight:900;color:${INK};line-height:1.1;">Recibo ${p.receiptNumber}</h1>
    <p style="margin:0 0 16px;font-size:14px;color:${INK};opacity:0.7;line-height:1.6;">
      Olá ${p.customerName}, confirmámos o pagamento da subscrição <strong>${p.planName}</strong>. A subscrição está activa.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;background:${GREEN};border-radius:12px;">
      <tr><td style="padding:16px;">
        <p style="margin:0 0 4px;font-size:12px;color:#ffffff;opacity:0.75;">Valor recebido · ${p.paidAt}</p>
        <p style="margin:0;font-size:20px;font-weight:900;color:#ffffff;">${p.amount}</p>
        <p style="margin:8px 0 0;font-size:12px;color:#ffffff;opacity:0.75;">Recibo ${p.receiptNumber} · Factura ${p.invoiceNumber}</p>
      </td></tr>
    </table>
    <p style="margin:0;font-size:12px;color:${INK};opacity:0.55;">Emitente: <strong>${p.issuerName}</strong> · NUIT ${p.issuerNuit}</p>
  `;
  return baseLayout(`Recibo ${params.receiptNumber} — Workdeal`, "PAGAMENTO CONFIRMADO", inner, undefined, true);
}

export interface SubscriptionNoticeEmailParams {
  customerName: string;
  planName: string;
  amount: string;
  message: string;
}

export function subscriptionPaymentNoticeHtml(params: SubscriptionNoticeEmailParams): string {
  const safeMessage = escapeHtml(params.message).replace(/\n/g, "<br/>");
  const inner = `
    <h1 style="margin:0 0 12px;font-size:22px;font-weight:900;color:${INK};line-height:1.1;">Pagamento da subscrição ${escapeHtml(params.planName)}</h1>
    <p style="margin:0 0 16px;font-size:14px;color:${INK};opacity:0.7;line-height:1.6;">Olá ${escapeHtml(params.customerName)},</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;background:#FFF7ED;border:1px solid #FDBA74;border-radius:12px;">
      <tr><td style="padding:16px;font-size:14px;color:${INK};line-height:1.6;">${safeMessage}</td></tr>
    </table>
    <p style="margin:0;font-size:13px;color:${INK};opacity:0.65;">Valor em causa: <strong>${escapeHtml(params.amount)}</strong>. Responde a este email ou fala connosco para regularizar.</p>
  `;
  return baseLayout(`Subscrição ${params.planName} — Workdeal`, "AVISO DE PAGAMENTO", inner, undefined, true);
}

// ── Notificações transaccionais (inbox + email via dispatcher) ──────
// Migrados dos builders inline dos services — mesmo copy, shell única.

function quoteBox(bodyHtml: string, accent: string = ORANGE): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;">
      <tr><td style="border-left:4px solid ${accent};padding:12px 16px;background:${CREAM};border-radius:8px;">${bodyHtml}</td></tr>
    </table>`;
}

export function negotiationMessageHtml(params: { senderName: string; label: string; preview: string; url: string }): string {
  const { senderName, label, preview, url } = params;
  const inner = `
    <h1 style="margin:0 0 8px;font-size:20px;font-weight:900;color:${INK};line-height:1.2;">Nova mensagem de ${escapeHtml(senderName)}</h1>
    <p style="margin:0 0 16px;font-size:13px;color:${INK};opacity:0.6;">Negociação entre solicitante e ${escapeHtml(label)} · pedido de serviço</p>
    ${quoteBox(`<p style="margin:0;white-space:pre-wrap;font-size:14px;color:${INK};line-height:1.6;">${escapeHtml(preview)}</p>`)}
    ${ctaButton(url, "Abrir negociação")}
  `;
  return baseLayout("Nova mensagem — Workdeal", "NEGOCIAÇÃO", inner);
}

export function negotiationOfferHtml(params: { accepted: boolean; terms: string; note: string; url: string }): string {
  const { accepted, terms, note, url } = params;
  const inner = `
    <h1 style="margin:0 0 8px;font-size:20px;font-weight:900;color:${INK};line-height:1.2;">${accepted ? "Contraproposta aceite" : "Contraproposta recusada"}</h1>
    ${quoteBox(`<p style="margin:0;white-space:pre-wrap;font-size:14px;color:${INK};line-height:1.6;">${escapeHtml(terms)}</p>`, accepted ? GREEN : "#B91C1C")}
    <p style="margin:0 0 16px;font-size:14px;color:${INK};opacity:0.7;line-height:1.6;">${escapeHtml(note)}</p>
    ${ctaButton(url, "Abrir negociação")}
  `;
  return baseLayout(`${accepted ? "Contraproposta aceite" : "Contraproposta recusada"} — Workdeal`, "NEGOCIAÇÃO", inner);
}

export function proposalReceivedHtml(params: { taskTitle: string; url: string }): string {
  const inner = `
    <h1 style="margin:0 0 8px;font-size:20px;font-weight:900;color:${INK};line-height:1.2;">Nova proposta recebida</h1>
    <p style="margin:0 0 16px;font-size:14px;color:${INK};opacity:0.7;line-height:1.6;">A tarefa <strong>${escapeHtml(params.taskTitle)}</strong> recebeu uma nova proposta.</p>
    ${ctaButton(params.url, "Ver propostas")}
  `;
  return baseLayout("Nova proposta — Workdeal", "TAREFA", inner, `Nova proposta em “${params.taskTitle}”.`);
}

export function bidAwardedHtml(params: { taskTitle: string; price: string; url: string }): string {
  const inner = `
    <h1 style="margin:0 0 8px;font-size:20px;font-weight:900;color:${INK};line-height:1.2;">Proposta adjudicada 🎉</h1>
    <p style="margin:0 0 16px;font-size:14px;color:${INK};opacity:0.7;line-height:1.6;">A tua proposta para <strong>${escapeHtml(params.taskTitle)}</strong> foi aceite (${escapeHtml(params.price)}).</p>
    ${ctaButton(params.url, "Ver adjudicação")}
  `;
  return baseLayout("Proposta adjudicada — Workdeal", "ADJUDICAÇÃO", inner, `Ganhaste “${params.taskTitle}” (${params.price}).`);
}

export function eventRegistrationHtml(params: { interested: boolean; userName: string; eventTitle: string; url: string }): string {
  const title = params.interested ? "Novo interessado no evento" : "Nova inscrição no evento";
  const inner = `
    <h1 style="margin:0 0 8px;font-size:20px;font-weight:900;color:${INK};line-height:1.2;">${title}</h1>
    <p style="margin:0 0 16px;font-size:14px;color:${INK};opacity:0.7;line-height:1.6;"><strong>${escapeHtml(params.userName)}</strong> ${params.interested ? "manifestou interesse" : "inscreveu-se"} em <strong>${escapeHtml(params.eventTitle)}</strong>.</p>
    ${ctaButton(params.url, "Ver evento")}
  `;
  return baseLayout(`${title} — Workdeal`, "EVENTO", inner);
}

export function supportReplyHtml(params: { subject: string; url: string }): string {
  const inner = `
    <h1 style="margin:0 0 8px;font-size:20px;font-weight:900;color:${INK};line-height:1.2;">A equipa respondeu ao teu pedido</h1>
    <p style="margin:0 0 16px;font-size:14px;color:${INK};opacity:0.7;line-height:1.6;"><strong>${escapeHtml(params.subject)}</strong> — vê a resposta no teu painel.</p>
    ${ctaButton(params.url, "Ver resposta")}
  `;
  return baseLayout("Resposta do suporte — Workdeal", "SUPORTE", inner);
}

export function quoteReceivedHtml(params: { companyName: string; serviceLabel: string; url: string }): string {
  const inner = `
    <h1 style="margin:0 0 8px;font-size:20px;font-weight:900;color:${INK};line-height:1.2;">Nova cotação recebida</h1>
    <p style="margin:0 0 16px;font-size:14px;color:${INK};opacity:0.7;line-height:1.6;"><strong>${escapeHtml(params.companyName)}</strong> recebeu um pedido de cotação para <strong>${escapeHtml(params.serviceLabel)}</strong>.</p>
    ${ctaButton(params.url, "Ver cotação")}
  `;
  return baseLayout("Nova cotação — Workdeal", "COTAÇÃO", inner, `Novo pedido de cotação: ${params.serviceLabel}.`);
}

// ── Verificação de empresa ───────────────────────────────────────

export function verificationRequestedHtml(params: { companyName: string; level: string; url: string }): string {
  const inner = `
    <h1 style="margin:0 0 12px;font-size:22px;font-weight:900;color:${INK};line-height:1.1;">Pedido recebido</h1>
    <p style="margin:0 0 16px;font-size:14px;color:${INK};opacity:0.7;line-height:1.6;">
      Recebemos o pedido de verificação da <strong>${escapeHtml(params.companyName)}</strong> (${escapeHtml(params.level)}). A nossa equipa revê os documentos em 24–48h úteis.
    </p>
    ${infoBox(`
      <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:${INK};">Enquanto isso</p>
      <p style="margin:0;font-size:13px;color:${INK};opacity:0.65;line-height:1.5;">O perfil continua visível e a receber contactos. Avisamos por email assim que houver decisão.</p>
    `)}
    ${ctaButton(params.url, "Ver estado do pedido")}
  `;
  return baseLayout("Pedido de verificação recebido — Workdeal", "VERIFICAÇÃO", inner, `Pedido de verificação de ${params.companyName} recebido.`);
}

export function verificationDecisionHtml(params: { approved: boolean; companyName: string; level: string; reviewNote?: string | null; url: string }): string {
  const note = params.reviewNote?.trim()
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;background:${CREAM};border:1px solid ${SAND};border-radius:12px;"><tr><td style="padding:16px;font-size:14px;color:${INK};line-height:1.6;">${escapeHtml(params.reviewNote)}</td></tr></table>`
    : "";
  const inner = params.approved
    ? `
    <h1 style="margin:0 0 12px;font-size:22px;font-weight:900;color:${INK};line-height:1.1;">Empresa verificada 🎉</h1>
    <p style="margin:0 0 16px;font-size:14px;color:${INK};opacity:0.7;line-height:1.6;">
      A <strong>${escapeHtml(params.companyName)}</strong> concluiu a verificação (${escapeHtml(params.level)}) e ganhou o selo Workdeal — visível no perfil para transmitir confiança.
    </p>
    ${note}
    ${ctaButton(params.url, "Ver perfil verificado")}
    `
    : `
    <h1 style="margin:0 0 12px;font-size:22px;font-weight:900;color:${INK};line-height:1.1;">Pedido não aprovado</h1>
    <p style="margin:0 0 16px;font-size:14px;color:${INK};opacity:0.7;line-height:1.6;">
      O pedido de verificação da <strong>${escapeHtml(params.companyName)}</strong> (${escapeHtml(params.level)}) não foi aprovado. Vê o motivo abaixo e submete de novo com os documentos em falta.
    </p>
    ${note}
    ${ctaButton(params.url, "Submeter de novo")}
    `;
  return baseLayout(
    `${params.approved ? "Empresa verificada" : "Pedido não aprovado"} — Workdeal`,
    "VERIFICAÇÃO",
    inner,
    params.approved ? `${params.companyName} verificada — selo activo.` : `Pedido de ${params.companyName} não aprovado.`,
  );
}

// ── Apresentação do Workdeal ─────────────────────────────────────

export function workdealIntroductionHtml(params: { companyName?: string | null; contactName?: string | null; ctaUrl?: string | null }): string {
  const hello = params.contactName ? `Olá ${escapeHtml(params.contactName)},` : "Olá,";
  const who = params.companyName ? ` para a <strong>${escapeHtml(params.companyName)}</strong>` : "";
  const inner = `
    <h1 style="margin:0 0 12px;font-size:22px;font-weight:900;color:${INK};line-height:1.1;">O que é o Workdeal?</h1>
    <p style="margin:0 0 16px;font-size:14px;color:${INK};opacity:0.7;line-height:1.6;">
      ${hello} o Workdeal é o ecossistema onde os negócios de Moçambique se encontram${who}: empresas publicam o que precisam, fornecedores propõem, tudo com perfis verificados e reputação visível.
    </p>
    ${infoBox(`
      <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:${INK};">Num só lugar</p>
      <p style="margin:0;font-size:13px;color:${INK};opacity:0.65;line-height:1.5;">Directório de empresas · pedidos de serviço e propostas · concursos públicos · eventos de negócio.</p>
    `)}
    ${params.ctaUrl ? ctaButton(params.ctaUrl, "Conhecer o Workdeal →") : ""}
  `;
  return baseLayout("O que é o Workdeal", "APRESENTAÇÃO", inner, "Workdeal: onde os negócios de Moçambique se encontram.");
}
