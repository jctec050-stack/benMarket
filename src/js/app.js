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

// **NUEVO:** Constante para centralizar los servicios de pagos
// **MODIFICADO:** Lista de servicios dinámica cargada desde localStorage
const SERVICIOS_DEFAULT = [
    "Aca Puedo",
    "Aqui Pago",
    "Pago Express",
    "Wepa",
    "Pasaje NSA",
    "Encomienda NSA",
    "Apostala"
];

let SERVICIOS_PAGOS = JSON.parse(localStorage.getItem('serviciosPagos')) || SERVICIOS_DEFAULT;

// Función para cargar los servicios en el select
function cargarServicios() {
    const select = document.getElementById('servicioEfectivoSelect');
    if (!select) return;

    // Guardar la selección actual si existe
    const valorActual = select.value;

    // Limpiar opciones excepto el placeholder
    while (select.options.length > 1) {
        select.remove(1);
    }

    SERVICIOS_PAGOS.forEach(servicio => {
        const option = document.createElement('option');
        option.value = servicio;
        option.textContent = servicio;
        select.appendChild(option);
    });

    // Restaurar selección si aún existe
    if (SERVICIOS_PAGOS.includes(valorActual)) {
        select.value = valorActual;
    }
}

// Función para agregar un nuevo servicio
window.agregarNuevoServicio = function () {
    const nuevoServicio = prompt("Ingrese el nombre del nuevo servicio:");
    if (nuevoServicio && nuevoServicio.trim() !== "") {
        const nombreServicio = nuevoServicio.trim();

        // Verificar si ya existe (case insensitive)
        const existe = SERVICIOS_PAGOS.some(s => s.toLowerCase() === nombreServicio.toLowerCase());

        if (existe) {
            alert("Este servicio ya existe en la lista.");
            return;
        }

        SERVICIOS_PAGOS.push(nombreServicio);
        SERVICIOS_PAGOS.sort(); // Mantener orden alfabético

        // Guardar en localStorage
        localStorage.setItem('serviciosPagos', JSON.stringify(SERVICIOS_PAGOS));

        // Recargar el dropdown
        cargarServicios();

        // Seleccionar el nuevo servicio
        const select = document.getElementById('servicioEfectivoSelect');
        if (select) {
            select.value = nombreServicio;
        }

        alert(`Servicio "${nombreServicio}" agregado correctamente.`);
    }
};



