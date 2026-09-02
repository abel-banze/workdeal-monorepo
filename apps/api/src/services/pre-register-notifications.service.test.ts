import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock do Resend para testar o canal de email sem chamadas reais.
vi.mock("../lib/resend.js", () => ({
  resend: { emails: { send: vi.fn() } },
  EMAIL_FROM: "Workdeal <noreply@example.com>",
}));

import {
  notifyCompanyPreRegister,
  sendEmail,
  sendSms,
  sendWhatsApp,
  webOrigin,
  BASE_URL,
} from "./pre-register-notifications.service.js";
import { resend } from "../lib/resend.js";

const fetchMock = vi.fn<typeof fetch>();

const baseInput = {
  companyName: "Construções XYZ",
  contactName: "Ana Mondlane",
  contactPhone: "+258 82 123 4567",
  contactEmail: "contacto@xyz.co.mz",
  completionUrl: "https://workdeal.co.mz/pre-register/abc-123",
  formattedAddress: "Av. Julius Nyerere, Maputo",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", fetchMock);
  delete process.env.SMS_USER_TOKEN;
  delete process.env.SMS_API_URL;
  delete process.env.ZERNIO_API_KEY;
  delete process.env.ZERNIO_PHONE_ID;
  process.env.NODE_ENV = "test";
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("pre-register notifications", () => {
  describe("webOrigin", () => {
    it("usa a BASE_URL fixa https://workdeal.co.mz (não lê ALLOWED_ORIGINS)", () => {
      process.env.ALLOWED_ORIGINS = "http://something-else";
      expect(webOrigin()).toBe("https://workdeal.co.mz");
      expect(BASE_URL).toBe("https://workdeal.co.mz");
    });
  });

  describe("sendWhatsApp", () => {
    it("envia template onboarding_request com {{1}}=nome e {{2}}=link completo", async () => {
      process.env.ZERNIO_API_KEY = "z-key";
      process.env.ZERNIO_PHONE_ID = "acc-1";

      fetchMock.mockResolvedValueOnce({
        ok: true,
        text: async () => "",
      } as unknown as Response);

      const result = await sendWhatsApp(baseInput);

      expect(result.ok).toBe(true);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
      expect(url).toBe("https://zernio.com/api/v1/inbox/conversations");
      const body = JSON.parse(init.body as string) as {
        accountId: string;
        participantId: string;
        templateName: string;
        templateLanguage: string;
        templateParams: string[];
      };
      expect(body.accountId).toBe("acc-1");
      expect(body.participantId).toBe("258821234567");
      expect(body.templateName).toBe("onboarding_request");
      expect(body.templateLanguage).toBe("pt_PT");
      // {{1}} = nome da organização, {{2}} = link completo
      expect(body.templateParams).toEqual([baseInput.companyName, baseInput.completionUrl]);
    });

    it("salta quando não há contactPhone", async () => {
      process.env.ZERNIO_API_KEY = "z-key";
      process.env.ZERNIO_PHONE_ID = "acc-1";
      const result = await sendWhatsApp({ ...baseInput, contactPhone: null });
      expect(result.skipped).toBe(true);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("usa WHATSAPP_API_TOKEN como fallback do token Zernio", async () => {
      process.env.WHATSAPP_API_TOKEN = "wa-token";
      process.env.ZERNIO_PHONE_ID = "acc-1";
      fetchMock.mockResolvedValueOnce({ ok: true, text: async () => "" } as unknown as Response);
      await sendWhatsApp(baseInput);
      const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
      const headers = init.headers as Record<string, string>;
      expect(headers.Authorization).toBe("Bearer wa-token");
    });
  });

  describe("sendSms", () => {
    it("envia SMS para o número normalizado quando o token está presente", async () => {
      process.env.SMS_USER_TOKEN = "s-token";
      fetchMock.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ status: "successful" }),
      } as unknown as Response);

      const result = await sendSms(baseInput);

      expect(result.ok).toBe(true);
      const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
      expect(url).toContain("/international-sms/submit");
      const body = JSON.parse(init.body as string) as { numbers: string[]; user_token: string };
      expect(body.user_token).toBe("s-token");
      expect(body.numbers).toEqual(["+258821234567"]);
    });

    it("salta quando não há contactPhone", async () => {
      process.env.SMS_USER_TOKEN = "s-token";
      const result = await sendSms({ ...baseInput, contactPhone: null });
      expect(result.skipped).toBe(true);
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe("sendEmail", () => {
    it("envia email com assunto e destinatário correctos", async () => {
      const resendSend = vi.mocked(resend!.emails.send);
      resendSend.mockResolvedValueOnce({ data: { id: "email-1" }, error: null, headers: {} as Record<string, string> });

      const result = await sendEmail(baseInput);

      expect(result.ok).toBe(true);
      expect(resendSend).toHaveBeenCalledTimes(1);
      const call = resendSend.mock.calls[0]![0];
      expect(call.to).toBe(baseInput.contactEmail);
      expect(call.subject).toContain(baseInput.companyName);
      expect(call.from).toBe("Workdeal <noreply@example.com>");
      expect(call.html).toContain(baseInput.completionUrl);
    });

    it("salta quando não há contactEmail", async () => {
      const result = await sendEmail({ ...baseInput, contactEmail: null });
      expect(result.skipped).toBe(true);
    });

    it("reporta falha quando o Resend devolve erro", async () => {
      const resendSend = vi.mocked(resend!.emails.send);
      resendSend.mockResolvedValueOnce({
        data: null,
        error: { statusCode: 429, name: "rate_limit_exceeded", message: "quota excedida" },
        headers: null,
      });

      const result = await sendEmail(baseInput);

      expect(result.ok).toBe(false);
      expect(result.error).toBe("quota excedida");
    });
  });

  describe("notifyCompanyPreRegister", () => {
    it("agrega os resultados dos três canais", async () => {
      process.env.SMS_USER_TOKEN = "s-token";
      process.env.ZERNIO_API_KEY = "z-key";
      process.env.ZERNIO_PHONE_ID = "acc-1";
      const resendSend = vi.mocked(resend!.emails.send);
      resendSend.mockResolvedValueOnce({ data: { id: "e" }, error: null, headers: {} as Record<string, string> });
      fetchMock
        .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify({ status: "successful" }) } as unknown as Response)
        .mockResolvedValueOnce({ ok: true, text: async () => "" } as unknown as Response);

      const result = await notifyCompanyPreRegister(baseInput);

      expect(result.email.ok).toBe(true);
      expect(result.sms.ok).toBe(true);
      expect(result.whatsapp.ok).toBe(true);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });
});
