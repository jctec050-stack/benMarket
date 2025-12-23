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

    // Combinar movimientos guardados y temporales para tener el universo completo
    let movimientosFiltrados = [
        ...(estado.movimientos || []),
        ...(estado.movimientosTemporales || [])
    ];

    if (fechaDesde) {
        movimientosFiltrados = movimientosFiltrados.filter(m => m.fecha.split('T')[0] >= fechaDesde);
    }

    if (fechaHasta) {
        movimientosFiltrados = movimientosFiltrados.filter(m => m.fecha.split('T')[0] <= fechaHasta);
    }

    if (filtroCajaGeneral && filtroCajaGeneral !== 'Todas las Cajas') {
        movimientosFiltrados = movimientosFiltrados.filter(m => m.caja === filtroCajaGeneral);
    }

    // Calcular totales por tipo, siguiendo reglas estrictas del usuario
    let totalEfectivo = 0;
    let totalTarjeta = 0;
    let totalCredito = 0;
    let totalPedidosYa = 0;

    // Helper para identificar si es ingreso de tienda (no servicio)
    const esIngresoTienda = (m) => {
        let esServicio = false;
        if (m.servicios) esServicio = Object.values(m.servicios).some(s => (parseFloat(s.monto) || 0) > 0);
        if (!esServicio && m.otrosServicios && m.otrosServicios.length > 0)
            esServicio = m.otrosServicios.some(s => (parseFloat(s.monto) || 0) > 0);
        return !esServicio;
    };

    // Procesar movimientos de ingresos
    movimientosFiltrados.forEach(m => {
        const esIngreso = !m.tipo || m.tipo === 'ingreso';

        if (!esIngreso) return;

        // 1. Total Tarjeta: al total de movimientos en Pagos con tarjeta
        totalTarjeta += (m.pagosTarjeta || 0);

        // 2. Pedidos Ya: el total de movimientos de Pedidos Ya
        totalPedidosYa += (m.pedidosYa || 0);

        // 3. Ventas a Credito: el total de movimientos de Ventas a Credito
        totalCredito += (m.ventasCredito || 0);

        // 4. Efectivo: tomar el monto resultante en Total Ingresos Tienda
        // Lógica de Ingresos Tienda: Si no es servicio, sumar valorVenta o efectivo
        if (esIngresoTienda(m)) {
            // Mirroring logic from calcularTotalesArqueo in app.js
            if (m.valorVenta > 0) {
                totalEfectivo += m.valorVenta;
            } else {
                // Sumar efectivo (denominaciones)
                if (m.efectivo) {
                    Object.entries(m.efectivo).forEach(([denom, cant]) => {
                        totalEfectivo += parseInt(denom) * cant;
                    });
                }
                // Sumar moneda extranjera
                if (m.monedasExtranjeras) {
                    if (m.monedasExtranjeras.usd) totalEfectivo += (m.monedasExtranjeras.usd.montoGs || 0);
                    if (m.monedasExtranjeras.brl) totalEfectivo += (m.monedasExtranjeras.brl.montoGs || 0);
                    if (m.monedasExtranjeras.ars) totalEfectivo += (m.monedasExtranjeras.ars.montoGs || 0);
                }
            }
        }
    });

    // Actualizar UI
    const elTarjeta = document.getElementById('metricTotalTarjeta');
    const elPedidosYa = document.getElementById('metricTotalPedidosYa');
    const elCredito = document.getElementById('metricTotalCredito');
    const elEfectivo = document.getElementById('metricTotalEfectivo');

    if (elTarjeta) elTarjeta.textContent = formatearMoneda(totalTarjeta, 'gs');
    if (elPedidosYa) elPedidosYa.textContent = formatearMoneda(totalPedidosYa, 'gs');
    if (elCredito) elCredito.textContent = formatearMoneda(totalCredito, 'gs');
    if (elEfectivo) elEfectivo.textContent = formatearMoneda(totalEfectivo, 'gs');

    // Actualizar Tabla Recaudacion
    actualizarTablaRecaudacion(movimientosFiltrados, fechaDesde, fechaHasta, filtroCajaGeneral);
};

