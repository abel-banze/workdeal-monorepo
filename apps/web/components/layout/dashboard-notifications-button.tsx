"use client"

import { useState } from "react"
import { BellIcon } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"

export function DashboardNotificationsButton() {
  const [hasUnread] = useState(false)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="inline-flex size-8 items-center justify-center rounded-full border border-[#D9D2C2] bg-white text-[#0F1A2E]/60 transition-colors hover:bg-[#F6F3EE] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B5E56]/40"
        aria-label="Notificações"
      >
        <span className="relative">
          <BellIcon className="size-4" />
          {hasUnread && (
            <span className="absolute -right-0.5 -top-0.5 flex size-1.5 rounded-full bg-[#FF3B1F]" />
          )}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-72 rounded-2xl border-[#E4DED1]/80 bg-white p-1.5 shadow-lg">
        <div className="border-b border-[#E4DED1]/60 px-4 py-3">
          <p className="text-sm font-bold text-[#0F1A2E]">Notificações</p>
          <p className="text-[11px] text-[#0F1A2E]/55">Ainda não há notificações para mostrar. Em breve: propostas, requisições e mensagens.</p>
        </div>
        <DropdownMenuItem disabled className="px-4 py-6 text-center text-xs text-[#0F1A2E]/40">
          Sem novidades por agora
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
