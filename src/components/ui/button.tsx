import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors duration-(--motion-quick,150ms) disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
  {
    variants: {
      variant: {
        default: "bg-accent text-accent-fg hover:opacity-90",
        ghost: "text-muted hover:bg-elevated hover:text-fg",
        outline: "border border-border bg-transparent text-fg hover:bg-elevated",
        danger: "bg-danger text-fg hover:opacity-90",
      },
      size: {
        default: "h-10 px-3.5 text-sm",
        sm: "h-8 px-2.5 text-xs",
        icon: "size-11",
        "icon-sm": "size-8",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export function Button({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<"button"> & VariantProps<typeof buttonVariants>) {
  return (
    <button className={cn(buttonVariants({ variant, size }), className)} {...props} />
  );
}
