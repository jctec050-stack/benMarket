'use client'

import { formatCurrency } from '@/lib/utils'
import { Pencil, Trash2 } from 'lucide-react'
import { getServicioLabel } from '@/lib/config'
import { useAuth } from '@/context/AuthContext'

export default function MovimientosList({ 
  movimientos, 
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

  // Extract unique boxes from movements for the filter dropdown
  const availableCajas = Array.from(new Set(movimientos.map(m => m.caja))).filter(Boolean)
  // Extract unique cashiers from movements
  const availableCajeros = Array.from(new Set(movimientos.map(m => m.cajero || m.usuario))).filter(Boolean)
  
  // Filter movements
  const filteredMovimientos = movimientos.filter(mov => {
    const movDate = mov.fecha ? mov.fecha.split('T')[0] : ''
    const matchDate = dateFilter ? movDate === dateFilter : true
    const matchCaja = cajaFilter && cajaFilter !== 'Todas las cajas' ? mov.caja === cajaFilter : true
    const movCajero = mov.cajero || mov.usuario
    
    // Safety check for cashiers: only their own movements
    if (isCajero && profile?.username) {
      if (movCajero !== profile.username) return false
    }

    const matchCajero = (cajeroFilter && cajaFilter !== 'Todos los cajeros') ? movCajero === cajeroFilter : true
    return matchDate && matchCaja && matchCajero
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <h3 className="text-lg font-bold text-gray-800">Historial de Ingresos Agregados</h3>
        
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
            <input 
              type="date" 
              value={dateFilter || ''} 
              onChange={(e) => setDateFilter && setDateFilter(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-700 focus:ring-blue-500 focus:border-blue-500"
            />
              <select 
              value={cajaFilter || 'Todas las cajas'} 
              onChange={(e) => setCajaFilter && setCajaFilter(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-700 bg-white"
            >
              <option value="Todas las cajas">Todas las cajas</option>
              {availableCajas.sort().map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            {/* Cajero Filter (Only for Admin/Super) */}
            {!isCajero && (
              <select 
                value={cajeroFilter || 'Todos los cajeros'} 
                onChange={(e) => setCajeroFilter && setCajeroFilter(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-700 bg-white"
              >
                <option value="Todos los cajeros">Todos los cajeros</option>
                {availableCajeros.sort().map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            )}
          </div>
        </div>

      {(!filteredMovimientos || filteredMovimientos.length === 0) ? (
        <div className="text-center py-8 text-gray-500 bg-white rounded-lg shadow">
          <p>No se encontraron movimientos para los filtros seleccionados.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredMovimientos.map((mov, index) => {
            // Calculate totals for display
            let totalEfectivo = 0
            if (mov.efectivo) {
              Object.entries(mov.efectivo).forEach(([denom, count]) => {
                totalEfectivo += parseInt(denom) * (parseInt(count) || 0)
              })
            }

          // Services totals
          let totalServicios = 0
          if (mov.servicios) {
             Object.values(mov.servicios).forEach(s => {
               totalServicios += (s.monto || 0) + (s.tarjeta || 0)
             })
          }

          // Subtotals
          const totalTienda = 
            totalEfectivo +
            (mov.pagosTarjeta || mov.pagos_tarjeta || 0) +
            (mov.pedidosYa || mov.pedidos_ya || 0) +
            (mov.ventas_transferencia || mov.ventasTransferencia || 0) +
            (mov.ventasCredito || mov.ventas_credito || 0)

          const hasTienda = totalTienda > 0
          const hasServicios = totalServicios > 0
          
          // Determine the "Header Total"
          const displayTotal = hasTienda ? totalTienda : totalServicios
          const totalLabel = !hasTienda && hasServicios ? 'SERVICIO' : ''

          return (
            <div key={mov.id || index} className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center flex-wrap gap-2">
                    <span className="font-bold text-gray-900 text-lg line-clamp-1">{mov.descripcion || 'Sin descripción'}</span>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full flex items-center">
                      <span className="mr-1">🕒</span>
                      {new Date(mov.fecha || Date.now()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                    <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full flex items-center">
                      <span className="mr-1">🏪</span>
                      {mov.caja || 'Sin caja'}
                    </span>
                    <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full flex items-center">
                      <span className="mr-1">👤</span>
                      {mov.cajero || 'Desconocido'}
                    </span>
                  </div>
                  
                  {/* Ventas Tienda Section */}
                  {hasTienda && (
                    <div className="text-sm text-gray-600 space-y-1">
                      {totalEfectivo > 0 && (
                        <p className="flex items-center">
                          <span className="mr-2">💵</span>
                          <strong>Efectivo:</strong> 
                          <span className="ml-1 text-green-700 font-medium">{formatCurrency(totalEfectivo)}</span>
                        </p>
                      )}
                      
                      {(mov.pagosTarjeta > 0 || mov.pagos_tarjeta > 0) && (
                        <p className="flex items-center">
                          <span className="mr-2">💳</span>
                          <strong>Tarjeta:</strong> 
                          <span className="ml-1">{formatCurrency(mov.pagosTarjeta || mov.pagos_tarjeta)}</span>
                        </p>
                      )}

                      {(mov.pedidosYa > 0 || mov.pedidos_ya > 0) && (
                        <p className="flex items-center">
                          <span className="mr-2">🛵</span>
                          <strong>PedidosYa:</strong> 
                          <span className="ml-1">{formatCurrency(mov.pedidosYa || mov.pedidos_ya)}</span>
                        </p>
                      )}

                      {(mov.ventas_transferencia > 0 || mov.ventasTransferencia > 0) && (
                        <p className="flex items-center">
                          <span className="mr-2">🏦</span>
                          <strong>Transferencia:</strong> 
                          <span className="ml-1">{formatCurrency(mov.ventas_transferencia || mov.ventasTransferencia)}</span>
                        </p>
                      )}

                      {(mov.ventasCredito > 0 || mov.ventas_credito > 0) && (
                        <p className="flex items-center text-red-600">
                          <span className="mr-2">📝</span>
                          <strong>Crédito:</strong> 
                          <span className="ml-1 font-medium">{formatCurrency(mov.ventasCredito || mov.ventas_credito)}</span>
                          {mov.creditoDetalles && (
                            <span className="text-xs ml-2 text-red-400">({mov.creditoDetalles.cliente})</span>
                          )}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Servicios Section */}
                  {hasServicios && (
                    <div className={`mt-2 ${hasTienda ? 'pt-2 border-t border-dashed border-gray-100' : ''}`}>
                      <div className="flex items-center justify-between group/total">
                        <p className="flex items-center font-bold text-gray-700">
                          <span className="mr-2">📄</span>
                          <strong>Servicios:</strong> 
                          <span className="ml-1 text-blue-600">{formatCurrency(totalServicios)}</span>
                        </p>
                      </div>
                      <ul className="list-disc list-inside ml-8 mt-1 text-xs text-gray-500 space-y-1">
                        {Object.entries(mov.servicios)
                            .filter(([_, s]) => (s.monto > 0 || s.tarjeta > 0))
                            .map(([name, s]) => {
                              const totalItem = (s.monto || 0) + (s.tarjeta || 0);
                              const detalles = [];
                              if (s.monto > 0) detalles.push(`Efe: ${formatCurrency(s.monto)}`);
                              if (s.tarjeta > 0) detalles.push(`Tar: ${formatCurrency(s.tarjeta)}`);
                              return (
                                <li key={name}>
                                  <span className="font-semibold text-gray-600">{getServicioLabel(name)}:</span> {formatCurrency(totalItem)} 
                                  <span className="ml-1 text-gray-400">({detalles.join(' | ')})</span>
                                </li>
                              )
                            })
                        }
                      </ul>
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-end space-y-2">
                  <div className="flex flex-col items-end">
                    {totalLabel && <span className="text-[10px] font-black text-blue-400 leading-none">SERVICIO</span>}
                    <span className={`text-xl font-bold ${hasTienda ? 'text-blue-700' : 'text-blue-500'}`}>
                      {formatCurrency(displayTotal)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onEdit && onEdit(mov)}
                      className="text-blue-600 hover:text-blue-800 p-2 hover:bg-blue-50 rounded-full transition-colors"
                      title="Editar movimiento"
                      type="button"
                    >
                      <Pencil size={20} />
                    </button>
                    <button
                      onClick={() => onDelete(mov.id)}
                      className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-full transition-colors"
                      title="Eliminar movimiento"
                      type="button"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
          })}
        </div>
      )}
    </div>
  )
}
