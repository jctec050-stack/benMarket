// Configuración y utilidades
const CONFIG = {
    denominaciones: [
        { valor: 100000, nombre: '100,000' },
        { valor: 50000, nombre: '50,000' },
        { valor: 20000, nombre: '20,000' },
        { valor: 10000, nombre: '10,000' },
        { valor: 5000, nombre: '5,000' },
        { valor: 2000, nombre: '2,000' },
        { valor: 1000, nombre: '1,000' },
        { valor: 500, nombre: '500' }
    ],
    monedas: {
        gs: 'Guaraníes',
        usd: 'Dólares',
        brl: 'Reales',
        ars: 'Pesos'
    }
};

// Estado de la aplicación
let estado = {
    arqueos: JSON.parse(localStorage.getItem('arqueos')) || [],
    movimientos: JSON.parse(localStorage.getItem('movimientos')) || [],
    egresosCaja: JSON.parse(localStorage.getItem('egresosCaja')) || [],
    movimientosTemporales: JSON.parse(localStorage.getItem('movimientosTemporales')) || [], // Para los ingresos de caja del día
    seccionActiva: 'ingreso-movimiento',
    ultimoNumeroRecibo: JSON.parse(localStorage.getItem('ultimoNumeroRecibo')) || 0
};

// Funciones de utilidad
function formatearMoneda(monto, moneda = 'gs') {
    return new Intl.NumberFormat('es-PY', {
        style: 'currency',
        currency: moneda === 'gs' ? 'PYG' : moneda === 'usd' ? 'USD' : moneda === 'brl' ? 'BRL' : 'ARS',
        minimumFractionDigits: 0
    }).format(monto);
}

function parsearMoneda(valor) {
    if (typeof valor === 'number') return valor;
    // Elimina puntos de miles y cualquier otro caracter no numérico
    return parseInt(String(valor).replace(/\D/g, ''), 10) || 0;
}

