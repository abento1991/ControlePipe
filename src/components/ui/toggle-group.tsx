"use client";
import * as React from "react";
import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group";
import { cn } from "@/lib/utils";

const ToggleGroup = React.forwardRef<React.ElementRef<typeof ToggleGroupPrimitive.Root>, React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Root>>(({ className, children, ...props }, ref) => (
  <ToggleGroupPrimitive.Root ref={ref} className={cn("inline-flex items-center rounded-md border bg-card p-0.5 gap-0.5", className)} {...props}>
    {children}
  </ToggleGroupPrimitive.Root>
));
ToggleGroup.displayName = ToggleGroupPrimitive.Root.displayName;

const ToggleGroupItem = React.forwardRef<React.ElementRef<typeof ToggleGroupPrimitive.Item>, React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Item>>(({ className, children, ...props }, ref) => (
  <ToggleGroupPrimitive.Item ref={ref} className={cn("inline-flex h-7 items-center justify-center rounded px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground data-[state=on]:bg-leto-ink data-[state=on]:text-white disabled:opacity-50", className)} {...props}>
    {children}
  </ToggleGroupPrimitive.Item>
));
ToggleGroupItem.displayName = ToggleGroupPrimitive.Item.displayName;

export { ToggleGroup, ToggleGroupItem };
