/**
 * Consolidates multiple arqueo objects into a single summary object
 * @param {Array} arqueos - List of arqueo records from DB
 * @returns {Object|null} - Consolidated arqueo object
 */
export function consolidateArqueos(arqueos) {
  if (!arqueos || arqueos.length === 0) return null;
  if (arqueos.length === 1) return arqueos[0];

  const consolidated = {
    id: 'consolidated',
    isConsolidated: true,
    count: arqueos.length,
    fecha: arqueos[0].fecha, // Use the date of the first one
    caja: 'Todas las cajas',
    cajero: 'Todos los cajeros',
    fondoFijo: 0,
    totalEfectivo: 0,
    pagosTarjeta: 0,
    ventasCredito: 0,
    pedidosYa: 0,
    ventas_transferencia: 0,
    totalServicios: 0,
    totalIngresosTienda: 0,
    totalIngresos: 0,
    totalEgresos: 0,
    totalMovimientos: 0,
    saldoCaja: 0,
    efectivo: {},
    dolares: { cantidad: 0, montoGs: 0 },
    reales: { cantidad: 0, montoGs: 0 },
    pesos: { cantidad: 0, montoGs: 0 },
    monedasExtranjeras: {
      usd: { cantidad: 0, cotizacion: 0, montoGs: 0 },
      brl: { cantidad: 0, cotizacion: 0, montoGs: 0 },
      ars: { cantidad: 0, cotizacion: 0, montoGs: 0 }
    },
    servicios: { otros: {} }
  };

  arqueos.forEach(a => {
    // Basic numbers
    consolidated.fondoFijo += (a.fondoFijo || a.fondo_fijo || 0);
    consolidated.totalEfectivo += (a.totalEfectivo || a.total_efectivo || 0);
    consolidated.pagosTarjeta += (a.pagosTarjeta || a.pagos_tarjeta || 0);
    consolidated.ventasCredito += (a.ventasCredito || a.ventas_credito || 0);
    consolidated.pedidosYa += (a.pedidosYa || a.pedidos_ya || 0);
    consolidated.ventas_transferencia += (a.ventas_transferencia || a.ventasTransferencia || 0);
    consolidated.totalServicios += (a.totalServicios || a.total_servicios || 0);
    consolidated.totalIngresosTienda += (a.totalIngresosTienda || a.total_ingresos_tienda || 0);
    consolidated.totalIngresos += (a.totalIngresos || a.total_ingresos || 0);
    consolidated.totalEgresos += (a.totalEgresos || a.total_egresos || 0);
    consolidated.totalMovimientos += (a.totalMovimientos || a.total_movimientos || 0);
    consolidated.saldoCaja += (a.saldoCaja || a.saldo_caja || 0);

    // Deep merge denominations (Efectivo)
    const efec = a.efectivo || a.efectivo_detalle || {};
    Object.entries(efec).forEach(([denom, count]) => {
      consolidated.efectivo[denom] = (consolidated.efectivo[denom] || 0) + (parseInt(count) || 0);
    });

    // Deep merge foreign currency
    if (a.monedasExtranjeras || a.monedas_extranjeras) {
      const mon = a.monedasExtranjeras || a.monedas_extranjeras;
      ['usd', 'brl', 'ars'].forEach(curr => {
        if (mon[curr]) {
          consolidated.monedasExtranjeras[curr].cantidad += (mon[curr].cantidad || 0);
          consolidated.monedasExtranjeras[curr].montoGs += (mon[curr].montoGs || 0);
          // Cotizacion is tricky, use the one from the move if available
          if (mon[curr].cotizacion) consolidated.monedasExtranjeras[curr].cotizacion = mon[curr].cotizacion;
        }
      });
    }

    // Merge services
    if (a.servicios) {
      Object.entries(a.servicios).forEach(([name, data]) => {
        if (name === 'otros') {
           Object.entries(data).forEach(([sName, sData]) => {
              if (!consolidated.servicios.otros[sName]) consolidated.servicios.otros[sName] = { monto: 0, tarjeta: 0 };
              consolidated.servicios.otros[sName].monto += (sData.monto || 0);
              consolidated.servicios.otros[sName].tarjeta += (sData.tarjeta || 0);
           });
        } else {
           if (!consolidated.servicios[name]) consolidated.servicios[name] = { monto: 0, tarjeta: 0 };
           consolidated.servicios[name].monto += (data.monto || 0);
           consolidated.servicios[name].tarjeta += (data.tarjeta || 0);
        }
      });
    }
  });

  return consolidated;
}
