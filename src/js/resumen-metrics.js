/**
 * Actualiza las métricas quick stats en la página de Resumen
 * Muestra total efectivo, total tarjeta, total crédito y caja destacada
 */
window.actualizarMetricasResumen = function () {
    // Verificar que estamos en la página de resumen
    if (!document.getElementById('metricTotalTarjeta')) return;

    // **NUEVO:** Resetear el total global al iniciar la actualización para evitar datos obsoletos
    window.totalRecaudadoGlobal = 0;

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
    let totalTarjeta = 0;
    let totalCredito = 0;
    let totalPedidosYa = 0;

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
    });

    // Actualizar UI
    const elTarjeta = document.getElementById('metricTotalTarjeta');
    const elPedidosYa = document.getElementById('metricTotalPedidosYa');
    const elCredito = document.getElementById('metricTotalCredito');

    if (elTarjeta) elTarjeta.textContent = formatearMoneda(totalTarjeta, 'gs');
    if (elPedidosYa) elPedidosYa.textContent = formatearMoneda(totalPedidosYa, 'gs');
    if (elCredito) elCredito.textContent = formatearMoneda(totalCredito, 'gs');

    // **NUEVO:** Hacer las tarjetas clicables
    const addClickListener = (id, tipo) => {
        const card = document.querySelector(`.${id}`);
        if (card) {
            // Remover listeners anteriores para evitar duplicados (clonando el nodo)
            const newCard = card.cloneNode(true);
            card.parentNode.replaceChild(newCard, card);
            newCard.addEventListener('click', () => mostrarDetalleMetrica(tipo, movimientosFiltrados));
        }
    };

    addClickListener('metric-tarjeta', 'tarjeta');
    addClickListener('metric-pedidosya', 'pedidosya');
    addClickListener('metric-credito', 'credito');
    // addClickListener('metric-efectivo', 'efectivo');

    // Actualizar Tabla Recaudacion
    actualizarTablaRecaudacion(movimientosFiltrados, fechaDesde, fechaHasta, filtroCajaGeneral);
};

// **NUEVO:** Funciones para el Modal de Detalle
window.mostrarDetalleMetrica = function (tipo, movimientos) {
    const modal = document.getElementById('modalDetalleMetrica');
    const tbody = document.getElementById('tbodyDetalleMetrica');
    const titulo = document.getElementById('tituloModalMetrica');
    const totalEl = document.getElementById('totalModalMetrica');
    if (!modal || !tbody) return;

    let movimientosFiltrados = [];
    let tituloTexto = '';
    let total = 0;

    // Helper para identificar si es ingreso de tienda (no servicio) - Reutilizado
    const esIngresoTienda = (m) => {
        let esServicio = false;
        if (m.servicios) esServicio = Object.values(m.servicios).some(s => (parseFloat(s.monto) || 0) > 0);
        if (!esServicio && m.otrosServicios && m.otrosServicios.length > 0)
            esServicio = m.otrosServicios.some(s => (parseFloat(s.monto) || 0) > 0);
        return !esServicio;
    };

    if (tipo === 'tarjeta') {
        tituloTexto = 'Detalle Pagos con Tarjeta';
        movimientosFiltrados = movimientos.filter(m => (m.pagosTarjeta || 0) > 0);
        total = movimientosFiltrados.reduce((sum, m) => sum + (m.pagosTarjeta || 0), 0);
    } else if (tipo === 'pedidosya') {
        tituloTexto = 'Detalle Pedidos Ya';
        movimientosFiltrados = movimientos.filter(m => (m.pedidosYa || 0) > 0);
        total = movimientosFiltrados.reduce((sum, m) => sum + (m.pedidosYa || 0), 0);
    } else if (tipo === 'credito') {
        tituloTexto = 'Detalle Ventas a Crédito';
        movimientosFiltrados = movimientos.filter(m => (m.ventasCredito || 0) > 0);
        total = movimientosFiltrados.reduce((sum, m) => sum + (m.ventasCredito || 0), 0);
    }

    titulo.textContent = tituloTexto;
    tbody.innerHTML = '';

    if (movimientosFiltrados.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No hay movimientos registrados.</td></tr>';
    } else {
        movimientosFiltrados.forEach(m => {
            let montoMostrar = 0;
            if (tipo === 'tarjeta') montoMostrar = m.pagosTarjeta;
            else if (tipo === 'pedidosya') montoMostrar = m.pedidosYa;
            else if (tipo === 'credito') montoMostrar = m.ventasCredito;

            const row = `
                <tr>
                    <td>${formatearFecha(m.fecha)}</td>
                    <td>${m.cajero || 'N/A'}</td>
                    <td>${m.caja || 'N/A'}</td>
                    <td>${m.descripcion || 'Sin descripción'}</td>
                    <td style="text-align: right; font-weight: bold;">${formatearMoneda(montoMostrar, 'gs')}</td>
                </tr>
            `;
            tbody.innerHTML += row;
        });
    }

    if (totalEl) totalEl.textContent = formatearMoneda(total, 'gs');
    modal.style.display = 'block';
};

