"use client"

import { useState } from "react"
import { toast } from "sonner"
import { NOTIFICATION_PREFS_LABELS_PT, type NotificationPrefs } from "@workdeal/shared"
import { Switch } from "@workspace/ui/components/switch"

const CHANNELS: (keyof NotificationPrefs)[] = ["email", "whatsapp", "sms"]

export function NotificationsPrefsCard({
  organizationId,
  initial,
  canEdit,
}: {
  organizationId: string
  initial: NotificationPrefs
  canEdit: boolean
}) {
  const [prefs, setPrefs] = useState<NotificationPrefs>(initial)
  const [saving, setSaving] = useState<keyof NotificationPrefs | null>(null)

  async function onToggle(channel: keyof NotificationPrefs, checked: boolean) {
    if (!canEdit || saving) return
    const prev = prefs
    const next = { ...prefs, [channel]: checked }
    setPrefs(next)
    setSaving(channel)
    try {
      const { updateOrganizationNotificationPrefs } = await import("@/app/actions/organizations")
      await updateOrganizationNotificationPrefs(organizationId, next)
      toast.success("Preferências actualizadas.")
    } catch (err) {
      setPrefs(prev)
      toast.error(err instanceof Error ? err.message : "Falha ao guardar preferências.")
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="rounded-[20px] border border-[#D9D2C2] bg-white p-5">
      <h2 className="text-sm font-black text-[#0F1A2E]">Notificações</h2>
      <p className="mt-1 text-xs leading-relaxed text-[#0F1A2E]/60">
        Como a empresa quer ser notificada — cotações recebidas, alertas e avisos. Por defeito: email e WhatsApp.
      </p>
      <div className="mt-4 divide-y divide-[#D9D2C2]/60">
        {CHANNELS.map((channel) => {
          const meta = NOTIFICATION_PREFS_LABELS_PT[channel]
          return (
            <label key={channel} className={`flex items-center justify-between gap-4 py-3 ${canEdit ? "cursor-pointer" : ""}`}>
              <span>
                <span className="block text-sm font-bold text-[#0F1A2E]">{meta.title}</span>
                <span className="block text-xs text-[#0F1A2E]/55">{meta.hint}</span>
              </span>
              <Switch
                checked={prefs[channel]}
                disabled={!canEdit || saving !== null}
                onCheckedChange={(checked) => void onToggle(channel, checked)}
                aria-label={`Notificações por ${meta.title}`}
              />
            </label>
          )
        })}
      </div>
      {!canEdit && <p className="mt-3 text-xs font-medium text-[#7A1A0A]">Sem permissão `profile:edit` — contacta um `admin`/`owner`.</p>}
    </div>
  )
}
