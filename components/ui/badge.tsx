import * as React from "react"
import { cn } from "@/lib/utils"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "outline" | "success" | "warning" | "danger";
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variantClass =
    variant === "success"   ? "badge-success" :
    variant === "warning"   ? "badge-warning" :
    variant === "danger"    ? "badge-danger" :
    variant === "outline"   ? "badge-outline" :
    variant === "secondary" ? "badge-outline" : "badge-default";

  return (
    <div
      className={cn("badge", variantClass, className)}
      {...props}
    />
  )
}

export { Badge }