// Estado de la aplicación
let estado = {
    arqueos: JSON.parse(localStorage.getItem('arqueos')) || [],
    movimientos: JSON.parse(localStorage.getItem('movimientos')) || [],
    egresosCaja: JSON.parse(localStorage.getItem('egresosCaja')) || [],
    movimientosTemporales: JSON.parse(localStorage.getItem('movimientosTemporales')) || [], // Para los ingresos de caja del día seccionActiva: 'ingreso-movimiento',
    ultimoNumeroRecibo: JSON.parse(localStorage.getItem('ultimoNumeroRecibo')) || 0,
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
    if (!fecha) return '';
    // Si es solo fecha (YYYY-MM-DD), agregar hora para que sea local y no UTC
    if (fecha.length === 10 && fecha.includes('-')) {
        return new Date(fecha + 'T00:00:00').toLocaleDateString('es-PY', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }
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
        // **CORRECCIÓN:** Solo añadir si la tabla de egreso existe en la página actual.
        if (tablaEgreso) {
            tablaEgreso.appendChild(filaEgreso);
        }
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

    // **CORRECCIÓN:** Solo añadir el listener si la tabla de egreso existe.
    if (tablaEgreso) {
        tablaEgreso.addEventListener('input', function (e) {
            if (e.target.classList.contains('cantidad-denominacion-egreso')) {
                const input = e.target;
                const monto = (parseInt(input.value) || 0) * parseInt(input.dataset.denominacion);
                input.closest('tr').querySelector('.monto-parcial-egreso').textContent = formatearMoneda(monto, 'gs');
                calcularTotalEgresoCaja();
            }
        });
    }



    // Establecer fecha y hora actual
    const fechaArqueoInput = document.getElementById('fecha');
    if (fechaArqueoInput) {
        fechaArqueoInput.value = obtenerFechaHoraLocalISO().split('T')[0];
    }

    // Formatear input de Fondo Fijo
    const fondoFijoInput = document.getElementById('fondoFijo');
    if (fondoFijoInput) {
        fondoFijoInput.addEventListener('input', function (e) {
            let value = e.target.value.replace(/\D/g, '');
            if (value) {
                value = value.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
            }
            e.target.value = value;
            actualizarArqueoFinal(); // Recalcular al cambiar el fondo fijo
        });
    }
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


    const obtenerValorParseado = (id) => {
        const element = document.getElementById(id);
        return element ? parsearMoneda(element.value) : 0;
    };

    const obtenerValorInput = (selector) => {
        const element = document.querySelector(selector);
        return element ? parseFloat(element.value) || 0 : 0;
    };

    const obtenerValorTexto = (id) => {
        const element = document.getElementById(id);
        return element ? element.value : '';
    };

    const movimiento = {
        fecha: document.getElementById('fechaMovimiento').value,
        cajero: sessionStorage.getItem('usuarioActual'),
        // **CORREGIDO:** Asegurar que la caja sea la correcta para cada rol.
        caja: sessionStorage.getItem('userRole') === 'tesoreria'
            ? 'Caja Tesoreria'
            : (sessionStorage.getItem('cajaSeleccionada') || 'Caja 1'),
        historialEdiciones: [], // Inicializamos el historial de ediciones
        valorVenta: esVentaConVuelto ? totalVenta : 0, // **NUEVO:** Guardar el valor real de la venta
        efectivoVuelto: {}, // **NUEVO:** Para guardar el desglose del vuelto
        descripcion: document.getElementById('descripcionMovimiento').value || '',
        efectivo: {},
        monedasExtranjeras: {
            usd: { cantidad: obtenerValorInput('.cantidad-moneda-movimiento[data-moneda="usd"]'), cotizacion: obtenerCotizacion('usd', true) },
            brl: { cantidad: obtenerValorInput('.cantidad-moneda-movimiento[data-moneda="brl"]'), cotizacion: obtenerCotizacion('brl', true) },
            ars: { cantidad: obtenerValorInput('.cantidad-moneda-movimiento[data-moneda="ars"]'), cotizacion: obtenerCotizacion('ars', true) }
        },
        pagosTarjeta: obtenerValorParseado('pagosTarjetaMovimiento'),
        ventasCredito: obtenerValorParseado('ventasCreditoMovimiento'),
        pedidosYa: obtenerValorParseado('pedidosYaMovimiento'),
        ventasTransferencia: obtenerValorParseado('ventasTransfMovimiento'),
        servicios: {
            apLote: { lote: obtenerValorTexto('apLoteCantMovimiento'), monto: 0, tarjeta: obtenerValorParseado('apLoteTarjetaMovimiento') },
            aquiPago: { lote: obtenerValorTexto('aquiPagoLoteMovimiento'), monto: 0, tarjeta: obtenerValorParseado('aquiPagoTarjetaMovimiento') },
            expressLote: { lote: obtenerValorTexto('expressCantMovimiento'), monto: 0, tarjeta: obtenerValorParseado('expressTarjetaMovimiento') },
            wepa: { lote: obtenerValorTexto('wepaFechaMovimiento'), monto: 0, tarjeta: obtenerValorParseado('wepaTarjetaMovimiento') },
            pasajeNsa: { lote: obtenerValorTexto('pasajeNsaLoteMovimiento'), monto: 0, tarjeta: obtenerValorParseado('pasajeNsaTarjetaMovimiento') },
            encomiendaNsa: { lote: obtenerValorTexto('encomiendaNsaLoteMovimiento'), monto: 0, tarjeta: obtenerValorParseado('encomiendaNsaTarjetaMovimiento') },
            apostala: { lote: obtenerValorTexto('apostalaLoteMovimiento'), monto: 0, tarjeta: obtenerValorParseado('apostalaTarjetaMovimiento') }
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
        const tarjeta = parsearMoneda(fila.querySelector('.tarjeta-servicio-dinamico').value);

        if (nombre && tarjeta > 0) {
            movimiento.otrosServicios.push({ nombre, lote, monto: 0, tarjeta });
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
function agregarFilaServicioDinamico() {
    const tbody = document.getElementById('tbodyServiciosMovimiento');
    const fila = document.createElement('tr');
    fila.className = 'fila-servicio-dinamico';

    fila.innerHTML = `
        <td><input type="text" class="nombre-servicio-dinamico" placeholder="Nombre del servicio"></td>
        <td><input type="text" class="lote-servicio-dinamico" placeholder="Lote/Ref"></td>
        <td><input type="text" inputmode="numeric" class="tarjeta-servicio-dinamico" value="0"></td>
    `;
    tbody.appendChild(fila);

    // Aplicar formato de miles a los nuevos campos
    const camposNuevos = fila.querySelectorAll('.tarjeta-servicio-dinamico');
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
                if (!servicio) return;
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
    document.getElementById('apLoteTarjetaMovimiento').value = movimiento.servicios.apLote.tarjeta;
    document.getElementById('aquiPagoLoteMovimiento').value = movimiento.servicios.aquiPago.lote;
    document.getElementById('aquiPagoTarjetaMovimiento').value = movimiento.servicios.aquiPago.tarjeta;
    document.getElementById('expressCantMovimiento').value = movimiento.servicios.expressLote.lote;
    document.getElementById('expressTarjetaMovimiento').value = movimiento.servicios.expressLote.tarjeta;
    document.getElementById('wepaFechaMovimiento').value = movimiento.servicios.wepa.lote;
    document.getElementById('wepaTarjetaMovimiento').value = movimiento.servicios.wepa.tarjeta;
    document.getElementById('pasajeNsaLoteMovimiento').value = movimiento.servicios.pasajeNsa.lote;
    document.getElementById('pasajeNsaTarjetaMovimiento').value = movimiento.servicios.pasajeNsa.tarjeta;
    document.getElementById('encomiendaNsaLoteMovimiento').value = movimiento.servicios.encomiendaNsa.lote;
    document.getElementById('encomiendaNsaTarjetaMovimiento').value = movimiento.servicios.encomiendaNsa.tarjeta;
    document.getElementById('apostalaLoteMovimiento').value = movimiento.servicios.apostala.lote;
    document.getElementById('apostalaTarjetaMovimiento').value = movimiento.servicios.apostala.tarjeta;

    // Limpiar y cargar otros servicios dinámicos
    limpiarFilasServiciosDinamicos();
    movimiento.otrosServicios.forEach(servicio => {
        agregarFilaServicioDinamico(); // Crea una nueva fila vacía
        const nuevaFila = document.querySelector('.fila-servicio-dinamico:last-child');
        nuevaFila.querySelector('.nombre-servicio-dinamico').value = servicio.nombre;
        nuevaFila.querySelector('.lote-servicio-dinamico').value = servicio.lote;
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
        totalIngresosTienda: 0, // **NUEVO:** Para sumar solo ingresos de tienda (no servicios)
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

    // Inicializar estructura de efectivo
    CONFIG.denominaciones.forEach(denom => {
        totales.efectivo[denom.valor] = { ingreso: 0, egreso: 0, neto: 0 };
    });

    movimientosParaArqueo.forEach(mov => {
        // **NUEVA LÓGICA:** Identificar si es un ingreso de tienda
        if (mov.tipoMovimiento === 'ingreso') {
            let esServicio = false;
            if (mov.servicios) {
                for (const key in mov.servicios) {
                    if (mov.servicios[key].monto > 0) esServicio = true;
                }
            }
            if (mov.otrosServicios && mov.otrosServicios.length > 0) {
                if (mov.otrosServicios.some(s => s.monto > 0)) esServicio = true;
            }

            if (!esServicio) {
                totales.totalIngresosTienda += mov.valorVenta > 0 ? mov.valorVenta : Object.entries(mov.efectivo).reduce((sum, [denom, cant]) => sum + (parseInt(denom) * cant), 0);
            }
        }
        // Sumar/Restar efectivo por denominación
        if (mov.efectivo) {
            for (const [denominacion, cantidad] of Object.entries(mov.efectivo)) {
                if (!totales.efectivo[denominacion]) totales.efectivo[denominacion] = { ingreso: 0, egreso: 0, neto: 0 };

                if (mov.tipoMovimiento === 'egreso') {
                    totales.efectivo[denominacion].egreso += cantidad;
                    totales.efectivo[denominacion].neto -= cantidad;
                } else {
                    totales.efectivo[denominacion].ingreso += cantidad;
                    totales.efectivo[denominacion].neto += cantidad;
                }
            }
        }
        // Restar efectivo por vuelto (siempre es egreso)
        if (mov.efectivoVuelto) {
            for (const denom in mov.efectivoVuelto) {
                if (!totales.efectivo[denom]) totales.efectivo[denom] = { ingreso: 0, egreso: 0, neto: 0 };
                totales.efectivo[denom].egreso += mov.efectivoVuelto[denom];
                totales.efectivo[denom].neto -= mov.efectivoVuelto[denom];
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
        const data = totales.efectivo[denom.valor];
        const cantidad = data ? data.neto : 0;
        const ingreso = data ? data.ingreso : 0;
        const egreso = data ? data.egreso : 0;

        // Mostrar si hay movimiento (ingreso o egreso) o si hay cantidad neta
        if (ingreso === 0 && egreso === 0 && cantidad === 0) return;

        const monto = cantidad * denom.valor;
        totalEfectivoFinal += monto;
        efectivoHTML += `<tr>
            <td>${denom.nombre}</td>
            <td style="color: var(--color-exito);">${ingreso || 0}</td>
            <td style="color: var(--color-peligro);">${egreso || 0}</td>
            <td><strong>${cantidad}</strong></td>
            <td>${formatearMoneda(monto, 'gs')}</td>
        </tr>`;
    });

    let totalMonedasExtranjerasGs = 0;
    Object.keys(totales.monedasExtranjeras).forEach(moneda => {
        const { cantidad, montoGs } = totales.monedasExtranjeras[moneda];
        if (cantidad > 0) {
            totalMonedasExtranjerasGs += montoGs;
            efectivoHTML += `<tr>
                <td>${moneda.toUpperCase()}</td>
                <td colspan="3" style="text-align: center;">${cantidad.toFixed(2)}</td>
                <td>${formatearMoneda(montoGs, 'gs')}</td>
            </tr>`;
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
    let totalServiciosEfectivo = 0; // **NUEVO:** Variable para sumar solo efectivo de servicios
    ['apLote', 'aquiPago', 'expressLote', 'wepa', 'pasajeNsa', 'encomiendaNsa', 'apostala'].forEach(key => {
        const servicio = totales.servicios[key];
        if (servicio) {
            totalServiciosArqueo += servicio.monto + servicio.tarjeta;
            totalServiciosEfectivo += servicio.monto; // Sumar solo efectivo
        }
    });
    for (const nombre in totales.servicios.otros) {
        const servicio = totales.servicios.otros[nombre];
        totalServiciosArqueo += servicio.monto + servicio.tarjeta;
        totalServiciosEfectivo += servicio.monto; // Sumar solo efectivo
    }

    const totalEfectivoBruto = totalEfectivoFinal; // Solo efectivo en Gs
    // **CORRECCIÓN:** El total a entregar debe ser el resultado de (Total Efectivo Bruto + Fondo Fijo) - Fondo Fijo,
    // lo que es igual al Total Efectivo Bruto. La variable 'totalAEntregar' ahora contendrá este valor.
    const totalAEntregar = totalEfectivoBruto;
    const totalIngresoEfectivo = totalServiciosEfectivo; // **NUEVA LÓGICA:** El total de ingreso efectivo es solo el efectivo de servicios.

    const egresosDeCajaFiltrados = estado.egresosCaja.filter(e => e.fecha.startsWith(document.getElementById('fecha').value.split('T')[0]) && e.caja === cajaFiltro);
    const egresosDeOperacionesFiltrados = estado.movimientos.filter(m =>
        m.fecha.startsWith(document.getElementById('fecha').value.split('T')[0]) &&
        (m.tipo === 'gasto' || m.tipo === 'egreso') &&
        m.caja === cajaFiltro
    );

    const totalEgresosCaja = egresosDeCajaFiltrados.reduce((sum, e) => sum + e.monto, 0) +
        egresosDeOperacionesFiltrados.reduce((sum, m) => sum + m.monto, 0);

    const totalNeto = (totales.totalIngresosTienda + totalIngresoEfectivo) - totalEgresosCaja;

    // Preparar HTML para totales de monedas extranjeras
    let totalesMonedasHTML = '';
    if (totales.monedasExtranjeras.usd.cantidad > 0) {
        totalesMonedasHTML += `<div class="total-item final" style="margin-top: 0.5rem;"><strong>Total a Entregar (USD):</strong><strong>${totales.monedasExtranjeras.usd.cantidad.toFixed(2)}</strong></div>`;
    }
    if (totales.monedasExtranjeras.brl.cantidad > 0) {
        totalesMonedasHTML += `<div class="total-item final" style="margin-top: 0.5rem;"><strong>Total a Entregar (R$):</strong><strong>${totales.monedasExtranjeras.brl.cantidad.toFixed(2)}</strong></div>`;
    }
    if (totales.monedasExtranjeras.ars.cantidad > 0) {
        totalesMonedasHTML += `<div class="total-item final" style="margin-top: 0.5rem;"><strong>Total a Entregar (ARS):</strong><strong>${totales.monedasExtranjeras.ars.cantidad.toFixed(0)}</strong></div>`;
    }

    // Construir el HTML final para la vista
    contenedorVista.innerHTML = `
        <!-- **NUEVO:** Información General del Arqueo -->
        <div class="detalle-seccion" style="border-bottom: 1px solid var(--color-borde); padding-bottom: 1rem; margin-bottom: 1rem;">
            <h5>Información General del Arqueo</h5>
            <p><strong>Fecha y Hora:</strong> ${formatearFecha(document.getElementById('fecha').value)}</p>
            <p><strong>Cajero:</strong> ${document.getElementById('cajero').value || 'No especificado'}</p>
            <p><strong>Caja:</strong> ${document.getElementById('caja').value}</p>
        </div>

        <div class="detalle-arqueo">
            <!-- Columna 1: Efectivo y Resumen de Efectivo -->
            <div class="detalle-seccion">
                <h5>Conteo de Efectivo</h5>
                <table class="tabla-detalle">
                    <thead>
                        <tr>
                            <th>Denominación</th>
                            <th>Ingresos</th>
                            <th>Egresos</th>
                            <th>Existencia</th>
                            <th>Monto (G$)</th>
                        </tr>
                    </thead>
                    <tbody>${efectivoHTML || '<tr><td colspan="5">No hay movimientos en efectivo.</td></tr>'}</tbody>
                </table>
                <div class="resumen-totales" style="margin-top: 1rem;">
                    <div class="total-item" style="color: var(--color-info);"><span>Total Efectivo Bruto + Fondo Fijo:</span><span>${formatearMoneda(totalEfectivoBruto + fondoFijo, 'gs')}</span></div>
                    <div class="total-item negativo"><span>- Fondo Fijo:</span><span>${formatearMoneda(fondoFijo, 'gs')}</span></div>
                    <div class="total-item final"><strong>Total a Entregar (G$):</strong><strong>${formatearMoneda(totalEfectivoBruto, 'gs')}</strong></div>
                    ${totalesMonedasHTML}
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
            <div class="total-item positivo"><span>Total Ingresos Tienda:</span><span>${formatearMoneda(totales.totalIngresosTienda, 'gs')}</span></div>
            <div class="total-item positivo"><span>Total Efectivo Servicios:</span><span>${formatearMoneda(totalIngresoEfectivo, 'gs')}</span></div>
            <div class="total-item negativo"><span>- Total Egresos de Caja:</span><span>${formatearMoneda(totalEgresosCaja, 'gs')}</span></div>
            <div class="total-item ${totalNeto >= 0 ? 'positivo' : 'negativo'}"><strong>Total Neto del Arqueo:</strong><strong>${formatearMoneda(totalNeto, 'gs')}</strong></div>
        </div>

        <!-- **NUEVO:** Botón para exportar el arqueo actual a PDF -->
        <div class="acciones-arqueo" style="text-align: center; margin-top: 2rem;">
            <button class="btn" onclick="exportarArqueoActualPDF()">📄 Exportar Vista a PDF</button>
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
    const fechaInput = document.getElementById('fecha');
    // **CORRECCIÓN:** Usar el mismo ID de caja que en el resto de la página para consistencia.
    const cajaInput = document.getElementById('caja'); 

    if (!fechaInput || !cajaInput) return;

    const fechaArqueo = fechaInput.value.split('T')[0];
    const cajaFiltro = cajaInput.value;

    // 1. Obtener ingresos del día
    // **CORRECCIÓN:** Filtrar también los ingresos por la fecha seleccionada.
    let ingresosParaArqueo = estado.movimientosTemporales.filter(m => m.fecha.split('T')[0] === fechaArqueo);

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
    cargarHistorialMovimientosDia(); // Actualizar el historial visual
}

function cargarHistorialMovimientosDia() {
    const contenedor = document.getElementById('historialMovimientosDia');
    if (!contenedor) return;

    const fechaInput = document.getElementById('fecha');
    const cajaInput = document.getElementById('caja');
    if (!fechaInput || !cajaInput) return;

    const fechaFiltro = fechaInput.value.split('T')[0];
    const cajaFiltro = cajaInput.value;

    // Obtener movimientos
    const ingresos = estado.movimientosTemporales.filter(m =>
        m.fecha.startsWith(fechaFiltro) && (!cajaFiltro || m.caja === cajaFiltro)
    ).map(m => ({ ...m, tipoMovimiento: 'ingreso' }));

    const egresosCaja = estado.egresosCaja.filter(e =>
        e.fecha.startsWith(fechaFiltro) && (!cajaFiltro || e.caja === cajaFiltro)
    ).map(e => ({ ...e, tipoMovimiento: 'egreso' }));

    const egresosOperaciones = estado.movimientos.filter(m =>
        m.fecha.startsWith(fechaFiltro) &&
        (m.tipo === 'gasto' || m.tipo === 'egreso') &&
        (!cajaFiltro || m.caja === cajaFiltro)
    ).map(m => ({ ...m, tipoMovimiento: 'egreso' }));

    const todosLosMovimientos = [...ingresos, ...egresosCaja, ...egresosOperaciones]
        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    contenedor.innerHTML = '<h3>Historial de Movimientos</h3>';

    if (todosLosMovimientos.length === 0) {
        contenedor.innerHTML += '<p class="text-center" style="color: var(--color-secundario);">No hay movimientos registrados para este día y caja.</p>';
        return;
    }

    todosLosMovimientos.forEach(mov => {
        const esIngreso = mov.tipoMovimiento === 'ingreso';
        const colorMonto = esIngreso ? 'var(--color-exito)' : 'var(--color-peligro)';
        const signo = esIngreso ? '+' : '-';

        // Calcular monto total para mostrar
        let montoMostrar = 0;
        if (mov.monto) {
            montoMostrar = mov.monto;
        } else if (mov.valorVenta > 0) {
            montoMostrar = mov.valorVenta;
        } else {
            // Calcular total para ingresos complejos (mismo cálculo que en renderizarIngresosAgregados)
            let totalEfectivo = 0;
            if (mov.efectivo) {
                for (const denom in mov.efectivo) totalEfectivo += mov.efectivo[denom] * parseInt(denom);
            }
            if (mov.monedasExtranjeras) {
                for (const moneda in mov.monedasExtranjeras) totalEfectivo += mov.monedasExtranjeras[moneda].cantidad * mov.monedasExtranjeras[moneda].cotizacion;
            }
            let totalServicios = 0;
            if (mov.servicios) {
                for (const servicio in mov.servicios) totalServicios += mov.servicios[servicio].monto + mov.servicios[servicio].tarjeta;
            }
            if (mov.otrosServicios) {
                mov.otrosServicios.forEach(s => totalServicios += s.monto + s.tarjeta);
            }
            montoMostrar = totalEfectivo + (mov.pagosTarjeta || 0) + (mov.ventasCredito || 0) + (mov.pedidosYa || 0) + (mov.ventasTransferencia || 0) + totalServicios;
        }

        const div = document.createElement('div');
        div.className = 'movimiento-item';
        div.innerHTML = `
            <div class="movimiento-header">
                <span class="movimiento-tipo">${mov.descripcion || 'Movimiento'}</span>
                <span class="movimiento-monto" style="color: ${colorMonto};">${signo}${formatearMoneda(montoMostrar, 'gs')}</span>
            </div>
            <div class="movimiento-detalles">
                <small>${formatearFecha(mov.fecha)} - ${mov.caja || 'Sin caja'}</small>
            </div>
        `;
        contenedor.appendChild(div);
    });
}
// Guardar arqueo
function guardarArqueo() {
    if (estado.movimientosTemporales.length === 0) {
        mostrarMensaje('No hay movimientos para guardar en el arqueo.', 'peligro');
        return;
    }

    const arqueo = {
        fecha: document.getElementById('fecha').value,
        cajero: document.getElementById('cajero').value,
        caja: document.getElementById('caja').value,
        fondoFijo: parsearMoneda(document.getElementById('fondoFijo').value),
        // Los siguientes campos se llenarán con los datos ya calculados para la vista
        reales: {
            cantidad: 0, monto: 0
        },
        pesos: {
            cantidad: 0, monto: 0
        },
        dolares: {
            cantidad: 0, monto: 0
        },
        id: generarId(),
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

    // **REFACTORIZADO:** Usar los totales ya calculados para la vista en pantalla.
    const fechaArqueo = arqueo.fecha.split('T')[0];
    const cajaFiltro = arqueo.caja;

    const ingresosParaArqueo = estado.movimientosTemporales.filter(m => m.caja === cajaFiltro);
    const egresosDeCaja = estado.egresosCaja.filter(e => e.fecha.startsWith(fechaArqueo) && e.caja === cajaFiltro);
    const egresosDeOperaciones = estado.movimientos.filter(m => m.fecha.startsWith(fechaArqueo) && (m.tipo === 'gasto' || m.tipo === 'egreso') && m.caja === cajaFiltro);
    const todosLosEgresos = [...egresosDeCaja, ...egresosDeOperaciones];

    const movimientosParaArqueo = [
        ...ingresosParaArqueo.map(m => ({ ...m, tipoMovimiento: 'ingreso' })),
        ...todosLosEgresos.map(e => ({ ...e, tipoMovimiento: 'egreso' }))
    ];

    const totales = calcularTotalesArqueo(movimientosParaArqueo);

    // Poblar el objeto 'arqueo' con los datos correctos y consistentes
    arqueo.efectivo = {};
    for (const denom in totales.efectivo) {
        if (totales.efectivo[denom].neto > 0) {
            arqueo.efectivo[denom] = totales.efectivo[denom].neto;
        }
    }
    arqueo.monedasExtranjeras = totales.monedasExtranjeras;
    arqueo.pagosTarjeta = totales.pagosTarjeta;
    arqueo.ventasCredito = totales.ventasCredito;
    arqueo.pedidosYa = totales.pedidosYa;
    arqueo.ventasTransferencia = totales.ventasTransferencia;
    arqueo.servicios = totales.servicios;

    // Calcular totales para el objeto guardado (esto es para la data cruda)
    const totalEfectivoBruto = Object.entries(arqueo.efectivo).reduce((sum, [denom, cant]) => sum + (parseInt(denom) * cant), 0) + totales.monedasExtranjeras.usd.montoGs + totales.monedasExtranjeras.brl.montoGs + totales.monedasExtranjeras.ars.montoGs;
    arqueo.totalEfectivo = totalEfectivoBruto;

    const totalServicios = Object.values(totales.servicios).flat().reduce((sum, s) => sum + (s.monto || 0) + (s.tarjeta || 0), 0);
    arqueo.totalServicios = totalServicios;

    // El total de ingresos es la suma de todo lo que entró
    arqueo.totalIngresos = totalEfectivoBruto + totales.pagosTarjeta + totales.ventasCredito + totales.pedidosYa + totales.ventasTransferencia + totalServicios;

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

    // **MODIFICADO:** Exportar el PDF con los datos consistentes de la pantalla
    exportarArqueoActualPDF(true); // true indica que es un guardado final

    // Limpiar formulario
    limpiarMovimientos();

    cargarHistorialMovimientosDia();
}

// Funciones de Modal
function abrirModal(contenidoId, titulo) {
    // Asegurarse de que el contenido del modal de efectivo esté generado
    if (contenidoId === 'contenido-efectivo') {
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

    // **CORRECCIÓN DEFINITIVA:** Obtener el campo receptor y su valor de forma segura.
    const receptorInput = document.getElementById('receptorGasto');
    const receptorValue = (receptorInput && receptorInput.style.display !== 'none') ? receptorInput.value : '';

    if (idEditar) {
        // Modo Edición
        const movimientoIndex = estado.movimientos.findIndex(m => m.id === idEditar);
        if (movimientoIndex > -1) {
            // **CORRECCIÓN:** Primero, registrar la edición.
            if (!registrarEdicion(estado.movimientos[movimientoIndex])) {
                return;
            }
            // Luego, actualizar los datos.
            estado.movimientos[movimientoIndex].fecha = document.getElementById('fechaGasto').value;
            estado.movimientos[movimientoIndex].tipo = document.getElementById('tipoGasto').value;
            estado.movimientos[movimientoIndex].receptor = receptorValue;
            estado.movimientos[movimientoIndex].descripcion = document.getElementById('descripcionGasto').value;
            estado.movimientos[movimientoIndex].monto = parsearMoneda(document.getElementById('montoGasto').value);
            estado.movimientos[movimientoIndex].moneda = document.getElementById('monedaGasto').value;
            estado.movimientos[movimientoIndex].caja = document.getElementById('cajaGasto').value;
            estado.movimientos[movimientoIndex].referencia = document.getElementById('referenciaGasto').value;

            // **CORRECCIÓN FINAL:** Usar el objeto ya actualizado para la impresión.
            const movimientoActualizado = estado.movimientos[movimientoIndex]; // Este objeto ya tiene todos los datos.
            if (movimientoActualizado.tipo === 'egreso' || movimientoActualizado.tipo === 'operacion') {
                imprimirReciboGasto(movimientoActualizado);
            }
        }
        mostrarMensaje('Movimiento actualizado con éxito.', 'exito');
    } else {
        // Modo Creación
        const tipoGasto = document.getElementById('tipoGasto').value;
        let numeroRecibo = null;

        if (tipoGasto === 'egreso' || tipoGasto === 'operacion') {
            estado.ultimoNumeroRecibo++; // Incrementar el número de recibo solo para estos tipos
            numeroRecibo = estado.ultimoNumeroRecibo;
        }

        const gasto = {
            id: generarId(),
            fecha: document.getElementById('fechaGasto').value,
            tipo: tipoGasto,
            historialEdiciones: [], // Inicializar historial
            receptor: receptorValue,
            descripcion: document.getElementById('descripcionGasto').value,
            numeroRecibo: numeroRecibo,
            monto: parsearMoneda(document.getElementById('montoGasto').value),
            moneda: document.getElementById('monedaGasto').value,
            // **CORREGIDO:** Asegurar que la caja de Tesorería se asigne si el campo está vacío.
            caja: document.getElementById('cajaGasto').value || (sessionStorage.getItem('userRole') === 'tesoreria' ? 'Caja Tesoreria' : ''),
            referencia: document.getElementById('referenciaGasto').value
        };
        estado.movimientos.push(gasto);
        if (gasto.tipo === 'egreso' || gasto.tipo === 'operacion') {
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
    // **CORRECCIÓN:** Solo ejecutar si estamos en la página de operaciones/gastos.
    const listaGastos = document.getElementById('listaGastos');
    if (!listaGastos) return;

    const fechaFiltroInput = document.getElementById('fechaFiltroGastos');
    const tipoFiltroSelect = document.getElementById('tipoFiltroGastos');
    const cajaFiltroInput = document.getElementById('filtroCajaGastos');
    const tituloHistorial = document.querySelector('#gastos .historial-gastos h3');

    const fechaFiltro = fechaFiltroInput ? fechaFiltroInput.value : '';
    const tipoFiltro = tipoFiltroSelect ? tipoFiltroSelect.value : '';
    const cajaFiltro = cajaFiltroInput ? cajaFiltroInput.value : '';

    // Actualizar el título del historial
    if (tituloHistorial) {
        if (tipoFiltro && tipoFiltroSelect) {
            const textoSeleccionado = tipoFiltroSelect.options[tipoFiltroSelect.selectedIndex].text;
            tituloHistorial.textContent = `Historial de ${textoSeleccionado}`;
        } else {
            tituloHistorial.textContent = 'Historial de Movimientos';
        }
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

    // **NUEVO:** Lógica de filtrado por caja y rol, copiada de la sección de Egresos.
    const userRole = sessionStorage.getItem('userRole');
    if (userRole === 'cajero') {
        const cajaAsignada = sessionStorage.getItem('cajaSeleccionada');
        movimientosFiltrados = movimientosFiltrados.filter(m => m.caja === cajaAsignada);
    } else if (userRole === 'tesoreria') {
        // Tesorería solo ve los movimientos de su propia caja.
        movimientosFiltrados = movimientosFiltrados.filter(m => m.caja === 'Caja Tesoreria');
    } else if (userRole === 'admin') {
        // El admin puede filtrar por cualquier caja usando el selector.
        if (cajaFiltro) {
            movimientosFiltrados = movimientosFiltrados.filter(m => m.caja === cajaFiltro);
        }
    }


    // Ordenar por fecha descendente
    movimientosFiltrados.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    const lista = listaGastos; // Ya lo obtuvimos antes
    if (lista) lista.innerHTML = '';

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
                    ${movimiento.numeroRecibo ? `<button class="btn-accion reimprimir" onclick="reimprimirRecibo('${movimiento.id}')">Reimprimir</button>` : ''}
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

    // **CORRECCIÓN:** Formatear el monto al cargar para edición.
    const montoInput = document.getElementById('montoGasto');
    montoInput.value = new Intl.NumberFormat('es-PY').format(movimiento.monto);

    document.querySelector('#formularioGastos button[type="submit"]').textContent = 'Actualizar Movimiento';
    toggleReceptorField(); // Asegurarse de que el campo se muestre si es necesario
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

// ============================================
// GESTIÓN DE EGRESOS DE CAJA
// ============================================

/**
 * Guarda un egreso de caja en localStorage
 */
function guardarEgresoCaja(event) {
    event.preventDefault();

    const idEditar = document.getElementById('idEgresoCajaEditar').value;
    const esEdicion = idEditar !== '';

    // Obtener datos del formulario
    const fecha = document.getElementById('fechaEgresoCaja').value;
    const caja = document.getElementById('cajaEgreso').value;
    const categoria = document.getElementById('categoriaEgresoCaja').value;
    const descripcion = document.getElementById('descripcionEgresoCaja').value;
    const monto = parsearMoneda(document.getElementById('montoEgresoCaja').value);
    const referencia = document.getElementById('referenciaEgresoCaja').value;
    const cajero = sessionStorage.getItem('usuarioActual');

    // Validaciones
    if (!fecha || !caja || !categoria || !descripcion) {
        mostrarMensaje('Por favor, complete todos los campos obligatorios.', 'peligro');
        return;
    }

    if (monto <= 0) {
        mostrarMensaje('Debe registrar los billetes del egreso.', 'peligro');
        return;
    }

    // Obtener desglose de billetes
    const efectivo = {};
    document.querySelectorAll('#tablaDenominacionesEgresoCaja .cantidad-denominacion-egreso').forEach(input => {
        const denominacion = input.dataset.denominacion;
        const cantidad = parseInt(input.value) || 0;
        if (cantidad > 0) {
            efectivo[denominacion] = cantidad;
        }
    });

    // Crear objeto de egreso
    const egreso = {
        id: esEdicion ? idEditar : generarId(),
        fecha: fecha,
        caja: caja,
        cajero: cajero,
        categoria: categoria,
        descripcion: descripcion,
        monto: monto,
        referencia: referencia,
        efectivo: efectivo
    };

    if (esEdicion) {
        // Actualizar egreso existente
        const index = estado.egresosCaja.findIndex(e => e.id === idEditar);
        if (index !== -1) {
            estado.egresosCaja[index] = egreso;
            mostrarMensaje('Egreso actualizado con éxito.', 'exito');
        }
    } else {
        // Agregar nuevo egreso
        estado.egresosCaja.push(egreso);
        mostrarMensaje('Egreso guardado con éxito.', 'exito');
    }

    // Guardar en localStorage
    localStorage.setItem('egresosCaja', JSON.stringify(estado.egresosCaja));

    // Limpiar formulario y actualizar historial
    limpiarFormularioEgresoCaja();
    cargarHistorialEgresosCaja();
}

/**
 * Carga y muestra el historial de egresos de caja
 */
function cargarHistorialEgresosCaja() {
    const listaEgresosCaja = document.getElementById('listaEgresosCaja');
    if (!listaEgresosCaja) return;

    // Obtener egresos desde localStorage
    let todosLosEgresos = JSON.parse(localStorage.getItem('egresosCaja')) || [];
    let egresosFiltrados = todosLosEgresos;

    // Obtener filtros
    const fechaFiltro = document.getElementById('fechaFiltroEgresos')?.value;
    const cajaFiltro = document.getElementById('filtroCajaEgresos')?.value;

    // --- LÓGICA DE FILTRADO REVISADA ---
    const userRole = sessionStorage.getItem('userRole');

    if (userRole === 'cajero') {
        const cajaAsignada = sessionStorage.getItem('cajaSeleccionada');
        egresosFiltrados = egresosFiltrados.filter(e => e.caja === cajaAsignada);
    } else if (userRole === 'tesoreria') {
        egresosFiltrados = egresosFiltrados.filter(e => e.caja === 'Caja Tesoreria');
    } else if (userRole === 'admin') {
        // Para el admin, el filtro del <select> es el que manda.
        if (cajaFiltro) {
            egresosFiltrados = egresosFiltrados.filter(e => e.caja === cajaFiltro);
        }
    }

    if (fechaFiltro) {
        egresosFiltrados = egresosFiltrados.filter(e => e.fecha.startsWith(fechaFiltro));
    }

    // Ordenar por fecha descendente
    egresosFiltrados.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    // Limpiar lista
    listaEgresosCaja.innerHTML = '';

    if (egresosFiltrados.length === 0) {
        listaEgresosCaja.innerHTML = '<p class="text-center" style="color: var(--color-secundario);">No hay egresos registrados.</p>';
        return;
    }

    // Renderizar egresos
    egresosFiltrados.forEach(egreso => {
        const div = document.createElement('div');
        div.className = 'movimiento-item';

        div.innerHTML = `
            <div class="movimiento-header">
                <span class="movimiento-tipo">${egreso.categoria.toUpperCase()}</span>
                <span class="movimiento-monto negativo">${formatearMoneda(egreso.monto, 'gs')}</span>
            </div>
            <div class="movimiento-detalles">
                <div>
                    <p><strong>Descripción:</strong> ${egreso.descripcion}</p>
                    <small>${formatearFecha(egreso.fecha)}</small><br>
                    <small><strong>Cajero:</strong> ${egreso.cajero || 'N/A'} | <strong>Caja:</strong> ${egreso.caja}</small>
                    ${egreso.referencia ? `<br><small><strong>Referencia:</strong> ${egreso.referencia}</small>` : ''}
                </div>
                <div>
                    <button class="btn-accion editar" onclick="iniciarEdicionEgresoCaja('${egreso.id}')">Editar</button>
                    <button class="btn-accion eliminar" onclick="eliminarEgresoCaja('${egreso.id}')">Eliminar</button>
                </div>
            </div>
        `;

        listaEgresosCaja.appendChild(div);
    });
}

/**
 * Inicia la edición de un egreso de caja
 */
function iniciarEdicionEgresoCaja(id) {
    const egreso = estado.egresosCaja.find(e => e.id === id);
    if (!egreso) return;

    // Cargar datos en el formulario
    document.getElementById('idEgresoCajaEditar').value = egreso.id;
    document.getElementById('fechaEgresoCaja').value = egreso.fecha;
    document.getElementById('cajaEgreso').value = egreso.caja;
    document.getElementById('categoriaEgresoCaja').value = egreso.categoria;
    document.getElementById('descripcionEgresoCaja').value = egreso.descripcion;
    document.getElementById('referenciaEgresoCaja').value = egreso.referencia || '';

    // Cargar desglose de billetes
    document.querySelectorAll('#tablaDenominacionesEgresoCaja .cantidad-denominacion-egreso').forEach(input => {
        const denominacion = input.dataset.denominacion;
        input.value = egreso.efectivo[denominacion] || 0;
    });

    // Recalcular total
    calcularTotalEgresoCaja();

    // Cambiar texto del botón
    document.querySelector('#formularioEgresoCaja button[type="submit"]').textContent = 'Actualizar Egreso';

    // Scroll al formulario
    document.getElementById('formularioEgresoCaja').scrollIntoView({ behavior: 'smooth' });
    mostrarMensaje('Editando egreso. Realice los cambios y presione "Actualizar Egreso".', 'info');
}

/**
 * Elimina un egreso de caja
 */
function eliminarEgresoCaja(id) {
    if (confirm('¿Está seguro de que desea eliminar este egreso?')) {
        estado.egresosCaja = estado.egresosCaja.filter(e => e.id !== id);
        localStorage.setItem('egresosCaja', JSON.stringify(estado.egresosCaja));
        cargarHistorialEgresosCaja();
        mostrarMensaje('Egreso eliminado.', 'info');
    }
}

/**
 * Limpia el formulario de egresos de caja
 */
function limpiarFormularioEgresoCaja() {
    // **CORRECCIÓN:** Guardar la caja seleccionada antes de resetear
    const cajaSeleccionada = document.getElementById('cajaEgreso').value;

    document.getElementById('formularioEgresoCaja').reset();

    // **CORRECCIÓN:** Restaurar la caja seleccionada
    if (cajaSeleccionada) {
        document.getElementById('cajaEgreso').value = cajaSeleccionada;
    }

    document.getElementById('idEgresoCajaEditar').value = '';
    document.getElementById('montoEgresoCaja').value = '0';

    // Limpiar tabla de denominaciones
    document.querySelectorAll('#tablaDenominacionesEgresoCaja .cantidad-denominacion-egreso').forEach(input => {
        input.value = '0';
    });
    document.querySelectorAll('#tablaDenominacionesEgresoCaja .monto-parcial-egreso').forEach(celda => {
        celda.textContent = '0';
    });

    // Resetear display del total
    const totalDisplay = document.getElementById('totalEgresoCajaDisplay');
    if (totalDisplay) {
        totalDisplay.textContent = formatearMoneda(0, 'gs');
    }

    // Cambiar texto del botón
    document.querySelector('#formularioEgresoCaja button[type="submit"]').textContent = 'Guardar Egreso';

    // Establecer fecha actual
    document.getElementById('fechaEgresoCaja').value = obtenerFechaHoraLocalISO();
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
    const fechaDesdeInput = document.getElementById('fechaResumenDesde');
    if (!fechaDesdeInput) return;

    const fechaDesde = fechaDesdeInput.value;
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

document.addEventListener('DOMContentLoaded', function () {
    // Función para verificar autenticación y configurar la UI básica.
    function setupPage() {
        const usuarioActual = sessionStorage.getItem('usuarioActual');
        const userRole = sessionStorage.getItem('userRole');

        if (!usuarioActual || !userRole) {
            if (!window.location.pathname.endsWith('login.html')) {
                window.location.href = 'login.html';
            }
            return false; // Detener si no está autenticado
        }

        document.getElementById('nombreUsuarioNav').textContent = `Usuario: ${usuarioActual} (${userRole})`;
        const cajaSeleccionada = sessionStorage.getItem('cajaSeleccionada');
        configurarVistaPorRol(userRole, cajaSeleccionada, usuarioActual);
        return true; // Continuar si está autenticado
    }

    // Función para inicializar los campos de fecha y hora en la página actual.
    function initializeDateTimeFields() {
        const fields = {
            'formularioMovimiento': 'fechaMovimiento', // index.html
            'formularioEgresoCaja': 'fechaEgresoCaja', // egresosCaja.html
            'formularioGastos': 'fechaGasto',       // operaciones.html
            'controlesArqueo': 'fecha'             // arqueo.html
        };

        for (const formId in fields) {
            if (document.getElementById(formId)) {
                const dateFieldId = fields[formId];
                const dateField = document.getElementById(dateFieldId);
                if (dateField) {
                    if (dateField.type === 'date') {
                        dateField.value = obtenerFechaHoraLocalISO().split('T')[0];
                    } else {
                        dateField.value = obtenerFechaHoraLocalISO();
                    }
                }
            }
        }
    }

    // Ejecución principal al cargar el DOM
    if (!setupPage()) {
        return; // Si la configuración falla (no autenticado), no continuar.
    }

    // **CORRECCIÓN:** Inicializar la gestión de usuarios si estamos en la página correcta.
    // Esto soluciona el error en la línea 2259.
    if (window.location.pathname.includes('usuarios.html')) {
        inicializarGestionUsuarios();
    }

    initializeDateTimeFields();

    // El resto de tu lógica de inicialización específica de la página...
    // (Esta parte se ha simplificado, ya que la inicialización de fechas ya está hecha)
    if (document.getElementById('formularioMovimiento')) {
        inicializarModalEfectivo();
        const filtroFechaIngresos = document.getElementById('filtroFechaIngresos');
        if (filtroFechaIngresos) {
            filtroFechaIngresos.value = obtenerFechaHoraLocalISO().split('T')[0];
        }
        renderizarIngresosAgregados();
        // **NUEVO:** Inicializar la nueva sección de servicios en efectivo
        inicializarSeccionServiciosEfectivo();
    }
    if (document.getElementById('formularioEgresoCaja')) {
        inicializarFormularioArqueo();
        document.getElementById('formularioEgresoCaja').addEventListener('submit', guardarEgresoCaja);
        const fechaFiltroEgresos = document.getElementById('fechaFiltroEgresos');
        if (fechaFiltroEgresos) {
            fechaFiltroEgresos.value = obtenerFechaHoraLocalISO().split('T')[0];
        }
        cargarHistorialEgresosCaja();
    }
    if (document.getElementById('formularioGastos')) {
        document.getElementById('formularioGastos').addEventListener('submit', guardarGasto);
        document.getElementById('tipoGasto').addEventListener('change', toggleReceptorField);

        // **NUEVO:** Aplicar formato de separador de miles al campo de monto.
        const montoGastoInput = document.getElementById('montoGasto');
        aplicarFormatoMiles(montoGastoInput);

        // **CORRECCIÓN:** Verificar que el elemento de filtro de fecha exista antes de asignarle un valor.
        const fechaFiltroGastos = document.getElementById('fechaFiltroGastos');
        if (fechaFiltroGastos) {
            fechaFiltroGastos.value = obtenerFechaHoraLocalISO().split('T')[0];
        }

        cargarHistorialGastos();
    }
    if (document.getElementById('controlesArqueo')) {
        inicializarFormularioArqueo();
        document.getElementById('caja').addEventListener('change', actualizarArqueoFinal);
        document.getElementById('fecha').addEventListener('change', actualizarArqueoFinal); // **CORRECCIÓN:** Añadir listener para la fecha.
        document.getElementById('fondoFijo').addEventListener('input', actualizarArqueoFinal);
        actualizarArqueoFinal();
        // **NUEVO:** Asegurar que la fecha y hora se establezcan al cargar la página de arqueo.
        const fechaArqueoInput = document.getElementById('fecha');
        if (fechaArqueoInput) fechaArqueoInput.value = obtenerFechaHoraLocalISO();

    }
    // ... y así sucesivamente para las otras páginas.
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
    if (receptorContainer) { // **CORRECCIÓN:** Solo ejecutar si el contenedor existe
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
function exportarArqueoActualPDF(esGuardadoFinal = false) {
    const fechaArqueo = document.getElementById('fecha').value.split('T')[0];
    // **CORRECCIÓN:** Usar el filtro de la página de arqueo, no de ingresos.
    const cajaFiltro = document.getElementById('caja').value;

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

    // **NUEVO:** Recalcular los totales del resumen final para pasarlos al PDF
    let totalServiciosEfectivo = 0;
    ['apLote', 'aquiPago', 'expressLote', 'wepa', 'pasajeNsa', 'encomiendaNsa', 'apostala'].forEach(key => {
        if (totales.servicios[key]) totalServiciosEfectivo += totales.servicios[key].monto;
    });
    for (const nombre in totales.servicios.otros) {
        totalServiciosEfectivo += totales.servicios.otros[nombre].monto;
    }

    const egresosDeCajaFiltrados = estado.egresosCaja.filter(e => e.fecha.startsWith(fechaArqueo) && e.caja === cajaFiltro);
    const egresosDeOperacionesFiltrados = estado.movimientos.filter(m => m.fecha.startsWith(fechaArqueo) && (m.tipo === 'gasto' || m.tipo === 'egreso') && m.caja === cajaFiltro);
    const totalEgresosCaja = egresosDeCajaFiltrados.reduce((sum, e) => sum + e.monto, 0) + egresosDeOperacionesFiltrados.reduce((sum, m) => sum + m.monto, 0);

    const totalNeto = (totales.totalIngresosTienda + totalServiciosEfectivo) - totalEgresosCaja;


    // Aplanar la estructura de efectivo para el PDF (usar solo el neto)
    const efectivoPlano = {};
    for (const denom in totales.efectivo) {
        efectivoPlano[denom] = totales.efectivo[denom].neto;
    }

    // Construir un objeto 'arqueo' temporal para la función de exportación
    const arqueoTemporal = {
        fecha: document.getElementById('fecha').value,
        cajero: document.getElementById('cajero').value,
        caja: document.getElementById('caja').value,
        fondoFijo: parsearMoneda(document.getElementById('fondoFijo').value),
        efectivo: efectivoPlano,
        monedasExtranjeras: totales.monedasExtranjeras,
        pagosTarjeta: totales.pagosTarjeta,
        ventasCredito: totales.ventasCredito,
        pedidosYa: totales.pedidosYa,
        ventasTransferencia: totales.ventasTransferencia,
        servicios: totales.servicios,
        // No necesitamos otrosServicios aquí porque ya están agregados en totales.servicios.otros

        // **NUEVO:** Pasar los datos del resumen final al PDF
        resumen: {
            totalIngresosTienda: totales.totalIngresosTienda,
            totalEfectivoServicios: totalServiciosEfectivo,
            totalEgresosCaja: totalEgresosCaja,
            totalNeto: totalNeto
        }
    };

    exportarArqueoPDF(arqueoTemporal, esGuardadoFinal);
}

// **NUEVA FUNCIÓN PRINCIPAL PARA GENERAR EL PDF**
function exportarArqueoPDF(arqueo, esGuardadoFinal = false) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const titulo = esGuardadoFinal ? 'Arqueo de Caja Guardado' : 'Vista Previa de Arqueo';

    doc.setFontSize(18);
    doc.text('Detalle de Arqueo de Caja', 14, 22);

    doc.setFontSize(11);
    doc.text(`Fecha y Hora: ${formatearFecha(arqueo.fecha)}`, 14, 32);
    doc.text(`Cajero: ${arqueo.cajero || 'N/A'}`, 14, 38);
    doc.text(`Caja: ${arqueo.caja || 'N/A'}`, 14, 44);

    let finalY = 50;

    // --- Tabla de Efectivo ---
    const efectivoBody = [];
    let totalEfectivoBruto = 0; // Este es el total de la existencia neta en efectivo
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
            if (data.cantidad > 0) { // data.montoGs ya está calculado
                totalEfectivoBruto += data.montoGs || 0;
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
        theme: 'plain',
        body: [
            ['Total Efectivo Bruto (Existencia):', formatearMoneda(totalEfectivoBruto, 'gs')],
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

    // --- Resumen Final del Arqueo (idéntico a la pantalla) ---
    doc.setFontSize(14);
    doc.text('Resumen Final del Arqueo', 14, finalY + 10);
    finalY += 12;

    doc.autoTable({
        startY: finalY,
        theme: 'plain',
        body: [
            ['Total Ingresos Tienda:', formatearMoneda(arqueo.resumen.totalIngresosTienda, 'gs')],
            ['Total Efectivo Servicios:', formatearMoneda(arqueo.resumen.totalEfectivoServicios, 'gs')],
            ['- Total Egresos de Caja:', formatearMoneda(arqueo.resumen.totalEgresosCaja, 'gs')],
            ['Total Neto del Arqueo:', formatearMoneda(arqueo.resumen.totalNeto, 'gs')]
        ],
        theme: 'plain',
        styles: { fontStyle: 'bold' },
        didDrawPage: (data) => { finalY = data.cursor.y; }
    });

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

// ============================================
// GESTIÓN DE USUARIOS
// ============================================

/**
 * Inicializa la gestión de usuarios en la página usuarios.html
 */
function inicializarGestionUsuarios() {
    // Validar que solo administradores puedan acceder
    validarAccesoAdmin();

    // Configurar el event listener para el formulario
    const formularioUsuario = document.getElementById('formularioUsuario');
    if (formularioUsuario) {
        formularioUsuario.addEventListener('submit', agregarUsuario);
    }

    // Renderizar la lista inicial de usuarios
    renderizarListaUsuarios();
}

/**
 * Valida que el usuario actual sea administrador
 * Si no lo es, muestra un mensaje y podría redirigir
 */
function validarAccesoAdmin() {
    const userRole = sessionStorage.getItem('userRole');

    if (userRole !== 'admin') {
        mostrarMensaje('Acceso denegado. Solo los administradores pueden gestionar usuarios.', 'peligro');
        // Opcional: redirigir a la página principal después de 2 segundos
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
        return false;
    }
    return true;
}

/**
 * Maneja el envío del formulario para agregar un nuevo usuario
 */
function agregarUsuario(event) {
    event.preventDefault();

    // Validar acceso de administrador
    if (!validarAccesoAdmin()) {
        return;
    }

    // Obtener valores del formulario
    const username = document.getElementById('nuevoUsuarioNombre').value.trim();
    const password = document.getElementById('nuevoUsuarioPassword').value;
    const rol = document.getElementById('nuevoUsuarioRol').value;

    // Validaciones
    if (!username || !password || !rol) {
        mostrarMensaje('Por favor, complete todos los campos.', 'peligro');
        return;
    }

    if (username.length < 3) {
        mostrarMensaje('El nombre de usuario debe tener al menos 3 caracteres.', 'peligro');
        return;
    }

    if (password.length < 3) {
        mostrarMensaje('La contraseña debe tener al menos 3 caracteres.', 'peligro');
        return;
    }

    // Obtener usuarios existentes
    let usuarios = JSON.parse(localStorage.getItem('usuarios')) || [];

    // Verificar que el usuario no exista
    const usuarioExistente = usuarios.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (usuarioExistente) {
        mostrarMensaje('Ya existe un usuario con ese nombre.', 'peligro');
        return;
    }

    // Crear el nuevo usuario
    const nuevoUsuario = {
        username: username,
        password: password,
        rol: rol
    };

    // Agregar al array de usuarios
    usuarios.push(nuevoUsuario);

    // Guardar en localStorage
    localStorage.setItem('usuarios', JSON.stringify(usuarios));

    // Limpiar el formulario
    document.getElementById('formularioUsuario').reset();

    // Actualizar la lista de usuarios
    renderizarListaUsuarios();

    // Mostrar mensaje de éxito
    mostrarMensaje(`Usuario "${username}" agregado exitosamente con rol de ${rol}.`, 'exito');
}

/**
 * Renderiza la lista de usuarios existentes
 */
function renderizarListaUsuarios() {
    const listaUsuarios = document.getElementById('listaUsuarios');
    if (!listaUsuarios) return;

    // Obtener usuarios desde localStorage
    const usuarios = JSON.parse(localStorage.getItem('usuarios')) || [];

    // Obtener el usuario actual para evitar que se elimine a sí mismo
    const usuarioActual = sessionStorage.getItem('usuarioActual');
    const userRole = sessionStorage.getItem('userRole');

    // Limpiar la lista
    listaUsuarios.innerHTML = '';

    if (usuarios.length === 0) {
        listaUsuarios.innerHTML = '<p class="text-center" style="color: var(--color-secundario);">No hay usuarios registrados.</p>';
        return;
    }

    // Generar HTML para cada usuario
    usuarios.forEach(usuario => {
        const div = document.createElement('div');
        div.className = 'movimiento-item';

        // Determinar el ícono según el rol
        let iconoRol = '👤';
        let nombreRol = usuario.rol;
        if (usuario.rol === 'admin') {
            iconoRol = '👑';
            nombreRol = 'Administrador';
        } else if (usuario.rol === 'cajero') {
            iconoRol = '💰';
            nombreRol = 'Cajero';
        } else if (usuario.rol === 'tesoreria') {
            iconoRol = '🏦';
            nombreRol = 'Tesorería';
        }

        // Determinar si se puede eliminar este usuario
        const puedeEliminar = userRole === 'admin' && usuario.username !== usuarioActual;

        // Indicador si es el usuario actual
        const esUsuarioActual = usuario.username === usuarioActual;
        const badgeActual = esUsuarioActual ? '<span style="background-color: var(--color-exito); color: white; padding: 2px 8px; border-radius: 4px; font-size: 0.8em; margin-left: 8px;">Sesión Activa</span>' : '';

        div.innerHTML = `
            <div class="movimiento-header">
                <span class="movimiento-tipo">
                    ${iconoRol} ${usuario.username.toUpperCase()}${badgeActual}
                </span>
                <span class="movimiento-monto" style="background-color: var(--color-info); color: white; padding: 4px 12px; border-radius: 4px;">
                    ${nombreRol}
                </span>
            </div>
            <div class="movimiento-detalles" style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <small><strong>Usuario:</strong> ${usuario.username}</small><br>
                    <small><strong>Rol:</strong> ${nombreRol}</small>
                </div>
                <div>
                    ${puedeEliminar ? `<button class="btn-accion eliminar" onclick="eliminarUsuario('${usuario.username}')">Eliminar</button>` : ''}
                    ${esUsuarioActual ? '<small style="color: var(--color-secundario);">No puedes eliminar tu propia cuenta</small>' : ''}
                </div>
            </div>
        `;

        listaUsuarios.appendChild(div);
    });
}

// ============================================
// INICIALIZACIÓN AUTOMÁTICA
// ============================================

function guardarEnLocalStorage() {
    localStorage.setItem('arqueos', JSON.stringify(estado.arqueos));
    localStorage.setItem('movimientos', JSON.stringify(estado.movimientos));
    localStorage.setItem('egresosCaja', JSON.stringify(estado.egresosCaja));
    localStorage.setItem('movimientosTemporales', JSON.stringify(estado.movimientosTemporales));
    localStorage.setItem('ultimoNumeroRecibo', JSON.stringify(estado.ultimoNumeroRecibo));
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

// =================================================================================
// INICIO: LÓGICA PARA LA SECCIÓN DE REGISTRO EFECTIVO POR SERVICIOS
// =================================================================================

const servicioEfectivoSelect = document.getElementById('servicioEfectivoSelect');
const montoServicioEfectivoInput = document.getElementById('montoServicioEfectivo');
const montoRecibidoServicioInput = document.getElementById('montoRecibidoServicio');
const vueltoCalculadoServicioDisplay = document.getElementById('vueltoCalculadoServicio');

function inicializarSeccionServiciosEfectivo() {
    if (!servicioEfectivoSelect) return;

    // 1. Poblar el select de servicios
    SERVICIOS_PAGOS.forEach(s => servicioEfectivoSelect.add(new Option(s, s)));
    // **NUEVO:** Agregar opción "Otro..."
    servicioEfectivoSelect.add(new Option("Otro...", "Otro..."));

    // 2. Añadir listeners para formateo y cálculo de vuelto
    [montoServicioEfectivoInput, montoRecibidoServicioInput].forEach(input => {
        if (input) {
            aplicarFormatoMiles(input);
            input.addEventListener('input', calcularVueltoServicio);
        }
    });

    // **NUEVO:** Listener para mostrar/ocultar campo de otro servicio
    servicioEfectivoSelect.addEventListener('change', function () {
        const inputOtro = document.getElementById('nombreServicioOtro');
        if (this.value === 'Otro...') {
            inputOtro.style.display = 'block';
            inputOtro.required = true;
            inputOtro.focus();
        } else {
            inputOtro.style.display = 'none';
            inputOtro.required = false;
            inputOtro.value = '';
        }
    });
}

function calcularVueltoServicio() {
    if (!montoServicioEfectivoInput || !montoRecibidoServicioInput || !vueltoCalculadoServicioDisplay) return;
    const montoTotal = parsearMoneda(montoServicioEfectivoInput.value);
    const montoRecibido = parsearMoneda(montoRecibidoServicioInput.value);
    const vuelto = (montoRecibido > montoTotal) ? montoRecibido - montoTotal : 0;

    vueltoCalculadoServicioDisplay.textContent = formatearMoneda(vuelto, 'gs');
}

function abrirModalServicioEfectivo() {
    const servicio = servicioEfectivoSelect.value;
    const montoTotal = parsearMoneda(montoServicioEfectivoInput.value);
    const montoRecibido = parsearMoneda(montoRecibidoServicioInput.value);

    if (!servicio) {
        mostrarMensaje('Por favor, seleccione un servicio.', 'peligro');
        return;
    }

    // **NUEVO:** Validar nombre de servicio personalizado
    if (servicio === 'Otro...') {
        const nombreOtro = document.getElementById('nombreServicioOtro').value.trim();
        if (!nombreOtro) {
            mostrarMensaje('Por favor, ingrese el nombre del servicio.', 'peligro');
            return;
        }
    }

    if (montoTotal <= 0) {
        mostrarMensaje('El "Monto del Servicio" debe ser mayor a cero.', 'peligro');
        return;
    }
    if (montoRecibido < montoTotal) {
        mostrarMensaje('El "Monto Recibido" debe ser igual o mayor al monto del servicio.', 'peligro');
        return;
    }

    const vuelto = montoRecibido - montoTotal;

    // Llenar el modal con los datos del formulario principal
    document.getElementById('totalServicioModal').value = formatearMoneda(montoTotal, 'gs');
    document.getElementById('montoRecibidoModal').value = formatearMoneda(montoRecibido, 'gs');
    document.getElementById('vueltoCalculadoModal').textContent = formatearMoneda(vuelto, 'gs');

    // Generar la tabla para el desglose de billetes recibidos
    const tablaBody = document.getElementById('tablaServicioRecibido');
    tablaBody.innerHTML = '';
    CONFIG.denominaciones.forEach(denom => {
        tablaBody.innerHTML += `
            <tr>
                <td>${denom.nombre}</td>
                <td><input type="number" class="cantidad-servicio-recibido" data-denominacion="${denom.valor}" min="0" value="0"></td>
                <td class="monto-servicio-recibido" data-denominacion="${denom.valor}">0</td>
            </tr>
        `;
    });

    // Añadir listener a la nueva tabla del modal
    tablaBody.addEventListener('input', (e) => {
        if (e.target.classList.contains('cantidad-servicio-recibido')) {
            const input = e.target;
            const monto = (parseInt(input.value) || 0) * parseInt(input.dataset.denominacion);
            input.closest('tr').querySelector('.monto-servicio-recibido').textContent = formatearMoneda(monto, 'gs');
            calcularTotalServicioRecibido();
        }
    });

    // **NUEVO:** Gestionar la sección de registro de vuelto
    const seccionVuelto = document.getElementById('registroVueltoServicioSeccion');
    if (vuelto > 0) {
        seccionVuelto.style.display = 'block';
        const tablaVueltoBody = document.getElementById('tablaVueltoServicio');
        tablaVueltoBody.innerHTML = '';
        CONFIG.denominaciones.forEach(denom => {
            tablaVueltoBody.innerHTML += `
                <tr>
                    <td>${denom.nombre}</td>
                    <td><input type="number" class="cantidad-vuelto-servicio" data-denominacion="${denom.valor}" min="0" value="0"></td>
                    <td class="monto-vuelto-servicio" data-denominacion="${denom.valor}">0</td>
                </tr>
            `;
        });

        tablaVueltoBody.addEventListener('input', (e) => {
            if (e.target.classList.contains('cantidad-vuelto-servicio')) {
                const input = e.target;
                const monto = (parseInt(input.value) || 0) * parseInt(input.dataset.denominacion);
                input.closest('tr').querySelector('.monto-vuelto-servicio').textContent = formatearMoneda(monto, 'gs');
                calcularTotalVueltoServicioRegistrado();
            }
        });
        calcularTotalVueltoServicioRegistrado(); // Inicializar en G$ 0

    } else {
        seccionVuelto.style.display = 'none';
        document.getElementById('tablaVueltoServicio').innerHTML = '';
    }

    // Abrir el modal
    abrirModal('contenido-servicio-efectivo', `Registrar Billetes para: ${servicio}`);
    calcularTotalServicioRecibido(); // Para inicializar el total en G$ 0
}

function calcularTotalServicioRecibido() {
    let total = 0;
    document.querySelectorAll('#tablaServicioRecibido .cantidad-servicio-recibido').forEach(input => {
        total += (parseInt(input.value) || 0) * parseInt(input.dataset.denominacion);
    });

    const displayTotal = document.getElementById('totalServicioRecibidoDisplay');
    const montoRecibido = parsearMoneda(document.getElementById('montoRecibidoModal').value);
    displayTotal.textContent = formatearMoneda(total, 'gs');
    displayTotal.style.color = (total === montoRecibido) ? 'var(--color-exito)' : 'var(--color-peligro)';
}

function calcularTotalVueltoServicioRegistrado() {
    let total = 0;
    document.querySelectorAll('#tablaVueltoServicio .cantidad-vuelto-servicio').forEach(input => {
        total += (parseInt(input.value) || 0) * parseInt(input.dataset.denominacion);
    });

    const displayTotal = document.getElementById('totalVueltoServicioVerificacion');
    const vueltoCalculado = parsearMoneda(document.getElementById('vueltoCalculadoModal').textContent);

    displayTotal.textContent = `Total Vuelto Registrado: ${formatearMoneda(total, 'gs')}`;
    displayTotal.style.color = (total === vueltoCalculado) ? 'var(--color-exito)' : 'var(--color-peligro)';
}

function guardarServicioEfectivo() {
    let servicioSeleccionado = servicioEfectivoSelect.value;

    const montoServicio = parsearMoneda(document.getElementById('totalServicioModal').value);
    const montoRecibido = parsearMoneda(document.getElementById('montoRecibidoModal').value);
    const vuelto = montoRecibido - montoServicio;

    // Validar que el desglose de billetes coincida con el monto recibido
    let totalDesgloseRecibido = 0;
    const desgloseEfectivo = {};
    document.querySelectorAll('#tablaServicioRecibido .cantidad-servicio-recibido').forEach(input => {
        const cantidad = parseInt(input.value) || 0;
        if (cantidad > 0) {
            const denominacion = input.dataset.denominacion;
            desgloseEfectivo[denominacion] = cantidad;
            totalDesgloseRecibido += cantidad * parseInt(denominacion);
        }
    });

    if (totalDesgloseRecibido !== montoRecibido) {
        mostrarMensaje('El desglose de billetes no coincide con el monto recibido del cliente. Por favor, verifique.', 'peligro');
        return;
    }

    // **NUEVO:** Validar que el desglose del vuelto coincida con el vuelto calculado
    let totalDesgloseVuelto = 0;
    const desgloseVuelto = {};
    if (vuelto > 0) {
        document.querySelectorAll('#tablaVueltoServicio .cantidad-vuelto-servicio').forEach(input => {
            const cantidad = parseInt(input.value) || 0;
            if (cantidad > 0) {
                const denominacion = input.dataset.denominacion;
                desgloseVuelto[denominacion] = cantidad;
                totalDesgloseVuelto += cantidad * parseInt(denominacion);
            }
        });

        if (totalDesgloseVuelto !== vuelto) {
            mostrarMensaje('El desglose de billetes del vuelto no coincide con el monto de vuelto a entregar. Por favor, verifique.', 'peligro');
            return;
        }
    }

    // Mapeo de nombres de servicios a claves internas
    const mapaServicios = {
        "AP Lote": "apLote",
        "Aqui Pago": "aquiPago",
        "Express Lote": "expressLote",
        "Wepa": "wepa",
        "Pasaje NSA": "pasajeNsa",
        "Encomienda NSA": "encomiendaNsa",
        "Apostala": "apostala"
    };

    const servicios = {};
    const otrosServicios = [];

    const keyServicio = mapaServicios[servicioSeleccionado];
    if (keyServicio) {
        servicios[keyServicio] = {
            lote: null, // No hay campo de lote en este formulario por ahora
            monto: montoServicio, // Monto en efectivo
            tarjeta: 0
        };
    } else {
        otrosServicios.push({
            nombre: servicioSeleccionado,
            lote: null,
            monto: montoServicio,
            tarjeta: 0
        });
    }

    // Crear el objeto de movimiento
    const nuevoMovimiento = {
        id: generarId(),
        fecha: obtenerFechaHoraLocalISO(),
        caja: sessionStorage.getItem('cajaSeleccionada') || (sessionStorage.getItem('userRole') === 'tesoreria' ? 'Caja Tesoreria' : 'Caja 1'),
        descripcion: `Ingreso por servicio: ${servicioSeleccionado}`,
        valorVenta: montoServicio,
        efectivo: desgloseEfectivo,
        // **NUEVO:** Guardar el desglose del vuelto
        efectivoVuelto: desgloseVuelto,
        historialEdiciones: [],
        monedasExtranjeras: {},
        pagosTarjeta: 0,
        ventasCredito: 0,
        pedidosYa: 0,
        ventasTransferencia: 0,
        servicios: servicios,
        otrosServicios: otrosServicios
    };

    estado.movimientosTemporales.push(nuevoMovimiento);
    guardarEnLocalStorage();
    renderizarIngresosAgregados();
    actualizarArqueoFinal();

    mostrarMensaje(`Ingreso por "${servicioSeleccionado}" guardado.`, 'exito');

    cerrarModal();
    limpiarFormularioServicioEfectivo();
}

function limpiarFormularioServicioEfectivo() {
    if (!servicioEfectivoSelect) return;
    servicioEfectivoSelect.value = "";
    montoServicioEfectivoInput.value = "";
    montoRecibidoServicioInput.value = "";



    calcularVueltoServicio();
    servicioEfectivoSelect.focus();
}

// =================================================================================
// FIN: LÓGICA PARA LA SECCIÓN DE REGISTRO EFECTIVO POR SERVICIOS
// =================================================================================

// =================================================================================
// FIN: LÓGICA PARA LA SECCIÓN DE REGISTRO EFECTIVO POR SERVICIOS
// =================================================================================

// Asegurar que la función cerrarSesion sea globalmente accesible
window.cerrarSesion = cerrarSesion;
// ... (código existente)

document.addEventListener('DOMContentLoaded', () => {
    // ... (código existente)

    // Referencias a elementos del DOM para Registro Efectivo de Servicio
    const servicioEfectivoSelect = document.getElementById('servicioEfectivoSelect');
    const montoServicioEfectivoInput = document.getElementById('montoServicioEfectivo');
    const montoRecibidoServicioInput = document.getElementById('montoRecibidoServicio');

    const vueltoCalculadoServicio = document.getElementById('vueltoCalculadoServicio');

    // Poblar el selector de servicios
    cargarServicios();

    // Calcular vuelto automáticamente
    const calcularVueltoServicio = () => {
        const montoServicio = parsearMoneda(montoServicioEfectivoInput.value);
        const montoRecibido = parsearMoneda(montoRecibidoServicioInput.value);
        const vuelto = montoRecibido - montoServicio;

        if (vuelto < 0) {
            vueltoCalculadoServicio.textContent = "Falta dinero";
            vueltoCalculadoServicio.style.color = "var(--color-peligro)";
        } else {
            vueltoCalculadoServicio.textContent = formatearMoneda(vuelto, 'gs');
            vueltoCalculadoServicio.style.color = "var(--color-exito)";
        }
    };

    if (montoServicioEfectivoInput && montoRecibidoServicioInput) {
        // Aplicar formato de miles (la función ya añade el listener)
        aplicarFormatoMiles(montoServicioEfectivoInput);
        aplicarFormatoMiles(montoRecibidoServicioInput);

        // Calcular vuelto al cambiar los valores
        montoServicioEfectivoInput.addEventListener('input', calcularVueltoServicio);
        montoRecibidoServicioInput.addEventListener('input', calcularVueltoServicio);
    }

    // Exponer funciones al scope global si es necesario para los onclick del HTML
    window.abrirModalServicioEfectivo = function () {
        const servicio = servicioEfectivoSelect.value;
        const montoTotal = parsearMoneda(montoServicioEfectivoInput.value);
        const montoRecibido = parsearMoneda(montoRecibidoServicioInput.value);

        if (!servicio) {
            mostrarMensaje('Por favor, seleccione un servicio.', 'peligro');
            return;
        }



        if (montoTotal <= 0) {
            mostrarMensaje('El "Monto del Servicio" debe ser mayor a cero.', 'peligro');
            return;
        }
        if (montoRecibido < montoTotal) {
            mostrarMensaje('El "Monto Recibido" debe ser igual o mayor al monto del servicio.', 'peligro');
            return;
        }

        const vuelto = montoRecibido - montoTotal;

        // Llenar el modal con los datos del formulario principal
        document.getElementById('totalServicioModal').value = formatearMoneda(montoTotal, 'gs');
        document.getElementById('montoRecibidoModal').value = formatearMoneda(montoRecibido, 'gs');
        document.getElementById('vueltoCalculadoModal').textContent = formatearMoneda(vuelto, 'gs');

        // Generar la tabla para el desglose de billetes recibidos
        const tablaBody = document.getElementById('tablaServicioRecibido');
        tablaBody.innerHTML = '';
        CONFIG.denominaciones.forEach(denom => {
            tablaBody.innerHTML += `
                <tr>
                    <td>${denom.nombre}</td>
                    <td><input type="number" class="cantidad-servicio-recibido" data-denominacion="${denom.valor}" min="0" value="0"></td>
                    <td class="monto-servicio-recibido" data-denominacion="${denom.valor}">0</td>
                </tr>
            `;
        });

        // Añadir listener a la nueva tabla del modal
        tablaBody.addEventListener('input', (e) => {
            if (e.target.classList.contains('cantidad-servicio-recibido')) {
                const input = e.target;
                const monto = (parseInt(input.value) || 0) * parseInt(input.dataset.denominacion);
                input.closest('tr').querySelector('.monto-servicio-recibido').textContent = formatearMoneda(monto, 'gs');
                calcularTotalServicioRecibido();
            }
        });

        // Gestionar la sección de registro de vuelto
        const seccionVuelto = document.getElementById('registroVueltoServicioSeccion');
        if (vuelto > 0) {
            seccionVuelto.style.display = 'block';
            const tablaVueltoBody = document.getElementById('tablaVueltoServicio');
            tablaVueltoBody.innerHTML = '';
            CONFIG.denominaciones.forEach(denom => {
                tablaVueltoBody.innerHTML += `
                    <tr>
                        <td>${denom.nombre}</td>
                        <td><input type="number" class="cantidad-vuelto-servicio" data-denominacion="${denom.valor}" min="0" value="0"></td>
                        <td class="monto-vuelto-servicio" data-denominacion="${denom.valor}">0</td>
                    </tr>
                `;
            });

            tablaVueltoBody.addEventListener('input', (e) => {
                if (e.target.classList.contains('cantidad-vuelto-servicio')) {
                    const input = e.target;
                    const monto = (parseInt(input.value) || 0) * parseInt(input.dataset.denominacion);
                    input.closest('tr').querySelector('.monto-vuelto-servicio').textContent = formatearMoneda(monto, 'gs');
                    calcularTotalVueltoServicioRegistrado();
                }
            });
            calcularTotalVueltoServicioRegistrado(); // Inicializar en G$ 0

        } else {
            seccionVuelto.style.display = 'none';
            document.getElementById('tablaVueltoServicio').innerHTML = '';
        }

        // Abrir el modal
        abrirModal('contenido-servicio-efectivo', `Registrar Billetes para: ${servicio}`);
        calcularTotalServicioRecibido(); // Para inicializar el total en G$ 0
    };

    window.limpiarFormularioServicioEfectivo = function () {
        if (!servicioEfectivoSelect) return;
        servicioEfectivoSelect.value = "";
        montoServicioEfectivoInput.value = "";
        montoRecibidoServicioInput.value = "";

        calcularVueltoServicio();
        servicioEfectivoSelect.focus();
    };

    // ... (resto del código existente)
});
