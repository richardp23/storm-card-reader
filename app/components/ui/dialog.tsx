import * as React from "react"
import { cn } from "../../lib/utils"

interface DialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children?: React.ReactNode
}

export function Dialog({
  open = false,
  onOpenChange,
  children,
}: DialogProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      <div 
        className="fixed inset-0 bg-gray-50/80 dark:bg-black/80 backdrop-blur-sm" 
        onClick={() => onOpenChange?.(false)}
      />
      <div className="fixed inset-0 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="min-h-full flex items-center justify-center p-4">
          <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-lg w-full max-w-lg">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

interface DialogContentProps {
  children: React.ReactNode
  className?: string
}

export function DialogContent({ children, className }: DialogContentProps) {
  return <div className={cn("p-6 space-y-6 rounded-xl", className)}>{children}</div>
}

interface DialogHeaderProps {
  children: React.ReactNode
  className?: string
}

export function DialogHeader({ children, className }: DialogHeaderProps) {
  return <div className={cn("space-y-1.5", className)}>{children}</div>
}

interface DialogFooterProps {
  children: React.ReactNode
  className?: string
}

export function DialogFooter({ children, className }: DialogFooterProps) {
  return (
    <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 border-t border-border pt-4", className)}>
      {children}
    </div>
  )
}

interface DialogTitleProps {
  children: React.ReactNode
  className?: string
}

export function DialogTitle({ children, className }: DialogTitleProps) {
  return <h2 className={cn("text-lg font-semibold leading-none tracking-tight", className)}>{children}</h2>
}

interface DialogDescriptionProps {
  children: React.ReactNode
  className?: string
}

export function DialogDescription({ children, className }: DialogDescriptionProps) {
  return <p className={cn("text-sm text-muted-foreground", className)}>{children}</p>
} 