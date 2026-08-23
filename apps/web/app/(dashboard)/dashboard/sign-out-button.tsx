"use client"

import { signOut } from "@/app/actions/auth"

export function SignOutButton() {
  return (
    <button
      onClick={() => void signOut()}
      className="rounded-md border border-input px-4 py-2 text-sm font-medium"
    >
      Terminar sessão
    </button>
  )
}
