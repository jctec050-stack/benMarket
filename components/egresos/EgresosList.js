'use client'

import { formatCurrency } from '@/lib/utils'
import { Trash2, Printer, Calendar, Landmark, User, Pencil } from 'lucide-react'
import { exportEgresoReceiptPDF } from '@/lib/pdfExport'
import { useAuth } from '@/context/AuthContext'

export default function EgresosList({ 
  egresos, 
  onDelete,
  onEdit,
  dateFilter,
  setDateFilter,
  cajaFilter,
  setCajaFilter,
  cajeroFilter,
  setCajeroFilter
}) {
  const { profile } = useAuth()
  const isCajero = profile?.rol === 'cajero'

  const availableCajas = Array.from(new Set(egresos.map(m => m.caja))).filter(Boolean)
  const availableCajeros = Array.from(new Set(egresos.map(m => m.cajero))).filter(Boolean)
  
  const filteredEgresos = egresos.filter(eg => {
    const egDate = eg.fecha ? eg.fecha.split('T')[0] : ''
    const matchDate = dateFilter ? egDate === dateFilter : true
    const matchCaja = cajaFilter && cajaFilter !== 'Todas las cajas' ? eg.caja === cajaFilter : true
    
    // Safety check for cashiers: only their own egresos
    if (isCajero && profile?.username) {
      if (eg.cajero !== profile.username) return false
    }

    const matchCajero = cajeroFilter && cajeroFilter !== 'Todos los cajeros' ? eg.cajero === cajeroFilter : true
    return matchDate && matchCaja && matchCajero
  })

  const handlePrint = (eg) => {
    exportEgresoReceiptPDF(eg)
  }

  return (
    <div className="w-full space-y-4 max-w-5xl mx-auto">
      {/* Search & Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
        <h3 className="text-md font-bold text-gray-700 uppercase tracking-wider">Historial de Movimientos</h3>
        
        <div className="flex flex-wrap items-center gap-3">
            <input 
              type="date" 
              value={dateFilter || ''} 
              onChange={(e) => setDateFilter && setDateFilter(e.target.value)}
              className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 outline-none focus:border-red-500 transition-all"
            />
            <select 
              value={cajaFilter || 'Todas las cajas'} 
              onChange={(e) => setCajaFilter && setCajaFilter(e.target.value)}
              className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 outline-none cursor-pointer"
            >
              <option value="Todas las cajas">Todas las cajas</option>
              {availableCajas.sort().map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            {!isCajero && (
              <select 
                value={cajeroFilter || 'Todos los cajeros'} 
                onChange={(e) => setCajeroFilter && setCajeroFilter(e.target.value)}
                className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 outline-none cursor-pointer"
              >
                <option value="Todos los cajeros">Todos los cajeros</option>
                {availableCajeros.sort().map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            )}
          </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {filteredEgresos.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-dashed border-gray-200 text-gray-400 font-medium">
            No se encontraron registros
          </div>
        ) : (
          filteredEgresos.map((egreso) => (
            <div key={egreso.id} className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-red-600 hover:shadow-md transition-all flex justify-between items-center group">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-800 text-md">{egreso.descripcion}</span>
                  {egreso.numeroRecibo && (
                    <span className="bg-red-50 text-red-700 text-[10px] px-2 py-0.5 rounded font-bold">
                      #{egreso.numeroRecibo}
                    </span>
                  )}
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tight bg-gray-50 px-2 py-0.5 rounded">
                    {egreso.categoria}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-[11px] text-gray-400 font-bold uppercase">
                  <span className="flex items-center gap-1">
                    <Calendar size={12} className="text-gray-300" />
                    {new Date(egreso.fecha).toLocaleDateString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <Landmark size={12} className="text-gray-300" />
                    {egreso.caja}
                  </span>
                  <span className="flex items-center gap-1 text-red-400">
                    <User size={12} />
                    {egreso.cajero}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <span className="text-lg font-bold text-red-600">
                  -{formatCurrency(egreso.monto)}
                </span>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handlePrint(egreso)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                    title="Reimprimir Recibo"
                  >
                    <Printer size={18} />
                  </button>
                  <button
                    onClick={() => onDelete && onDelete(egreso.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                    title="Eliminar"
                  >
                    <Trash2 size={18} />
                  </button>
                  <button
                    onClick={() => onEdit && onEdit(egreso)}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                    title="Editar"
                  >
                    <Pencil size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