window.cerrarModalMetrica = function () {
    const modal = document.getElementById('modalDetalleMetrica');
    if (modal) modal.style.display = 'none';
};

// Cerrar modal al hacer click fuera
window.onclick = function (event) {
    const modal = document.getElementById('modalDetalleMetrica');
    if (event.target == modal) {
        modal.style.display = "none";
    }
};


// Nueva función para la tabla de Recaudación
async function actualizarTablaRecaudacion(movimientos, fechaDesde, fechaHasta, filtroCaja) {
    const tbody = document.getElementById('tbodyRecaudacion');
    const tfoot = document.getElementById('tfootRecaudacion');
    if (!tbody || !tfoot) return;

    // Recuperar datos de Supabase si existe
    let recaudacionGuardada = {};
    if (db && db.obtenerRecaudacion && fechaDesde) {
        try {
            // Esperar a que la base de datos responda antes de renderizar
            const registros = await db.obtenerRecaudacion(fechaDesde, null, filtroCaja || null);
            if (registros && registros.length > 0) {
                registros.forEach(reg => {
                    // Normalizar clave para coincidir con la generación posterior
                    const clave = `${reg.cajero}_${reg.caja}`;
                    recaudacionGuardada[clave] = reg.efectivo_ingresado;
                });
                console.log('[DEBUG] Recaudación recuperada de BD:', Object.keys(recaudacionGuardada).length, 'registros');
            }
        } catch (err) {
            console.error('Error recuperando recaudación:', err);
        }
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

    // Agrupar por cajero Y caja
    const datosPorClave = {}; // Clave: "Cajero_Caja"

    // --- LÓGICA HÍBRIDA: PRIORIZAR ARQUEOS CERRADOS ---
    // 1. Agrupar Arqueos existentes


    if (estado.arqueos) {
        estado.arqueos.forEach(a => {
            const fechaArqueo = a.fecha.split('T')[0];
            if (fechaDesde && fechaArqueo < fechaDesde) return;
            if (fechaHasta && fechaArqueo > fechaHasta) return;
            if (filtroCaja && filtroCaja !== 'Todas las Cajas' && a.caja !== filtroCaja) return;

            const cajero = a.cajero || 'Desconocido';
            const caja = a.caja || 'Desconocida';
            const clave = `${cajero}_${caja}`;

            if (!datosPorClave[clave]) {
                datosPorClave[clave] = {
                    nombreCajero: cajero,
                    nombreCaja: caja,
                    tarjeta: 0, pedidosYa: 0, credito: 0, efectivo: 0, sobrante: 0, faltante: 0,
                    egresos: 0, fondoFijo: 0, totalDeclarar: 0, ingresoTiendaCalculado: 0,
                    esArqueoCerrado: true
                };
            } else {
                datosPorClave[clave].esArqueoCerrado = true;
            }

            datosPorClave[clave].tarjeta += (a.pagosTarjeta || 0);
            datosPorClave[clave].pedidosYa += (a.pedidosYa || 0);
            datosPorClave[clave].credito += (a.ventasCredito || 0);

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

            // Sumar monedas extranjeras del arqueo si existen (Soporte camelCase y snake_case)
            const monedas = a.monedasExtranjeras || a.monedas_extranjeras;
            if (monedas) {
                // Función helper para obtener monto en Gs de una moneda
                const obtenerMontoMoneda = (monedaData) => {
                    if (!monedaData) return 0;
                    // Prioridad 1: Monto ya calculado y guardado
                    let monto = monedaData.montoGs || monedaData.monto_gs;
                    // Prioridad 2: Calcular si tenemos cantidad y cotización
                    if (!monto && monedaData.cantidad > 0 && monedaData.cotizacion > 0) {
                        monto = monedaData.cantidad * monedaData.cotizacion;
                    }
                    return monto || 0;
                };

                // USD
                efectivoFisico += obtenerMontoMoneda(monedas.usd);
                // BRL
                efectivoFisico += obtenerMontoMoneda(monedas.brl);
                // ARS
                efectivoFisico += obtenerMontoMoneda(monedas.ars);
            }

            let egresos = (a.total_egresos !== undefined) ? a.total_egresos : (a.totalEgresos || 0);
            let fondo = (a.fondo_fijo !== undefined) ? a.fondo_fijo : (a.fondoFijo || 0);

            // Recalcular Ingreso Tienda usando los datos del arqueo
            let ingresoTiendaCalculado = (efectivoFisico + egresos) - serviciosEfectivo - fondo;

            datosPorClave[clave].totalDeclarar = efectivoFisico; // Asumimos que esto es "Total a declarar"
            datosPorClave[clave].egresos = egresos;
            datosPorClave[clave].fondoFijo = fondo;

            console.log(`[DEBUG ARQUEO CERRADO - ${cajero} ${caja}]`, {
                efectivoFisico,
                egresos,
                serviciosEfectivo,
                serviciosDetalle: a.servicios,
                otrosServicios: a.otrosServicios,
                fondo,
                calculo: `(${efectivoFisico} + ${egresos}) - ${serviciosEfectivo} - ${fondo} = ${ingresoTiendaCalculado}`,
                arqueoCompleto: a
            });

            if (ingresoTiendaCalculado < 0) ingresoTiendaCalculado = 0;

            // Almacenar el Total Ingresos Tienda calculado
            datosPorClave[clave].ingresoTiendaCalculado = ingresoTiendaCalculado;
        });
    }

    // 2. Procesar Movimientos (SOLO si no hay arqueo cerrado para ese cajero/caja/dia)
    // Primero, consolidar datos de movimientos por cajero+caja
    const datosPorClaveTemp = {};

    movimientos.forEach((m, idx) => {
        const esIngreso = !m.tipo || m.tipo === 'ingreso';
        if (!esIngreso) return;

        const cajero = m.cajero || 'Desconocido';
        const caja = m.caja || 'Desconocida';
        const clave = `${cajero}_${caja}`;

        // Si ya cargamos datos desde un arqueo cerrado, ignoramos movimientos sueltos
        if (datosPorClave[clave] && datosPorClave[clave].esArqueoCerrado) return;

        if (!datosPorClaveTemp[clave]) {
            datosPorClaveTemp[clave] = {
                nombreCajero: cajero,
                nombreCaja: caja,
                efectivoBruto: 0,
                servicios: 0,
                tarjeta: 0,
                pedidosYa: 0,
                credito: 0
            };
        }

        datosPorClaveTemp[clave].tarjeta += (m.pagosTarjeta || 0);
        datosPorClaveTemp[clave].pedidosYa += (m.pedidosYa || 0);
        datosPorClaveTemp[clave].credito += (m.ventasCredito || 0);

        let efectivoMovimiento = 0;
        if (m.valorVenta > 0) {
            efectivoMovimiento = m.valorVenta;
        } else {
            if (m.efectivo) Object.entries(m.efectivo).forEach(([d, c]) => efectivoMovimiento += parseInt(d) * c);
            // Sumar monedas extranjeras (Soporte camelCase y snake_case)
            const monedas = m.monedasExtranjeras || m.monedas_extranjeras;
            if (monedas) {
                // Función helper dentro del loop de movimientos
                const obtenerMontoMonedaMov = (monedaData) => {
                    if (!monedaData) return 0;
                    let monto = monedaData.montoGs || monedaData.monto_gs;
                    if (!monto && monedaData.cantidad > 0 && monedaData.cotizacion > 0) {
                        monto = monedaData.cantidad * monedaData.cotizacion;
                    }
                    return monto || 0;
                };

                // USD
                efectivoMovimiento += obtenerMontoMonedaMov(monedas.usd);
                // BRL
                efectivoMovimiento += obtenerMontoMonedaMov(monedas.brl);
                // ARS
                efectivoMovimiento += obtenerMontoMonedaMov(monedas.ars);
            }
        }
        datosPorClaveTemp[clave].efectivoBruto += efectivoMovimiento;

        let montoServicioEfectivo = 0;
        if (m.servicios) {
            Object.values(m.servicios).forEach(s => {
                const monto = parseFloat(s.monto) || 0;
                // **MODIFICADO:** Sumar todos los montos (positivos Y negativos)
                montoServicioEfectivo += monto;
            });
        }
        if (m.otrosServicios) {
            m.otrosServicios.forEach(s => {
                const monto = parseFloat(s.monto) || 0;
                // **MODIFICADO:** Sumar todos los montos (positivos Y negativos)
                montoServicioEfectivo += monto;
            });
        }
        datosPorClaveTemp[clave].servicios += montoServicioEfectivo;
    });

    // Ahora procesar datos consolidados
    Object.keys(datosPorClaveTemp).forEach(clave => {
        const temp = datosPorClaveTemp[clave];
        const { nombreCajero, nombreCaja } = temp;

        if (!datosPorClave[clave]) {
            datosPorClave[clave] = {
                nombreCajero, nombreCaja,
                tarjeta: 0, pedidosYa: 0, credito: 0, efectivo: 0, sobrante: 0, faltante: 0,
                egresos: 0, fondoFijo: 0, totalDeclarar: 0, ingresoTiendaCalculado: 0
            };
        }

        datosPorClave[clave].tarjeta = temp.tarjeta;
        datosPorClave[clave].pedidosYa = temp.pedidosYa;
        datosPorClave[clave].credito = temp.credito;

        // Calcular Total Egresos para este cajero Y caja desde estado.egresosCaja
        let egresosDelCajero = 0;
        if (estado.egresosCaja && estado.egresosCaja.length > 0) {
            egresosDelCajero = estado.egresosCaja
                .filter(e => (!e.cajero || e.cajero === nombreCajero || e.cajero === 'Todas las cajas') &&
                    (!e.caja || e.caja === nombreCaja))
                .reduce((sum, e) => sum + (e.monto || 0), 0);
        }

        // Usar fondo fijo por defecto (700000)
        const fondoFijo = 700000;

        // FÓRMULA CORRECTA: Total Ingresos Tienda = (Efectivo Bruto + Egresos) - Servicios - Fondo Fijo
        const totalADeclarar = temp.efectivoBruto + egresosDelCajero;
        const ingresoTiendaCalculado = totalADeclarar - temp.servicios - fondoFijo;

        console.log(`[DEBUG CONSOLIDADO - ${nombreCajero} ${nombreCaja}]`, {
            efectivoBruto: temp.efectivoBruto,
            egresos: egresosDelCajero,
            servicios: temp.servicios,
            serviciosDetalle: temp.serviciosDetalle, // **NUEVO:** Ver detalle de servicios
            fondoFijo: fondoFijo,
            totalADeclarar: totalADeclarar,
            ingresoTiendaCalculado: Math.max(0, ingresoTiendaCalculado)
        });

        datosPorClave[clave].totalDeclarar = totalADeclarar;
        datosPorClave[clave].egresos = egresosDelCajero;
        datosPorClave[clave].fondoFijo = fondoFijo;
        datosPorClave[clave].ingresoTiendaCalculado = Math.max(0, ingresoTiendaCalculado);
        datosPorClave[clave].efectivo = temp.efectivoBruto;
    });

    // Renderizar Filas
    Object.keys(datosPorClave).sort().forEach(clave => {
        const d = datosPorClave[clave];
        const { nombreCajero, nombreCaja } = d;

        const row = document.createElement('tr');
        row.dataset.cajero = nombreCajero;
        row.dataset.caja = nombreCaja;

        // Calcular valores iniciales
        // Usamos totalDeclarar si existe (caso Arqueo), o fallback a efectivo (caso Movs sueltos)
        const totalDeclararSystem = d.totalDeclarar || d.efectivo;
        const egresosSystem = d.egresos || 0;
        const fondoSystem = d.fondoFijo || 0;
        // Guardamos el "Ingreso Tienda" real calculado para comparaciones
        const ingresoTiendaReal = d.ingresoTiendaCalculado || 0;



        const rowHTML = `
            <td>
                <div>${nombreCajero}</div>
                <div style="font-size: 0.85em; color: #666; font-weight: normal;">${nombreCaja}</div>
            </td>
            <td style="text-align: right; padding-right: 10px;"><strong>${formatearMoneda(ingresoTiendaReal, 'gs')}</strong></td>
            <td>
                <div style="display: flex; align-items: center; gap: 5px;">
                    <input type="text" inputmode="numeric" class="input-recaudacion" value="0" 
                        data-cajero="${nombreCajero}"
                        data-caja="${nombreCaja}"
                        data-system="${totalDeclararSystem}" 
                        data-egresos="${egresosSystem}" 
                        data-fondo="${fondoSystem}"
                        data-ingreso-tienda="${ingresoTiendaReal}">
                    <button type="button" class="btn-guardar-recaudacion" title="Guardar en base de datos" 
                        style="background: transparent; border: none; cursor: pointer; font-size: 1.2em; padding: 0 4px;">
                        💾
                    </button>
                </div>
            </td>
            <td class="col-sobrante">${formatearMoneda(0, 'gs')}</td>
            <td class="col-faltante negativo">${formatearMoneda(0, 'gs')}</td>
            <td class="col-subtotal"><strong>${formatearMoneda(0, 'gs')}</strong></td>
        `;
        row.innerHTML = rowHTML;

        // Update function for this row
        const input = row.querySelector('.input-recaudacion');

        // Crear clave de localStorage con fecha + caja + cajero
        // **IMPORTANTE**: Sanitizar nombres para evitar problemas en las claves
        const cleanCaja = nombreCaja.trim().replace(/\s+/g, '_');
        const cleanCajero = nombreCajero.trim().replace(/\s+/g, '_');
        const claveStorage = `recaudacion_${fechaDesde}_${cleanCaja}_${cleanCajero}`;

        // Recuperar valor guardado en localStorage (prioridad 1)
        let storedValue = localStorage.getItem(claveStorage);

        // Si no está en localStorage, intentar recuperar de Supabase (prioridad 2)
        if (!storedValue && recaudacionGuardada) {
            const claveSupabase = `${nombreCajero}_${nombreCaja}`;
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
            localStorage.setItem(claveStorage, numValue);
        });
        input.addEventListener('blur', () => {
            // Limpiar puntos antes de parsear para evitar errores
            const rawValue = input.value.replace(/\./g, '');
            const value = parseFloat(rawValue) || 0;
            
            if (value > 0) {
                // Formatear con separadores de miles
                input.value = new Intl.NumberFormat('es-PY', { minimumFractionDigits: 0 }).format(value);
            }
            
            // Guardar en localStorage usando el valor numérico
            localStorage.setItem(claveStorage, value);


            // Guardar en Supabase
            if (db && db.guardarRecaudacion && fechaDesde) {
                // Guardar usando la caja específica de la fila
                db.guardarRecaudacion(fechaDesde, nombreCajero, nombreCaja, value).then(success => {
                    if (success) {
                        console.log(`✓ Recaudación guardada en BD para ${nombreCajero} (${nombreCaja})`);
                    }
                });
            }
        });
        
        // Al cargar, formatear si ya tiene valor
        if (storedValue && parseFloat(storedValue) > 0) {
             input.value = new Intl.NumberFormat('es-PY', { minimumFractionDigits: 0 }).format(parseFloat(storedValue));
        }
        input.addEventListener('focus', () => {
            // Remover formato cuando gana el foco para que pueda editar
            const value = parseFloat(input.value.replace(/\./g, '')) || 0;
            input.value = value;
        });
        
        // Listener para el botón de guardar
        const btnGuardar = row.querySelector('.btn-guardar-recaudacion');
        if (btnGuardar) {
            btnGuardar.addEventListener('click', () => {
                const rawValue = input.value.replace(/\./g, '');
                const value = parseFloat(rawValue) || 0;
                
                // Efecto visual de carga
                btnGuardar.textContent = '⏳';
                
                // Guardar en Supabase
                if (db && db.guardarRecaudacion && fechaDesde) {
                    db.guardarRecaudacion(fechaDesde, nombreCajero, nombreCaja, value).then(success => {
                        if (success) {

                            // Feedback de éxito
                            btnGuardar.textContent = '✅';
                            showNotification(`Recaudación de ${nombreCajero} guardada correctamente`, 'success');
                            
                            // Restaurar icono después de 2 segundos
                            setTimeout(() => {
                                btnGuardar.textContent = '💾';
                            }, 2000);
                        } else {
                            btnGuardar.textContent = '❌';
                            showNotification('Error al guardar en base de datos', 'error');
                        }
                    });
                } else {
                    showNotification('No se puede guardar: Falta fecha o conexión', 'warning');
                    btnGuardar.textContent = '⚠️';
                }
            });
        }
        
        setTimeout(updateRow, 0);

        tbody.appendChild(row);
    });

    // Fila Totales
    const rowTotal = document.createElement('tr');
    rowTotal.className = 'total-row';
    rowTotal.id = 'rowTotalRecaudacion';
    tfoot.appendChild(rowTotal);

    function actualizarTotalesFooter() {
        let tIngresoTienda = 0, tEfectivo = 0, tSobrante = 0, tFaltante = 0, tSub = 0;

        document.querySelectorAll('#tbodyRecaudacion tr').forEach(tr => {
            const input = tr.querySelector('input');
            if (input) {
                // Sumar Column 2: Total Ingresos Tienda (dataset)
                tIngresoTienda += parseFloat(input.dataset.ingresoTienda) || 0;

                // Sumar Column 3: Efectivo (Input value, removing dots)
                const valorInput = parseFloat(input.value.replace(/\./g, '')) || 0;
                tEfectivo += valorInput;

                // Sumar Column 4: Sobrante
                tSobrante += parsearMoneda(tr.querySelector('.col-sobrante').textContent);

                // Sumar Column 5: Faltante
                tFaltante += parsearMoneda(tr.querySelector('.col-faltante').textContent);

                // Sumar Column 6: Subtotales
                tSub += parsearMoneda(tr.querySelector('.col-subtotal').textContent);
            }
        });

        const row = document.getElementById('rowTotalRecaudacion');
        if (row) {
            row.innerHTML = `
                <td>TOTAL RECAUDADO:</td>
                <td style="text-align: right; padding-right: 10px;"><strong>${formatearMoneda(tIngresoTienda, 'gs')}</strong></td>
                <td><strong>${formatearMoneda(tEfectivo, 'gs')}</strong></td>
                <td>${formatearMoneda(tSobrante, 'gs')}</td>
                <td class="negativo">${formatearMoneda(tFaltante, 'gs')}</td>
                <td><strong>${formatearMoneda(tSub, 'gs')}</strong></td>
            `;
        }

        // **NUEVO:** Guardar el total en variable global y actualizar tabla de Ingresos/Egresos
        window.totalRecaudadoGlobal = tSub;


        // Llamar a la actualización de la tabla Ingresos/Egresos si existe
        if (typeof window.cargarTablaIngresosEgresos === 'function') {
            window.cargarTablaIngresosEgresos();
        }
    }
}
