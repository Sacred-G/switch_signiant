import * as React from 'react'
import { useState, useCallback } from 'react'

export interface ToastInfo {
  id: string
  title?: string
  description?: string
  variant?: 'default' | 'destructive'
  action?: React.ReactNode
}

export type ToastOptions = Omit<ToastInfo, 'id'>

export interface UseToastReturn {
  toast: (options: ToastOptions) => void
  toasts: ToastInfo[]
}

export type ToastProps = Omit<ToastInfo, 'title' | 'description' | 'action'> & {
  className?: string
}

export function useToast(): UseToastReturn {
  const [toasts, setToasts] = useState<ToastInfo[]>([])

  const toast = useCallback((options: ToastOptions) => {
    const id = Math.random().toString(36).substr(2, 9)
    const newToast: ToastInfo = {
      id,
      title: options.title,
      description: options.description,
      variant: options.variant || 'default',
      action: options.action,
    }

    setToasts((currentToasts) => [...currentToasts, newToast])

    // Auto dismiss after 5 seconds
    setTimeout(() => {
      setToasts((currentToasts) =>
        currentToasts.filter((toast) => toast.id !== id)
      )
    }, 5000)
  }, [])

  return { toast, toasts }
}
