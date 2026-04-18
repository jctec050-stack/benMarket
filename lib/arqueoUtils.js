import { CONFIG } from './config';

/**
 * Calculates totals for the Cash Count (Arqueo) based on a list of movements.
 * Adapted from legacy `calcularTotalesArqueo`.
 * 
 * @param {Array} movimientos - List of movements (Ingresos + Operaciones)
 * @returns {Object} Calculated totals
 */
export function calcularTotalesArqueo(movimientos) {
  const totals = {
    efectivo: {},
    monedasExtranjeras: {
      usd: { cantidad: 0, montoGs: 0 },
      brl: { cantidad: 0, montoGs: 0 },
      ars: { cantidad: 0, montoGs: 0 }
    },
    pagosTarjeta: 0,
    ventasCredito: 0,
    pedidosYa: 0,
    ventasTransferencia: 0,
    totalIngresosTienda: 0, // Sum of cash sales (excluding services)
    servicios: {
      apLote: { lotes: [], monto: 0, tarjeta: 0 },
      aquiPago: { lotes: [], monto: 0, tarjeta: 0 },
      expressLote: { lotes: [], monto: 0, tarjeta: 0 },
      wepa: { lotes: [], monto: 0, tarjeta: 0 },
      pasajeNsa: { lotes: [], monto: 0, tarjeta: 0 },
      encomiendaNsa: { lotes: [], monto: 0, tarjeta: 0 },
      apostala: { lotes: [], monto: 0, tarjeta: 0 },
      otros: {}
    }
  };

  // Initialize cash structure
  CONFIG.denominaciones.forEach(denom => {
    totals.efectivo[denom.valor] = { ingreso: 0, egreso: 0, neto: 0 };
  });

  movimientos.forEach(mov => {
    // Determine if it's an "Ingreso" (legacy logic check)
    // In legacy, 'tipo' didn't exist for ingresos, only for gastos.
    // So if !tipo or tipo === 'ingreso' -> Ingreso
    const esIngreso = !mov.tipo || mov.tipo === 'ingreso' || mov.tipo === 'deposito-inversiones';
    
    if (!esIngreso) return; // Skip expenses here, they are handled separately usually

    // --- 1. Total Ingresos Tienda Logic ---
    let esServicio = false;
    
    // Check standard services
    if (mov.servicios) {
      for (const key in mov.servicios) {
        if ((mov.servicios[key].monto || 0) > 0) esServicio = true;
      }
    }
    // Check other services
    if (mov.otrosServicios && mov.otrosServicios.length > 0) {
      if (mov.otrosServicios.some(s => (s.monto || 0) > 0)) esServicio = true;
    }

    if (!esServicio) {
      let montoEfectivo = 0;
      if (mov.efectivo) {
        Object.entries(mov.efectivo).forEach(([denom, cant]) => {
          montoEfectivo += parseInt(denom) * (cant || 0);
        });
      }
      totals.totalIngresosTienda += (mov.valorVenta > 0) ? mov.valorVenta : montoEfectivo;
    }

    // --- 2. Efectivo Breakdown ---
    if (mov.efectivo) {
      for (const [denominacion, cantidad] of Object.entries(mov.efectivo)) {
        if (!totals.efectivo[denominacion]) {
           totals.efectivo[denominacion] = { ingreso: 0, egreso: 0, neto: 0 };
        }
        totals.efectivo[denominacion].ingreso += (cantidad || 0);
        totals.efectivo[denominacion].neto += (cantidad || 0);
      }
    }

    // --- 3. Monedas Extranjeras ---
    const monedas = mov.monedasExtranjeras || mov.monedas_extranjeras;
    if (monedas) {
      for (const moneda in monedas) {
        if (totals.monedasExtranjeras[moneda]) {
          const { cantidad, cotizacion } = monedas[moneda];
          totals.monedasExtranjeras[moneda].cantidad += (cantidad || 0);
          totals.monedasExtranjeras[moneda].montoGs += ((cantidad || 0) * (cotizacion || 0));
        }
      }
    }

    // --- 4. Non-Cash Payments ---
    const pagosTarjeta = mov.pagosTarjeta || mov.pagos_tarjeta || 0;
    const ventasCredito = mov.ventasCredito || mov.ventas_credito || 0;
    const pedidosYa = mov.pedidosYa || mov.pedidos_ya || 0;
    const ventasTransferencia = mov.ventas_transferencia || mov.ventasTransferencia || 0;

    totals.pagosTarjeta += pagosTarjeta;
    totals.ventasCredito += ventasCredito;
    totals.pedidosYa += pedidosYa;
    totals.ventasTransferencia += ventasTransferencia;

    // Breakdown for consolidated views
    const cName = mov.cajero || mov.usuario || 'Desconocido';
    if (!totals.noEfectivoPorCajero) totals.noEfectivoPorCajero = {};
    if (!totals.noEfectivoPorCajero[cName]) {
      totals.noEfectivoPorCajero[cName] = { tarjeta: 0, credito: 0, pedidosYa: 0, transfer: 0, total: 0 };
    }
    totals.noEfectivoPorCajero[cName].tarjeta += pagosTarjeta;
    totals.noEfectivoPorCajero[cName].credito += ventasCredito;
    totals.noEfectivoPorCajero[cName].pedidosYa += pedidosYa;
    totals.noEfectivoPorCajero[cName].transfer += ventasTransferencia;
    totals.noEfectivoPorCajero[cName].total += (pagosTarjeta + ventasCredito + pedidosYa + ventasTransferencia);

    // --- 5. Servicios ---
    const processService = (key, serviceData) => {
      if (!serviceData) return;
      
      const monto = serviceData.monto || 0;
      const tarjeta = serviceData.tarjeta || 0;
      
      if (monto !== 0 || tarjeta !== 0) {
        if (totals.servicios[key]) {
          if (serviceData.lote) totals.servicios[key].lotes.push(serviceData.lote);
          totals.servicios[key].monto += monto;
          totals.servicios[key].tarjeta += tarjeta;
        }
      }
    };

    // Standard services
    ['apLote', 'aquiPago', 'expressLote', 'wepa', 'pasajeNsa', 'encomiendaNsa', 'apostala'].forEach(key => {
      if (mov.servicios) processService(key, mov.servicios[key]);
    });

    if (mov.servicios) {
      const standardKeys = new Set(['apLote', 'aquiPago', 'expressLote', 'wepa', 'pasajeNsa', 'encomiendaNsa', 'apostala'])
      Object.entries(mov.servicios).forEach(([k, serviceData]) => {
        if (standardKeys.has(k)) return
        if (!serviceData) return
        const monto = serviceData.monto || 0
        const tarjeta = serviceData.tarjeta || 0
        if (monto === 0 && tarjeta === 0) return

        if (!totals.servicios.otros[k]) {
          totals.servicios.otros[k] = { lotes: [], monto: 0, tarjeta: 0 }
        }
        if (serviceData.lote) totals.servicios.otros[k].lotes.push(serviceData.lote)
        totals.servicios.otros[k].monto += monto
        totals.servicios.otros[k].tarjeta += tarjeta
      })
    }

    // Dynamic services
    if (mov.otrosServicios || mov.otros_servicios) {
      const others = mov.otrosServicios || mov.otros_servicios;
      others.forEach(s => {
        if (!totals.servicios.otros[s.nombre]) {
          totals.servicios.otros[s.nombre] = { lotes: [], monto: 0, tarjeta: 0 };
        }
        if (s.lote) totals.servicios.otros[s.nombre].lotes.push(s.lote);
        totals.servicios.otros[s.nombre].monto += (s.monto || 0);
        totals.servicios.otros[s.nombre].tarjeta += (s.tarjeta || 0);
      });
    }
  });

  return totals;
}
