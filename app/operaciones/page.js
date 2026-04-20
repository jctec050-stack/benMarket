'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { useData } from '@/context/DataContext'
import { formatCurrency } from '@/lib/utils'
import OperacionForm from '@/components/operaciones/OperacionForm'
import OperacionesList from '@/components/operaciones/OperacionesList'
import { db } from '@/lib/db'
import { exportOperacionReceiptPDF } from '@/lib/pdfExport'
import { useNotifications } from '@/context/NotificationContext'

export default function OperacionesPage() {
  const { user, profile, loading: authLoading } = useAuth()
  const { success, error: notifyError, confirm } = useNotifications()
  const isCajero = profile?.rol === 'cajero'
  const { 
    movimientos, // These are 'Operaciones' in legacy terms
    addMovimiento, 
    deleteMovimiento, 
    loadingData, 
    selectedDate,
    setSelectedDate,
    selectedCaja,
    setSelectedCaja,
    selectedCajero,
    setSelectedCajero
  } = useData()
  const router = useRouter()
  const [editingOperacion, setEditingOperacion] = useState(null)

  const [nextReceiptNumber, setNextReceiptNumber] = useState(null)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    } else if (!authLoading && profile && profile.rol === 'cajero') {
      router.push('/')
    }
  }, [user, profile, authLoading, router])

  // Fetch next receipt number for bancario flow
  useEffect(() => {
    const fetchReceiptNumber = async () => {
      const num = await db.getNextMovimientoReceiptNumber()
      setNextReceiptNumber(num)
    }
    if (user) fetchReceiptNumber()
  }, [user])

  const handleAddOperacion = async (operacion) => {
    // Add metadata
    const newOperacion = {
      ...operacion,
      caja: selectedCaja,
      cajero: profile?.username || user?.email || 'unknown',
      usuarioId: user?.id
    }
    
    const res = await addMovimiento(newOperacion)
    
    if (res.success) {
      setEditingOperacion(null)
      success('Operación Guardada', 'El movimiento se registró con éxito.')
      
      // Auto-generate receipt if it's bank operation
      if (newOperacion.tipo === 'operacion') {
        try {
          exportOperacionReceiptPDF(newOperacion)
        } catch (pdfErr) {
          console.error('Error generating PDF:', pdfErr)
        }
      }

      // Refresh receipt number
      const num = await db.getNextMovimientoReceiptNumber()
      setNextReceiptNumber(num)
    } else {
      console.error('Error saving movement:', res.error)
      notifyError('Error de Registro', res.error || 'Ocurrió un error inesperado')
    }
  }

  const handleDeleteOperacion = async (id) => {
    const ok = await confirm({
      title: '¿Eliminar operación?',
      message: 'Se borrará el registro de la base de datos de forma permanente.',
      confirmText: 'Eliminar',
      type: 'danger'
    })

    if (ok) {
      await deleteMovimiento(id)
      setEditingOperacion(prev => (prev?.id === id ? null : prev))
      success('Eliminado', 'La operación ha sido borrada exitosamente.')
    }
  }

  const handleEditOperacion = (op) => {
    setEditingOperacion(op)
    window.scrollTo({ top: 0, behavior: 'smooth' })
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
              Operaciones y Gastos - 
              {!isCajero ? (
                <select 
                  value={selectedCaja} 
                  onChange={(e) => setSelectedCaja(e.target.value)}
                  className="bg-transparent border-b-2 border-gray-300 focus:outline-none focus:border-red-500 text-gray-800 cursor-pointer"
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
            <p className="text-gray-500">
              {new Date().toLocaleDateString('es-PY', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="w-full grid grid-cols-1 gap-8">
          
          {/* Top Section: Form */}
          <div className="space-y-8">
            <OperacionForm 
              onSubmit={handleAddOperacion} 
              nextReceiptNumber={nextReceiptNumber} 
              initialData={editingOperacion}
              onCancelEdit={() => setEditingOperacion(null)}
            />
          </div>

          {/* Bottom Section: History */}
          <div className="space-y-8">
             <OperacionesList 
               operaciones={movimientos} 
               onDelete={handleDeleteOperacion} 
               onEdit={handleEditOperacion}
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
