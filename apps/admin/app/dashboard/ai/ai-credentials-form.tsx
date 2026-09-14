"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { upsertAiCredential, deleteAiCredential, type CredentialResult } from "./actions";

export interface CredentialSource {
  provider: string;
  label: string;
  hasEnvKey: boolean;
  envKeyMasked: string | null;
  hasDbKey: boolean;
  dbKeyMasked: string | null;
  credentialUpdatedAt: string | null;
}

export interface AiCredentialsFormProps {
  providers: CredentialSource[];
  masterKeyConfigured: boolean;
  isAdmin: boolean;
}

export function AiCredentialsForm({ providers, masterKeyConfigured, isAdmin }: AiCredentialsFormProps) {
  if (!isAdmin) {
    return (
      <p className="text-sm text-muted-foreground">
        Apenas administradores podem gerir credenciais de IA.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {!masterKeyConfigured && (
        <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <strong>Chave-mestra em falta.</strong> Define a env <code>AI_CREDENTIALS_MASTER_KEY</code> no servidor para
          guardar credenciais na base de dados. Enquanto isso, todas as chaves são lidas do env.
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {providers.map((p) => (
          <ProviderCredentialCard key={p.provider} {...p} masterKeyConfigured={masterKeyConfigured} />
        ))}
      </div>
    </div>
  );
}

function ProviderCredentialCard({
  provider,
  label,
  hasEnvKey,
  envKeyMasked,
  hasDbKey,
  dbKeyMasked,
  credentialUpdatedAt,
  masterKeyConfigured,
}: CredentialSource & { masterKeyConfigured: boolean }) {
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<CredentialResult | null>(null);

  async function handleSave() {
    if (!apiKey.trim()) return;
    setSaving(true);
    setResult(null);
    const res = await upsertAiCredential({ provider: provider as "google" | "anthropic" | "openai", apiKey: apiKey.trim() });
    setSaving(false);
    setResult(res.success ? { ok: true, message: "Credencial guardada e encriptada." } : { ok: false, message: res.error?.message ?? "Falha ao guardar." });
    if (res.success) setApiKey("");
  }

  async function handleDelete() {
    if (!window.confirm(`Eliminar a credencial de ${label}? O motor voltará a usar a env key (se existir).`)) return;
    setResult(null);
    const res = await deleteAiCredential(provider);
    setResult(res.success ? { ok: true, message: "Credencial eliminada." } : { ok: false, message: res.error?.message ?? "Falha ao eliminar." });
  }

  return (
    <div className="space-y-3 rounded-md border p-4">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">
          Env: {hasEnvKey && envKeyMasked ? <code>{envKeyMasked}</code> : <span className="text-muted-foreground">não definida</span>}
        </p>
      </div>

      <div>
        <p className="text-xs text-muted-foreground">
          BD: {hasDbKey && dbKeyMasked ? (
            <>
              <code>{dbKeyMasked}</code>
              {credentialUpdatedAt && <span className="ml-1">({new Date(credentialUpdatedAt).toLocaleDateString("pt-MZ")})</span>}
            </>
          ) : (
            <span className="text-muted-foreground">nenhuma credencial guardada</span>
          )}
        </p>
      </div>

      {masterKeyConfigured && (
        <div className="space-y-2">
          <input
            type="password"
            placeholder={`API key ${label}`}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs font-mono"
          />
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={handleSave}
              disabled={saving || !apiKey.trim()}
            >
              {saving ? "A guardar…" : "Guardar"}
            </Button>
            {hasDbKey && (
              <Button
                size="sm"
                variant="destructive"
                onClick={handleDelete}
              >
                Eliminar
              </Button>
            )}
          </div>
        </div>
      )}

      {result && (
        <p className={`text-xs ${result.ok ? "text-emerald-600" : "text-red-600"}`}>{result.message}</p>
      )}
    </div>
  );
}