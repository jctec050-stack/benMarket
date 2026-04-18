'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { useData } from '@/context/DataContext'
import { useNotifications } from '@/context/NotificationContext'
import { formatCurrency } from '@/lib/utils'
import { db } from '@/lib/db'
import IngresoForm from '@/components/ingresos/IngresoForm'
import MovimientosList from '@/components/ingresos/MovimientosList'

export default function Dashboard() {
  const { user, profile, loading: authLoading } = useAuth()
  const { success, error: notifyError, confirm } = useNotifications()
  const isCajero = profile?.rol === 'cajero'
  const { 
    ingresos, 
    addIngreso, 
    deleteIngreso, 
    loadingData, 
    refreshData,
    selectedCaja,
    setSelectedCaja,
    selectedDate,
    setSelectedDate,
    selectedCajero,
    setSelectedCajero
  } = useData()
  const router = useRouter()

  // Fondo Fijo State (Local for now, should be persisted)
  const [fondoFijo, setFondoFijo] = useState(0)
  const [editingMovimiento, setEditingMovimiento] = useState(null)

  // Auth Protection
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  // Load Fondo Fijo from DB (Replaces legacy localStorage)
  useEffect(() => {
    const fetchFondo = async () => {
      if (selectedCaja) {
        const res = await db.getFondoFijo(selectedCaja);
        if (res.success) {
          setFondoFijo(res.data);
        }
      }
    };
    fetchFondo();
  }, [selectedCaja])

  const handleFondoFijoChange = async (e) => {
    // Remove all non-numeric characters for parsing
    const rawValue = e.target.value.replace(/\D/g, '')
    const val = rawValue ? parseInt(rawValue, 10) : 0
    
    setFondoFijo(val)
    
    // Save to Database (Replaces legacy localStorage)
    await db.setFondoFijo(selectedCaja, val);
  }

  const handleAddMovimiento = async (movimiento) => {
    const now = new Date()
    const timeString = now.toTimeString().split(' ')[0] // HH:MM:SS
    
    // Use the date from form (defaulting to selectedDate)
    const baseDate = movimiento?.fecha || selectedDate
    const datetimeString = `${baseDate}T${timeString}`
    const genId = () => {
      if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
      return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
    }

    const newMovimiento = {
      ...movimiento,
      id: movimiento?.id || genId(),
      fecha: movimiento?.fecha || datetimeString,
      caja: movimiento?.caja || selectedCaja,
      cajero: movimiento?.cajero || profile?.username || user?.email || 'unknown',
      arqueado: movimiento?.arqueado !== undefined ? movimiento.arqueado : false
    }
    
    const res = await addIngreso(newMovimiento)
    if (res?.success) {
      setEditingMovimiento(null)
      success('Éxito', 'Movimiento guardado correctamente.')
    } else {
      notifyError('Error al guardar', res?.error || 'No se pudo completar la operación.')
    }
    return res
  }

  const handleEditMovimiento = (mov) => {
    setEditingMovimiento(mov)
  }

  const handleDeleteMovimiento = async (id) => {
    const ok = await confirm({
      title: '¿Eliminar movimiento?',
      message: 'Esta acción borrará el registro de forma permanente de la base de datos.',
      confirmText: 'Eliminar',
      type: 'danger'
    })

    if (ok) {
      await deleteIngreso(id)
      setEditingMovimiento(prev => (prev?.id === id ? null : prev))
      success('Eliminado', 'El movimiento ha sido borrado.')
    }
  }

  if (authLoading || !user) {
    return <div className="flex h-screen items-center justify-center">Cargando...</div>
  }

  return (
    <div className="w-full">
      <main className="container mx-auto px-4 py-8 max-w-4xl flex flex-col items-center">
        {/* Header Section */}
        <div className="w-full flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              Ingresos - 
              {!isCajero ? (
                <select 
                  value={selectedCaja} 
                  onChange={(e) => setSelectedCaja(e.target.value)}
                  className="bg-transparent border-b-2 border-gray-300 focus:outline-none focus:border-blue-500 text-gray-800 cursor-pointer"
                >
                  <option value="Caja 1">Caja 1</option>
                  <option value="Caja 2">Caja 2</option>
                  <option value="Caja 3">Caja 3</option>
                  <option value="Tesoreria">Tesoreria</option>
                  <option value="Todas las cajas">Todas las cajas</option>
                </select>
              ) : (
                <span>{selectedCaja}</span>
              )}
            </h1>
            <p className="text-gray-500 text-sm font-medium mt-1">
              Configuración de Jornada
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-4">
            {/* Date Selector (Working Day) */}
            <div className="bg-white p-3 rounded-lg shadow-sm border border-blue-200 flex flex-col min-w-[150px]">
              <label className="text-[10px] font-bold text-blue-600 uppercase tracking-tight">Fecha de Trabajo</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="text-gray-800 bg-transparent border-none cursor-pointer font-bold text-sm focus:ring-0 focus:outline-none p-0 mt-0.5"
              />
            </div>

            {/* Fondo Fijo */}
            <div className="bg-white p-3 rounded-lg shadow-sm border border-green-200 flex flex-col min-w-[140px]">
              <label className="block text-[10px] font-bold text-green-600 uppercase tracking-tight">Fondo Fijo (Caja)</label>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-gray-400 text-xs font-bold">Gs</span>
                <input
                  type="text"
                  value={fondoFijo === 0 ? '' : fondoFijo.toLocaleString('es-PY')}
                  onChange={handleFondoFijoChange}
                  placeholder="0"
                  className="block w-full border-none focus:ring-0 focus:outline-none text-sm font-bold p-0"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="w-full grid grid-cols-1 gap-8">
          
          {/* Top Section: Form */}
          <div className="space-y-8">
            <IngresoForm onSubmit={handleAddMovimiento} initialData={editingMovimiento} onCancelEdit={() => setEditingMovimiento(null)} />
          </div>

          {/* Bottom Section: History */}
          <div className="space-y-8">
             <MovimientosList 
               movimientos={ingresos} 
               onDelete={handleDeleteMovimiento} 
               onEdit={handleEditMovimiento}
               dateFilter={selectedDate}
               setDateFilter={setSelectedDate}
               cajaFilter={selectedCaja}
               setCajaFilter={setSelectedCaja}
               cajeroFilter={selectedCajero}
               setCajeroFilter={setSelectedCajero}
             />
          </div>

        </div>

      </main>
    </div>
  )
}
