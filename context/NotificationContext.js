'use client'

import React, { createContext, useContext, useState, useCallback, useRef } from 'react'
import { CheckCircle, AlertCircle, AlertTriangle, Info, X, Trash2, HelpCircle } from 'lucide-react'

const NotificationContext = createContext()

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([])
  const [confirmState, setConfirmState] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirmar',
    cancelText: 'Cancelar',
    type: 'danger',
    resolve: null
  })

  // --- TOAST LOGIC ---
  const addNotification = useCallback((type, message, description = '') => {
    const id = Math.random().toString(36).substr(2, 9)
    setNotifications((prev) => [...prev, { id, type, message, description }])

    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id))
    }, 5000)
  }, [])

  const removeNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }, [])

  const success = useCallback((message, description) => addNotification('success', message, description), [addNotification])
  const error = useCallback((message, description) => addNotification('error', message, description), [addNotification])
  const warning = useCallback((message, description) => addNotification('warning', message, description), [addNotification])
  const info = useCallback((message, description) => addNotification('info', message, description), [addNotification])

  // --- CONFIRM DIALOG LOGIC ---
  const confirm = useCallback((options = {}) => {
    return new Promise((resolve) => {
      setConfirmState({
        isOpen: true,
        title: options.title || '¿Estás seguro?',
        message: options.message || 'Esta acción no se puede deshacer.',
        confirmText: options.confirmText || 'Confirmar',
        cancelText: options.cancelText || 'Cancelar',
        type: options.type || 'danger',
        resolve
      })
    })
  }, [])

  const handleConfirm = () => {
    if (confirmState.resolve) confirmState.resolve(true)
    setConfirmState(prev => ({ ...prev, isOpen: false }))
  }

  const handleCancel = () => {
    if (confirmState.resolve) confirmState.resolve(false)
    setConfirmState(prev => ({ ...prev, isOpen: false }))
  }

  return (
    <NotificationContext.Provider value={{ notifications, success, error, warning, info, confirm, removeNotification }}>
      {children}
      <Toaster notifications={notifications} remove={removeNotification} />
      <ConfirmDialog state={confirmState} onConfirm={handleConfirm} onCancel={handleCancel} />
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}

// --- INTERNAL COMPONENTS ---

function Toaster({ notifications, remove }) {
  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 w-full max-w-sm pointer-events-none">
      {notifications.map((n) => (
        <div 
          key={n.id}
          className={`
            pointer-events-auto
            flex items-start gap-3 p-4 rounded-xl shadow-2xl border backdrop-blur-md animate-in slide-in-from-right duration-300
            ${n.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : ''}
            ${n.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-500' : ''}
            ${n.type === 'warning' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' : ''}
            ${n.type === 'info' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : ''}
          `}
        >
          <div className="flex-shrink-0 mt-0.5">
            {n.type === 'success' && <CheckCircle size={20} />}
            {n.type === 'error' && <AlertCircle size={20} />}
            {n.type === 'warning' && <AlertTriangle size={20} />}
            {n.type === 'info' && <Info size={20} />}
          </div>
          
          <div className="flex-grow">
            <h4 className="font-bold text-sm leading-tight text-white mb-0.5">{n.message}</h4>
            {n.description && <p className="text-xs opacity-80 font-medium leading-relaxed">{n.description}</p>}
          </div>

          <button 
            onClick={() => remove(n.id)}
            className="flex-shrink-0 opacity-50 hover:opacity-100 transition-opacity"
          >
            <X size={16} className="text-white" />
          </button>
        </div>
      ))}
    </div>
  )
}

function ConfirmDialog({ state, onConfirm, onCancel }) {
  if (!state.isOpen) return null

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className={`p-3 rounded-full ${state.type === 'danger' ? 'bg-red-500/20 text-red-500' : 'bg-blue-500/20 text-blue-500'}`}>
              {state.type === 'danger' ? <Trash2 size={24} /> : <HelpCircle size={24} />}
            </div>
            <div>
              <h3 className="text-xl font-bold text-white leading-tight">{state.title}</h3>
            </div>
          </div>
          <p className="text-gray-400 text-sm leading-relaxed mb-8">
            {state.message}
          </p>
          <div className="flex gap-3">
            <button 
              onClick={onCancel}
              className="flex-1 px-4 py-3 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-xl transition-colors"
            >
              {state.cancelText}
            </button>
            <button 
              onClick={onConfirm}
              className={`flex-1 px-4 py-3 font-bold rounded-xl transition-all active:scale-95 text-white shadow-lg
                ${state.type === 'danger' ? 'bg-red-600 hover:bg-red-700 shadow-red-900/20' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-900/20'}
              `}
            >
              {state.confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
