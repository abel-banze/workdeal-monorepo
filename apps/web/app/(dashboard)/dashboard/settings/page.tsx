import { redirect } from "next/navigation"
import { requireAuth } from "@/lib/auth"

export default async function PersonalSettingsPage() {
  await requireAuth()
  // Definições pessoais são geridas no perfil — redirecciona
  redirect("/dashboard/profile/edit")
}
