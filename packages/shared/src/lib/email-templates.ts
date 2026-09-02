const BRAND = "Workdeal";
const WEB_URL = "https://workdeal.co.mz";

function baseLayout(title: string, eyebrow: string, innerHtml: string): string {
  return `<!DOCTYPE html>
<html lang="pt-MZ">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#F6F3EE;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F6F3EE;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">
          <tr>
            <td align="center" style="padding-bottom:28px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background-color:#0B5E56;border-radius:12px;padding:10px 18px;">
                    <span style="font-size:18px;font-weight:900;color:#ffffff;letter-spacing:-0.02em;">workdeal</span>
                  </td>
                </tr>
              </table>
              <p style="margin:8px 0 0;font-size:10px;font-weight:700;letter-spacing:0.22em;color:#0B5E56;text-transform:uppercase;">PLATAFORMA GLOBAL</p>
            </td>
          </tr>
          <tr>
            <td>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:20px;border:1px solid #D9D2C2;overflow:hidden;">
                <tr>
                  <td style="padding:36px 32px 32px;">
                    <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:0.14em;color:#0B5E56;text-transform:uppercase;">${eyebrow}</p>
                    ${innerHtml}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:24px 20px 0;">
              <p style="margin:0;font-size:11px;color:#0F1A2E;opacity:0.5;">
                <a href="${WEB_URL}" style="color:#0B5E56;text-decoration:none;font-weight:600;">workdeal.co.mz</a>
                <span style="color:#D9D2C2;margin:0 6px;">·</span>
                Onde os negócios se encontram
              </p>
              <p style="margin:8px 0 0;font-size:11px;color:#0F1A2E;opacity:0.35;">Se não criaste conta no Workdeal, podes ignorar esta mensagem.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function welcomeAccountHtml(params: { name: string; ctaUrl: string }): string {
  const { name, ctaUrl } = params;
  const safeName = escapeHtml(name);
  const inner = `
    <h1 style="margin:0 0 12px;font-size:22px;font-weight:900;color:#0F1A2E;line-height:1.1;">Bem-vindo ao Workdeal, ${safeName}!</h1>
    <p style="margin:0 0 16px;font-size:14px;color:#0F1A2E;opacity:0.7;line-height:1.6;">
      A tua conta foi criada com sucesso. Estás a um passo de colocar a tua empresa no ecossistema onde negócios sérios se encontram, ganham visibilidade e crescem juntos.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
      <tr><td style="background:#F6F3EE;border:1px solid #D9D2C2;border-radius:12px;padding:16px;">
        <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#0F1A2E;">Próximo passo</p>
        <p style="margin:0;font-size:13px;color:#0F1A2E;opacity:0.65;line-height:1.5;">Cria o perfil da tua empresa — nome, serviços, localização e contactos verificados. Leva cerca de 5 minutos e o perfil fica activo de imediato.</p>
      </td></tr>
    </table>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
      <tr>
        <td align="center" style="background-color:#FF3B1F;border-radius:999px;">
          <a href="${ctaUrl}" style="display:inline-block;padding:14px 28px;font-size:14px;font-weight:800;color:#ffffff;text-decoration:none;">Criar perfil da empresa →</a>
        </td>
      </tr>
    </table>
    <p style="margin:20px 0 0;font-size:12px;color:#0F1A2E;opacity:0.45;line-height:1.5;">Dica: prepara o logótipo, NUIT e uma breve descrição do que a empresa faz — acelera a verificação.</p>
  `;
  return baseLayout("Bem-vindo ao Workdeal", "CONTA CRIADA", inner);
}

export function welcomeCompanyHtml(params: { name: string; companyName: string; profileUrl: string; dashboardUrl: string }): string {
  const { name, companyName, profileUrl, dashboardUrl } = params;
  const safeName = escapeHtml(name);
  const safeCompany = escapeHtml(companyName);
  const inner = `
    <h1 style="margin:0 0 12px;font-size:22px;font-weight:900;color:#0F1A2E;line-height:1.1;">${safeCompany} está no ar! 🎉</h1>
    <p style="margin:0 0 16px;font-size:14px;color:#0F1A2E;opacity:0.7;line-height:1.6;">
      Olá ${safeName}, o perfil da tua empresa foi publicado com sucesso no Workdeal. A partir de agora, quem procura o que fazes — perto de ti — pode encontrar-te e contactar-te directamente.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
      <tr><td style="background:#0B5E56;border-radius:12px;padding:16px;">
        <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:0.12em;color:rgba(255,255,255,0.7);text-transform:uppercase;">PERFIL PÚBLICO</p>
        <p style="margin:0 0 12px;font-size:15px;font-weight:800;color:#ffffff;">${safeCompany}</p>
        <a href="${profileUrl}" style="display:inline-block;background:#ffffff;color:#0B5E56;padding:10px 18px;border-radius:999px;font-size:13px;font-weight:700;text-decoration:none;">Ver perfil público</a>
      </td></tr>
    </table>
    <p style="margin:0 0 16px;font-size:13px;color:#0F1A2E;opacity:0.65;line-height:1.6;"><strong style="color:#0F1A2E;">O que fazer agora:</strong></p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
      <tr><td style="padding:0 0 8px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
          <td style="width:28px;vertical-align:top;"><span style="display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:999px;background:#0B5E56;color:#fff;font-size:12px;font-weight:700;">1</span></td>
          <td style="font-size:13px;color:#0F1A2E;opacity:0.75;line-height:1.5;">Completa a verificação para ganhar o selo Workdeal — transmite confiança e aumenta conversões.</td>
        </tr></table>
      </td></tr>
      <tr><td style="padding:0 0 8px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
          <td style="width:28px;vertical-align:top;"><span style="display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:999px;background:#0F1A2E;color:#fff;font-size:12px;font-weight:700;">2</span></td>
          <td style="font-size:13px;color:#0F1A2E;opacity:0.75;line-height:1.5;">Adiciona serviços e portfólio — perfis completos recebem até 3× mais contactos.</td>
        </tr></table>
      </td></tr>
      <tr><td>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
          <td style="width:28px;vertical-align:top;"><span style="display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:999px;background:#FF3B1F;color:#fff;font-size:12px;font-weight:700;">3</span></td>
          <td style="font-size:13px;color:#0F1A2E;opacity:0.75;line-height:1.5;">Partilha o perfil com clientes e nas redes — quanto mais visível, mais oportunidades.</td>
        </tr></table>
      </td></tr>
    </table>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
      <tr>
        <td align="center" style="background-color:#0F1A2E;border-radius:999px;">
          <a href="${dashboardUrl}" style="display:inline-block;padding:14px 28px;font-size:14px;font-weight:800;color:#ffffff;text-decoration:none;">Ir para o painel →</a>
        </td>
      </tr>
    </table>
  `;
  return baseLayout("Empresa publicada — Workdeal", "PERFIL CRIADO", inner);
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
<body style="margin:0;padding:0;background-color:#F6F3EE;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F6F3EE;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background-color:#0B5E56;border-radius:12px;padding:10px 18px;">
                    <span style="font-size:18px;font-weight:900;color:#ffffff;letter-spacing:-0.02em;font-family:'Helvetica Neue',Arial,sans-serif;">workdeal</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:20px;border:1px solid #D9D2C2;overflow:hidden;">
                <tr>
                  <td style="padding:40px 36px 36px;">

                    <!-- Eyebrow -->
                    <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:0.14em;color:#0B5E56;text-transform:uppercase;">Verificação de conta</p>

                    <!-- Heading -->
                    <h1 style="margin:0 0 12px;font-size:22px;font-weight:900;color:#0F1A2E;line-height:1.1;letter-spacing:-0.02em;">O teu código de verificação</h1>

                    <!-- Body text -->
                    <p style="margin:0 0 32px;font-size:14px;color:#0F1A2E;line-height:1.6;">
                      Olá! Usamos o código abaixo para verificar a tua conta <strong>${brandName}</strong> no Workdeal.
                    </p>

                    <!-- OTP Code -->
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td align="center" style="padding:0 0 24px;">
                          <table role="presentation" cellpadding="0" cellspacing="6">
                            <tr>
                              ${digits.map((d, i) => `
                              <td style="background-color:${i < 3 ? "#0B5E56" : "#F6F3EE"};border:1px solid ${i < 3 ? "#0B5E56" : "#D9D2C2"};border-radius:10px;width:48px;height:56px;text-align:center;vertical-align:middle;">
                                <span style="font-size:24px;font-weight:700;color:${i < 3 ? "#ffffff" : "#0F1A2E"};font-family:'Helvetica Neue',Arial,sans-serif;line-height:56px;">${d}</span>
                              </td>`).join("")}
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <!-- Divider -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="border-top:1px solid #D9D2C2;"></td>
                      </tr>
                    </table>

                    <!-- Expiry notice -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:20px 0 0;">
                          <p style="margin:0;font-size:13px;color:#0F1A2E;line-height:1.5;">
                            <strong style="color:#0B5E56;">⏱ Expira em 15 minutos.</strong> Não partilhes este código com ninguém.
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
              <p style="margin:0 0 8px;font-size:12px;color:#0F1A2E;line-height:1.5;">
                Se não solicitaste este código, podes ignorar esta mensagem.
              </p>
              <p style="margin:0;font-size:11px;color:#0F1A2E;line-height:1.5;">
                <a href="https://workdeal.co.mz" style="color:#0B5E56;text-decoration:none;font-weight:600;">workdeal.co.mz</a>
                <span style="color:#D9D2C2;margin:0 6px;">·</span>
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
    <h1 style="margin:0 0 12px;font-size:22px;font-weight:900;color:#0F1A2E;line-height:1.1;">Redefine a tua palavra-passe</h1>
    <p style="margin:0 0 16px;font-size:14px;color:#0F1A2E;opacity:0.7;line-height:1.6;">
      Olá ${safeName}, recebemos um pedido para redefinir a palavra-passe da tua conta Workdeal. Clica no botão abaixo para escolher uma nova — o link é válido por 1 hora.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 20px;">
      <tr>
        <td align="center" style="background-color:#0F1A2E;border-radius:999px;">
          <a href="${resetUrl}" style="display:inline-block;padding:14px 28px;font-size:14px;font-weight:800;color:#ffffff;text-decoration:none;">Redefinir palavra-passe →</a>
        </td>
      </tr>
    </table>
    <p style="margin:0 0 8px;font-size:12px;color:#0F1A2E;opacity:0.5;line-height:1.5;">Se o botão não funcionar, copia e cola este link no navegador:</p>
    <p style="margin:0 0 20px;font-size:12px;word-break:break-all;"><a href="${resetUrl}" style="color:#0B5E56;text-decoration:underline;">${resetUrl}</a></p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="border-top:1px solid #D9D2C2;padding-top:16px;">
      <p style="margin:0;font-size:12px;color:#0F1A2E;opacity:0.5;line-height:1.5;">Não pediste esta alteração? Ignora este email — a tua palavra-passe actual continua válida e segura. Se suspeitares de actividade estranha, responde a este email.</p>
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
  const addressHtml = formattedAddress ? `<p style="margin:0 0 16px;font-size:14px;color:#0F1A2E;opacity:0.7;line-height:1.6;">📍 <strong>${escapeHtml(formattedAddress)}</strong></p>` : "";
  const inner = `
    <h1 style="margin:0 0 12px;font-size:22px;font-weight:900;color:#0F1A2E;line-height:1.1;">${safeCompany} no Workdeal</h1>
    <p style="margin:0 0 16px;font-size:14px;color:#0F1A2E;opacity:0.7;line-height:1.6;">
      Olá ${safeContact}, durante o nosso contacto (${safePromoter}) registámos a ${safeCompany} para fazer parte do Workdeal — o ecossistema onde os negócios de Moçambique se encontram.
    </p>
    ${addressHtml}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
      <tr><td style="background:#F6F3EE;border:1px solid #D9D2C2;border-radius:12px;padding:16px;">
        <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#0F1A2E;">Falta só um passo</p>
        <p style="margin:0;font-size:13px;color:#0F1A2E;opacity:0.65;line-height:1.5;">Cria a tua conta, completa os dados da empresa e o teu perfil fica disponível para milhares de pessoas recomendarem, encontrarem e contactarem o teu negócio.</p>
      </td></tr>
    </table>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 20px;">
      <tr>
        <td align="center" style="background-color:#FF3B1F;border-radius:999px;">
          <a href="${completionUrl}" style="display:inline-block;padding:14px 28px;font-size:14px;font-weight:800;color:#ffffff;text-decoration:none;">Completar registo →</a>
        </td>
      </tr>
    </table>
    <p style="margin:0 0 8px;font-size:12px;color:#0F1A2E;opacity:0.5;line-height:1.5;">Se o botão não funcionar, copia e cola este link:</p>
    <p style="margin:0;font-size:12px;word-break:break-all;"><a href="${completionUrl}" style="color:#0B5E56;text-decoration:underline;">${completionUrl}</a></p>
  `;
  return baseLayout(`Registo da ${companyName} no Workdeal`, "REGISTO INICIADO", inner);
}

function escapeHtml(str: string): string {
  return str.replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]!));
}
