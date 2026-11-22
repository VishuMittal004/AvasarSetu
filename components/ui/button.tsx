import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "link" | "danger";
  size?: "default" | "sm" | "lg" | "icon";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    const variantClass =
      variant === "default" ? "btn-primary" :
      variant === "outline" ? "btn-outline" :
      variant === "ghost"   ? "btn-ghost" :
      variant === "link"    ? "btn-ghost" :
      variant === "danger"  ? "btn-outline" : "btn-primary";

    const sizeClass =
      size === "sm"   ? "btn-sm" :
      size === "lg"   ? "btn-lg" :
      size === "icon" ? "btn-icon" : "";

    return (
      <button
        ref={ref}
        className={cn("btn", variantClass, sizeClass, className)}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
