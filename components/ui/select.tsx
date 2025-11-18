"use client";
import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { cn } from "@/lib/utils";

export const Select = SelectPrimitive.Root;
export const SelectTrigger = ({ className, ...props }: React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>) => (
  <SelectPrimitive.Trigger
    className={cn(
      "inline-flex h-10 w-full items-center justify-between rounded-md border border-slate-300 bg-white px-3 py-2 text-sm",
      className
    )}
    {...props}
  />
);
export const SelectValue = SelectPrimitive.Value;
export const SelectContent = ({ className, children, ...props }: React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content> & { children?: React.ReactNode }) => (
  <SelectPrimitive.Content
    className={cn("z-50 rounded-md border border-slate-200 bg-white shadow-md", className)}
    {...props}
  >
    <SelectPrimitive.Viewport className="p-1">
      {children}
    </SelectPrimitive.Viewport>
  </SelectPrimitive.Content>
);
export const SelectItem = ({ className, children, ...props }: React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item> & { children?: React.ReactNode }) => (
  <SelectPrimitive.Item
    className={cn("cursor-pointer px-3 py-2 text-sm hover:bg-slate-100", className)}
    {...props}
  >
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
);