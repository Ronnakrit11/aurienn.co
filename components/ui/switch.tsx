"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface SwitchProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string;
}

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, ...props }, ref) => (
    <label className="relative inline-flex items-center cursor-pointer">
      <input
        type="checkbox"
        className="sr-only peer"
        ref={ref}
        {...props}
      />
      <div className={cn(
        "w-11 h-6 bg-gray-200 rounded-full peer",
        "dark:bg-gray-700",
        "peer-checked:after:translate-x-full",
        "peer-checked:after:border-white",
        "after:content-['']",
        "after:absolute",
        "after:top-0.5",
        "after:left-[2px]",
        "after:bg-white",
        "after:border-gray-300",
        "after:border",
        "after:rounded-full",
        "after:h-5",
        "after:w-5",
        "after:transition-all",
        "peer-checked:bg-orange-500",
        className
      )} />
    </label>
  )
)
Switch.displayName = "Switch"

export { Switch }