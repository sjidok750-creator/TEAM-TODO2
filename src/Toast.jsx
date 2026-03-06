import { useState, useEffect } from 'react'

// Single toast item
function ToastItem({ toast, onRemove }) {
  useEffect(() => {
    const t = setTimeout(() => onRemove(toast.id), toast.duration ?? 4000)
    return () => clearTimeout(t)
  }, [toast.id, toast.duration, onRemove])

  return (
    <div
      className="flex items-start gap-2.5 bg-gray-900 text-white text-sm rounded-xl px-4 py-3 shadow-lg max-w-xs w-full animate-slide-up"
      onClick={() => onRemove(toast.id)}
    >
      <span className="text-base shrink-0">{toast.icon ?? '🔔'}</span>
      <p className="leading-snug break-words flex-1">{toast.message}</p>
    </div>
  )
}

// Container + hook
export function useToast() {
  const [toasts, setToasts] = useState([])

  function addToast(message, { icon, duration } = {}) {
    const id = Date.now() + Math.random()
    setToasts((prev) => [...prev, { id, message, icon, duration }])
  }

  function removeToast(id) {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  function ToastContainer() {
    return (
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <ToastItem toast={toast} onRemove={removeToast} />
          </div>
        ))}
      </div>
    )
  }

  return { addToast, ToastContainer }
}