// Nueva función para la tabla de Recaudación
function actualizarTablaRecaudacion(movimientos, fechaDesde, fechaHasta, filtroCaja) {
    const tbody = document.getElementById('tbodyRecaudacion');
    const tfoot = document.getElementById('tfootRecaudacion');
    if (!tbody || !tfoot) return;

    tbody.innerHTML = '';
    tfoot.innerHTML = '';

    // Agrupar por cajero
    const datosPorCajero = {};

    // --- LÓGICA HÍBRIDA: PRIORIZAR ARQUEOS CERRADOS ---
    // 1. Agrupar Arqueos existentes por cajero (si existen en estado.arqueos)
    if (estado.arqueos) {
        estado.arqueos.forEach(a => {
            const fechaArqueo = a.fecha.split('T')[0];
            if (fechaDesde && fechaArqueo < fechaDesde) return;
            if (fechaHasta && fechaArqueo > fechaHasta) return;
            if (filtroCaja && filtroCaja !== 'Todas las Cajas' && a.caja !== filtroCaja) return;

            const cajero = a.cajero || 'Desconocido';
            if (!datosPorCajero[cajero]) {
                datosPorCajero[cajero] = {
                    tarjeta: 0, pedidosYa: 0, credito: 0, efectivo: 0, sobrante: 0, faltante: 0,
                    egresos: 0, fondoFijo: 0, totalDeclarar: 0, // Campos nuevos para el cálculo explícito
                    esArqueoCerrado: true
                };
            } else {
                datosPorCajero[cajero].esArqueoCerrado = true;
            }

            datosPorCajero[cajero].tarjeta += (a.pagosTarjeta || 0);
            datosPorCajero[cajero].pedidosYa += (a.pedidosYa || 0);
            datosPorCajero[cajero].credito += (a.ventasCredito || 0);

            let serviciosEfectivo = 0;
            if (a.servicios) {
                Object.values(a.servicios).forEach(val => {
                    if (val) {
                        if (typeof val === 'object' && 'monto' in val) {
                            serviciosEfectivo += (val.monto || 0);
                        } else if (typeof val === 'object') {
                            Object.values(val).forEach(sub => {
                                if (sub && typeof sub === 'object' && 'monto' in sub) {
                                    serviciosEfectivo += (sub.monto || 0);
                                }
                            });
                        }
                    }
                });
            }
            if (a.otrosServicios) {
                a.otrosServicios.forEach(s => serviciosEfectivo += (parseFloat(s.monto) || 0));
            }

            let efectivoFisico = (a.totalEfectivo || 0);
            if (!efectivoFisico && a.total_efectivo) efectivoFisico = a.total_efectivo;

            let egresos = (a.total_egresos !== undefined) ? a.total_egresos : (a.totalEgresos || 0);
            let fondo = (a.fondo_fijo !== undefined) ? a.fondo_fijo : (a.fondoFijo || 0);

            // Almacenar valores crudos para la fórmula del usuario
            datosPorCajero[cajero].totalDeclarar = efectivoFisico; // Asumimos que esto es "Total a declarar"
            datosPorCajero[cajero].egresos = egresos;
            datosPorCajero[cajero].fondoFijo = fondo;

            let ingresoTiendaCalculado = (efectivoFisico + egresos) - serviciosEfectivo - fondo;

            if (ingresoTiendaCalculado < 0) ingresoTiendaCalculado = 0;

            datosPorCajero[cajero].efectivo += ingresoTiendaCalculado;
        });
    }

    // 2. Procesar Movimientos (SOLO si no hay arqueo cerrado para ese cajero/dia)
    movimientos.forEach(m => {
        const esIngreso = !m.tipo || m.tipo === 'ingreso';
        if (!esIngreso) return;

        const cajero = m.cajero || 'Desconocido';

        // Si ya cargamos datos desde un arqueo cerrado, ignoramos movimientos sueltos
        if (datosPorCajero[cajero] && datosPorCajero[cajero].esArqueoCerrado) return;

        if (!datosPorCajero[cajero]) {
            datosPorCajero[cajero] = {
                tarjeta: 0, pedidosYa: 0, credito: 0, efectivo: 0, sobrante: 0, faltante: 0,
                egresos: 0, fondoFijo: 0, totalDeclarar: 0
            };
        }

        datosPorCajero[cajero].tarjeta += (m.pagosTarjeta || 0);
        datosPorCajero[cajero].pedidosYa += (m.pedidosYa || 0);
        datosPorCajero[cajero].credito += (m.ventasCredito || 0);

        let efectivoMovimiento = 0;
        if (m.valorVenta > 0) {
            efectivoMovimiento = m.valorVenta;
        } else {
            if (m.efectivo) Object.entries(m.efectivo).forEach(([d, c]) => efectivoMovimiento += parseInt(d) * c);
            if (m.monedasExtranjeras) {
                if (m.monedasExtranjeras.usd) efectivoMovimiento += (m.monedasExtranjeras.usd.montoGs || 0);
                if (m.monedasExtranjeras.brl) efectivoMovimiento += (m.monedasExtranjeras.brl.montoGs || 0);
                if (m.monedasExtranjeras.ars) efectivoMovimiento += (m.monedasExtranjeras.ars.montoGs || 0);
            }
        }

        let montoServicioEfectivo = 0;
        // ... (cálculo servicios) ...
        if (m.servicios) {
            Object.values(m.servicios).forEach(s => {
                const monto = parseFloat(s.monto) || 0;
                if (monto > 0) montoServicioEfectivo += monto;
            });
        }
        if (m.otrosServicios) {
            m.otrosServicios.forEach(s => {
                const monto = parseFloat(s.monto) || 0;
                if (monto > 0) montoServicioEfectivo += monto;
            });
        }

        // Para movimientos sueltos, asumimos que efectivoMovimiento YA es el ingreso neto
        // O si queremos compatibilidad con la fórmula, totalDeclarar sería el efectivo bruto
        datosPorCajero[cajero].totalDeclarar += efectivoMovimiento;

        let ingresoTiendaNeto = efectivoMovimiento - montoServicioEfectivo;
        if (ingresoTiendaNeto < 0) ingresoTiendaNeto = 0;

        datosPorCajero[cajero].efectivo += ingresoTiendaNeto;
    });

    // Renderizar Filas
    Object.keys(datosPorCajero).sort().forEach(cajero => {
        const d = datosPorCajero[cajero];

        const row = document.createElement('tr');
        row.dataset.cajero = cajero;

        // Calcular valores iniciales
        // Usamos totalDeclarar si existe (caso Arqueo), o fallback a efectivo (caso Movs sueltos)
        const totalDeclararSystem = d.totalDeclarar || d.efectivo;
        const egresosSystem = d.egresos || 0;
        const fondoSystem = d.fondoFijo || 0;
        // Guardamos el "Ingreso Tienda" real para comparaciones si fuera necesario
        const ingresoTiendaReal = d.efectivo;

        const rowHTML = `
            <td>${cajero}</td>
            <td>${formatearMoneda(d.tarjeta, 'gs')}</td>
            <td>${formatearMoneda(d.pedidosYa, 'gs')}</td>
            <td>${formatearMoneda(d.credito, 'gs')}</td>
            <td><input type="number" class="input-recaudacion" value="0" 
                data-system="${totalDeclararSystem}" 
                data-egresos="${egresosSystem}" 
                data-fondo="${fondoSystem}"
                data-ingreso-tienda="${ingresoTiendaReal}"></td>
            <td class="col-sobrante">${formatearMoneda(0, 'gs')}</td>
            <td class="col-faltante negativo">${formatearMoneda(0, 'gs')}</td>
            <td class="col-subtotal"><strong>${formatearMoneda(0, 'gs')}</strong></td>
        `;
        row.innerHTML = rowHTML;

        // Update function for this row
        const input = row.querySelector('.input-recaudacion');
        const updateRow = () => {
            const inputVal = parseFloat(input.value) || 0;
            const systemVal = parseFloat(input.dataset.system); // Total a declarar
            const egresosVal = parseFloat(input.dataset.egresos);
            const fondoVal = parseFloat(input.dataset.fondo);
            const ingresoTiendaVal = parseFloat(input.dataset.ingresoTienda);

            // El usuario solo quiere ingresar el efectivo de tienda (sin servicios)
            // Por eso comparamos contra el Total Ingresos Tienda ya calculado
            const calculatedExpectation = ingresoTiendaVal;
            const difference = inputVal - calculatedExpectation;

            let sobrante = 0;
            let faltante = 0;

            // Condición: si Efectivo === Total Ingresos Tienda (que es calculatedExpectation)
            // Usamos una tolerancia pequeña para evitar errores de punto flotante
            if (Math.abs(difference) < 1) {
                sobrante = 0;
                faltante = 0;
            } else {
                if (difference > 0) {
                    sobrante = difference;
                } else {
                    faltante = Math.abs(difference);
                }
            }

            row.querySelector('.col-sobrante').textContent = formatearMoneda(sobrante, 'gs');
            row.querySelector('.col-faltante').textContent = formatearMoneda(faltante, 'gs');

            const totalCajero = d.tarjeta + d.pedidosYa + d.credito + inputVal;
            row.querySelector('.col-subtotal').innerHTML = `<strong>${formatearMoneda(totalCajero, 'gs')}</strong>`;

            actualizarTotalesFooter();
        };

        input.addEventListener('input', updateRow);
        setTimeout(updateRow, 0);

        tbody.appendChild(row);
    });

    // Fila Otros Ingresos
    const rowOtros = document.createElement('tr');
    rowOtros.innerHTML = `
        <td>OTROS INGRESOS</td>
        <td></td><td></td><td></td>
        <td>${formatearMoneda(0, 'gs')}</td>
        <td></td><td></td>
        <td><strong>${formatearMoneda(0, 'gs')}</strong></td>
    `;
    tbody.appendChild(rowOtros);

    // Fila Totales
    const rowTotal = document.createElement('tr');
    rowTotal.className = 'total-row';
    rowTotal.id = 'rowTotalRecaudacion';
    tfoot.appendChild(rowTotal);

    function actualizarTotalesFooter() {
        let tTarjeta = 0, tPy = 0, tCredito = 0, tEfectivo = 0, tSobrante = 0, tFaltante = 0, tSub = 0;

        Object.values(datosPorCajero).forEach(d => {
            tTarjeta += d.tarjeta;
            tPy += d.pedidosYa;
            tCredito += d.credito;
        });

        document.querySelectorAll('#tbodyRecaudacion tr').forEach(tr => {
            if (tr.querySelector('input')) {
                tEfectivo += parseFloat(tr.querySelector('input').value) || 0;
                tSobrante += parsearMoneda(tr.querySelector('.col-sobrante').textContent);
                tFaltante += parsearMoneda(tr.querySelector('.col-faltante').textContent);
                tSub += parsearMoneda(tr.querySelector('.col-subtotal').textContent);
            }
        });

        const row = document.getElementById('rowTotalRecaudacion');
        if (row) {
            row.innerHTML = `
                <td>TOTAL RECAUDADO:</td>
                <td>${formatearMoneda(tTarjeta, 'gs')}</td>
                <td>${formatearMoneda(tPy, 'gs')}</td>
                <td>${formatearMoneda(tCredito, 'gs')}</td>
                <td>${formatearMoneda(tEfectivo, 'gs')}</td>
                <td>${formatearMoneda(tSobrante, 'gs')}</td>
                <td class="negativo">${formatearMoneda(tFaltante, 'gs')}</td>
                <td>${formatearMoneda(tSub, 'gs')}</td>
            `;
        }
    }
}
