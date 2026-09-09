"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { validateSubscriptionPayment } from "@/app/actions/admin";

// Validação de activação: confirma o pagamento, activa a subscrição em
// pausa, emite o recibo e envia-o à empresa. Nota opcional → notas internas.
export function PaymentValidateButton({
  paymentId,
  disabled,
}: {
  paymentId: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleValidate() {
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const res = await validateSubscriptionPayment(paymentId, note.trim() || undefined);
      if (!res.success) throw new Error(res.error?.message ?? "Falha ao validar pagamento");
      const data = res.data as { receipt?: { receiptNumber?: string }; receiptEmail?: { ok?: boolean } } | null;
      const receiptNo = data?.receipt?.receiptNumber ? ` Recibo ${data.receipt.receiptNumber}.` : "";
      const mailWarn = data?.receiptEmail && !data.receiptEmail.ok ? " (email do recibo falhou — reenviar manualmente)" : "";
      setSuccess(`Pagamento validado, subscrição activada.${receiptNo}${mailWarn}`);
      setNote("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao validar pagamento");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex w-full flex-col gap-2">
      {error && <p className="text-xs text-destructive">{error}</p>}
      {success && <p className="text-xs text-emerald-600">{success}</p>}
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={1000}
        placeholder="Nota interna (opcional)"
        className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
      />
      <Button
        size="sm"
        disabled={disabled || loading}
        onClick={handleValidate}
      >
        {loading ? "A validar…" : "Validar pagamento e activar"}
      </Button>
    </div>
  );
}
