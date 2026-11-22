import * as React from "react"
import { cn } from "@/lib/utils"

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, ...props }, ref) => (
    <input
      type="checkbox"
      ref={ref}
      style={{ accentColor: "#10b981", width: 16, height: 16, cursor: "pointer", flexShrink: 0 }}
      className={cn(className)}
      {...props}
    />
  )
)
Checkbox.displayName = "Checkbox"

export { Checkbox }