function formatearFecha(fecha) {
    return new Date(fecha).toLocaleDateString('es-PY', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function generarId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function obtenerFechaHoraLocalISO() {
    const ahora = new Date();
    // Se ajusta la fecha a la zona horaria local para que toISOString() funcione como se espera.
    ahora.setMinutes(ahora.getMinutes() - ahora.getTimezoneOffset());
    return ahora.toISOString().slice(0, 16);
}

// Inicializar formulario de arqueo
function inicializarFormularioArqueo() {
    const tabla = document.getElementById('tablaDenominaciones');
    const tablaEgreso = document.getElementById('tablaDenominacionesEgresoCaja');
    if (tabla) tabla.innerHTML = ''; // Limpiar tabla de arqueo final

    CONFIG.denominaciones.forEach(denom => {
        // Fila para el Arqueo Final (solo lectura)
        const filaFinal = document.createElement('tr');
        filaFinal.innerHTML = `
            <td>${denom.nombre}</td>
            <td><input type="number" class="cantidad-denominacion" data-denominacion="${denom.valor}" min="0" value="0" readonly></td>
            <td class="monto-parcial" data-denominacion="${denom.valor}">0</td>
        `;
        if (tabla) tabla.appendChild(filaFinal);

        // Fila para el Egreso de Caja (editable)
        const filaEgreso = document.createElement('tr');
        filaEgreso.innerHTML = `
            <td>${denom.nombre}</td>
            <td><input type="number" class="cantidad-denominacion-egreso" data-denominacion="${denom.valor}" min="0" value="0"></td>
            <td class="monto-parcial-egreso" data-denominacion="${denom.valor}">0</td>
        `;
        tablaEgreso.appendChild(filaEgreso);
    });

    // Agregar filas para monedas extranjeras
    const filasMonedas = [
        { nombre: 'DÓLAR (US$)', clase: 'cantidad-moneda', data: 'data-moneda="usd"' },
        { nombre: 'REAL (R$)', clase: 'cantidad-moneda', data: 'data-moneda="brl"' },
        { nombre: 'PESO ($)', clase: 'cantidad-moneda', data: 'data-moneda="ars"' }
    ];

    filasMonedas.forEach(moneda => {
        const fila = document.createElement('tr');
        fila.innerHTML = `
            <td>${moneda.nombre}</td>
            <td><input type="number" class="${moneda.clase}" ${moneda.data} min="0" step="0.01" value="0" readonly></td>
            <td class="monto-moneda" ${moneda.data}>0</td> <!-- Este mostrará el total en Gs -->
        `;
        if (tabla) tabla.appendChild(fila); // Para el arqueo final

    });

    // Event listener para el arqueo final (si existe)
    if (tabla) {
        tabla.addEventListener('input', function (e) { });
    }

    tablaEgreso.addEventListener('input', function (e) {
        if (e.target.classList.contains('cantidad-denominacion-egreso')) {
            const input = e.target;
            const monto = (parseInt(input.value) || 0) * parseInt(input.dataset.denominacion);
            input.closest('tr').querySelector('.monto-parcial-egreso').textContent = formatearMoneda(monto, 'gs');
            calcularTotalEgresoCaja();
        }
    });

    // Establecer fecha y hora actual
    document.getElementById('fecha').value = obtenerFechaHoraLocalISO();
}

function inicializarModalEfectivo() {
    const tablaMovimiento = document.getElementById('tablaDenominacionesMovimiento');
    const tablaVuelto = document.getElementById('tablaVueltoMovimiento');
    tablaMovimiento.innerHTML = '';
    tablaVuelto.innerHTML = '';

    CONFIG.denominaciones.forEach(denom => {
        // Fila para Ingresar Movimiento (editable)
        const filaMovimiento = document.createElement('tr');
        filaMovimiento.innerHTML = `
            <td>${denom.nombre}</td>
            <td><input type="number" class="cantidad-denominacion-movimiento" data-denominacion="${denom.valor}" min="0" value="0"></td>
            <td class="monto-parcial-movimiento" data-denominacion="${denom.valor}">0</td>
        `;
        tablaMovimiento.appendChild(filaMovimiento);

        // Fila para el Vuelto del Movimiento (editable)
        const filaVuelto = document.createElement('tr');
        filaVuelto.innerHTML = `
            <td>${denom.nombre}</td>
            <td><input type="number" class="cantidad-denominacion-vuelto" data-denominacion="${denom.valor}" min="0" value="0"></td>
            <td class="monto-parcial-vuelto" data-denominacion="${denom.valor}">0</td>
        `;
        tablaVuelto.appendChild(filaVuelto);
    });

    const filasMonedas = [
        { nombre: 'DÓLAR (US$)', clase: 'cantidad-moneda', data: 'data-moneda="usd"' },
        { nombre: 'REAL (R$)', clase: 'cantidad-moneda', data: 'data-moneda="brl"' },
        { nombre: 'PESO ($)', clase: 'cantidad-moneda', data: 'data-moneda="ars"' }
    ];

    filasMonedas.forEach(moneda => {
        const filaMovimiento = document.createElement('tr');
        filaMovimiento.innerHTML = `
            <td>${moneda.nombre}</td>
            <td><input type="number" class="${moneda.clase}-movimiento" ${moneda.data} min="0" step="0.01" value="0"></td>
            <td class="monto-moneda-movimiento" ${moneda.data}>0</td>
        `;
        tablaMovimiento.appendChild(filaMovimiento); // Para el formulario de movimiento
    });

    // Re-asignar event listeners que se pierden al limpiar el innerHTML
    tablaMovimiento.addEventListener('input', function (e) {
        if (e.target.classList.contains('cantidad-denominacion-movimiento')) {
            const input = e.target;
            const monto = (parseInt(input.value) || 0) * parseInt(input.dataset.denominacion);
            input.closest('tr').querySelector('.monto-parcial-movimiento').textContent = formatearMoneda(monto, 'gs');
            calcularTotalEfectivoMovimiento();
        } else if (e.target.classList.contains('cantidad-moneda-movimiento')) {
            const input = e.target;
            const moneda = input.dataset.moneda;
            const cotizacion = obtenerCotizacion(moneda, true);
            const monto = (parseFloat(input.value) || 0) * cotizacion;
            input.closest('tr').querySelector('.monto-moneda-movimiento').textContent = formatearMoneda(monto, 'gs');
            calcularTotalEfectivoMovimiento();
        }
    });

    // **CORRECCIÓN:** Mover el listener de la tabla de vuelto aquí, ya que es donde se genera.
    tablaVuelto.addEventListener('input', function (e) {
        if (e.target.classList.contains('cantidad-denominacion-vuelto')) {
            const input = e.target;
            const monto = (parseInt(input.value) || 0) * parseInt(input.dataset.denominacion);
            input.closest('tr').querySelector('.monto-parcial-vuelto').textContent = formatearMoneda(monto, 'gs');
            calcularTotalVueltoRegistrado();
        }
    });
}

function calcularTotalEfectivoMovimiento() {
    let total = 0;
    document.querySelectorAll('#tablaDenominacionesMovimiento .cantidad-denominacion-movimiento').forEach(input => {
        const denominacion = parseInt(input.dataset.denominacion);
        const cantidad = parseInt(input.value) || 0;
        total += denominacion * cantidad;
    });
    document.querySelectorAll('#tablaDenominacionesMovimiento .cantidad-moneda-movimiento').forEach(input => {
        const moneda = input.dataset.moneda;
        const cantidad = parseFloat(input.value) || 0;
        const cotizacion = obtenerCotizacion(moneda, true);
        total += cantidad * cotizacion;
    });

    document.getElementById('totalEfectivoMovimiento').textContent = formatearMoneda(total, 'gs').replace('PYG', '').trim();
}

function calcularTotalVueltoRegistrado() {
    let total = 0;
    document.querySelectorAll('#tablaVueltoMovimiento .cantidad-denominacion-vuelto').forEach(input => {
        const denominacion = parseInt(input.dataset.denominacion);
        const cantidad = parseInt(input.value) || 0;
        total += denominacion * cantidad;
    });
    const verificador = document.getElementById('totalVueltoVerificacion');
    verificador.textContent = `Total Vuelto Registrado: ${formatearMoneda(total, 'gs')}`;
    verificador.style.color = (total === parsearMoneda(document.getElementById('vueltoCalculado').textContent)) ? 'var(--color-exito)' : 'var(--color-peligro)';
}

function calcularTotalEgresoCaja() {
    let total = 0;
    document.querySelectorAll('#tablaDenominacionesEgresoCaja .cantidad-denominacion-egreso').forEach(input => {
        const denominacion = parseInt(input.dataset.denominacion);
        const cantidad = parseInt(input.value) || 0;
        total += denominacion * cantidad;
    });
    const montoInput = document.getElementById('montoEgresoCaja');
    montoInput.value = new Intl.NumberFormat('es-PY').format(total);
    montoInput.dataset.raw = total; // Guardar el valor numérico

    // **NUEVO:** Actualizar el display del total en el modal
    const totalDisplay = document.getElementById('totalEgresoCajaDisplay');
    if (totalDisplay) {
        totalDisplay.textContent = formatearMoneda(total, 'gs');
    }
}

function obtenerCotizacion(moneda, esMovimiento = false) {
    const sufijo = esMovimiento ? 'Movimiento' : '';
    switch (moneda) {
        case 'usd':
            return parsearMoneda(document.getElementById(`cotDolar${sufijo}`).value);
        case 'brl':
            return parsearMoneda(document.getElementById(`cotReal${sufijo}`).value);
        case 'ars':
            return parsearMoneda(document.getElementById(`cotPeso${sufijo}`).value);
        default: return 0;
    }
}

function calcularTotalEfectivo() {
    let total = 0;

    // Sumar denominaciones guaraníes
    document.querySelectorAll('.cantidad-denominacion').forEach(input => {
        const denominacion = parseInt(input.dataset.denominacion);
        const cantidad = parseInt(input.value) || 0;
        total += denominacion * cantidad;
    });

    // Sumar monedas extranjeras convertidas
    document.querySelectorAll('.cantidad-moneda').forEach(input => {
        const moneda = input.dataset.moneda;
        const cantidad = parseFloat(input.value) || 0;
        const cotizacion = obtenerCotizacion(moneda);
        total += cantidad * cotizacion;
    });

    document.getElementById('totalEfectivo').textContent = formatearMoneda(total, 'gs');
}

// Agregar un movimiento de caja a la lista temporal (desde el formulario de Ingresar Movimiento)
function agregarMovimiento() {
    // Función para obtener valor parseado de un campo
    const totalVenta = parsearMoneda(document.getElementById('totalVentaEfectivo').value);
    const montoRecibido = parsearMoneda(document.getElementById('montoRecibidoCliente').value);

    // **NUEVA LÓGICA:** Si se usó el cálculo de vuelto, el ingreso de efectivo es el total de la venta, no el monto recibido.
    const esVentaConVuelto = totalVenta > 0 && montoRecibido > 0;

    if (esVentaConVuelto) {
        // Si es una venta con vuelto, el valor del movimiento es el total de la venta.
        // El desglose de billetes que se guarda es el que se recibió.
        // El arqueo final se balanceará porque el total de ingresos (valor de la venta) será menor
        // que el efectivo contado (dinero recibido), y la diferencia es el vuelto que salió de caja.
    }

    // **CORRECCIÓN:** Identificar qué modal está activo para limpiar los datos de los otros.
    const modalBody = document.getElementById('modal-body');
    const contenidoActivoId = modalBody.firstChild ? modalBody.firstChild.id : null;

    if (contenidoActivoId !== 'contenido-efectivo') {
        // Si no estamos guardando desde el modal de efectivo, limpiar sus campos.
        document.querySelectorAll('#tablaDenominacionesMovimiento input').forEach(input => input.value = '0');
        calcularTotalEfectivoMovimiento();
    }
    if (contenidoActivoId !== 'contenido-no-efectivo') {
        // Si no estamos guardando desde el modal de no-efectivo, limpiar sus campos.
        document.getElementById('pagosTarjetaMovimiento').value = '0';
        document.getElementById('ventasCreditoMovimiento').value = '0';
        document.getElementById('pedidosYaMovimiento').value = '0';
        document.getElementById('ventasTransfMovimiento').value = '0';
    }
    if (contenidoActivoId !== 'contenido-servicios') {
        // Si no estamos guardando desde el modal de servicios, limpiar sus campos.
        document.querySelectorAll('#tbodyServiciosMovimiento input').forEach(input => {
            if (input.type === 'text') input.value = '';
            if (input.type === 'text' && input.value.startsWith('0')) input.value = '0';
        });
        limpiarFilasServiciosDinamicos();
    }

    const indiceEditar = document.getElementById('indiceMovimientoEditar').value;
    const esEdicion = indiceEditar !== '';


    const obtenerValorParseado = (id) => parsearMoneda(document.getElementById(id).value);

    const movimiento = {
        fecha: document.getElementById('fechaMovimiento').value,
        cajero: sessionStorage.getItem('usuarioActual'),
        // **CORREGIDO:** Asegurar que la caja sea la correcta para cada rol.
        caja: sessionStorage.getItem('userRole') === 'tesoreria'
            ? 'Caja Tesoreria'
            : (sessionStorage.getItem('cajaSeleccionada') || 'N/A'),
        historialEdiciones: [], // Inicializamos el historial de ediciones
        valorVenta: esVentaConVuelto ? totalVenta : 0, // **NUEVO:** Guardar el valor real de la venta
        efectivoVuelto: {}, // **NUEVO:** Para guardar el desglose del vuelto
        descripcion: document.getElementById('descripcionMovimiento').value || '',
        efectivo: {},
        monedasExtranjeras: {
            usd: { cantidad: parseFloat(document.querySelector('.cantidad-moneda-movimiento[data-moneda="usd"]').value) || 0, cotizacion: obtenerCotizacion('usd', true) },
            brl: { cantidad: parseFloat(document.querySelector('.cantidad-moneda-movimiento[data-moneda="brl"]').value) || 0, cotizacion: obtenerCotizacion('brl', true) },
            ars: { cantidad: parseFloat(document.querySelector('.cantidad-moneda-movimiento[data-moneda="ars"]').value) || 0, cotizacion: obtenerCotizacion('ars', true) }
        },
        pagosTarjeta: obtenerValorParseado('pagosTarjetaMovimiento'),
        ventasCredito: obtenerValorParseado('ventasCreditoMovimiento'),
        pedidosYa: obtenerValorParseado('pedidosYaMovimiento'),
        ventasTransferencia: obtenerValorParseado('ventasTransfMovimiento'),
        servicios: {
            apLote: { lote: document.getElementById('apLoteCantMovimiento').value, monto: obtenerValorParseado('apLoteMontoMovimiento'), tarjeta: obtenerValorParseado('apLoteTarjetaMovimiento') },
            aquiPago: { lote: document.getElementById('aquiPagoLoteMovimiento').value, monto: obtenerValorParseado('aquiPagoMontoMovimiento'), tarjeta: obtenerValorParseado('aquiPagoTarjetaMovimiento') },
            expressLote: { lote: document.getElementById('expressCantMovimiento').value, monto: obtenerValorParseado('expressMontoMovimiento'), tarjeta: obtenerValorParseado('expressTarjetaMovimiento') },
            wepa: { lote: document.getElementById('wepaFechaMovimiento').value, monto: obtenerValorParseado('wepaMontoMovimiento'), tarjeta: obtenerValorParseado('wepaTarjetaMovimiento') },
            pasajeNsa: { lote: document.getElementById('pasajeNsaLoteMovimiento').value, monto: obtenerValorParseado('pasajeNsaMovimiento'), tarjeta: obtenerValorParseado('pasajeNsaTarjetaMovimiento') },
            encomiendaNsa: { lote: document.getElementById('encomiendaNsaLoteMovimiento').value, monto: obtenerValorParseado('encomiendaNsaMovimiento'), tarjeta: obtenerValorParseado('encomiendaNsaTarjetaMovimiento') },
            apostala: { lote: document.getElementById('apostalaLoteMovimiento').value, monto: obtenerValorParseado('apostalaMontoMovimiento'), tarjeta: obtenerValorParseado('apostalaTarjetaMovimiento') },
        },
        otrosServicios: []
    };

    // Capturar desglose de efectivo
    document.querySelectorAll('#tablaDenominacionesMovimiento .cantidad-denominacion-movimiento').forEach(input => {
        const denominacion = input.dataset.denominacion;
        const cantidad = parseInt(input.value) || 0;
        if (cantidad > 0) {
            movimiento.efectivo[denominacion] = cantidad;
        }
    });

    // Capturar desglose de vuelto
    if (esVentaConVuelto) {
        document.querySelectorAll('#tablaVueltoMovimiento .cantidad-denominacion-vuelto').forEach(input => {
            const denominacion = input.dataset.denominacion;
            const cantidad = parseInt(input.value) || 0;
            if (cantidad > 0) movimiento.efectivoVuelto[denominacion] = cantidad;
        });
    }

    // Capturar otros servicios dinámicos
    document.querySelectorAll('.fila-servicio-dinamico').forEach(fila => {
        const nombre = fila.querySelector('.nombre-servicio-dinamico').value;
        const lote = fila.querySelector('.lote-servicio-dinamico').value;
        const monto = parsearMoneda(fila.querySelector('.monto-servicio-dinamico').value);
        const tarjeta = parsearMoneda(fila.querySelector('.tarjeta-servicio-dinamico').value);

        if (nombre && (monto > 0 || tarjeta > 0)) {
            movimiento.otrosServicios.push({ nombre, lote, monto, tarjeta });
        }
    });

    if (esEdicion) {
        // **REFACTORIZADO:** Usar la nueva función auxiliar
        if (!registrarEdicion(movimiento)) {
            return; // Si el usuario canceló, no continuar
        }
        estado.movimientosTemporales[indiceEditar] = { ...estado.movimientosTemporales[indiceEditar], ...movimiento };
        localStorage.setItem('movimientosTemporales', JSON.stringify(estado.movimientosTemporales));
        mostrarMensaje('Movimiento actualizado con éxito.', 'exito');
    } else {
        estado.movimientosTemporales.push(movimiento);
        localStorage.setItem('movimientosTemporales', JSON.stringify(estado.movimientosTemporales));
        mostrarMensaje('Movimiento agregado. ' + `Total: ${estado.movimientosTemporales.length}`, 'exito');
    }

    limpiarFormularioMovimiento();

    // Cerrar el modal si está abierto
    cerrarModal();

    // Actualizar el arqueo final
    actualizarArqueoFinal();
    renderizarIngresosAgregados();
}

// Función para agregar una fila de servicio dinámico
function agregarFilaServicio() {
    const tbody = document.getElementById('tbodyServiciosMovimiento');
    const fila = document.createElement('tr');
    fila.className = 'fila-servicio-dinamico';

    fila.innerHTML = `
        <td><input type="text" class="nombre-servicio-dinamico" placeholder="Nombre del servicio"></td>
        <td><input type="text" class="lote-servicio-dinamico" placeholder="Lote/Fecha"></td>
        <td><input type="text" inputmode="numeric" class="monto-servicio-dinamico" value="0"></td>
        <td><input type="text" inputmode="numeric" class="tarjeta-servicio-dinamico" value="0"></td>
    `;
    tbody.appendChild(fila);

    // Aplicar formato de miles a los nuevos campos
    const camposNuevos = fila.querySelectorAll('.monto-servicio-dinamico, .tarjeta-servicio-dinamico');
    camposNuevos.forEach(aplicarFormatoMiles);
}

// Limpiar filas de servicios dinámicos
function limpiarFilasServiciosDinamicos() {
    const filasDinamicas = document.querySelectorAll('.fila-servicio-dinamico');
    filasDinamicas.forEach(fila => fila.remove());
}

function limpiarFormularioMovimiento() {
    document.getElementById('formularioMovimiento').reset();
    document.getElementById('indiceMovimientoEditar').value = ''; // Limpiar índice de edición

    // Limpiar visualmente la tabla de efectivo
    document.querySelectorAll('#tablaDenominacionesMovimiento .monto-parcial-movimiento, #tablaDenominacionesMovimiento .monto-moneda-movimiento').forEach(celda => celda.textContent = '0');
    document.getElementById('totalEfectivoMovimiento').textContent = '0';

    // Resetear valores de campos formateados a '0'
    const camposFormateados = [
        'pagosTarjetaMovimiento', 'ventasCreditoMovimiento', 'pedidosYaMovimiento', 'ventasTransfMovimiento',
        'apLoteMontoMovimiento', 'aquiPagoMontoMovimiento', 'expressMontoMovimiento', 'wepaMontoMovimiento',
        'pasajeNsaMovimiento', 'encomiendaNsaMovimiento', 'apostalaMontoMovimiento',
        'apLoteTarjetaMovimiento', 'aquiPagoTarjetaMovimiento', 'expressTarjetaMovimiento', 'wepaTarjetaMovimiento',
        'pasajeNsaTarjetaMovimiento', 'encomiendaNsaTarjetaMovimiento', 'apostalaTarjetaMovimiento'
    ];
    camposFormateados.forEach(id => document.getElementById(id).value = '0');

    limpiarFilasServiciosDinamicos();

    // Poner el foco en el campo de descripción para el siguiente movimiento
    document.getElementById('descripcionMovimiento').focus();

    // **Mejora UX:** Mantener el cajero y la caja para el siguiente movimiento,
    // pero limpiar la descripción y el índice de edición.
    document.getElementById('descripcionMovimiento').value = '';
    document.getElementById('indiceMovimientoEditar').value = '';

    // **CORRECCIÓN:** Reinicializar la fecha al momento actual para el siguiente movimiento.
    document.getElementById('fechaMovimiento').value = obtenerFechaHoraLocalISO();

    // **CORRECCIÓN:** Reinicializar la fecha al momento actual para el siguiente movimiento.
    document.getElementById('fechaMovimiento').value = obtenerFechaHoraLocalISO();

    // Limpiar campos de vuelto
    document.getElementById('totalVentaEfectivo').value = '0';
    document.getElementById('montoRecibidoCliente').value = '0';
    document.getElementById('vueltoCalculado').textContent = formatearMoneda(0, 'gs');
    document.getElementById('registroVueltoSeccion').style.display = 'none';
    document.querySelectorAll('#tablaVueltoMovimiento input').forEach(input => input.value = '0');
    document.querySelectorAll('#tablaVueltoMovimiento .monto-parcial-vuelto').forEach(celda => celda.textContent = '0');
    document.getElementById('totalVueltoVerificacion').textContent = 'Total Vuelto Registrado: G$ 0';
    document.getElementById('totalVueltoVerificacion').style.color = 'inherit';
}

function renderizarIngresosAgregados() {
    const lista = document.getElementById('listaIngresosAgregados');
    if (!lista) return;

    const fechaFiltro = document.getElementById('filtroFechaIngresos').value;
    const cajaFiltro = document.getElementById('filtroCajaIngresos').value;
    const descFiltro = document.getElementById('filtroDescripcionIngresos').value.toLowerCase();

    let movimientosFiltrados = estado.movimientosTemporales;

    if (fechaFiltro) {
        movimientosFiltrados = movimientosFiltrados.filter(m => m.fecha.startsWith(fechaFiltro));
    }
    if (cajaFiltro) {
        movimientosFiltrados = movimientosFiltrados.filter(m => m.caja === cajaFiltro);
    }
    if (descFiltro) {
        movimientosFiltrados = movimientosFiltrados.filter(m => m.descripcion.toLowerCase().includes(descFiltro));
    }

    if (cajaFiltro && sessionStorage.getItem('userRole') === 'admin') {
        movimientosFiltrados = movimientosFiltrados.filter(m => m.caja === cajaFiltro);
    }

    lista.innerHTML = '';

    if (movimientosFiltrados.length === 0) {
        lista.innerHTML = '<p class="text-center" style="color: var(--color-secundario);">Aún no se han agregado movimientos.</p>';
        return;
    }

    movimientosFiltrados.forEach((mov) => {
        const div = document.createElement('div');
        div.className = 'movimiento-item';

        // El índice original se mantiene para poder eliminar el correcto
        const originalIndex = estado.movimientosTemporales.indexOf(mov);

        // Preparar el indicador y el detalle de la edición
        let edicionHTML = '';
        let observacionEdicionHTML = '';
        ({ edicionHTML, observacionEdicionHTML } = generarHTMLHistorial(mov));

        // --- INICIO DE LA LÓGICA DE DETALLE ---
        let totalEfectivo = 0;
        for (const denom in mov.efectivo) {
            totalEfectivo += mov.efectivo[denom] * parseInt(denom);
        }
        for (const moneda in mov.monedasExtranjeras) {
            totalEfectivo += mov.monedasExtranjeras[moneda].cantidad * mov.monedasExtranjeras[moneda].cotizacion;
        }

        let totalServicios = 0;
        for (const servicio in mov.servicios) {
            totalServicios += mov.servicios[servicio].monto + mov.servicios[servicio].tarjeta;
        }
        mov.otrosServicios.forEach(s => totalServicios += s.monto + s.tarjeta);

        // **CORRECCIÓN:** Usar el valor de la venta si existe, si no, calcular el total.
        let totalGeneral = 0;
        if (mov.valorVenta > 0) {
            totalGeneral = mov.valorVenta;
        } else {
            totalGeneral = totalEfectivo + mov.pagosTarjeta + mov.ventasCredito + mov.pedidosYa + mov.ventasTransferencia + totalServicios;
        }

        let detallesHTML = [];
        if (totalEfectivo > 0) {
            if (mov.valorVenta > 0) {
                const vuelto = totalEfectivo - mov.valorVenta;
                detallesHTML.push(`<p><span class="detalle-icono">💵</span><strong>Efectivo:</strong> +${formatearMoneda(totalEfectivo, 'gs')} / <span class="negativo">-${formatearMoneda(vuelto, 'gs')}</span></p>`);
            } else {
                detallesHTML.push(`<p><span class="detalle-icono">💵</span><strong>Efectivo:</strong> ${formatearMoneda(totalEfectivo, 'gs')}</p>`);
            }
        }
        if (mov.pagosTarjeta > 0) detallesHTML.push(`<p><span class="detalle-icono">💳</span><strong>Pago con Tarjeta:</strong> ${formatearMoneda(mov.pagosTarjeta, 'gs')}</p>`);
        if (mov.ventasCredito > 0) detallesHTML.push(`<p><span class="detalle-icono">🧾</span><strong>Venta a Crédito:</strong> ${formatearMoneda(mov.ventasCredito, 'gs')}</p>`);
        if (mov.pedidosYa > 0) detallesHTML.push(`<p><span class="detalle-icono">🛵</span><strong>PedidosYA:</strong> ${formatearMoneda(mov.pedidosYa, 'gs')}</p>`);
        if (mov.ventasTransferencia > 0) detallesHTML.push(`<p><span class="detalle-icono">💻</span><strong>Venta por Transferencia:</strong> ${formatearMoneda(mov.ventasTransferencia, 'gs')}</p>`);

        // **MODIFICADO:** Detallar los servicios individualmente
        if (totalServicios > 0) {
            const agregarDetalleServicio = (nombre, servicio) => {
                const totalServicio = servicio.monto + servicio.tarjeta;
                if (totalServicio > 0) {
                    detallesHTML.push(`<p><span class="detalle-icono">⚙️</span><strong>${nombre}:</strong> ${formatearMoneda(totalServicio, 'gs')}</p>`);
                }
            };
            agregarDetalleServicio('ACA PUEDO', mov.servicios.apLote);
            agregarDetalleServicio('Aquí Pago', mov.servicios.aquiPago);
            agregarDetalleServicio('Pago Express', mov.servicios.expressLote);
            agregarDetalleServicio('WEPA', mov.servicios.wepa);
            agregarDetalleServicio('Pasaje NSA', mov.servicios.pasajeNsa);
            agregarDetalleServicio('Encomienda NSA', mov.servicios.encomiendaNsa);
            agregarDetalleServicio('Apostala', mov.servicios.apostala);
            mov.otrosServicios.forEach(s => agregarDetalleServicio(s.nombre, s));
        }

        const subDetallesHTML = `<div class="movimiento-sub-detalles">${detallesHTML.join('')}</div>`;
        // --- FIN DE LA LÓGICA DE DETALLE ---

        div.innerHTML = `
            <div class="movimiento-header">
                <span class="movimiento-tipo">${mov.descripcion.toUpperCase() || 'MOVIMIENTO'}${edicionHTML}</span>
                <span class="movimiento-monto positivo">${formatearMoneda(totalGeneral, 'gs')}</span>
            </div>
            ${observacionEdicionHTML}
            
            <!-- **NUEVO:** Contenedor para los sub-detalles -->
            ${subDetallesHTML}

            <div class="movimiento-detalles" style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <small>${formatearFecha(mov.fecha)}</small><br>
                    <small><strong>Cajero:</strong> ${mov.cajero || 'N/A'} | <strong>Caja:</strong> ${mov.caja || 'N/A'}</small>
                </div>
                <div>
                    <button class="btn-accion editar" onclick="iniciarEdicionMovimiento(${originalIndex})">Editar</button>
                    <button class="btn-accion eliminar" onclick="eliminarIngresoAgregado(${originalIndex})">Eliminar</button>
                </div>
            </div>
        `;
        lista.appendChild(div);
    });
}

function iniciarEdicionMovimiento(index) {
    const movimiento = estado.movimientosTemporales[index];
    if (!movimiento) return;

    // Marcar que estamos editando
    document.getElementById('indiceMovimientoEditar').value = index;

    // Cargar datos generales
    document.getElementById('fechaMovimiento').value = movimiento.fecha;
    document.getElementById('descripcionMovimiento').value = movimiento.descripcion;

    // Cargar desglose de efectivo
    document.querySelectorAll('#tablaDenominacionesMovimiento .cantidad-denominacion-movimiento').forEach(input => {
        const denominacion = input.dataset.denominacion;
        input.value = movimiento.efectivo[denominacion] || 0;
    });
    document.querySelector('.cantidad-moneda-movimiento[data-moneda="usd"]').value = movimiento.monedasExtranjeras.usd.cantidad;
    document.querySelector('.cantidad-moneda-movimiento[data-moneda="brl"]').value = movimiento.monedasExtranjeras.brl.cantidad;
    document.querySelector('.cantidad-moneda-movimiento[data-moneda="ars"]').value = movimiento.monedasExtranjeras.ars.cantidad;
    calcularTotalEfectivoMovimiento(); // Recalcular totales visuales

    // Cargar ingresos no efectivo
    document.getElementById('pagosTarjetaMovimiento').value = movimiento.pagosTarjeta;
    document.getElementById('ventasCreditoMovimiento').value = movimiento.ventasCredito;
    document.getElementById('pedidosYaMovimiento').value = movimiento.pedidosYa;
    document.getElementById('ventasTransfMovimiento').value = movimiento.ventasTransferencia;

    // Cargar servicios fijos
    document.getElementById('apLoteCantMovimiento').value = movimiento.servicios.apLote.lote;
    document.getElementById('apLoteMontoMovimiento').value = movimiento.servicios.apLote.monto;
    document.getElementById('apLoteTarjetaMovimiento').value = movimiento.servicios.apLote.tarjeta;
    document.getElementById('aquiPagoLoteMovimiento').value = movimiento.servicios.aquiPago.lote;
    document.getElementById('aquiPagoMontoMovimiento').value = movimiento.servicios.aquiPago.monto;
    document.getElementById('aquiPagoTarjetaMovimiento').value = movimiento.servicios.aquiPago.tarjeta;
    document.getElementById('expressCantMovimiento').value = movimiento.servicios.expressLote.lote;
    document.getElementById('expressMontoMovimiento').value = movimiento.servicios.expressLote.monto;
    document.getElementById('expressTarjetaMovimiento').value = movimiento.servicios.expressLote.tarjeta;
    document.getElementById('wepaFechaMovimiento').value = movimiento.servicios.wepa.lote;
    document.getElementById('wepaMontoMovimiento').value = movimiento.servicios.wepa.monto;
    document.getElementById('wepaTarjetaMovimiento').value = movimiento.servicios.wepa.tarjeta;
    document.getElementById('pasajeNsaLoteMovimiento').value = movimiento.servicios.pasajeNsa.lote;
    document.getElementById('pasajeNsaMovimiento').value = movimiento.servicios.pasajeNsa.monto;
    document.getElementById('pasajeNsaTarjetaMovimiento').value = movimiento.servicios.pasajeNsa.tarjeta;
    document.getElementById('encomiendaNsaLoteMovimiento').value = movimiento.servicios.encomiendaNsa.lote;
    document.getElementById('encomiendaNsaMovimiento').value = movimiento.servicios.encomiendaNsa.monto;
    document.getElementById('encomiendaNsaTarjetaMovimiento').value = movimiento.servicios.encomiendaNsa.tarjeta;
    document.getElementById('apostalaLoteMovimiento').value = movimiento.servicios.apostala.lote;
    document.getElementById('apostalaMontoMovimiento').value = movimiento.servicios.apostala.monto;
    document.getElementById('apostalaTarjetaMovimiento').value = movimiento.servicios.apostala.tarjeta;

    // Limpiar y cargar otros servicios dinámicos
    limpiarFilasServiciosDinamicos();
    movimiento.otrosServicios.forEach(servicio => {
        agregarFilaServicio(); // Crea una nueva fila vacía
        const nuevaFila = document.querySelector('.fila-servicio-dinamico:last-child');
        nuevaFila.querySelector('.nombre-servicio-dinamico').value = servicio.nombre;
        nuevaFila.querySelector('.lote-servicio-dinamico').value = servicio.lote;
        nuevaFila.querySelector('.monto-servicio-dinamico').value = servicio.monto;
        nuevaFila.querySelector('.tarjeta-servicio-dinamico').value = servicio.tarjeta;
    });

    // Llevar al usuario al formulario
    document.getElementById('ingreso-movimiento').scrollIntoView({ behavior: 'smooth' });
    mostrarMensaje('Editando movimiento. Realice los cambios y presione "Agregar Movimiento" para guardar.', 'info');
}

function eliminarIngresoAgregado(index) {
    // **MEJORA UX:** Añadir confirmación antes de eliminar.
    if (confirm('¿Está seguro de que desea eliminar este movimiento?')) {
        estado.movimientosTemporales.splice(index, 1);
        localStorage.setItem('movimientosTemporales', JSON.stringify(estado.movimientosTemporales));
        actualizarArqueoFinal();
        renderizarIngresosAgregados();
        mostrarMensaje('Movimiento eliminado', 'info');
    }
}

// --- REFACTORIZACIÓN DE ARQUEO FINAL ---

/**
 * Calcula los totales a partir de una lista de movimientos.
 * Esta es una función "pura": solo procesa datos, no modifica el DOM.
 * @param {Array} movimientosParaArqueo - La lista de movimientos a procesar.
 * @returns {Object} Un objeto con todos los totales calculados.
 */
function calcularTotalesArqueo(movimientosParaArqueo) {
    const totales = {
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

    movimientosParaArqueo.forEach(mov => {
        // Sumar/Restar efectivo por denominación
        if (mov.efectivo) {
            for (const [denominacion, cantidad] of Object.entries(mov.efectivo)) {
                if (!totales.efectivo[denominacion]) totales.efectivo[denominacion] = 0;

                // **MODIFICADO:** Si es egreso, restamos; si es ingreso, sumamos.
                if (mov.tipoMovimiento === 'egreso') {
                    totales.efectivo[denominacion] -= cantidad;
                } else {
                    totales.efectivo[denominacion] += cantidad;
                }
            }
        }
        // Restar efectivo por vuelto
        if (mov.efectivoVuelto) {
            for (const denom in mov.efectivoVuelto) {
                totales.efectivo[denom] = (totales.efectivo[denom] || 0) - mov.efectivoVuelto[denom];
            }
        }
        for (const moneda in mov.monedasExtranjeras) {
            const { cantidad, cotizacion } = mov.monedasExtranjeras[moneda];
            totales.monedasExtranjeras[moneda].cantidad += cantidad || 0;
            totales.monedasExtranjeras[moneda].montoGs += (cantidad * cotizacion) || 0;
        }

        // Solo sumar estos campos si existen (no son egresos)
        totales.pagosTarjeta += mov.pagosTarjeta || 0;
        totales.ventasCredito += mov.ventasCredito || 0;
        totales.pedidosYa += mov.pedidosYa || 0;
        totales.ventasTransferencia += mov.ventasTransferencia || 0;

        const sumarServicio = (nombreServicio) => {
            // Solo procesar servicios si el movimiento tiene servicios (no es un egreso)
            if (mov.servicios && mov.servicios[nombreServicio]) {
                if (mov.servicios[nombreServicio].monto > 0 || mov.servicios[nombreServicio].tarjeta > 0) {
                    if (mov.servicios[nombreServicio].lote) {
                        totales.servicios[nombreServicio].lotes.push(mov.servicios[nombreServicio].lote);
                    }
                    totales.servicios[nombreServicio].monto += mov.servicios[nombreServicio].monto || 0;
                    totales.servicios[nombreServicio].tarjeta += mov.servicios[nombreServicio].tarjeta || 0;
                }
            }
        };

        ['apLote', 'aquiPago', 'expressLote', 'wepa', 'pasajeNsa', 'encomiendaNsa', 'apostala'].forEach(sumarServicio);

        if (mov.otrosServicios) {
            mov.otrosServicios.forEach(s => {
                if (!totales.servicios.otros[s.nombre]) {
                    totales.servicios.otros[s.nombre] = { lotes: [], monto: 0, tarjeta: 0 };
                }
                if (s.lote) totales.servicios.otros[s.nombre].lotes.push(s.lote);
                totales.servicios.otros[s.nombre].monto += s.monto || 0;
                totales.servicios.otros[s.nombre].tarjeta += s.tarjeta || 0;
            });
        }
    });

    return totales;
}

// Actualizar el formulario de Arqueo Final con la suma de movimientos
/**
 * Renderiza la vista del arqueo final en el DOM.
 * Esta función solo se encarga de la presentación, no de los cálculos.
 * @param {Object} totales - El objeto con los totales pre-calculados.
 */
function renderizarVistaArqueoFinal(totales) {
    const contenedorVista = document.getElementById('vistaArqueoFinal');
    if (!contenedorVista) return;

    const fondoFijo = parsearMoneda(document.getElementById('fondoFijo').value);
    const cajaFiltro = document.getElementById('caja').value;

    // Generar HTML para cada sección del resumen
    let efectivoHTML = '';
    let totalEfectivoFinal = 0;

    CONFIG.denominaciones.forEach(denom => {
        const cantidad = totales.efectivo[denom.valor] || 0;
        // Solo mostrar si hay una cantidad neta de ese billete.
        if (cantidad === 0) return;

        const monto = cantidad * denom.valor;
        totalEfectivoFinal += monto;
        efectivoHTML += `<tr><td>${denom.nombre}</td><td>${cantidad}</td><td>${formatearMoneda(monto, 'gs')}</td></tr>`;
    });

    let totalMonedasExtranjerasGs = 0;
    Object.keys(totales.monedasExtranjeras).forEach(moneda => {
        const { cantidad, montoGs } = totales.monedasExtranjeras[moneda];
        if (cantidad > 0) {
            totalMonedasExtranjerasGs += montoGs;
            efectivoHTML += `<tr><td>${moneda.toUpperCase()}</td><td>${cantidad.toFixed(2)}</td><td>${formatearMoneda(montoGs, 'gs')}</td></tr>`;
        }
    });

    let serviciosHTML = '';
    const renderizarServicio = (nombre, servicio) => {
        if (servicio.monto > 0 || servicio.tarjeta > 0) {
            serviciosHTML += `<tr><td><strong>${nombre}</strong></td><td>${servicio.lotes.join(', ')}</td><td>${formatearMoneda(servicio.monto, 'gs')}</td><td>${formatearMoneda(servicio.tarjeta, 'gs')}</td></tr>`;
        }
    };
    renderizarServicio('ACA PUEDO', totales.servicios.apLote);
    renderizarServicio('Aquí Pago', totales.servicios.aquiPago);
    renderizarServicio('Pago Express', totales.servicios.expressLote);
    renderizarServicio('WEPA', totales.servicios.wepa);
    renderizarServicio('Pasaje NSA', totales.servicios.pasajeNsa);
    renderizarServicio('Encomienda NSA', totales.servicios.encomiendaNsa);
    renderizarServicio('Apostala', totales.servicios.apostala);
    for (const nombre in totales.servicios.otros) {
        renderizarServicio(nombre, totales.servicios.otros[nombre]);
    }

    let totalServiciosArqueo = 0;
    ['apLote', 'aquiPago', 'expressLote', 'wepa', 'pasajeNsa', 'encomiendaNsa', 'apostala'].forEach(key => {
        const servicio = totales.servicios[key];
        if (servicio) {
            totalServiciosArqueo += servicio.monto + servicio.tarjeta;
        }
    });
    for (const nombre in totales.servicios.otros) {
        totalServiciosArqueo += totales.servicios.otros[nombre].monto + totales.servicios.otros[nombre].tarjeta;
    }

    const totalEfectivoBruto = totalEfectivoFinal + totalMonedasExtranjerasGs;
    const totalAEntregar = totalEfectivoBruto - fondoFijo;
    const totalIngresosArqueo = totalEfectivoBruto + totales.pagosTarjeta + totales.ventasCredito + totales.pedidosYa + totales.ventasTransferencia + totalServiciosArqueo;

    // **CORRECCIÓN DEFINITIVA:** Calcular el total de egresos a partir de los movimientos ya filtrados.
    const egresosDeCajaFiltrados = estado.egresosCaja.filter(e => e.fecha.startsWith(document.getElementById('fecha').value.split('T')[0]) && e.caja === cajaFiltro);
    const egresosDeOperacionesFiltrados = estado.movimientos.filter(m =>
        m.fecha.startsWith(document.getElementById('fecha').value.split('T')[0]) &&
        (m.tipo === 'gasto' || m.tipo === 'egreso') &&
        m.caja === cajaFiltro
    );

    const totalEgresosCaja = egresosDeCajaFiltrados.reduce((sum, e) => sum + e.monto, 0) +
                             egresosDeOperacionesFiltrados.reduce((sum, m) => sum + m.monto, 0);
    // --- FIN DE LA CORRECCIÓN ---

    const totalNeto = totalIngresosArqueo - totalEgresosCaja;

    // Construir el HTML final para la vista
    contenedorVista.innerHTML = `
        <!-- **NUEVO:** Información General del Arqueo -->
        <div class="detalle-seccion" style="border-bottom: 1px solid var(--color-borde); padding-bottom: 1rem; margin-bottom: 1rem;">
            <h5>Información General</h5>
            <p><strong>Fecha y Hora:</strong> ${formatearFecha(document.getElementById('fecha').value)}</p>
            <p><strong>Cajero:</strong> ${document.getElementById('cajero').value || 'No especificado'}</p>
            <p><strong>Caja:</strong> ${document.getElementById('caja').value}</p>
        </div>

        <div class="detalle-arqueo">
            <!-- Columna 1: Efectivo y Resumen de Efectivo -->
            <div class="detalle-seccion">
                <h5>Conteo de Efectivo</h5>
                <table class="tabla-detalle">
                    <thead><tr><th>Denominación/Moneda</th><th>Cantidad</th><th>Monto (G$)</th></tr></thead>
                    <tbody>${efectivoHTML || '<tr><td colspan="3">No hay movimientos en efectivo.</td></tr>'}</tbody>
                </table>
                <div class="resumen-totales" style="margin-top: 1rem;">
                    <div class="total-item"><span>Total Efectivo Bruto:</span><span>${formatearMoneda(totalEfectivoBruto, 'gs')}</span></div>
                    <div class="total-item negativo"><span>- Fondo Fijo:</span><span>${formatearMoneda(fondoFijo, 'gs')}</span></div>
                    <div class="total-item final"><strong>Total a Entregar (G$):</strong><strong>${formatearMoneda(totalAEntregar, 'gs')}</strong></div>
                </div>
            </div>

            <!-- Columna 2: Otros Ingresos y Servicios -->
            <div class="detalle-seccion">
                <h5>Ingresos No Efectivo</h5>
                <p><strong>Pagos con Tarjeta:</strong> ${formatearMoneda(totales.pagosTarjeta, 'gs')}</p>
                <p><strong>Ventas a Crédito:</strong> ${formatearMoneda(totales.ventasCredito, 'gs')}</p>
                <p><strong>Pedidos YA:</strong> ${formatearMoneda(totales.pedidosYa, 'gs')}</p>
                <p><strong>Ventas a Transferencia:</strong> ${formatearMoneda(totales.ventasTransferencia, 'gs')}</p>
                
                <h5 style="margin-top: 2rem;">Servicios</h5>
                <table class="tabla-detalle">
                    <thead><tr><th>Servicio</th><th>Lote/Fecha</th><th>Efectivo (G$)</th><th>Tarjeta (G$)</th></tr></thead>
                    <tbody>${serviciosHTML || '<tr><td colspan="4">No hay servicios registrados.</td></tr>'}</tbody>
                </table>
            </div>
        </div>

        <!-- Resumen Final del Arqueo -->
        <div class="resumen-totales" style="margin-top: 2rem; border-top: 1px solid var(--color-borde); padding-top: 1rem;">
            <div class="total-item positivo"><span>Total Ingresos del Arqueo:</span><span>${formatearMoneda(totalIngresosArqueo, 'gs')}</span></div>
            <div class="total-item negativo"><span>- Total Egresos de Caja:</span><span>${formatearMoneda(totalEgresosCaja, 'gs')}</span></div>
            <div class="total-item ${totalNeto >= 0 ? 'positivo' : 'negativo'}"><strong>Total Neto del Arqueo:</strong><strong>${formatearMoneda(totalNeto, 'gs')}</strong></div>
        </div>

        <!-- **NUEVO:** Botón para exportar el arqueo actual a PDF -->
        <div class="acciones-arqueo" style="text-align: center; margin-top: 2rem;">
            <button class="btn" onclick="exportarArqueoActualPDF()">Exportar a PDF</button>
        </div>
    `;
}

/**
 * Función coordinadora que actualiza el resumen del arqueo final.
 * 1. Filtra los movimientos.
 * 2. Llama a la función de cálculo.
 * 3. Llama a la función de renderizado.
 */
function actualizarArqueoFinal() {
    const fechaArqueo = document.getElementById('fecha').value.split('T')[0];
    const cajaFiltro = document.getElementById('caja').value;

    // 1. Obtener ingresos del día
    let ingresosParaArqueo = estado.movimientosTemporales;

    // 2. Obtener egresos de la sección "Egresos"
    let egresosDeCaja = estado.egresosCaja.filter(e => {
        return e.fecha.split('T')[0] === fechaArqueo;
    });

    // **CORRECCIÓN:** 3. Obtener egresos de la sección "Operaciones" que afecten a la caja
    let egresosDeOperaciones = estado.movimientos.filter(m => {
        // Solo considerar 'gasto' y 'egreso' (pago a proveedor) que tengan una caja asignada
        return m.fecha.split('T')[0] === fechaArqueo &&
               (m.tipo === 'gasto' || m.tipo === 'egreso') &&
               m.caja; // Asegurarse de que el movimiento esté asociado a una caja
    });

    // Combinar ambos tipos de egresos
    let todosLosEgresos = [...egresosDeCaja, ...egresosDeOperaciones];

    if (cajaFiltro) {
        ingresosParaArqueo = ingresosParaArqueo.filter(m => m.caja === cajaFiltro);
        todosLosEgresos = todosLosEgresos.filter(e => e.caja === cajaFiltro);
    }

    const movimientosParaArqueo = [
        ...ingresosParaArqueo.map(m => ({ ...m, tipoMovimiento: 'ingreso' })),
        ...todosLosEgresos.map(e => ({ ...e, tipoMovimiento: 'egreso' }))
    ];

    const totales = calcularTotalesArqueo(movimientosParaArqueo);
    renderizarVistaArqueoFinal(totales);
}
// Guardar arqueo
function guardarArqueo() {
    if (estado.movimientosTemporales.length === 0) {
        mostrarMensaje('No hay movimientos para guardar en el arqueo.', 'peligro');
        return;
    }

    const arqueo = {
        id: generarId(),
        fecha: document.getElementById('fecha').value,
        cajero: document.getElementById('cajero').value,
        caja: document.getElementById('caja').value,
        fondoFijo: parsearMoneda(document.getElementById('fondoFijo').value),
        reales: {
            cantidad: 0, monto: 0
        },
        pesos: {
            cantidad: 0, monto: 0
        },
        dolares: {
            cantidad: 0, monto: 0
        },
        totalEfectivo: 0,
        pagosTarjeta: 0,
        ventasCredito: 0,
        pedidosYa: 0,
        ventasTransferencia: 0,
        servicios: {},
        otrosServicios: [],
        totalServicios: 0,
        totalIngresos: 0,
        efectivo: {},
        monedasExtranjeras: {
            usd: { cantidad: 0, monto: 0 },
            brl: { cantidad: 0, monto: 0 },
            ars: { cantidad: 0, monto: 0 }
        }
    };

    // Re-calcular y poblar el objeto arqueo a partir de los movimientos temporales
    estado.movimientosTemporales.forEach(mov => {
        for (const denom in mov.efectivo) {
            arqueo.efectivo[denom] = (arqueo.efectivo[denom] || 0) + mov.efectivo[denom];
        }
        for (const moneda in mov.monedasExtranjeras) {
            if (mov.monedasExtranjeras[moneda]) {
                // Mantener compatibilidad con estructura antigua
                if (arqueo[moneda + 's']) {
                    arqueo[moneda + 's'].cantidad += mov.monedasExtranjeras[moneda].cantidad || 0;
                    arqueo[moneda + 's'].monto += (mov.monedasExtranjeras[moneda].cantidad || 0) * (mov.monedasExtranjeras[moneda].cotizacion || 0);
                }

                // **NUEVO:** Poblar también la estructura monedasExtranjeras para el PDF
                if (arqueo.monedasExtranjeras[moneda]) {
                    arqueo.monedasExtranjeras[moneda].cantidad += mov.monedasExtranjeras[moneda].cantidad || 0;
                    arqueo.monedasExtranjeras[moneda].monto += (mov.monedasExtranjeras[moneda].cantidad || 0) * (mov.monedasExtranjeras[moneda].cotizacion || 0);
                }
            }
        }
        arqueo.pagosTarjeta += mov.pagosTarjeta;
        arqueo.ventasCredito += mov.ventasCredito;
        arqueo.pedidosYa += mov.pedidosYa;
        arqueo.ventasTransferencia += mov.ventasTransferencia;

        // Sumar servicios fijos y dinámicos
        Object.assign(arqueo.servicios, mov.servicios);
        arqueo.otrosServicios.push(...mov.otrosServicios);
    });

    // Calcular totales finales
    let totalEfectivoFinal = 0;
    for (const denom in arqueo.efectivo) {
        totalEfectivoFinal += arqueo.efectivo[denom] * parseInt(denom);
    }
    arqueo.totalEfectivo = totalEfectivoFinal + arqueo.dolares.monto + arqueo.reales.monto + arqueo.pesos.monto;

    let totalServiciosMonto = 0, totalServiciosTarjeta = 0;
    Object.values(arqueo.servicios).forEach(s => { totalServiciosMonto += s.monto; totalServiciosTarjeta += s.tarjeta; });
    arqueo.otrosServicios.forEach(s => { totalServiciosMonto += s.monto; totalServiciosTarjeta += s.tarjeta; });
    arqueo.totalServicios = totalServiciosMonto + totalServiciosTarjeta;
    // **CORRECCIÓN:** Calcular el total de ingresos usando el valor de la venta.
    const totalIngresosNoEfectivo = arqueo.pagosTarjeta + arqueo.ventasCredito + arqueo.pedidosYa + arqueo.ventasTransferencia;
    const totalIngresosVentasConVuelto = estado.movimientosTemporales
        .filter(m => m.valorVenta > 0)
        .reduce((sum, m) => sum + m.valorVenta, 0);
    const totalIngresosOtrasVentas = arqueo.totalEfectivo - estado.movimientosTemporales.filter(m => m.valorVenta > 0).reduce((sum, m) => sum + m.efectivo[Object.keys(m.efectivo)[0]] * Object.keys(m.efectivo)[0], 0);

    arqueo.totalIngresos = arqueo.totalEfectivo + arqueo.pagosTarjeta + arqueo.ventasCredito + arqueo.pedidosYa + arqueo.ventasTransferencia;

    // **NUEVA VALIDACIÓN:** No guardar si el total de ingresos es cero.
    if (arqueo.totalIngresos <= 0) {
        mostrarMensaje('No se puede guardar un arqueo con ingresos totales de cero o menos.', 'peligro');
        return; // Detener la ejecución de la función
    }

    // Guardar en el estado
    estado.arqueos.push(arqueo);
    guardarEnLocalStorage();

    // Mostrar mensaje de éxito
    mostrarMensaje('Arqueo guardado exitosamente', 'exito');

    // **NUEVO:** Exportar automáticamente el arqueo a PDF
    exportarArqueoPDF(arqueo, false);

    // Limpiar formulario
    limpiarMovimientos();

    cargarHistorialMovimientosDia();
}

// Funciones de Modal
function abrirModal(contenidoId, titulo, noReiniciar = false) {
    // Asegurarse de que el contenido del modal de efectivo esté generado
    if (contenidoId === 'contenido-efectivo' && !noReiniciar) {
        inicializarModalEfectivo();
    }
    const modal = document.getElementById('modal');
    const modalTitulo = document.getElementById('modal-titulo');
    const modalBody = document.getElementById('modal-body');
    const contenido = document.getElementById(contenidoId);

    if (!contenido) {
        console.error('No se encontró el contenido para el modal:', contenidoId);
        return;
    }

    modalTitulo.textContent = titulo;
    modalBody.innerHTML = ''; // Limpiar contenido anterior
    modalBody.appendChild(contenido); // Mover el contenido al modal

    modal.style.display = 'flex';

    // **CORRECCIÓN:** Volver a aplicar el formato de miles a los campos dentro del modal,
    // ya que los listeners se pueden perder al mover el contenido.
    const camposFormateados = [
        'pagosTarjetaMovimiento', 'ventasCreditoMovimiento', 'pedidosYaMovimiento', 'ventasTransfMovimiento',
        'apLoteMontoMovimiento', 'aquiPagoMontoMovimiento', 'expressMontoMovimiento', 'wepaMontoMovimiento',
        'pasajeNsaMovimiento', 'encomiendaNsaMovimiento', 'apostalaMontoMovimiento',
        'apLoteTarjetaMovimiento', 'aquiPagoTarjetaMovimiento', 'expressTarjetaMovimiento', 'wepaTarjetaMovimiento',
        'pasajeNsaTarjetaMovimiento', 'encomiendaNsaTarjetaMovimiento', 'apostalaTarjetaMovimiento',
        'totalVentaEfectivo', 'montoRecibidoCliente'
    ];

    camposFormateados.forEach(id => {
        const input = modalBody.querySelector(`#${id}`);
        if (input) {
            // Eliminar listeners antiguos para evitar duplicados (opcional pero buena práctica)
            // input.removeEventListener('input', ...); 
            // input.removeEventListener('blur', ...);
            aplicarFormatoMiles(input);
        }
    });

    // **CORRECCIÓN:** Volver a aplicar los listeners para el cálculo de vuelto.
    const camposVuelto = ['totalVentaEfectivo', 'montoRecibidoCliente'];
    camposVuelto.forEach(id => {
        const input = modalBody.querySelector(`#${id}`);
        if (input) input.addEventListener('input', calcularVuelto);
    });
}

function cerrarModal() {
    const modal = document.getElementById('modal');
    const modalBody = document.getElementById('modal-body');
    const contenedores = document.getElementById('contenedores-modales');
    const contenido = modalBody.firstChild;

    if (modal.style.display === 'none') {
        return; // Si el modal ya está cerrado, no hacer nada.
    }

    if (contenido && contenedores) {
        // Devolver el contenido a su contenedor original
        contenedores.appendChild(contenido);
    }
    modal.style.display = 'none'; // Ocultar el modal
}

// Funciones para gastos y operaciones
function guardarGasto(event) {
    event.preventDefault();
    const idEditar = document.getElementById('idGastoEditar').value;

    if (idEditar) {
        // Modo Edición
        const movimientoIndex = estado.movimientos.findIndex(m => m.id === idEditar);
        if (movimientoIndex > -1) {
            const movimientoAEditar = estado.movimientos[movimientoIndex];
            if (!registrarEdicion(movimientoAEditar)) {
                return;
            }
            estado.movimientos[movimientoIndex].fecha = document.getElementById('fechaGasto').value;
            estado.movimientos[movimientoIndex].tipo = document.getElementById('tipoGasto').value;
            estado.movimientos[movimientoIndex].receptor = document.getElementById('receptorGasto').value;
            estado.movimientos[movimientoIndex].descripcion = document.getElementById('descripcionGasto').value;
            estado.movimientos[movimientoIndex].monto = parsearMoneda(document.getElementById('montoGasto').value);
            estado.movimientos[movimientoIndex].moneda = document.getElementById('monedaGasto').value;
            estado.movimientos[movimientoIndex].caja = document.getElementById('cajaGasto').value;
            estado.movimientos[movimientoIndex].referencia = document.getElementById('referenciaGasto').value;
        }
        const movimientoActualizado = estado.movimientos[movimientoIndex];
        if (movimientoActualizado.tipo !== 'gasto' && movimientoActualizado.tipo !== 'transferencia') {
            imprimirReciboGasto(movimientoActualizado);
        }
        mostrarMensaje('Movimiento actualizado con éxito.', 'exito');
    } else {
        // Modo Creación
        estado.ultimoNumeroRecibo++; // Incrementar el número de recibo
        const gasto = {
            id: generarId(),
            fecha: document.getElementById('fechaGasto').value,
            tipo: document.getElementById('tipoGasto').value,
            historialEdiciones: [], // Inicializar historial
            receptor: document.getElementById('receptorGasto').value,
            descripcion: document.getElementById('descripcionGasto').value,
            numeroRecibo: estado.ultimoNumeroRecibo,
            monto: parsearMoneda(document.getElementById('montoGasto').value),
            moneda: document.getElementById('monedaGasto').value,
            // **CORREGIDO:** Asegurar que la caja de Tesorería se asigne si el campo está vacío.
            caja: document.getElementById('cajaGasto').value || (sessionStorage.getItem('userRole') === 'tesoreria' ? 'Caja Tesoreria' : ''),
            referencia: document.getElementById('referenciaGasto').value
        };
        estado.movimientos.push(gasto);
        if (gasto.tipo !== 'gasto' && gasto.tipo !== 'transferencia') {
            imprimirReciboGasto(gasto);
        }
        mostrarMensaje('Movimiento guardado exitosamente', 'exito');
    }

    guardarEnLocalStorage();
    limpiarFormularioGastos();
    cargarHistorialGastos();
    cargarResumenDiario();
}

function cargarHistorialGastos() {
    const fechaFiltro = document.getElementById('fechaFiltroGastos').value;
    const tipoFiltroSelect = document.getElementById('tipoFiltroGastos');
    const cajaFiltro = document.getElementById('filtroCajaGastos').value;
    const tipoFiltro = tipoFiltroSelect.value;

    // Actualizar el título del historial
    const tituloHistorial = document.querySelector('#gastos .historial-gastos h3');
    if (tipoFiltro) {
        const textoSeleccionado = tipoFiltroSelect.options[tipoFiltroSelect.selectedIndex].text;
        tituloHistorial.textContent = `Historial de ${textoSeleccionado}`;
    } else {
        tituloHistorial.textContent = 'Historial de Movimientos';
    }

    let movimientosFiltrados = estado.movimientos;

    if (fechaFiltro) {
        movimientosFiltrados = movimientosFiltrados.filter(m =>
            m.fecha.startsWith(fechaFiltro)
        );
    }

    if (tipoFiltro) {
        movimientosFiltrados = movimientosFiltrados.filter(m =>
            m.tipo === tipoFiltro
        );
    }
    if (cajaFiltro && sessionStorage.getItem('userRole') === 'admin') {
        movimientosFiltrados = movimientosFiltrados.filter(m => m.caja === cajaFiltro
        );
    }

    // Ordenar por fecha descendente
    movimientosFiltrados.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    const lista = document.getElementById('listaGastos');
    lista.innerHTML = '';

    if (movimientosFiltrados.length === 0) {
        lista.innerHTML = '<p class="text-center" style="color: var(--color-secundario);">No hay movimientos registrados para esta fecha.</p>';
        return;
    }

    movimientosFiltrados.forEach(movimiento => {
        const div = document.createElement('div');
        div.className = 'movimiento-item';

        const signo = '-'; // Todos los movimientos en esta sección son egresos
        const claseMonto = 'negativo';
        const numeroReciboHTML = movimiento.numeroRecibo
            ? `| Recibo: ${String(movimiento.numeroRecibo).padStart(6, '0')}`
            : '';

        // Preparar HTML de edición
        let edicionHTML = '';
        let observacionEdicionHTML = ''; ({ edicionHTML, observacionEdicionHTML } = generarHTMLHistorial(movimiento));

        div.innerHTML = `
            <div class="movimiento-header">
                <span class="movimiento-tipo">${movimiento.tipo.toUpperCase()}${edicionHTML}</span>
                <span class="movimiento-monto ${claseMonto}">${signo}${formatearMoneda(movimiento.monto, movimiento.moneda)}</span>
            </div>
            ${observacionEdicionHTML}
            <div style="display: flex; justify-content: space-between; align-items: flex-end;">
                <div class="movimiento-detalles">
                    <strong>${movimiento.descripcion}</strong><br>
                    <small>${formatearFecha(movimiento.fecha)} ${movimiento.caja ? '| ' + movimiento.caja : ''} ${movimiento.referencia ? '| Ref: ' + movimiento.referencia : ''} ${numeroReciboHTML}</small>
                </div>
                <div class="movimiento-acciones">
                    <button class="btn-accion reimprimir" onclick="reimprimirRecibo('${movimiento.id}')">Reimprimir</button>
                    <button class="btn-accion editar" onclick="iniciarEdicionGasto('${movimiento.id}')">Editar</button>
                    <button class="btn-accion eliminar" onclick="eliminarGasto('${movimiento.id}')">Eliminar</button>
                </div>
            </div>
        `;

        lista.appendChild(div);
    });
}

function reimprimirRecibo(id) {
    const movimiento = estado.movimientos.find(m => m.id === id);
    if (movimiento) {
        imprimirReciboGasto(movimiento);
    } else {
        mostrarMensaje('No se encontró el movimiento para reimprimir.', 'peligro');
    }
}

function iniciarEdicionGasto(id) {
    const movimiento = estado.movimientos.find(m => m.id === id);
    if (!movimiento) return;

    document.getElementById('idGastoEditar').value = movimiento.id;
    document.getElementById('fechaGasto').value = movimiento.fecha;
    document.getElementById('tipoGasto').value = movimiento.tipo;
    document.getElementById('receptorGasto').value = movimiento.receptor || '';
    document.getElementById('descripcionGasto').value = movimiento.descripcion;
    document.getElementById('montoGasto').value = movimiento.monto;
    document.getElementById('monedaGasto').value = movimiento.moneda;
    document.getElementById('cajaGasto').value = movimiento.caja;
    document.getElementById('referenciaGasto').value = movimiento.referencia;

    document.querySelector('#formularioGastos button[type="submit"]').textContent = 'Actualizar Movimiento';
    toggleReceptorField(); // Asegurarse de que el campo se muestre si es necesario
    // Formatear el monto al cargar para edición
    const montoInput = document.getElementById('montoGasto');
    montoInput.value = new Intl.NumberFormat('es-PY').format(movimiento.monto);
    document.getElementById('gastos').scrollIntoView({ behavior: 'smooth' });
}

function eliminarGasto(id) {
    // **MEJORA UX:** Añadir confirmación antes de eliminar.
    if (confirm('¿Está seguro de que desea eliminar este movimiento de tesorería? Esta acción no se puede deshacer.')) {
        estado.movimientos = estado.movimientos.filter(m => m.id !== id);
        guardarEnLocalStorage();
        mostrarMensaje('Movimiento eliminado', 'info');
        cargarHistorialGastos();
        cargarResumenDiario();
    }
}

function limpiarFormularioGastos() {
    document.getElementById('formularioGastos').reset();
    document.getElementById('idGastoEditar').value = '';
    document.getElementById('montoGasto').value = '0';
    toggleReceptorField(); // Ocultar el campo al limpiar
    document.querySelector('#formularioGastos button[type="submit"]').textContent = 'Guardar Movimiento';
    document.getElementById('fechaGasto').value = obtenerFechaHoraLocalISO();
}

function imprimirReciboGasto(gasto) {
    const montoEnLetras = numeroALetras(gasto.monto, gasto.moneda);
    const fechaFormateada = new Date(gasto.fecha).toLocaleDateString('es-PY', { day: '2-digit', month: 'long', year: 'numeric' });
    const numeroRecibo = gasto.numeroRecibo ? String(gasto.numeroRecibo).padStart(6, '0') : 'N/A';

    const contenidoRecibo = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <title>Recibo de Dinero</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 0; padding: 20px; font-size: 12px; }
                .recibo { border: 1px solid #000; padding: 20px; width: 600px; margin: auto; }
                .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
                .header h2 { margin: 0; }
                .header .info { text-align: right; }
                .monto-box { border: 1px solid #000; padding: 5px 10px; font-weight: bold; font-size: 14px; }
                .cuerpo { margin-bottom: 30px; }
                .cuerpo p { margin: 10px 0; line-height: 1.6; }
                .firma { margin-top: 80px; text-align: center; }
                .firma-linea { border-top: 1px solid #000; width: 250px; margin: 0 auto; }
                .firma-texto { margin-top: 5px; }
            </style>
        </head>
        <body>
            <div class="recibo">
                <div class="header">
                    <h2>RECIBO DE DINERO</h2>
                    <div class="info">
                        <div><strong>Fecha:</strong> ${fechaFormateada}</div>
                        <div><strong>Nro. Recibo:</strong> ${numeroRecibo}</div>
                        <div style="margin-top: 10px;">
                            <span class="monto-box">${formatearMoneda(gasto.monto, gasto.moneda)}</span>
                        </div>
                    </div>
                </div>
                <div class="cuerpo">
                    <p>
                        Recibí de <strong>BenMarket</strong> la suma de <strong>${montoEnLetras}</strong>.
                    </p>
                    <p>
                        En concepto de: <strong>${gasto.descripcion}</strong>.
                    </p>
                </div>
                <div class="firma">
                    <div class="firma-linea"></div>
                    <div class="firma-texto">
                        <strong>${gasto.receptor}</strong><br>
                        Firma y Aclaración
                    </div>
                </div>
            </div>
        </body>
        </html>
    `;

    const ventanaImpresion = window.open('', '_blank');
    ventanaImpresion.document.write(contenidoRecibo);
    ventanaImpresion.document.close();
    ventanaImpresion.focus();
    ventanaImpresion.print();
    ventanaImpresion.onafterprint = () => ventanaImpresion.close();
}

// Función para convertir número a letras
function numeroALetras(valor, moneda = 'gs') {
    const unidades = ['', 'un', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'];
    const decenas = ['', 'diez', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
    const especiales = ['diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve'];
    const centenas = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];

    function convertirMenorMil(n) {
        if (n >= 100) {
            const c = Math.floor(n / 100);
            const d = n % 100;
            if (n === 100) return 'cien';
            return centenas[c] + (d > 0 ? ' ' + convertirMenorMil(d) : '');
        }
        if (n >= 20) {
            const d = Math.floor(n / 10);
            const u = n % 10;
            return decenas[d] + (u > 0 ? ' y ' + unidades[u] : '');
        }
        if (n >= 10) {
            return especiales[n - 10];
        }
        if (n > 0) {
            return unidades[n];
        }
        return '';
    }

    function convertir(n) {
        if (n === 0) return 'cero';

        const millones = Math.floor(n / 1000000);
        const restoMillones = n % 1000000;

        const miles = Math.floor(restoMillones / 1000);
        const restoMiles = restoMillones % 1000;

        let resultado = [];

        if (millones > 0) {
            if (millones === 1) {
                resultado.push('un millón');
            } else {
                resultado.push(convertirMenorMil(millones) + ' millones');
            }
        }

        if (miles > 0) {
            if (miles === 1) {
                resultado.push('mil');
            } else {
                resultado.push(convertirMenorMil(miles) + ' mil');
            }
        }

        if (restoMiles > 0) {
            resultado.push(convertirMenorMil(restoMiles));
        }

        return resultado.join(' ');
    }

    const monedaTexto = {
        gs: 'Guaraníes',
        usd: 'Dólares Americanos',
        brl: 'Reales Brasileños',
        ars: 'Pesos Argentinos'
    };

    const valorEntero = Math.floor(valor);
    const texto = convertir(valorEntero);

    return `${texto} ${monedaTexto[moneda] || ''}`.toUpperCase();
}

// Funciones para Egresos de Caja
function guardarEgresoCaja(event) {
    event.preventDefault();
    const idEditar = document.getElementById('idEgresoCajaEditar').value;

    if (idEditar) {
        // Modo Edición
        const egresoIndex = estado.egresosCaja.findIndex(e => e.id === idEditar);
        if (egresoIndex > -1) {
            const egresoAEditar = estado.egresosCaja[egresoIndex];
            if (!registrarEdicion(egresoAEditar)) {
                return;
            }
            // Capturar el nuevo desglose de efectivo
            const nuevoEfectivo = {};
            document.querySelectorAll('#tablaDenominacionesEgresoCaja .cantidad-denominacion-egreso').forEach(input => {
                const denominacion = input.dataset.denominacion;
                const cantidad = parseInt(input.value) || 0;
                if (cantidad > 0) nuevoEfectivo[denominacion] = cantidad;
            });

            estado.egresosCaja[egresoIndex].fecha = document.getElementById('fechaEgresoCaja').value;
            estado.egresosCaja[egresoIndex].caja = document.getElementById('cajaEgreso').value;
            estado.egresosCaja[egresoIndex].categoria = document.getElementById('categoriaEgresoCaja').value;
            estado.egresosCaja[egresoIndex].descripcion = document.getElementById('descripcionEgresoCaja').value;
            estado.egresosCaja[egresoIndex].monto = parsearMoneda(document.getElementById('montoEgresoCaja').dataset.raw || document.getElementById('montoEgresoCaja').value);
            estado.egresosCaja[egresoIndex].referencia = document.getElementById('referenciaEgresoCaja').value;
            estado.egresosCaja[egresoIndex].efectivo = nuevoEfectivo;
        }
        mostrarMensaje('Egreso de caja actualizado con éxito.', 'exito');
    } else {
        // Modo Creación
        const egreso = {
            id: generarId(),
            fecha: document.getElementById('fechaEgresoCaja').value,
            historialEdiciones: [], // Inicializar historial
            caja: document.getElementById('cajaEgreso').value,
            categoria: document.getElementById('categoriaEgresoCaja').value,
            descripcion: document.getElementById('descripcionEgresoCaja').value.trim(),
            monto: parsearMoneda(document.getElementById('montoEgresoCaja').dataset.raw || document.getElementById('montoEgresoCaja').value),
            referencia: document.getElementById('referenciaEgresoCaja').value,
            efectivo: {} // **NUEVO:** Para guardar el desglose
        };
        // Capturar desglose de efectivo
        document.querySelectorAll('#tablaDenominacionesEgresoCaja .cantidad-denominacion-egreso').forEach(input => {
            const denominacion = input.dataset.denominacion;
            const cantidad = parseInt(input.value) || 0;
            if (cantidad > 0) egreso.efectivo[denominacion] = cantidad;
        });
        estado.egresosCaja.push(egreso);
        mostrarMensaje('Egreso de caja guardado exitosamente', 'exito');
    }

    guardarEnLocalStorage();
    limpiarFormularioEgresoCaja();
    cargarHistorialEgresosCaja();
    actualizarArqueoFinal(); // **AÑADIDO:** Actualizar el arqueo por si afecta al resumen.
    cargarResumenDiario(); // Actualizar el resumen de tesorería
}

function limpiarFormularioEgresoCaja() {
    // **CORRECCIÓN:** Guardar la caja seleccionada antes de resetear
    const cajaSeleccionada = document.getElementById('cajaEgreso').value;

    document.getElementById('formularioEgresoCaja').reset();

    // **CORRECCIÓN:** Restaurar la caja seleccionada
    if (cajaSeleccionada) {
        document.getElementById('cajaEgreso').value = cajaSeleccionada;
    }

    document.getElementById('montoEgresoCaja').value = '0';
    document.getElementById('fechaEgresoCaja').value = obtenerFechaHoraLocalISO();

    // Limpiar tabla de desglose de egreso
    document.querySelectorAll('#tablaDenominacionesEgresoCaja input').forEach(input => input.value = '0');
    document.querySelectorAll('#tablaDenominacionesEgresoCaja .monto-parcial-egreso').forEach(celda => celda.textContent = '0');
    calcularTotalEgresoCaja();

    // Resetear modo edición
    document.getElementById('idEgresoCajaEditar').value = '';
    const botonGuardar = document.querySelector('#formularioEgresoCaja button[type="submit"]');
    botonGuardar.textContent = 'Guardar Egreso';
}

function cargarHistorialEgresosCaja() {
    const fechaFiltro = document.getElementById('fechaFiltroEgresos').value;
    const cajaFiltro = document.getElementById('filtroCajaEgresos').value;

    let egresosFiltrados = estado.egresosCaja;

    if (fechaFiltro) {
        egresosFiltrados = egresosFiltrados.filter(e => e.fecha && e.fecha.startsWith(fechaFiltro));
    }

    if (cajaFiltro) {
        egresosFiltrados = egresosFiltrados.filter(e => e.caja === cajaFiltro);
    }

    // Ordenar por fecha descendente
    egresosFiltrados.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    const lista = document.getElementById('listaEgresosCaja');
    lista.innerHTML = '';

    if (egresosFiltrados.length === 0) {
        lista.innerHTML = '<p class="text-center" style="color: var(--color-secundario);">No hay egresos registrados para esta fecha.</p>';
        return;
    }

    egresosFiltrados.forEach(egreso => {
        const div = document.createElement('div');
        div.className = 'movimiento-item';

        // Preparar HTML de edición
        let edicionHTML = '';
        let observacionEdicionHTML = ''; ({ edicionHTML, observacionEdicionHTML } = generarHTMLHistorial(egreso));

        div.innerHTML = `
            <div class="movimiento-header">
                <span class="movimiento-tipo">EGRESO - ${egreso.caja}${edicionHTML}</span>
                <span class="movimiento-monto negativo">-${formatearMoneda(egreso.monto, 'gs')}</span>
            </div>
            ${observacionEdicionHTML}
            <div style="display: flex; justify-content: space-between; align-items: flex-end;">
                <div class="movimiento-detalles">
                    <strong>${egreso.categoria}</strong> - ${egreso.descripcion}<br>
                    <small>${formatearFecha(egreso.fecha)} ${egreso.referencia ? '| Ref: ' + egreso.referencia : ''}</small>
                </div>
                <div class="movimiento-acciones">
                    <button class="btn-accion editar" onclick="iniciarEdicionEgresoCaja('${egreso.id}')">Editar</button>
                    <button class="btn-accion eliminar" onclick="eliminarEgresoCaja('${egreso.id}')">Eliminar</button>
                </div>
            </div>
        `;
        lista.appendChild(div);
    });
}

function iniciarEdicionEgresoCaja(id) {
    const egreso = estado.egresosCaja.find(e => e.id === id);
    if (!egreso) return;

    document.getElementById('idEgresoCajaEditar').value = egreso.id;
    document.getElementById('fechaEgresoCaja').value = egreso.fecha;
    document.getElementById('cajaEgreso').value = egreso.caja;
    document.getElementById('categoriaEgresoCaja').value = egreso.categoria;
    document.getElementById('descripcionEgresoCaja').value = egreso.descripcion;

    // Cargar desglose de efectivo
    document.querySelectorAll('#tablaDenominacionesEgresoCaja .cantidad-denominacion-egreso').forEach(input => {
        const denominacion = input.dataset.denominacion;
        input.value = egreso.efectivo ? (egreso.efectivo[denominacion] || 0) : 0;
    });

    // Recalcular y mostrar el total
    calcularTotalEgresoCaja();
    document.getElementById('referenciaEgresoCaja').value = egreso.referencia;

    document.querySelector('#formularioEgresoCaja button[type="submit"]').textContent = 'Actualizar Egreso';
    document.getElementById('egresos-caja').scrollIntoView({ behavior: 'smooth' });
}

function eliminarEgresoCaja(id) {
    // **MEJORA UX:** Añadir confirmación antes de eliminar.
    if (confirm('¿Está seguro de que desea eliminar este egreso de caja? Esta acción no se puede deshacer.')) {
        estado.egresosCaja = estado.egresosCaja.filter(e => e.id !== id);
        guardarEnLocalStorage();
        mostrarMensaje('Egreso de caja eliminado', 'info');
        cargarHistorialEgresosCaja();
        actualizarArqueoFinal();
        cargarResumenDiario();
    }
}


// Resumen de tesorería
function cargarResumenDiario() {
    const fechaDesde = document.getElementById('fechaResumenDesde').value;
    const fechaHasta = document.getElementById('fechaResumenHasta').value;

    // Obtener los contenedores del DOM
    const ingresosDiv = document.getElementById('resumenIngresos');
    const egresosTesoreriaDiv = document.getElementById('resumenEgresosTesoreria');
    const egresosCajaDiv = document.getElementById('resumenEgresosCaja');
    const resumenGeneralDiv = document.getElementById('resumenGeneral');
    const historialArqueosDiv = document.getElementById('historialArqueosGuardados');


    // Limpiar contenedores
    ingresosDiv.innerHTML = '<p>No hay datos de arqueo para la fecha seleccionada.</p>';
    egresosTesoreriaDiv.innerHTML = '<p>No hay egresos de tesorería.</p>';
    egresosCajaDiv.innerHTML = '<p>No hay egresos de caja.</p>';
    resumenGeneralDiv.innerHTML = '';

    // 1. Filtrar datos por fecha
    const arqueosDelPeriodo = estado.arqueos.filter(a => {
        const fechaArqueo = a.fecha.split('T')[0];
        return (!fechaDesde || fechaArqueo >= fechaDesde) && (!fechaHasta || fechaArqueo <= fechaHasta);
    }).sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    const egresosTesoreriaDelDia = estado.movimientos.filter(m => m.fecha.split('T')[0] >= fechaDesde && m.fecha.split('T')[0] <= fechaHasta);
    const egresosCajaDelDia = estado.egresosCaja.filter(e => e.fecha.split('T')[0] >= fechaDesde && e.fecha.split('T')[0] <= fechaHasta);

    // 2. Procesar y mostrar Ingresos (basado en Arqueos)
    let totalIngresosDia = 0;
    if (arqueosDelPeriodo.length > 0) {
        ingresosDiv.innerHTML = '';
        arqueosDelPeriodo.forEach(arqueo => {
            totalIngresosDia += arqueo.totalIngresos;
            ingresosDiv.innerHTML += `
                <div class="resumen-item">
                    <span>Arqueo ${arqueo.caja} (${arqueo.cajero})</span>
                    <span class="positivo">${formatearMoneda(arqueo.totalIngresos, 'gs')}</span>
                </div>
            `;
        });
    }

    // 3. Procesar y mostrar Egresos de Tesorería
    let totalEgresosTesoreria = 0;
    if (egresosTesoreriaDelDia.length > 0) {
        egresosTesoreriaDiv.innerHTML = '';
        egresosTesoreriaDelDia.forEach(mov => {
            totalEgresosTesoreria += mov.monto;
            egresosTesoreriaDiv.innerHTML += `
                <div class="resumen-item">
                    <span>${mov.descripcion}</span>
                    <span class="negativo">-${formatearMoneda(mov.monto, mov.moneda)}</span>
                </div>
            `;
        });
    }

    // 4. Procesar y mostrar Egresos de Caja
    let totalEgresosCaja = 0;
    if (egresosCajaDelDia.length > 0) {
        egresosCajaDiv.innerHTML = '';
        egresosCajaDelDia.forEach(egreso => {
            totalEgresosCaja += egreso.monto;
            egresosCajaDiv.innerHTML += `
                <div class="resumen-item">
                    <span>${egreso.descripcion} (${egreso.caja})</span>
                    <span class="negativo">-${formatearMoneda(egreso.monto, 'gs')}</span>
                </div>
            `;
        });
    }

    // 5. Calcular y mostrar el Resumen General
    const totalEgresosDia = totalEgresosTesoreria + totalEgresosCaja;
    const saldoNeto = totalIngresosDia - totalEgresosDia;

    resumenGeneralDiv.innerHTML = `
        <div class="total-item positivo">
            <span>Total Ingresos:</span>
            <span>${formatearMoneda(totalIngresosDia, 'gs')}</span>
        </div>
        <div class="total-item negativo">
            <span>Total Egresos:</span>
            <span>-${formatearMoneda(totalEgresosDia, 'gs')}</span>
        </div>
        <div class="total-item ${saldoNeto >= 0 ? 'positivo' : 'negativo'}">
            <span><strong>Saldo Neto:</strong></span>
            <span><strong>${formatearMoneda(saldoNeto, 'gs')}</strong></span>
        </div>
    `;
}

// Función para descargar Excel
function descargarExcel() {
    const fechaDesde = document.getElementById('fechaResumenDesde').value;
    const fechaHasta = document.getElementById('fechaResumenHasta').value;
    if (!fechaDesde || !fechaHasta) {
        mostrarMensaje('Por favor, seleccione un rango de fechas para descargar el resumen.', 'peligro');
        return;
    }

    // Filtrar datos por fecha
    const arqueosDelDia = estado.arqueos.filter(a => a.fecha.split('T')[0] >= fechaDesde && a.fecha.split('T')[0] <= fechaHasta);
    const movimientosDelDia = estado.movimientos.filter(m => m.fecha.split('T')[0] >= fechaDesde && m.fecha.split('T')[0] <= fechaHasta);
    const egresosCajaDelDia = estado.egresosCaja.filter(e => e.fecha.split('T')[0] >= fechaDesde && e.fecha.split('T')[0] <= fechaHasta);

    // Preparar datos para Excel
    const datosExcel = [];

    // Agregar encabezado
    datosExcel.push(['RESUMEN - FECHA: ' + fecha]);
    datosExcel.push([]);

    // Agregar arqueos
    datosExcel.push(['ARQUEOS DE CAJA']);
    datosExcel.push(['Caja', 'Cajero', 'Fecha/Hora', 'Total Efectivo', 'Tarjeta', 'Transferencia', 'Servicios', 'Total']);

    arqueosDelDia.forEach(arqueo => {
        datosExcel.push([
            arqueo.caja,
            arqueo.cajero,
            formatearFecha(arqueo.fecha),
            arqueo.totalEfectivo,
            arqueo.pagosTarjeta,
            arqueo.ventasTransferencia,
            arqueo.totalServicios,
            arqueo.totalIngresos
        ]);
    });

    datosExcel.push([]);
    datosExcel.push(['OPERACIONES Y EGRESOS']);
    datosExcel.push(['Tipo', 'Categoría', 'Descripción', 'Monto', 'Moneda', 'Fecha/Hora', 'Caja', 'Referencia', 'Nro. Recibo']);

    const todosLosEgresos = [...movimientosDelDia, ...egresosCajaDelDia].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    todosLosEgresos.forEach(movimiento => {
        datosExcel.push([
            movimiento.tipo || 'EGRESO CAJA',
            movimiento.categoria || '',
            movimiento.descripcion,
            movimiento.monto,
            CONFIG.monedas[movimiento.moneda] || 'Guaraníes',
            formatearFecha(movimiento.fecha),
            movimiento.caja || '',
            movimiento.referencia || '',
            movimiento.numeroRecibo ? String(movimiento.numeroRecibo).padStart(6, '0') : ''
        ]);
    });

    // Crear libro de trabajo
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(datosExcel);

    // Ajustar anchos de columna
    const colWidths = [
        { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 15 },
        { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
        { wch: 15 } // Ancho para Nro. Recibo
    ];
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, 'Resumen');

    // Descargar archivo
    const nombreArchivo = `Resumen_${fecha.replace(/-/g, '_')}.xlsx`;
    XLSX.writeFile(wb, nombreArchivo);
}

// **NUEVA FUNCIÓN PARA EXPORTAR HISTORIAL DE ARQUEOS**
function exportarHistorialArqueosExcel() {
    const fechaDesde = document.getElementById('fechaResumenDesde').value;
    const fechaHasta = document.getElementById('fechaResumenHasta').value;

    if (!fechaDesde || !fechaHasta) {
        mostrarMensaje('Por favor, seleccione un rango de fechas para exportar el historial.', 'peligro');
        return;
    }

    const arqueosFiltrados = estado.arqueos.filter(a => {
        const fechaArqueo = a.fecha.split('T')[0];
        return fechaArqueo >= fechaDesde && fechaArqueo <= fechaHasta;
    }).sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

    if (arqueosFiltrados.length === 0) {
        mostrarMensaje('No hay arqueos guardados en el rango de fechas seleccionado.', 'info');
        return;
    }

    const datosExcel = [];
    datosExcel.push(['Historial de Arqueos de Caja']);
    datosExcel.push([`Período: ${fechaDesde} al ${fechaHasta}`]);
    datosExcel.push([]); // Fila vacía

    // Encabezados
    datosExcel.push(['Fecha y Hora', 'Caja', 'Cajero', 'Fondo Fijo', 'Total Efectivo', 'Pagos Tarjeta', 'Ventas Crédito', 'Pedidos YA', 'Ventas Transferencia', 'Total Servicios', 'Total Ingresos']);

    // Datos
    arqueosFiltrados.forEach(arqueo => {
        datosExcel.push([
            formatearFecha(arqueo.fecha),
            arqueo.caja,
            arqueo.cajero,
            arqueo.fondoFijo,
            arqueo.totalEfectivo,
            arqueo.pagosTarjeta,
            arqueo.ventasCredito,
            arqueo.pedidosYa,
            arqueo.ventasTransferencia,
            arqueo.totalServicios,
            arqueo.totalIngresos
        ]);
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(datosExcel);
    ws['!cols'] = [{ wch: 20 }, { wch: 15 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Historial de Arqueos');

    const nombreArchivo = `Historial_Arqueos_${fechaDesde}_a_${fechaHasta}.xlsx`;
    XLSX.writeFile(wb, nombreArchivo);
}

// Funciones auxiliares
function limpiarMovimientos() {
    estado.movimientosTemporales = [];
    document.getElementById('controlesArqueo').reset();
    document.getElementById('formularioMovimiento').reset();
    actualizarArqueoFinal();
    renderizarIngresosAgregados();
    limpiarFilasServiciosDinamicos();
    mostrarMensaje('Todos los movimientos han sido limpiados.', 'info');
}

function guardarEnLocalStorage() {
    localStorage.setItem('arqueos', JSON.stringify(estado.arqueos));
    localStorage.setItem('movimientos', JSON.stringify(estado.movimientos));
    localStorage.setItem('egresosCaja', JSON.stringify(estado.egresosCaja));
    localStorage.setItem('ultimoNumeroRecibo', JSON.stringify(estado.ultimoNumeroRecibo));
}

function mostrarMensaje(mensaje, tipo = 'info') {
    // Crear elemento de mensaje
    const div = document.createElement('div');
    div.className = `mensaje mensaje-${tipo}`;
    div.textContent = mensaje;

    // Estilos para el mensaje
    div.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 0.375rem;
        color: white;
        font-weight: 500;
        z-index: 1000;
        animation: slideIn 0.3s ease-out;
        background-color: ${tipo === 'exito' ? 'var(--color-exito)' : tipo === 'peligro' ? 'var(--color-peligro)' : 'var(--color-primario)'};
    `;

    document.body.appendChild(div);

    // Remover después de 3 segundos
    setTimeout(() => {
        div.remove();
    }, 3000);
}

function filtrarGastos() {
    cargarHistorialGastos();
}

function configurarVistaPorRol(rol, caja, usuario) {
    // --- Visibilidad de Pestañas por Rol ---
    const navUsuarios = document.getElementById('nav-usuarios');
    if (navUsuarios) { // Siempre verificar que el elemento exista
        if (rol === 'admin') {
            navUsuarios.style.display = 'block'; // Mostrar para admin
        } else {
            navUsuarios.style.display = 'none'; // Ocultar para otros roles
        }
    }

    // --- Configuración de Campos y Selectores por Rol ---
    const selectoresCaja = ['caja', 'cajaEgreso', 'cajaGasto', 'filtroCajaIngresos', 'filtroCajaEgresos', 'filtroCajaGastos'];
    const indicadoresCaja = ['cajaActivaIngresos', 'cajaActivaEgresos', 'cajaActivaOperaciones', 'cajaActivaArqueo'];

    if (rol === 'admin') {
        // El admin puede cambiar de caja, así que los selectores deben estar habilitados.
        selectoresCaja.forEach(id => {
            const select = document.getElementById(id);
            if (select) select.disabled = false;
        });

    } else if (rol === 'tesoreria') {
        // Tesorería usa "Caja Tesoreria" y no puede cambiarla.
        selectoresCaja.forEach(id => {
            const select = document.getElementById(id);
            if (select) {
                select.value = 'Caja Tesoreria';
                select.disabled = true;
            }
        });

    } else if (rol === 'cajero') {
        // Cajero usa la caja asignada en el login y no puede cambiarla.
        selectoresCaja.forEach(id => {
            const select = document.getElementById(id);
            if (select) {
                select.value = caja; // 'caja' viene de sessionStorage
                select.disabled = true;
            }
        });
        indicadoresCaja.forEach(id => {
            const indicador = document.getElementById(id);
            if (indicador) indicador.textContent = caja;
        });
    }

    // **CORRECCIÓN:** Llenar el campo de cajero en la página de Arqueo para todos los roles.
    const cajeroInputArqueo = document.getElementById('cajero');
    if (cajeroInputArqueo) {
        cajeroInputArqueo.value = usuario;
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', function () {
    // --- LÓGICA DE AUTENTICACIÓN ---
    // Al cargar la página, verificar si hay un usuario en la sesión.
    const usuarioActual = sessionStorage.getItem('usuarioActual');
    const userRole = sessionStorage.getItem('userRole');

    // Si no hay datos de sesión, no se puede acceder a la aplicación.
    if (!usuarioActual || !userRole) {
        // Redirigir a la página de login.
        // Comprobamos que no estemos ya en login.html para evitar un bucle infinito
        if (window.location.pathname.endsWith('login.html') === false) {
            window.location.href = 'login.html';
        }
        return; // Detener la ejecución del resto del script
    }
    const cajaSeleccionada = sessionStorage.getItem('cajaSeleccionada'); // Puede ser null para admin

    // Mostrar el nombre de usuario y rol en la barra de navegación
    document.getElementById('nombreUsuarioNav').textContent = `Usuario: ${usuarioActual} (${userRole})`;

    // --- INICIALIZACIÓN CONDICIONAL POR PÁGINA ---

    // Elementos comunes a varias páginas
    inicializarModalEfectivo(); // Necesario en index.html
    inicializarFormularioArqueo(); // Necesario en egresosCaja.html y arqueo.html

    // Lógica para la página de Ingresos (index.html)
    const formMovimiento = document.getElementById('formularioMovimiento');
    if (formMovimiento) {
        document.getElementById('fechaMovimiento').value = obtenerFechaHoraLocalISO();
        document.getElementById('filtroFechaIngresos').value = new Date().toISOString().split('T')[0];
        renderizarIngresosAgregados();

        // Listeners para cálculo de vuelto
        const totalVentaInput = document.getElementById('totalVentaEfectivo');
        const montoRecibidoInput = document.getElementById('montoRecibidoCliente');
        if (totalVentaInput) totalVentaInput.addEventListener('input', calcularVuelto);
        if (montoRecibidoInput) montoRecibidoInput.addEventListener('input', calcularVuelto);
    }

    // Lógica para la página de Egresos (egresosCaja.html)
    const formEgresoCaja = document.getElementById('formularioEgresoCaja');
    if (formEgresoCaja) {
        formEgresoCaja.addEventListener('submit', guardarEgresoCaja);
        document.getElementById('fechaFiltroEgresos').value = new Date().toISOString().split('T-')[0];
        limpiarFormularioEgresoCaja();
        cargarHistorialEgresosCaja();
    }

    // Lógica para la página de Operaciones (operaciones.html)
    const formGastos = document.getElementById('formularioGastos');
    if (formGastos) {
        formGastos.addEventListener('submit', guardarGasto);
        document.getElementById('tipoGasto').addEventListener('change', toggleReceptorField);
        limpiarFormularioGastos();
        cargarHistorialGastos();
    }

    // Lógica para la página de Arqueo (arqueo.html)
    const controlesArqueo = document.getElementById('controlesArqueo');
    if (controlesArqueo) {
        document.getElementById('fecha').value = obtenerFechaHoraLocalISO();
        document.getElementById('caja').addEventListener('change', actualizarArqueoFinal);
        document.getElementById('fondoFijo').addEventListener('input', actualizarArqueoFinal);
        cargarHistorialMovimientosDia();
        actualizarArqueoFinal();
    }

    // Lógica para la página de Resumen (resumen.html)
    const seccionResumen = document.getElementById('resumen');
    if (seccionResumen) {
        const hoyISO = new Date().toISOString().split('T')[0];
        document.getElementById('fechaResumenDesde').value = hoyISO;
        document.getElementById('fechaResumenHasta').value = hoyISO;
        cargarResumenDiario();
    }

    // Lógica para la página de Usuarios (usuarios.html)
    const formUsuario = document.getElementById('formularioUsuario');
    if (formUsuario) {
        formUsuario.addEventListener('submit', guardarUsuario);
        renderizarListaUsuarios();
    }

    // Aplicar formato de miles a todos los campos numéricos que puedan existir en la página actual
    const camposFormateados = [
        'pagosTarjetaMovimiento', 'ventasCreditoMovimiento', 'pedidosYaMovimiento', 'ventasTransfMovimiento',
        'apLoteMontoMovimiento', 'aquiPagoMontoMovimiento', 'expressMontoMovimiento', 'wepaMontoMovimiento', 'fondoFijo',
        'pasajeNsaMovimiento', 'encomiendaNsaMovimiento', 'apostalaMontoMovimiento',
        'apLoteTarjetaMovimiento', 'aquiPagoTarjetaMovimiento', 'expressTarjetaMovimiento', 'wepaTarjetaMovimiento', 'pasajeNsaTarjetaMovimiento', 'encomiendaNsaTarjetaMovimiento', 'apostalaTarjetaMovimiento',
        'montoEgresoCaja', 'montoGasto',
        'cotDolarMovimiento', 'cotRealMovimiento', 'cotPesoMovimiento',
        'totalVentaEfectivo', 'montoRecibidoCliente'
    ];
    camposFormateados.forEach(id => {
        const input = document.getElementById(id);
        if (input) aplicarFormatoMiles(input);
    });

    // **LLAMADA FINAL Y DEFINITIVA:** Aseguramos que la configuración del rol se aplique al final de todo.
    configurarVistaPorRol(userRole, cajaSeleccionada, usuarioActual);
});

// **NUEVA FUNCIÓN AUXILIAR PARA REGISTRAR EDICIONES**
function registrarEdicion(item) {
    const motivoEdicion = prompt('Por favor, ingrese el motivo de la edición:');

    if (motivoEdicion === null) { // El usuario presionó "Cancelar"
        mostrarMensaje('Edición cancelada.', 'info');
        return false;
    }

    const motivo = motivoEdicion.trim() || 'Edición sin motivo especificado.';

    // Asegurarse de que el array de historial exista
    if (!item.historialEdiciones) {
        item.historialEdiciones = [];
    }

    // Añadir la nueva entrada al historial
    item.historialEdiciones.push({
        fecha: new Date().toISOString(),
        motivo: motivo,
        usuario: sessionStorage.getItem('usuarioActual') || 'Desconocido'
    });

    return true; // Indicar que la edición fue registrada
}

// **NUEVA FUNCIÓN AUXILIAR PARA GENERAR HTML DEL HISTORIAL**
function generarHTMLHistorial(item) {
    if (!item.historialEdiciones || item.historialEdiciones.length === 0) {
        return { edicionHTML: '', observacionEdicionHTML: '' };
    }

    const ultimaEdicion = item.historialEdiciones[item.historialEdiciones.length - 1];
    const detallesEdiciones = item.historialEdiciones.map(h =>
        `• ${formatearFecha(h.fecha)} por ${h.usuario || 'N/A'}: ${h.motivo}`
    ).join('\n');

    const edicionHTML = `<span class="indicador-editado" title="Historial de Ediciones:\n${detallesEdiciones}"> (Editado)</span>`;

    const observacionEdicionHTML = `
        <div class="movimiento-observacion" style="font-size: 0.8em; color: var(--color-peligro); margin-top: 4px;">
            <strong>Obs:</strong> ${ultimaEdicion.motivo} (por ${ultimaEdicion.usuario || 'N/A'})
        </div>
    `;

    return { edicionHTML, observacionEdicionHTML };
}

// **NUEVA FUNCIÓN PARA CALCULAR VUELTO**
function calcularVuelto() {
    const totalVenta = parsearMoneda(document.getElementById('totalVentaEfectivo').value);
    const montoRecibido = parsearMoneda(document.getElementById('montoRecibidoCliente').value);
    const vuelto = montoRecibido - totalVenta;
    document.getElementById('vueltoCalculado').textContent = formatearMoneda(vuelto > 0 ? vuelto : 0, 'gs');

    // Mostrar u ocultar la sección para registrar el vuelto
    const seccionVuelto = document.getElementById('registroVueltoSeccion');
    if (vuelto > 0) {
        seccionVuelto.style.display = 'block';
    } else {
        seccionVuelto.style.display = 'none';
    }
}

// **NUEVA FUNCIÓN PARA CERRAR SESIÓN**
function cerrarSesion() {
    if (confirm('¿Está seguro de que desea cerrar la sesión?')) {
        // Limpiar los datos de la sesión del usuario
        sessionStorage.clear();

        // Mostrar un mensaje y redirigir a la página de login
        alert('Sesión cerrada exitosamente.');
        window.location.href = 'login.html';
    }
}

function toggleReceptorField() {
    const tipoGasto = document.getElementById('tipoGasto').value;
    const receptorContainer = document.getElementById('receptor-gasto-container');
    const receptorInput = document.getElementById('receptorGasto');

    // 'egreso' es Pago a proveedor, 'operacion' es Deposito
    if (tipoGasto === 'egreso' || tipoGasto === 'operacion') {
        receptorContainer.style.display = 'block';
        receptorInput.required = true;
    } else {
        receptorContainer.style.display = 'none';
        receptorInput.required = false;
        receptorInput.value = ''; // Limpiar el valor si se oculta
    }
}

function aplicarFormatoMiles(input) {
    if (!input) return;
    // Para evitar añadir el mismo listener múltiples veces, lo nombramos y removemos antes de añadirlo.
    const handleInput = (e) => {
        const valorNumerico = parsearMoneda(e.target.value);
        e.target.value = new Intl.NumberFormat('es-PY').format(valorNumerico);
    };
    input.removeEventListener('input', handleInput); // Prevenir duplicados
    input.addEventListener('input', handleInput);
}

function eliminarArqueo(arqueoId, event) {
    event.stopPropagation(); // Evita que se dispare el modal de detalles

    if (confirm('¿Está seguro de que desea eliminar este arqueo de forma permanente? Esta acción no se puede deshacer.')) {
        estado.arqueos = estado.arqueos.filter(a => a.id !== arqueoId);
        guardarEnLocalStorage();
        mostrarMensaje('Arqueo eliminado con éxito.', 'exito');

        // Recargar tanto el historial de arqueos como el resumen de tesorería
        cargarHistorialMovimientosDia();
        cargarResumenDiario();
    }
}

function exportarArqueoPDFById(arqueoId) {
    const arqueo = estado.arqueos.find(a => a.id === arqueoId);
    if (arqueo) exportarArqueoPDF(arqueo);
}

function mostrarDetallesArqueo(arqueoId) {
    const arqueo = estado.arqueos.find(a => a.id === arqueoId);
    if (!arqueo) {
        mostrarMensaje('No se encontró el arqueo.', 'peligro');
        return;
    }

    let efectivoHTML = '';
    // **CORRECCIÓN:** Asegurarse de que el objeto `efectivo` exista antes de iterar.
    if (arqueo.efectivo) {
        CONFIG.denominaciones.forEach(denom => {
            const cantidad = arqueo.efectivo[denom.valor] || 0;
            if (cantidad > 0) efectivoHTML += `<tr><td>${denom.nombre}</td><td>${cantidad}</td><td>${formatearMoneda(cantidad * denom.valor, 'gs')}</td></tr>`;
        });
    }

    let serviciosHTML = '';
    Object.entries(arqueo.servicios).forEach(([key, val]) => {
        if (val.monto > 0 || val.tarjeta > 0) {
            const nombreServicio = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
            serviciosHTML += `<tr><td>${nombreServicio}</td><td>${formatearMoneda(val.monto, 'gs')}</td><td>${formatearMoneda(val.tarjeta, 'gs')}</td></tr>`;
        }
    });
    arqueo.otrosServicios.forEach(s => {
        serviciosHTML += `<tr><td>${s.nombre}</td><td>${formatearMoneda(s.monto, 'gs')}</td><td>${formatearMoneda(s.tarjeta, 'gs')}</td></tr>`;
    });

    const detallesHTML = `
        <div class="detalle-arqueo">
            <div class="detalle-seccion">
                <h5>Información General</h5>
                <p><strong>Caja:</strong> ${arqueo.caja}</p>
                <p><strong>Cajero:</strong> ${arqueo.cajero}</p>
                <p><strong>Fecha:</strong> ${formatearFecha(arqueo.fecha)}</p>
            </div>

            <div class="detalle-seccion">
                <h5>Desglose de Efectivo</h5>
                <table class="tabla-detalle">
                    <thead><tr><th>Denominación</th><th>Cantidad</th><th>Monto</th></tr></thead>
                    <tbody>${efectivoHTML}</tbody>
                </table>
                <p><strong>Total Efectivo:</strong> ${formatearMoneda(arqueo.totalEfectivo, 'gs')}</p>
            </div>

            <div class="detalle-seccion">
                <h5>Ingresos No Efectivo</h5>
                <p><strong>Tarjeta:</strong> ${formatearMoneda(arqueo.pagosTarjeta, 'gs')}</p>
                <p><strong>Crédito:</strong> ${formatearMoneda(arqueo.ventasCredito, 'gs')}</p>
                <p><strong>Pedidos YA:</strong> ${formatearMoneda(arqueo.pedidosYa, 'gs')}</p>
                <p><strong>Transferencia:</strong> ${formatearMoneda(arqueo.ventasTransferencia, 'gs')}</p>
            </div>

            <div class="detalle-seccion">
                <h5>Servicios</h5>
                <table class="tabla-detalle">
                    <thead><tr><th>Servicio</th><th>Efectivo</th><th>Tarjeta</th></tr></thead>
                    <tbody>${serviciosHTML}</tbody>
                </table>
                <p><strong>Total Servicios:</strong> ${formatearMoneda(arqueo.totalServicios, 'gs')}</p>
            </div>

            <div class="detalle-seccion total-final">
                <p><strong>Total Ingresos:</strong> ${formatearMoneda(arqueo.totalIngresos, 'gs')}</p>
            </div>

            <!-- **NUEVO:** Botón de exportación en el modal -->
            <div class="modal-footer" style="text-align: right; margin-top: 20px;">
                <button class="btn" onclick="exportarArqueoPDFById('${arqueo.id}')">Exportar a PDF</button>
            </div>
        </div>
    `;

    const modal = document.getElementById('modal');
    const modalTitulo = document.getElementById('modal-titulo');
    const modalBody = document.getElementById('modal-body');

    modalTitulo.textContent = `Detalle de Arqueo - ${arqueo.caja}`;
    modalBody.innerHTML = detallesHTML;
    modal.style.display = 'flex';
}

// **NUEVA FUNCIÓN PARA EXPORTAR ARQUEO ACTUAL A PDF**
function exportarArqueoActualPDF() {
    const fechaArqueo = document.getElementById('fecha').value.split('T')[0];
    const cajaFiltro = document.getElementById('filtroCajaIngresos').value;

    let ingresosParaArqueo = estado.movimientosTemporales;
    let egresosParaArqueo = estado.egresosCaja.filter(e => e.fecha.startsWith(fechaArqueo));

    if (cajaFiltro) {
        ingresosParaArqueo = ingresosParaArqueo.filter(m => m.caja === cajaFiltro);
        egresosParaArqueo = egresosParaArqueo.filter(e => e.caja === cajaFiltro);
    }

    const movimientosParaArqueo = [
        ...ingresosParaArqueo.map(m => ({ ...m, tipoMovimiento: 'ingreso' })),
        ...egresosParaArqueo.map(e => ({ ...e, tipoMovimiento: 'egreso' }))
    ];

    const totales = calcularTotalesArqueo(movimientosParaArqueo);

    // Construir un objeto 'arqueo' temporal para la función de exportación
    const arqueoTemporal = {
        fecha: document.getElementById('fecha').value,
        cajero: document.getElementById('cajero').value,
        caja: document.getElementById('caja').value,
        fondoFijo: parsearMoneda(document.getElementById('fondoFijo').value),
        efectivo: totales.efectivo,
        monedasExtranjeras: totales.monedasExtranjeras,
        pagosTarjeta: totales.pagosTarjeta,
        ventasCredito: totales.ventasCredito,
        pedidosYa: totales.pedidosYa,
        ventasTransferencia: totales.ventasTransferencia,
        servicios: totales.servicios,
        // No necesitamos otrosServicios aquí porque ya están agregados en totales.servicios.otros
    };

    exportarArqueoPDF(arqueoTemporal, true); // El 'true' indica que es un arqueo actual/temporal
}

// **NUEVA FUNCIÓN PRINCIPAL PARA GENERAR EL PDF**
function exportarArqueoPDF(arqueo, esTemporal = false) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text('Detalle de Arqueo de Caja', 14, 22);

    doc.setFontSize(11);
    doc.text(`Fecha: ${formatearFecha(arqueo.fecha)}`, 14, 32);
    doc.text(`Cajero: ${arqueo.cajero || 'N/A'}`, 14, 38);
    doc.text(`Caja: ${arqueo.caja || 'N/A'}`, 14, 44);

    let finalY = 50;

    // --- Tabla de Efectivo ---
    const efectivoBody = [];
    let totalEfectivoBruto = 0;
    if (arqueo.efectivo) {
        CONFIG.denominaciones.forEach(denom => {
            const cantidad = arqueo.efectivo[denom.valor] || 0;
            if (cantidad > 0) {
                const monto = cantidad * denom.valor;
                totalEfectivoBruto += monto;
                efectivoBody.push([denom.nombre, cantidad, formatearMoneda(monto, 'gs')]);
            }
        });
    }
    if (arqueo.monedasExtranjeras) {
        Object.entries(arqueo.monedasExtranjeras).forEach(([moneda, data]) => {
            if (data.cantidad > 0) {
                totalEfectivoBruto += data.montoGs;
                efectivoBody.push([moneda.toUpperCase(), data.cantidad.toFixed(2), formatearMoneda(data.montoGs, 'gs')]);
            }
        });
    }

    doc.autoTable({
        startY: finalY,
        head: [['Denominación/Moneda', 'Cantidad', 'Monto (Gs)']],
        body: efectivoBody,
        didDrawPage: (data) => { finalY = data.cursor.y; }
    });

    // --- Resumen de Efectivo ---
    const totalAEntregar = totalEfectivoBruto - (arqueo.fondoFijo || 0);
    doc.autoTable({
        startY: finalY + 2,
        body: [
            ['Total Efectivo Bruto:', formatearMoneda(totalEfectivoBruto, 'gs')],
            ['- Fondo Fijo:', formatearMoneda(arqueo.fondoFijo || 0, 'gs')],
            ['Total a Entregar:', formatearMoneda(totalAEntregar, 'gs')]
        ],
        theme: 'plain',
        styles: { fontStyle: 'bold' },
        didDrawPage: (data) => { finalY = data.cursor.y; }
    });

    // --- Ingresos No Efectivo y Servicios ---
    const ingresosNoEfectivoBody = [
        ['Pagos con Tarjeta', formatearMoneda(arqueo.pagosTarjeta || 0, 'gs')],
        ['Ventas a Crédito', formatearMoneda(arqueo.ventasCredito || 0, 'gs')],
        ['Pedidos YA', formatearMoneda(arqueo.pedidosYa || 0, 'gs')],
        ['Ventas por Transferencia', formatearMoneda(arqueo.ventasTransferencia || 0, 'gs')]
    ];
    doc.autoTable({ startY: finalY + 5, head: [['Ingresos No Efectivo', 'Monto']], body: ingresosNoEfectivoBody, didDrawPage: (data) => { finalY = data.cursor.y; } });

    const serviciosBody = [];
    if (arqueo.servicios) {
        const agregarServicio = (nombre, servicio) => {
            if ((servicio.monto || 0) > 0 || (servicio.tarjeta || 0) > 0) {
                serviciosBody.push([nombre, servicio.lotes ? servicio.lotes.join(', ') : '', formatearMoneda(servicio.monto || 0, 'gs'), formatearMoneda(servicio.tarjeta || 0, 'gs')]);
            }
        };
        agregarServicio('ACA PUEDO', arqueo.servicios.apLote || {});
        agregarServicio('Aquí Pago', arqueo.servicios.aquiPago || {});
        agregarServicio('WEPA', arqueo.servicios.wepa || {});
        agregarServicio('Pasaje NSA', arqueo.servicios.pasajeNsa || {});
        agregarServicio('Encomienda NSA', arqueo.servicios.encomiendaNsa || {});
        agregarServicio('Apostala', arqueo.servicios.apostala || {});
        if (arqueo.servicios.otros) Object.entries(arqueo.servicios.otros).forEach(([nombre, s]) => agregarServicio(nombre, s));
    }
    if (serviciosBody.length > 0) {
        doc.autoTable({ startY: finalY + 2, head: [['Servicio', 'Lote/Fecha', 'Efectivo (Gs)', 'Tarjeta (Gs)']], body: serviciosBody, didDrawPage: (data) => { finalY = data.cursor.y; } });
    }

    // --- Resumen Final del Arqueo ---
    let totalServiciosArqueo = 0;
    ['apLote', 'aquiPago', 'expressLote', 'wepa', 'pasajeNsa', 'encomiendaNsa', 'apostala'].forEach(key => {
        const servicio = arqueo.servicios[key];
        if (servicio) totalServiciosArqueo += (servicio.monto || 0) + (servicio.tarjeta || 0);
    });
    if (arqueo.servicios.otros) {
        for (const nombre in arqueo.servicios.otros) {
            totalServiciosArqueo += (arqueo.servicios.otros[nombre].monto || 0) + (arqueo.servicios.otros[nombre].tarjeta || 0);
        }
    }

    const totalIngresosArqueo = totalEfectivoBruto + (arqueo.pagosTarjeta || 0) + (arqueo.ventasCredito || 0) + (arqueo.pedidosYa || 0) + (arqueo.ventasTransferencia || 0) + totalServiciosArqueo;
    
    const egresosDeCajaFiltrados = estado.egresosCaja.filter(e => e.fecha.startsWith(arqueo.fecha.split('T')[0]) && e.caja === arqueo.caja);
    const egresosDeOperacionesFiltrados = estado.movimientos.filter(m => m.fecha.startsWith(arqueo.fecha.split('T')[0]) && (m.tipo === 'gasto' || m.tipo === 'egreso') && m.caja === arqueo.caja);
    const totalEgresosCaja = egresosDeCajaFiltrados.reduce((sum, e) => sum + e.monto, 0) + egresosDeOperacionesFiltrados.reduce((sum, m) => sum + m.monto, 0);

    const totalNeto = totalIngresosArqueo - totalEgresosCaja;

    doc.autoTable({
        startY: finalY + 5,
        body: [
            ['Total Ingresos del Arqueo:', formatearMoneda(totalIngresosArqueo, 'gs')],
            ['- Total Egresos de Caja:', formatearMoneda(totalEgresosCaja, 'gs')],
            ['Total Neto del Arqueo:', formatearMoneda(totalNeto, 'gs')]
        ],
        theme: 'plain',
        styles: { fontStyle: 'bold' },
        didDrawPage: (data) => { finalY = data.cursor.y; }
    });

    // --- Firmas ---
    // Añadir un espacio prudencial antes de las firmas.
    // Si el espacio no es suficiente, autoTable lo gestionará, pero un salto manual es más limpio.
    if (finalY > 240) { // Si queda poco espacio en la página
        doc.addPage();
        finalY = 20; // Reiniciar Y en la nueva página
    } else {
        finalY += 25; // Dejar espacio después de la última tabla
    }

    const firmaCajeroX = 35;
    const firmaTesoreroX = 140;

    doc.line(firmaCajeroX, finalY, firmaCajeroX + 40, finalY); // Línea para firma del cajero
    doc.text('Firma del Cajero', firmaCajeroX + 20, finalY + 5, { align: 'center' });
    doc.line(firmaTesoreroX, finalY, firmaTesoreroX + 40, finalY); // Línea para firma del tesorero
    doc.text('Firma del Tesorero', firmaTesoreroX + 20, finalY + 5, { align: 'center' });

    // --- Guardar el archivo ---
    const fechaArchivo = arqueo.fecha.split('T')[0].replace(/-/g, '_');
    doc.save(`Arqueo_${arqueo.caja}_${fechaArchivo}.pdf`);
}

function eliminarUsuario(username) {
    if (confirm(`¿Está seguro de que desea eliminar al usuario "${username}"?`)) {
        let usuarios = JSON.parse(localStorage.getItem('usuarios')) || [];
        usuarios = usuarios.filter(u => u.username !== username);
        localStorage.setItem('usuarios', JSON.stringify(usuarios));
        mostrarMensaje('Usuario eliminado.', 'info');
        renderizarListaUsuarios();
    }
}
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
    .movimiento-sub-detalles p {
        display: flex;
        align-items: center;
        margin: 4px 0 4px 10px;
        font-size: 0.9em;
    }
    .detalle-icono {
        margin-right: 8px;
        width: 20px;
        text-align: center;
    }
    .info-filtro {
        text-align: center;
        font-style: italic;
        color: var(--color-primario);
        background-color: var(--color-fondo-claro);
        padding: 0.5rem;
    }
    .vuelto-seccion {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
        padding: 1rem;
        background-color: var(--color-fondo-claro);
        border-radius: 0.375rem;
        margin-bottom: 1rem;
    }
    .vuelto-display {
        grid-column: 1 / -1;
        text-align: center;
        font-size: 1.2rem;
        padding: 0.5rem;
        background-color: var(--color-fondo);
        border: 1px solid var(--color-borde);
    }
    .resumen-botones-excel {
        display: flex;
        gap: 10px; /* Espacio entre los botones de Excel */
        align-items: center;
    }
`;
document.head.appendChild(style);

// **NUEVOS ESTILOS PARA LA BARRA DE NAVEGACIÓN DEL USUARIO**
const navUsuarioStyles = document.createElement('style');
navUsuarioStyles.textContent = `
    .nav-usuario {
        display: flex;
        align-items: center;
        gap: 1rem; /* Espacio entre el nombre y el botón */
    }
    #nombreUsuarioNav {
        font-weight: 500;
        color: var(--color-blanco);
    }
    .nav-link-logout {
        display: inline-flex; /* Para centrar el texto verticalmente */
        align-items: center; /* Para centrar el texto verticalmente */
        padding: 0.4rem 0.6rem; /* Padding más simétrico y compacto */
        background-color: var(--color-peligro); /* Color rojo para destacar */
        color: var(--color-blanco) !important; /* Asegurar texto blanco */
        border-radius: 4px;
        text-decoration: none;
        transition: background-color 0.2s;
        line-height: 1; /* Asegura que no haya altura de línea extra */
    }
    .nav-link-logout:hover {
        background-color: #c82333; /* Un rojo un poco más oscuro al pasar el mouse */
        color: var(--color-blanco) !important;
    }
`;
document.head.appendChild(navUsuarioStyles);

// **NUEVOS ESTILOS PARA CAMPOS DESHABILITADOS**
const disabledStyles = document.createElement('style');
disabledStyles.textContent = `
    select:disabled, input:read-only {
        background-color: #e9ecef; /* Un gris más claro */
        opacity: 1; /* Evita que el texto se vea muy opaco */
        cursor: not-allowed; /* Indica que no se puede interactuar */
    }
`;
document.head.appendChild(disabledStyles);
