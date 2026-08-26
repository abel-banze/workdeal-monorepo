"use client";

import Link from "next/link";
import { signOut } from "@/app/actions/auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { LogOutIcon, LayoutDashboardIcon, UserIcon, SettingsIcon } from "lucide-react";

export function UserDropdown({ user }: { user: { name: string; email: string; image?: string | null } }) {
  const initials = user.name.slice(0, 2).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            aria-label="Menu do utilizador"
            className="inline-flex size-9 items-center justify-center rounded-full bg-[#0F1A2E] text-white text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#0B5E56] focus:ring-offset-2"
          >
            {initials}
          </button>
        }
      />
      <DropdownMenuContent align="end" sideOffset={8} className="w-56">
        <DropdownMenuLabel className="p-0 font-normal">
          <div className="flex items-center gap-2 px-2 py-2">
            <div className="flex size-8 items-center justify-center rounded-full bg-[#0F1A2E] text-white text-xs font-bold">
              {initials}
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{user.name}</span>
              <span className="truncate text-xs text-muted-foreground">{user.email}</span>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem render={<Link href="/dashboard" />}>
            <LayoutDashboardIcon className="size-4" />
            Painel
          </DropdownMenuItem>
          <DropdownMenuItem render={<Link href="/dashboard/profile/edit" />}>
            <UserIcon className="size-4" />
            Perfil
          </DropdownMenuItem>
          <DropdownMenuItem render={<Link href="/dashboard/settings" />}>
            <SettingsIcon className="size-4" />
            Definições
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => signOut()} className="text-red-600 focus:text-red-600">
          <LogOutIcon className="size-4" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
