import { resend, EMAIL_FROM } from "../lib/resend.js";

export interface SendOtpEmailParams {
  to: string;
  code: string;
  brandName?: string;
}

function otpEmailHtml(code: string, brandName: string): string {
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

export async function sendOtpEmail({ to, code, brandName = "Workdeal" }: SendOtpEmailParams) {
  if (!resend) {
    console.warn("[Email] RESEND_API_KEY não configurado — mock (sem envio real)");
    console.log(`[Email OTP mock] ${code} para ${to}`);
    return { ok: true as const };
  }

  console.log(`[Email] Enviando OTP para ${to} via Resend (from=${EMAIL_FROM})`);

  try {
    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to,
      subject: `${code} — Código de verificação Workdeal`,
      html: otpEmailHtml(code, brandName),
    });

    if (error) {
      // Resend retorna { name, message } — ex: "invalid_api_key", "Domain not verified"
      console.error("[Email] Resend error:", JSON.stringify(error).slice(0, 800));
      const msg = (error as { message?: string })?.message || JSON.stringify(error).slice(0, 500);
      return { ok: false as const, error: msg };
    }

    if (!data?.id) {
      console.error("[Email] Resend resposta sem id:", JSON.stringify(data).slice(0, 800));
      return { ok: false as const, error: "Resposta do Resend sem id — verifique domínio verificado e API key" };
    }

    console.log(`[Email] OTP enviado para ${to} (id: ${data.id})`);
    return { ok: true as const };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[Email] Falha ao enviar:", msg.slice(0, 800));
    return { ok: false as const, error: msg };
  }
}

export interface SendContactEmailParams {
  to: string;
  fromName: string;
  fromEmail: string;
  message: string;
  profileName?: string;
}

function contactEmailHtml(fromName: string, fromEmail: string, message: string, profileName: string): string {
  return `<!DOCTYPE html><html lang="pt-MZ"><head><meta charset="utf-8"/></head><body style="margin:0;padding:0;background:#F6F3EE;font-family:Inter,Arial,sans-serif"><table width="100%" cellpadding="0" cellspacing="0" style="background:#F6F3EE;padding:32px 16px"><tr><td align="center"><table width="100%" style="max-width:520px;background:#fff;border:1px solid #D9D2C2;border-radius:16px;overflow:hidden"><tr><td style="padding:28px"><p style="font-size:11px;letter-spacing:0.14em;color:#0B5E56;font-weight:700;text-transform:uppercase;margin:0 0 8px">Contacto via Workdeal</p><h1 style="margin:0 0 8px;font-size:18px;font-weight:900;color:#0F1A2E">${profileName} — novo contacto</h1><p style="font-size:13px;color:#0F1A2E;opacity:0.7;margin:0 0 16px">De <strong>${fromName}</strong> &lt;${fromEmail}&gt; via perfil no Workdeal.</p><div style="background:#F6F3EE;border:1px solid #D9D2C2;border-radius:12px;padding:16px;font-size:14px;line-height:1.6;color:#0F1A2E;white-space:pre-wrap">${message.replace(/</g, "&lt;")}</div><p style="font-size:12px;color:#0F1A2E;opacity:0.5;margin:16px 0 0">Responda directamente para ${fromEmail}. Mensagem enviada via Workdeal.</p></td></tr></table></td></tr></table></body></html>`;
}

export async function sendContactEmail({ to, fromName, fromEmail, message, profileName = "Workdeal" }: SendContactEmailParams) {
  if (!resend) {
    console.warn("[Email] RESEND_API_KEY não configurado — mock contacto");
    console.log(`[Email contacto mock] de ${fromName} <${fromEmail}> para ${to}: ${message.slice(0, 120)}`);
    return { ok: true as const };
  }
  console.log(`[Email] Enviando contacto para ${to} de ${fromEmail} via Resend`);
  try {
    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to,
      replyTo: fromEmail,
      subject: `Contacto via Workdeal — ${fromName}`,
      html: contactEmailHtml(fromName, fromEmail, message, profileName),
    });
    if (error) {
      console.error("[Email] Resend contacto error:", JSON.stringify(error).slice(0, 800));
      const msg = (error as { message?: string })?.message || JSON.stringify(error).slice(0, 500);
      return { ok: false as const, error: msg };
    }
    if (!data?.id) {
      console.error("[Email] Resend contacto sem id:", JSON.stringify(data).slice(0, 800));
      return { ok: false as const, error: "Resposta sem id" };
    }
    console.log(`[Email] Contacto enviado para ${to} (id: ${data.id})`);
    return { ok: true as const };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[Email] Falha contacto:", msg.slice(0, 800));
    return { ok: false as const, error: msg };
  }
}
