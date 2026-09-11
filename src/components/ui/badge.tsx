import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center rounded-full border px-2 py-0.5 text-2xs font-medium leading-4 whitespace-nowrap transition-colors", {
  variants: {
    variant: {
      default: "border-transparent bg-primary text-primary-foreground",
      secondary: "border-transparent bg-secondary text-secondary-foreground",
      outline: "text-foreground",
      muted: "border-transparent bg-muted text-muted-foreground",
      accent: "border-transparent bg-leto-green/25 text-leto-green-deep",
      success: "border-transparent bg-success/15 text-success",
      warning: "border-transparent bg-warning/20 text-[#7a5a17]",
      danger: "border-transparent bg-danger/15 text-danger",
      info: "border-transparent bg-info/15 text-info",
    },
  },
  defaultVariants: { variant: "default" },
});

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
