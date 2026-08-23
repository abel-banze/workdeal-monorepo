"use client"

import * as React from "react"
import { Select as SelectPrimitive } from "@base-ui/react"
import { ChevronDownIcon, CheckIcon } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"

const Select = SelectPrimitive.Root

function SelectValue(props: SelectPrimitive.Value.Props) {
  return <SelectPrimitive.Value data-slot="select-value" {...props} />
}

function SelectTrigger({
  className,
  children,
  ...props
}: SelectPrimitive.Trigger.Props) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      className={cn(
        "flex w-full items-center justify-between rounded-lg border border-[#D9D2C2] bg-[#F6F3EE] px-3 py-2 text-[13px] leading-none text-[#0F1A2E] outline-none transition placeholder:text-[#0F1A2E]/35 focus:border-[#0B5E56] focus:bg-white focus:ring-2 focus:ring-[#0B5E56]/15 data-[popup-open]:border-[#0B5E56] data-[popup-open]:bg-white data-[popup-open]:ring-2 data-[popup-open]:ring-[#0B5E56]/15 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon render={<ChevronDownIcon className="size-4 shrink-0 opacity-50" />} />
    </SelectPrimitive.Trigger>
  )
}

function SelectContent({
  className,
  children,
  sideOffset = 6,
  ...props
}: SelectPrimitive.Popup.Props & { sideOffset?: number }) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/10 backdrop-blur-[1px]" />
      <SelectPrimitive.Positioner sideOffset={sideOffset} className="isolate z-50">
        <SelectPrimitive.Popup
          data-slot="select-content"
          className={cn(
            "relative max-h-[min(calc(var(--available-height)-1rem),300px)] w-[var(--anchor-width)] min-w-[8rem] overflow-hidden rounded-xl border border-[#D9D2C2] bg-white text-[#0F1A2E] shadow-[0_8px_24px_rgba(15,26,46,0.12)] duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
            className
          )}
          {...props}
        >
          <SelectPrimitive.ScrollUpArrow className="flex h-6 items-center justify-center bg-white text-[#0F1A2E]/40" />
          <SelectPrimitive.List
            data-slot="select-list"
            className="max-h-[280px] overflow-y-auto overscroll-contain p-1"
          >
            {children}
          </SelectPrimitive.List>
          <SelectPrimitive.ScrollDownArrow className="flex h-6 items-center justify-center bg-white text-[#0F1A2E]/40" />
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  )
}

function SelectItem({
  className,
  children,
  ...props
}: SelectPrimitive.Item.Props) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        "relative flex w-full cursor-default select-none items-center gap-2 rounded-lg px-2.5 py-2 text-sm outline-none data-highlighted:bg-[#F6F3EE] data-highlighted:text-[#0F1A2E] data-[selected]:bg-[#0B5E56] data-[selected]:text-white data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      <SelectPrimitive.ItemText className="flex-1 text-left">{children}</SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator className="flex size-4 items-center justify-center">
        <CheckIcon className="size-3.5" />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  )
}

function SelectGroup(props: SelectPrimitive.Group.Props) {
  return <SelectPrimitive.Group data-slot="select-group" {...props} />
}

function SelectLabel({ className, ...props }: SelectPrimitive.GroupLabel.Props) {
  return (
    <SelectPrimitive.GroupLabel
      data-slot="select-label"
      className={cn("px-2 py-1.5 text-[11px] font-bold tracking-widest text-[#0F1A2E]/40 uppercase", className)}
      {...props}
    />
  )
}

function SelectSeparator({ className, ...props }: SelectPrimitive.Separator.Props) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn("-mx-1 my-1 h-px bg-[#D9D2C2]", className)}
      {...props}
    />
  )
}

export {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  SelectGroup,
  SelectLabel,
  SelectSeparator,
}
