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

    // Limpiar localStorage cuando cambian los filtros (opcional: mantener valores si es la misma fecha/caja)
    // Por ahora, solo guardamos por nombre de cajero, ignorando fechas

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

    // Recuperar datos de Supabase si existe
    let recaudacionGuardada = {};
    if (db && db.obtenerRecaudacion && fechaDesde) {
        db.obtenerRecaudacion(fechaDesde, null, filtroCaja || null).then(registros => {
            if (registros && registros.length > 0) {
                registros.forEach(reg => {
                    const clave = `${reg.cajero}_${reg.caja}`;
                    recaudacionGuardada[clave] = reg.efectivo_ingresado;
                });
                console.log('[DB] Recaudación recuperada de Supabase:', recaudacionGuardada);
            }
        });
    }

    console.log('[DEBUG] Datos disponibles en estado:', {
        tieneArqueos: !!estado.arqueos && estado.arqueos.length > 0,
        tieneEgresosCaja: !!estado.egresosCaja && estado.egresosCaja.length > 0,
        cantidadEgresosCaja: estado.egresosCaja ? estado.egresosCaja.length : 0,
        egresosCaja: estado.egresosCaja,
        totalEgresos: estado.egresosCaja ? estado.egresosCaja.reduce((sum, e) => sum + (e.monto || 0), 0) : 0,
        tieneMovimientos: !!movimientos && movimientos.length > 0,
        cantidadMovimientos: movimientos ? movimientos.length : 0
    });

    tbody.innerHTML = '';
    tfoot.innerHTML = '';

    // Agrupar por cajero
    const datosPorCajero = {};

    // --- LÓGICA HÍBRIDA: PRIORIZAR ARQUEOS CERRADOS ---
    // 1. Agrupar Arqueos existentes por cajero (si existen en estado.arqueos)
    console.log('[DEBUG] estado.arqueos =', estado.arqueos);
    console.log('[DEBUG] Cantidad de arqueOS:', estado.arqueos ? estado.arqueos.length : 0);
    
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
                    egresos: 0, fondoFijo: 0, totalDeclarar: 0, ingresoTiendaCalculado: 0,
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

            // Almacenar valores crudos
            datosPorCajero[cajero].totalDeclarar = efectivoFisico; // Asumimos que esto es "Total a declarar"
            datosPorCajero[cajero].egresos = egresos;
            datosPorCajero[cajero].fondoFijo = fondo;

            // FÓRMULA CORREGIDA: Total Ingresos Tienda = Total a declarar Sistema - Total Servicios - Fondo fijo
            let ingresoTiendaCalculado = efectivoFisico - serviciosEfectivo - fondo;

            console.log(`[DEBUG ARQUEO - ${cajero}] efectivoFisico=${efectivoFisico}, serviciosEfectivo=${serviciosEfectivo}, fondo=${fondo}, RESULTADO=${ingresoTiendaCalculado}`);

            if (ingresoTiendaCalculado < 0) ingresoTiendaCalculado = 0;

            // Almacenar el Total Ingresos Tienda calculado
            datosPorCajero[cajero].ingresoTiendaCalculado = ingresoTiendaCalculado;
        });
    }

    // 2. Procesar Movimientos (SOLO si no hay arqueo cerrado para ese cajero/dia)
    // Primero, consolidar datos de movimientos por cajero
    const datosPorCajeroTemp = {};
    
    movimientos.forEach((m, idx) => {
        const esIngreso = !m.tipo || m.tipo === 'ingreso';
        if (!esIngreso) return;

        const cajero = m.cajero || 'Desconocido';

        // Si ya cargamos datos desde un arqueo cerrado, ignoramos movimientos sueltos
        if (datosPorCajero[cajero] && datosPorCajero[cajero].esArqueoCerrado) return;

        if (!datosPorCajeroTemp[cajero]) {
            datosPorCajeroTemp[cajero] = {
                efectivoBruto: 0,
                servicios: 0,
                tarjeta: 0,
                pedidosYa: 0,
                credito: 0
            };
        }

        datosPorCajeroTemp[cajero].tarjeta += (m.pagosTarjeta || 0);
        datosPorCajeroTemp[cajero].pedidosYa += (m.pedidosYa || 0);
        datosPorCajeroTemp[cajero].credito += (m.ventasCredito || 0);

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
        datosPorCajeroTemp[cajero].efectivoBruto += efectivoMovimiento;

        let montoServicioEfectivo = 0;
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
        datosPorCajeroTemp[cajero].servicios += montoServicioEfectivo;
    });

    // Ahora procesar datos consolidados
    Object.keys(datosPorCajeroTemp).forEach(cajero => {
        const temp = datosPorCajeroTemp[cajero];

        if (!datosPorCajero[cajero]) {
            datosPorCajero[cajero] = {
                tarjeta: 0, pedidosYa: 0, credito: 0, efectivo: 0, sobrante: 0, faltante: 0,
                egresos: 0, fondoFijo: 0, totalDeclarar: 0, ingresoTiendaCalculado: 0
            };
        }

        datosPorCajero[cajero].tarjeta = temp.tarjeta;
        datosPorCajero[cajero].pedidosYa = temp.pedidosYa;
        datosPorCajero[cajero].credito = temp.credito;

        // Calcular Total Egresos para este cajero desde estado.egresosCaja
        let egresosDelCajero = 0;
        if (estado.egresosCaja && estado.egresosCaja.length > 0) {
            egresosDelCajero = estado.egresosCaja
                .filter(e => !e.cajero || e.cajero === cajero || e.cajero === 'Todas las cajas')
                .reduce((sum, e) => sum + (e.monto || 0), 0);
        }
        
        // Usar fondo fijo por defecto (700000)
        const fondoFijo = 700000;

        // FÓRMULA FINAL: Total Ingresos Tienda = (Efectivo Bruto + Egresos) - Servicios - Fondo Fijo
        const totalADeclarar = temp.efectivoBruto + egresosDelCajero;
        const ingresoTiendaCalculado = totalADeclarar - temp.servicios - fondoFijo;

        console.log(`[DEBUG CONSOLIDADO - ${cajero}]`, {
            efectivoBruto: temp.efectivoBruto,
            egresos: egresosDelCajero,
            servicios: temp.servicios,
            fondoFijo: fondoFijo,
            totalADeclarar: totalADeclarar,
            ingresoTiendaCalculado: Math.max(0, ingresoTiendaCalculado)
        });

        datosPorCajero[cajero].totalDeclarar = totalADeclarar;
        datosPorCajero[cajero].egresos = egresosDelCajero;
        datosPorCajero[cajero].fondoFijo = fondoFijo;
        datosPorCajero[cajero].ingresoTiendaCalculado = Math.max(0, ingresoTiendaCalculado);
        datosPorCajero[cajero].efectivo = temp.efectivoBruto;
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
        // Guardamos el "Ingreso Tienda" real calculado para comparaciones
        const ingresoTiendaReal = d.ingresoTiendaCalculado || 0;

        const rowHTML = `
            <td>${cajero}</td>
            <td style="text-align: right; padding-right: 10px;"><strong>${formatearMoneda(ingresoTiendaReal, 'gs')}</strong></td>
            <td><input type="number" class="input-recaudacion" value="0" 
                data-cajero="${cajero}"
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
        
        // Crear clave de localStorage con fecha + caja + cajero
        const clave = `recaudacion_${fechaDesde}_${filtroCaja || 'Todas'}_${cajero}`;
        
        // Recuperar valor guardado en localStorage (prioridad 1)
        let storedValue = localStorage.getItem(clave);
        
        // Si no está en localStorage, intentar recuperar de Supabase (prioridad 2)
        if (!storedValue && recaudacionGuardada) {
            const claveSupabase = `${cajero}_${filtroCaja || 'Todas'}`;
            storedValue = recaudacionGuardada[claveSupabase];
        }
        
        if (storedValue) {
            input.value = storedValue;
        }
        
        const updateRow = () => {
            // Parsear valor removiendo puntos de formato
            const rawValue = input.value.replace(/\./g, '');
            const inputVal = parseFloat(rawValue) || 0;
            const ingresoTiendaVal = parseFloat(input.dataset.ingresoTienda);

            // Comparación: Efectivo ingresado - Total Ingresos Tienda
            const difference = inputVal - ingresoTiendaVal;

            let sobrante = 0;
            let faltante = 0;

            if (difference < 0) {
                sobrante = Math.abs(difference);
            } else if (difference > 0) {
                faltante = difference;
            }
            // Si difference === 0, ambos quedan en 0

            row.querySelector('.col-sobrante').textContent = formatearMoneda(sobrante, 'gs');
            row.querySelector('.col-faltante').textContent = formatearMoneda(faltante, 'gs');

            // Subtotales = Efectivo ingresado + Sobrante - Faltante
            const totalCajero = inputVal + sobrante - faltante;
            row.querySelector('.col-subtotal').innerHTML = `<strong>${formatearMoneda(totalCajero, 'gs')}</strong>`;

            actualizarTotalesFooter();
        };

        input.addEventListener('input', () => {
            updateRow();
            // Guardar en localStorage
            const rawValue = input.value.replace(/\./g, '');
            const numValue = parseFloat(rawValue) || 0;
            localStorage.setItem(clave, numValue);
        });
        input.addEventListener('blur', () => {
            const value = parseFloat(input.value) || 0;
            if (value > 0) {
                // Formatear con separadores de miles
                input.value = Math.floor(value).toLocaleString('es-PY');
            }
            // Guardar en localStorage
            localStorage.setItem(clave, value);
            
            // Guardar en Supabase
            if (db && db.guardarRecaudacion && fechaDesde && filtroCaja) {
                db.guardarRecaudacion(fechaDesde, cajero, filtroCaja, value).then(success => {
                    if (success) {
                        console.log(`✓ Recaudación guardada en BD para ${cajero}`);
                    }
                });
            }
        });
        input.addEventListener('focus', () => {
            // Remover formato cuando gana el foco para que pueda editar
            const value = parseFloat(input.value.replace(/\./g, '')) || 0;
            input.value = value;
        });
        setTimeout(updateRow, 0);

        tbody.appendChild(row);
    });

    // Fila Totales
    const rowTotal = document.createElement('tr');
    rowTotal.className = 'total-row';
    rowTotal.id = 'rowTotalRecaudacion';
    tfoot.appendChild(rowTotal);

    function actualizarTotalesFooter() {
        let tEfectivo = 0, tSobrante = 0, tFaltante = 0, tSub = 0;

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
                <td>${formatearMoneda(tEfectivo, 'gs')}</td>
                <td>${formatearMoneda(tSobrante, 'gs')}</td>
                <td class="negativo">${formatearMoneda(tFaltante, 'gs')}</td>
                <td>${formatearMoneda(tSub, 'gs')}</td>
            `;
        }
    }
}
