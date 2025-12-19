/**
 * Actualiza las métricas quick stats en la página de Resumen
 * Muestra total efectivo, total tarjeta, total crédito y caja destacada
 */
window.actualizarMetricasResumen = function () {
    // Verificar que estamos en la página de resumen
    if (!document.getElementById('metricTotalEfectivo')) return;

    // Obtener fechas del filtro
    const fechaDesde = document.getElementById('fechaResumenDesde')?.value || '';
    const fechaHasta = document.getElementById('fechaResumenHasta')?.value || '';
    const filtroCajaGeneral = document.getElementById('filtroCajaGeneral')?.value || '';

    // Filtrar movimientos por fecha y caja
    let movimientosFiltrados = estado.movimientosTemporales;

    if (fechaDesde) {
        movimientosFiltrados = movimientosFiltrados.filter(m => m.fecha.split('T')[0] >= fechaDesde);
    }

    if (fechaHasta) {
        movimientosFiltrados = movimientosFiltrados.filter(m => m.fecha.split('T')[0] <= fechaHasta);
    }

    if (filtroCajaGeneral) {
        movimientosFiltrados = movimientosFiltrados.filter(m => m.caja === filtroCajaGeneral);
    }

    // Calcular totales por tipo
    let totalEfectivo = 0;
    let totalTarjeta = 0;
    let totalCredito = 0;

    // Procesar movimientos de ingresos
    movimientosFiltrados.forEach(m => {
        // Efectivo: dinero recibido en mano
        if (m.efectivo) {
            Object.entries(m.efectivo).forEach(([denom, cant]) => {
                totalEfectivo += parseInt(denom) * cant;
            });
        }

        // Tarjeta: pagos con tarjeta + servicios con tarjeta
        totalTarjeta += (m.pagosTarjeta || 0);
        if (m.servicios) {
            Object.values(m.servicios).forEach(s => {
                totalTarjeta += (s.tarjeta || 0);
            });
        }
        if (m.otrosServicios) {
            m.otrosServicios.forEach(s => {
                totalTarjeta += (s.tarjeta || 0);
            });
        }

        // Crédito: ventas a crédito + pedidos ya
        totalCredito += (m.ventasCredito || 0) + (m.pedidosYa || 0);
    });

    // Identificar caja con mayor actividad
    const actividadPorCaja = {};
    movimientosFiltrados.forEach(m => {
        if (!actividadPorCaja[m.caja]) {
            actividadPorCaja[m.caja] = 0;
        }
        actividadPorCaja[m.caja]++;
    });

    let cajaDestacada = '-';
    let maxActividad = 0;
    Object.entries(actividadPorCaja).forEach(([caja, actividad]) => {
        if (actividad > maxActividad) {
            maxActividad = actividad;
            cajaDestacada = caja;
        }
    });

    // Actualizar UI
    document.getElementById('metricTotalEfectivo').textContent = formatearMoneda(totalEfectivo, 'gs');
    document.getElementById('metricTotalTarjeta').textContent = formatearMoneda(totalTarjeta, 'gs');
    document.getElementById('metricTotalCredito').textContent = formatearMoneda(totalCredito, 'gs');
    document.getElementById('metricCajaDestacada').textContent = cajaDestacada;
    if (cajaDestacada !== '-') {
        document.getElementById('metricCajaDetalle').textContent = `${maxActividad} movimiento${maxActividad !== 1 ? 's' : ''}`;
    }
};
