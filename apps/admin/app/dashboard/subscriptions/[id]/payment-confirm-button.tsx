"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { confirmManualPayment } from "@/app/actions/admin";

export function PaymentConfirmButton({
  paymentId,
  disabled,
}: {
  paymentId: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleConfirm() {
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const res = await confirmManualPayment(paymentId);
      if (!res.success) throw new Error(res.error?.message ?? "Falha ao confirmar pagamento");
      const data = res.data as { alreadyPaid?: boolean } | null;
      setSuccess(data?.alreadyPaid ? "Pagamento já estava confirmado." : "Pagamento confirmado e factura marcada como paga.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao confirmar pagamento");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      {error && <p className="text-xs text-destructive">{error}</p>}
      {success && <p className="text-xs text-emerald-600">{success}</p>}
      <Button
        size="sm"
        variant="outline"
        disabled={disabled || loading}
        onClick={handleConfirm}
      >
        {loading ? "A confirmar…" : "Confirmar pagamento"}
      </Button>
    </div>
  );
}