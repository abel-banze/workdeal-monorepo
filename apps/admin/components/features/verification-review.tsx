"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckIcon, XIcon } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@workspace/ui/components/dialog";
import { Button } from "@/components/ui/button";
import { approveVerification, rejectVerification } from "@/app/actions/admin";

export function VerificationReview({ requestId, requestName }: { requestId: string; requestName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(action: "approve" | "reject") {
    setError(null);
    setBusy(true);
    try {
      const res =
        action === "approve"
          ? await approveVerification(requestId, note.trim() || undefined)
          : await rejectVerification(requestId, note.trim() || undefined);
      if (!res.success) {
        setError(res.error?.message ?? "Falha ao submeter a revisão");
        return;
      }
      setOpen(false);
      setNote("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao submeter a revisão");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="outline" onClick={() => setOpen(true)} disabled={busy}>
          <XIcon className="size-3.5" /> Rejeitar
        </Button>
        <Button size="sm" onClick={() => setOpen(true)} disabled={busy}>
          <CheckIcon className="size-3.5" /> Aprovar
        </Button>
      </div>
      {error && <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revisão de {requestName}</DialogTitle>
            <DialogDescription>
              Confirma a decisão. A aprovação atribui o selo de verificação correspondente ao nível do pedido.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="review-note">Nota (opcional)</label>
            <textarea
              id="review-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={1000}
              rows={3}
              placeholder="Motivo da decisão, visível no pedido…"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            <p className="text-xs text-muted-foreground">Máximo 1000 caracteres.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setOpen(false)} disabled={busy}>
              Cancelar
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => void submit("reject")}
              disabled={busy}
            >
              Rejeitar
            </Button>
            <Button size="sm" onClick={() => void submit("approve")} disabled={busy}>
              Aprovar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}