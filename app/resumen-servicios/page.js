'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { db } from '@/lib/db'
import { formatCurrency } from '@/lib/utils'
import { processServiciosData } from '@/lib/serviciosLogic'
import { exportResumenServiciosPDF } from '@/lib/pdfExport'
import { Calendar, Filter, Archive, CheckCircle2, Download } from 'lucide-react'

export default function ResumenServiciosPage() {
  const { user, profile, loading: authLoading } = useAuth()
  const router = useRouter()

  // Filtros
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10))
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10))
  const [selectedCaja, setSelectedCaja] = useState('Todas las cajas')

  // Datos
  const [groupedData, setGroupedData] = useState({})
  const [loading, setLoading] = useState(false)

  // Protección de Auth
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    } else if (!authLoading && profile && profile.rol === 'cajero') {
      router.push('/')
    }
  }, [user, profile, authLoading, router])

  // Cargar Datos
  useEffect(() => {
    if (user && profile && profile.rol !== 'cajero') {
      fetchData()
    }
  }, [user, profile, startDate, endDate, selectedCaja])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [resMovimientos] = await Promise.all([
        db.getDataRange('movimientos_temporales', startDate, endDate, selectedCaja)
      ])

      const data = processServiciosData(resMovimientos.data || [])
      setGroupedData(data)
    } catch (error) {
      console.error("Error fetching servicios data:", error)
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || !user) return <div className="p-8 text-center text-gray-500">Cargando...</div>

  const grandTotalEfectivo = Object.values(groupedData).reduce((acc, s) => acc + s.totalEfectivo, 0)
  const grandTotalTarjeta = Object.values(groupedData).reduce((acc, s) => acc + s.totalTarjeta, 0)

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-800 tracking-tight">Resumen de Comprobantes por Servicios</h1>
          <p className="text-gray-500 font-medium">Visualización detallada de ingresos por lote y cajero.</p>
        </div>
      </div>

      {/* --- FILTROS --- */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-wrap gap-6 items-end">
        <div className="space-y-1.5">
          <label className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
            <Calendar size={14} className="text-red-500" /> Desde
          </label>
          <input 
            type="date" 
            value={startDate} 
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all font-medium text-gray-700"
          />
        </div>
        <div className="space-y-1.5">
          <label className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
            <Calendar size={14} className="text-red-500" /> Hasta
          </label>
          <input 
            type="date" 
            value={endDate} 
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all font-medium text-gray-700"
          />
        </div>
        <div className="space-y-1.5">
          <label className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
            <Filter size={14} className="text-red-500" /> Caja
          </label>
          <select 
            value={selectedCaja} 
            onChange={(e) => setSelectedCaja(e.target.value)}
            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all font-medium text-gray-700 appearance-none pr-10"
          >
            <option value="Todas las cajas">Todas las cajas</option>
            <option value="Caja 1">Caja 1</option>
            <option value="Caja 2">Caja 2</option>
            <option value="Caja 3">Caja 3</option>
            <option value="Tesoreria">Tesoreria</option>
          </select>
        </div>
        
        <button 
          onClick={fetchData}
          disabled={loading}
          className="px-8 py-2.5 bg-gray-900 text-white rounded-xl font-bold hover:bg-red-700 disabled:opacity-50 transition-all shadow-lg active:scale-95 flex items-center gap-2"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : 'Actualizar Reporte'}
        </button>
        
        <button
          onClick={() => exportResumenServiciosPDF(groupedData, startDate, endDate, selectedCaja)}
          disabled={loading || Object.keys(groupedData).length === 0}
          className="px-8 py-2.5 bg-red-600 text-white rounded-xl font-bold hover:bg-red-800 disabled:opacity-50 transition-all shadow-lg active:scale-95 flex items-center gap-2"
        >
          <Download size={18} />
          Exportar PDF
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-12 h-12 border-4 border-gray-100 border-t-red-600 rounded-full animate-spin" />
          <p className="text-gray-400 font-medium animate-pulse">Procesando servicios...</p>
        </div>
      ) : Object.keys(groupedData).length > 0 ? (
        <div className="space-y-12 pb-20">
          {Object.entries(groupedData).map(([serviceName, data]) => (
            <div key={serviceName} className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden transform transition-all hover:shadow-xl">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-xl font-black text-gray-800 flex items-center gap-3">
                  <span className="w-2 h-8 bg-red-600 rounded-full"></span>
                  {serviceName}
                </h2>
                <div className="flex gap-4">
                   <div className="text-right">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Servicio</p>
                      <p className="text-lg font-black text-red-600">{formatCurrency(data.totalEfectivo + data.totalTarjeta)}</p>
                   </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50/50 text-gray-500 font-bold uppercase text-[10px] tracking-widest border-b border-gray-100">
                    <tr>
                      <th className="px-8 py-4">Cajero</th>
                      <th className="px-8 py-4">Caja</th>
                      <th className="px-8 py-4">Lote</th>
                      <th className="px-8 py-4 text-right">Efectivo</th>
                      <th className="px-8 py-4 text-right">Tarjeta</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {data.items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/80 transition-colors">
                        <td className="px-8 py-4 font-bold text-gray-700">{item.cajero}</td>
                        <td className="px-8 py-4 text-gray-600">{item.caja}</td>
                        <td className="px-8 py-4">
                           <span className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-md font-mono text-xs font-bold">
                             {item.lote || 'N/A'}
                           </span>
                        </td>
                        <td className="px-8 py-4 text-right font-medium text-gray-600">{formatCurrency(item.efectivo)}</td>
                        <td className="px-8 py-4 text-right font-medium text-gray-600">{formatCurrency(item.tarjeta)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50/30">
                    <tr className="font-black border-t-2 border-gray-100 bg-gray-50/50">
                      <td colSpan="3" className="px-8 py-4 text-gray-800 uppercase tracking-tighter">Totales {serviceName}:</td>
                      <td className="px-8 py-4 text-right text-gray-800">{formatCurrency(data.totalEfectivo)}</td>
                      <td className="px-8 py-4 text-right text-gray-800">{formatCurrency(data.totalTarjeta)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ))}

          {/* Gran Total */}
          <div className="bg-gray-900 rounded-3xl p-10 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8 border-t-8 border-red-600">
             <div className="flex items-center gap-6">
                <div className="p-4 bg-red-600 rounded-2xl shadow-lg shadow-red-600/20">
                   <Archive className="text-white" size={32} />
                </div>
                <div>
                   <h3 className="text-white text-3xl font-black uppercase tracking-tighter">Resumen General</h3>
                   <p className="text-gray-400 font-medium lowercase">Total consolidado de todos los servicios en el periodo.</p>
                </div>
             </div>
             
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-4">
                <div className="text-right">
                   <p className="text-gray-500 font-bold uppercase text-xs tracking-widest pl-2">Total Efectivo</p>
                   <p className="text-3xl font-black text-white">{formatCurrency(grandTotalEfectivo)}</p>
                </div>
                <div className="text-right">
                   <p className="text-gray-500 font-bold uppercase text-xs tracking-widest pl-2">Total Tarjeta</p>
                   <p className="text-3xl font-black text-white">{formatCurrency(grandTotalTarjeta)}</p>
                </div>
                <div className="text-right sm:col-span-2 pt-4 border-t border-white/10 mt-2">
                   <p className="text-gray-400 font-bold uppercase text-xs tracking-widest">Gran Total Servicios</p>
                   <p className="text-5xl font-black text-red-500 leading-tight">
                     {formatCurrency(grandTotalEfectivo + grandTotalTarjeta)}
                   </p>
                </div>
             </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-20 text-center shadow-sm border border-dashed border-gray-200">
           <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Archive className="text-gray-300" size={40} />
           </div>
           <h3 className="text-xl font-bold text-gray-800 mb-2">No se encontraron movimientos</h3>
           <p className="text-gray-500 max-w-sm mx-auto">No hay registros de servicios para el rango de fechas y caja seleccionado.</p>
        </div>
      )}
    </div>
  )
}
