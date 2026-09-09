import {
  VERIFICATION_PAYMENT_METHOD_LABELS_PT,
  VERIFICATION_STATUS_LABELS_PT,
  VERIFICATION_LEVEL_LABELS_PT,
  VERIFICATION_TRUST_PAYMENT,
  verificationDocumentLabel,
} from "@workdeal/shared";
import type { AdminVerificationView } from "@workdeal/shared";
import { VerificationReview } from "./verification-review";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700",
  in_review: "bg-blue-50 text-blue-700",
  approved: "bg-green-50 text-green-700",
  rejected: "bg-destructive/10 text-destructive",
};

const PROFILE_TYPE_LABELS: Record<string, string> = {
  company: "Empresa",
  individual: "Individual",
  institution: "Instituição",
};

function fmtDate(v: string | null | undefined): string {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-MZ");
}

export function VerificationsTable({
  rows,
  mode,
}: {
  rows: AdminVerificationView[];
  mode: "active" | "history";
}) {
  return (
    <div className="rounded-md border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/40 text-left">
            <th className="px-3 py-2 font-medium">Perfil</th>
            <th className="px-3 py-2 font-medium">Nível</th>
            <th className="px-3 py-2 font-medium">Estatutos / BR</th>
            <th className="px-3 py-2 font-medium">Documentos</th>
            <th className="px-3 py-2 font-medium">Comprovativo</th>
            <th className="px-3 py-2 font-medium">Estado</th>
            {mode === "history" ? (
              <th className="px-3 py-2 font-medium">Revisão</th>
            ) : (
              <th className="px-3 py-2 text-right font-medium">Ações</th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">
                Nenhum pedido de verificação encontrado.
              </td>
            </tr>
          ) : (
            rows.map((r) => (
              <tr key={r.id} className="border-b last:border-0 align-top">
                <td className="px-3 py-2">
                  <span className="block font-medium">{r.profileName ?? r.profileId}</span>
                  {r.profileType && (
                    <span className="block text-xs text-muted-foreground">{PROFILE_TYPE_LABELS[r.profileType] ?? r.profileType}</span>
                  )}
                  <span className="block text-xs text-muted-foreground">{r.organizationName ?? r.ownerEmail ?? ""}</span>
                </td>
                <td className="px-3 py-2">{VERIFICATION_LEVEL_LABELS_PT[r.level] ?? r.level}</td>
                <td className="px-3 py-2">
                  {r.brNumber ? (
                    <span className="rounded-full border px-2 py-0.5 font-mono text-xs">{r.brNumber}</span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1">
                    {r.documents.length === 0 ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      r.documents.map((d) => (
                        <a
                          key={d.fileId}
                          href={d.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-full border px-2 py-0.5 text-xs hover:bg-accent"
                        >
                          {verificationDocumentLabel(d.type)}
                        </a>
                      ))
                    )}
                  </div>
                </td>
                <td className="px-3 py-2">
                  {r.paymentProof?.url ? (
                    <div className="space-y-1">
                      <a
                        href={r.paymentProof.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-md border border-input bg-background px-2 py-0.5 text-xs font-medium hover:bg-accent"
                      >
                        Ver comprovativo ↗
                      </a>
                      <div className="text-xs text-muted-foreground">
                        {VERIFICATION_PAYMENT_METHOD_LABELS_PT[r.paymentProof.method] ?? r.paymentProof.method}
                        {r.paymentProof.reference ? ` · ${r.paymentProof.reference}` : ""}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {VERIFICATION_TRUST_PAYMENT.planName} · {VERIFICATION_TRUST_PAYMENT.bankName} · {VERIFICATION_TRUST_PAYMENT.nib}
                      </div>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">Sem comprovativo</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[r.status] ?? "bg-gray-100 text-gray-600"}`}>
                    {VERIFICATION_STATUS_LABELS_PT[r.status] ?? r.status}
                  </span>
                </td>
                {mode === "history" ? (
                  <td className="px-3 py-2">
                    <span className="block text-xs">{fmtDate(r.reviewedAt)}</span>
                    {r.reviewNote && <span className="block text-xs text-muted-foreground">{r.reviewNote}</span>}
                  </td>
                ) : (
                  <td className="px-3 py-2">
                    {r.status === "pending" || r.status === "in_review" ? (
                      <VerificationReview requestId={r.id} requestName={r.profileName ?? r.profileId} />
                    ) : (
                      <span className="block text-right text-xs text-muted-foreground">{fmtDate(r.reviewedAt)}</span>
                    )}
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}