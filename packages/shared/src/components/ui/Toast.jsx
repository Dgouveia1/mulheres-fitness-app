import { createContext, useCallback, useContext, useState } from 'react'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const show = useCallback((message, type = 'info', duration = 3000) => {
    const id = Date.now()
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), duration)
  }, [])

  const hide = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const typeStyles = {
    success: 'bg-emerald-500',
    error: 'bg-red-500',
    info: 'bg-primary',
    warning: 'bg-amber-500',
  }

  const typeIcons = {
    success: 'check_circle',
    error: 'error',
    info: 'info',
    warning: 'warning',
  }

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[60] flex flex-col gap-2 w-[90vw] max-w-sm pointer-events-none"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-white text-sm font-medium shadow-soft-lg pointer-events-auto cursor-pointer animate-slide-up ${typeStyles[toast.type] || typeStyles.info}`}
            onClick={() => hide(toast.id)}
          >
            <span className="material-icons text-base">{typeIcons[toast.type] || 'info'}</span>
            <span className="flex-1">{toast.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
