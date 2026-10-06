import * as React from "react"

import { cn } from "@/lib/utils"

/* The app's buttons are defined once, as CSS component classes in index.css
   (`.btn-soft` plus the `.btn-primary` / `.btn-outline` / `.btn-ghost` /
   `.btn-destructive` variants). This component is a thin wrapper over those
   classes so the auth screens and the in-app pages share one button style
   rather than a second, parallel variant set. */
const VARIANT_CLASS = {
  default: "btn-primary",
  primary: "btn-primary",
  outline: "btn-outline",
  ghost: "btn-ghost",
  secondary: "btn-ghost",
  destructive: "btn-destructive",
}

const SIZE_CLASS = {
  default: "",
  sm: "px-3 py-1.5 text-xs",
  lg: "px-8",
  icon: "h-10 w-10 px-0",
}

const Button = React.forwardRef((/** @type {any} */ props, ref) => {
  const { className, variant = "default", size = "default", ...rest } = props
  return (
    <button
      ref={ref}
      className={cn("btn-soft", VARIANT_CLASS[variant] || VARIANT_CLASS.default, SIZE_CLASS[size], className)}
      {...rest}
    />
  )
})
Button.displayName = "Button"

export { Button }
