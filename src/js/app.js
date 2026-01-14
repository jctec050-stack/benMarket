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

// Información del perfil del usuario actual
let usuarioPerfil = null;

// Función para verificar sesión al cargar
window.addEventListener('load', async () => {
    // Verificar que supabase esté inicializado
    if (window.inicializarSupabase) {
        window.inicializarSupabase();
    }

    // Esperar a que db esté disponible
    if (!window.db) {
        console.error('db no está disponible, esperando...');
        // Esperar hasta 5 segundos a que db esté disponible
        for (let i = 0; i < 50; i++) {
            if (window.db) break;
            await new Promise(r => setTimeout(r, 100));
        }
    }

    if (!window.db) {
        console.error('db no se pudo inicializar');
        window.location.href = '/pages/login.html';
        return;
    }

    const sesion = await window.db.obtenerSesionActual();

    if (!sesion.success || !sesion.data.session) {
        // No hay sesión, redirigir al login
        window.location.href = '/pages/login.html';
        return;
    }

    // Obtener perfil para verificar permisos
    const perfil = await window.db.obtenerPerfilActual();
    if (perfil.success) {
        usuarioPerfil = perfil.data;
        console.log('Usuario:', perfil.data.username, 'Rol:', perfil.data.rol);
    } else {
        // Error obteniendo perfil, redirigir
        window.location.href = '/pages/login.html';
    }
});

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
            showNotification('Este servicio ya existe en la lista', 'warning');
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

        showNotification(`Servicio "${nombreServicio}" agregado correctamente`, 'success');
    }
};



// Estado de la aplicación
let estado = {
    arqueos: [],
    movimientos: [],
    egresosCaja: [],
    movimientosTemporales: [],
    ultimoNumeroRecibo: JSON.parse(localStorage.getItem('ultimoNumeroRecibo')) || 0,
    fondoFijoPorCaja: JSON.parse(localStorage.getItem('fondoFijoPorCaja')) || {} // **NUEVO:** Almacenar fondo fijo por caja
};


// Función para mostrar/ocultar secciones desplegables
window.toggleSeccion = function (seccionId) {
    const contenido = document.getElementById(seccionId);
    const iconoId = seccionId.replace('contenido', 'icono');
    const icono = document.getElementById(iconoId);

    if (contenido && icono) {
        const estaVisible = contenido.style.display !== 'none';
        contenido.style.display = estaVisible ? 'none' : 'block';
        icono.textContent = estaVisible ? '▶' : '▼';
    }
};

async function initSupabaseData() {
    // Obtener la fecha: buscar en múltiples elementos posibles
    let fechaInput = document.getElementById('fecha') ||
        document.getElementById('fechaEgresoCaja') ||
        document.getElementById('fechaGasto') ||
        document.getElementById('fechaMovimiento');

    // Si aún no hay fecha, usar la fecha actual
    let fechaBase;
    if (fechaInput && fechaInput.value) {
        fechaBase = fechaInput.value.split('T')[0];
    } else {
        fechaBase = new Date().toISOString().slice(0, 10);
    }

    const rol = sessionStorage.getItem('userRole');
    const caja = rol === 'tesoreria' ? 'Caja Tesoreria' : (sessionStorage.getItem('cajaSeleccionada') || '');

    // **CORRECCIÓN:** Cargar TODOS los datos de Supabase (sin filtro de fecha)
    const a = await window.db.obtenerArqueosPorFecha(fechaBase);

    // Obtener TODOS los movimientos, no solo de hoy
    const m = await (window.db.obtenerMovimientos ?
        window.db.obtenerMovimientos() :
        window.db.obtenerMovimientosPorFecha(fechaBase));

    // Obtener TODOS los egresos, no solo de hoy
    const e = await (window.db.obtenerEgresosCaja ?
        window.db.obtenerEgresosCaja() :
        window.db.obtenerEgresosCajaPorFecha(fechaBase));

    const t = await (window.db.obtenerMovimientosTemporales ?
        window.db.obtenerMovimientosTemporales() :
        { data: [] });

    // --- LÓGICA DE SINCRONIZACIÓN (NETWORK FIRST) ---
    // 1. Arqueos
    if (a && a.success) {
        estado.arqueos = a.data || [];
        // Actualizar caché
        localStorage.setItem('arqueos', JSON.stringify(estado.arqueos));
    } else {
        // Fallback offline
        console.warn('Offline: Cargando Arqueos desde caché local.');
        estado.arqueos = JSON.parse(localStorage.getItem('arqueos')) || [];
    }

    // 2. Movimientos (Operaciones)
    if (m && m.success) {
        estado.movimientos = m.data || [];
        localStorage.setItem('movimientos', JSON.stringify(estado.movimientos));
    } else {
        console.warn('Offline: Cargando Movimientos desde caché local.');
        estado.movimientos = JSON.parse(localStorage.getItem('movimientos')) || [];
    }

    // 3. Egresos de Caja
    if (e && e.success) {
        estado.egresosCaja = e.data || [];
        localStorage.setItem('egresosCaja', JSON.stringify(estado.egresosCaja));
    } else {
        console.warn('Offline: Cargando Egresos de Caja desde caché local.');
        estado.egresosCaja = JSON.parse(localStorage.getItem('egresosCaja')) || [];
    }

    // 4. Movimientos Temporales (Ingresos pendientes)
    if (t && t.success) {
        estado.movimientosTemporales = t.data || [];
        localStorage.setItem('movimientosTemporales', JSON.stringify(estado.movimientosTemporales));
    } else {
        console.warn('Offline: Cargando Movimientos Temporales desde caché local.');
        estado.movimientosTemporales = JSON.parse(localStorage.getItem('movimientosTemporales')) || [];
    }

    // **NUEVO:** Cargar fondoFijoPorCaja desde localStorage
    if (!estado.fondoFijoPorCaja || Object.keys(estado.fondoFijoPorCaja).length === 0) {
        const fondoFijo = JSON.parse(localStorage.getItem('fondoFijoPorCaja')) || {};
        estado.fondoFijoPorCaja = fondoFijo;
        console.log('Fondo fijo cargado desde localStorage:', fondoFijo);
    }

    actualizarArqueoFinal();
    cargarHistorialMovimientosDia();
    console.log('[DEBUG initSupabaseData] A punto de llamar cargarHistorialEgresosCaja...');
    cargarHistorialEgresosCaja();
    console.log('[DEBUG initSupabaseData] Después de llamar cargarHistorialEgresosCaja');
    cargarHistorialGastos();
    renderizarIngresosAgregados();

    // **NUEVO:** Inicializar fechas del resumen con el día actual si están vacías
    const fechaResumenDesde = document.getElementById('fechaResumenDesde');
    const fechaResumenHasta = document.getElementById('fechaResumenHasta');
    if (fechaResumenDesde && fechaResumenHasta) {
        const hoy = new Date().toISOString().slice(0, 10);
        if (!fechaResumenDesde.value) fechaResumenDesde.value = hoy;
        if (!fechaResumenHasta.value) fechaResumenHasta.value = hoy;
    }

    cargarResumenDiario();
}

window.initSupabaseData = initSupabaseData;

// Funciones de utilidad
function formatearMoneda(monto, moneda = 'gs') {
    // Asegurar que monto es un número válido
    const montoNumerico = typeof monto === 'number' ? monto : (parseFloat(monto) || 0);
    if (isNaN(montoNumerico)) {
        return new Intl.NumberFormat('es-PY', {
            style: 'currency',
            currency: moneda === 'gs' ? 'PYG' : moneda === 'usd' ? 'USD' : moneda === 'brl' ? 'BRL' : 'ARS',
            minimumFractionDigits: 0
        }).format(0);
    }
    return new Intl.NumberFormat('es-PY', {
        style: 'currency',
        currency: moneda === 'gs' ? 'PYG' : moneda === 'usd' ? 'USD' : moneda === 'brl' ? 'BRL' : 'ARS',
        minimumFractionDigits: 0
    }).format(montoNumerico);
}

function parsearMoneda(valor) {
    if (typeof valor === 'number') return valor;
    // Elimina puntos de miles y cualquier otro caracter no numérico EXCEPTO el signo menos
    const negativo = String(valor).includes('-');
    const numero = parseInt(String(valor).replace(/\D/g, ''), 10) || 0;
    return negativo ? -numero : numero;
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
        // Obtener fecha y hora en formato ISO y convertir al formato datetime-local (sin segundos)
        const fechaHoraISO = obtenerFechaHoraLocalISO();
        const fechaHoraLocal = fechaHoraISO.substring(0, 16); // yyyy-MM-ddThh:mm
        fechaArqueoInput.value = fechaHoraLocal;
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

    // **NUEVO:** Agregar listeners para recargar el historial cuando cambie la fecha o la caja
    if (fechaArqueoInput) {
        fechaArqueoInput.addEventListener('change', function () {
            actualizarArqueoFinal();
            cargarHistorialMovimientosDia();
        });
    }

    const cajaArqueoInput = document.getElementById('caja');
    if (cajaArqueoInput) {
        cajaArqueoInput.addEventListener('change', function () {
            actualizarArqueoFinal();
            cargarHistorialMovimientosDia();
            cargarFondoFijoEnArqueo(); // **NUEVO:** Cargar fondo fijo al cambiar de caja
        });
    }
}

// ===== FUNCIONES PARA FONDO FIJO =====

/**
 * Inicializar tabla de denominaciones para Fondo Fijo
 */
function inicializarTablaFondoFijo() {
    const tabla = document.getElementById('tablaDenominacionesFondoFijo');
    if (!tabla) return;

    tabla.innerHTML = '';

    CONFIG.denominaciones.forEach(denom => {
        const fila = document.createElement('tr');
        fila.innerHTML = `
            <td>${denom.nombre}</td>
            <td><input type="number" class="cantidad-denominacion-fondo-fijo" data-denominacion="${denom.valor}" min="0" value="0"></td>
            <td class="monto-parcial-fondo-fijo" data-denominacion="${denom.valor}">G$ 0</td>
        `;
        tabla.appendChild(fila);
    });

    // Agregar listener para calcular total automáticamente
    tabla.addEventListener('input', function (e) {
        if (e.target.classList.contains('cantidad-denominacion-fondo-fijo')) {
            const input = e.target;
            const monto = (parseInt(input.value) || 0) * parseInt(input.dataset.denominacion);
            input.closest('tr').querySelector('.monto-parcial-fondo-fijo').textContent = formatearMoneda(monto, 'gs');
            calcularTotalFondoFijo();
        }
    });
}

/**
 * Calcular total del Fondo Fijo
 */
function calcularTotalFondoFijo() {
    let total = 0;
    document.querySelectorAll('.cantidad-denominacion-fondo-fijo').forEach(input => {
        const denominacion = parseInt(input.dataset.denominacion);
        const cantidad = parseInt(input.value) || 0;
        total += denominacion * cantidad;
    });

    const totalSpan = document.getElementById('totalFondoFijo');
    if (totalSpan) {
        totalSpan.textContent = formatearMoneda(total, 'gs');
    }

    return total;
}

/**
 * Guardar Fondo Fijo para la caja actual
 */
window.guardarFondoFijo = function () {
    // Obtener la caja actual
    const cajaActual = sessionStorage.getItem('cajaSeleccionada') || 'Caja 1';

    // Obtener el monto del campo de input
    const montoInput = document.getElementById('montoFondoFijo');
    if (!montoInput) {
        console.error('Campo montoFondoFijo no encontrado');
        return;
    }

    const total = parsearMoneda(montoInput.value);

    if (total === 0) {
        // Si el monto es 0, eliminar el fondo fijo de esta caja
        delete estado.fondoFijoPorCaja[cajaActual];
        guardarEnLocalStorage();
        console.log('Fondo Fijo eliminado para', cajaActual);
        return;
    }

    // Guardar en estado
    estado.fondoFijoPorCaja[cajaActual] = {
        monto: total,
        fecha: new Date().toISOString()
    };

    console.log('Fondo Fijo guardado:', cajaActual, total, estado.fondoFijoPorCaja);

    // Guardar en localStorage
    try {
        guardarEnLocalStorage();
        console.log('Fondo Fijo guardado en localStorage');
    } catch (error) {
        console.error('Error al guardar en localStorage:', error);
    }

    // Mostrar mensaje de confirmación
    mostrarMensaje(`Fondo Fijo de ${formatearMoneda(total, 'gs')} guardado para ${cajaActual}`, 'exito');
};

/**
 * Cargar Fondo Fijo en la página de Arqueo
 */
function cargarFondoFijoEnArqueo() {
    const fondoFijoInput = document.getElementById('fondoFijo');
    const cajaInput = document.getElementById('caja');

    if (!fondoFijoInput || !cajaInput) {
        console.log('cargarFondoFijoEnArqueo: elementos no encontrados', { fondoFijoInput, cajaInput });
        return;
    }

    const cajaSeleccionada = cajaInput.value;
    let totalFondoFijo = 0;

    if (cajaSeleccionada === 'Todas las cajas') {
        // Sumar el fondo fijo de todas las cajas disponibles
        Object.values(estado.fondoFijoPorCaja).forEach(caja => {
            if (caja && caja.monto) {
                totalFondoFijo += caja.monto;
            }
        });
        console.log('Fondo fijo total (Todas las cajas):', totalFondoFijo);
    } else {
        const fondoFijo = estado.fondoFijoPorCaja[cajaSeleccionada];
        if (fondoFijo && fondoFijo.monto) {
            totalFondoFijo = fondoFijo.monto;
        }
    }

    const montoFormateado = totalFondoFijo.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    fondoFijoInput.value = montoFormateado;

    // Recalcular arqueo con el nuevo fondo fijo
    if (typeof actualizarArqueoFinal === 'function') {
        actualizarArqueoFinal();
    }
}

function inicializarModalEfectivo() {
    const tablaMovimiento = document.getElementById('tablaDenominacionesMovimiento');
    if (!tablaMovimiento) return; // Safety check

    tablaMovimiento.innerHTML = '';

    CONFIG.denominaciones.forEach(denom => {
        // Fila para Ingresar Movimiento (editable)
        const filaMovimiento = document.createElement('tr');
        filaMovimiento.innerHTML = `
            <td>${denom.nombre}</td>
            <td><input type="number" class="cantidad-denominacion-movimiento" data-denominacion="${denom.valor}" min="0" value="0"></td>
            <td class="monto-parcial-movimiento" data-denominacion="${denom.valor}">0</td>
        `;
        tablaMovimiento.appendChild(filaMovimiento);
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
        tablaMovimiento.appendChild(filaMovimiento);
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
async function agregarMovimiento() {
    // **IMPORTANTE:** Primero capturamos TODOS los valores ANTES de limpiar cualquier campo
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

    // **DEBUG:** Verificar valores de servicios con efectivo ANTES de limpiar
    console.log('=== DEBUG SERVICIOS EFECTIVO ===');
    console.log('apLoteEfectivoMovimiento:', document.getElementById('apLoteEfectivoMovimiento')?.value);
    console.log('aquiPagoEfectivoMovimiento:', document.getElementById('aquiPagoEfectivoMovimiento')?.value);
    console.log('expressEfectivoMovimiento:', document.getElementById('expressEfectivoMovimiento')?.value);

    // Crear el objeto movimiento CON TODOS LOS VALORES CAPTURADOS
    const movimiento = {
        id: generarId(),
        fecha: document.getElementById('fechaMovimiento').value,
        cajero: sessionStorage.getItem('usuarioActual'),
        // **CORREGIDO:** Asegurar que la caja sea la correcta para cada rol.
        caja: sessionStorage.getItem('userRole') === 'tesoreria'
            ? 'Caja Tesoreria'
            : (sessionStorage.getItem('cajaSeleccionada') || 'Caja 1'),
        historialEdiciones: [], // Inicializamos el historial de ediciones
        arqueado: false, // **NUEVO:** Inicializar como no arqueado
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
        ventas_transferencia: obtenerValorParseado('ventasTransfMovimiento'), // CORREGIDO: Coincidir con nombre de columna
        servicios: {
            apLote: { lote: obtenerValorTexto('apLoteEfectivoMovimiento') || obtenerValorTexto('apLoteCantMovimiento'), monto: obtenerValorParseado('apLoteEfectivoMontoMovimiento') || 0, tarjeta: obtenerValorParseado('apLoteTarjetaMovimiento') || 0 },
            aquiPago: { lote: obtenerValorTexto('aquiPagoEfectivoMovimiento') || obtenerValorTexto('aquiPagoLoteMovimiento'), monto: obtenerValorParseado('aquiPagoEfectivoMontoMovimiento') || 0, tarjeta: obtenerValorParseado('aquiPagoTarjetaMovimiento') || 0 },
            expressLote: { lote: obtenerValorTexto('expressEfectivoMovimiento') || obtenerValorTexto('expressCantMovimiento'), monto: obtenerValorParseado('expressEfectivoMontoMovimiento') || 0, tarjeta: obtenerValorParseado('expressTarjetaMovimiento') || 0 },
            wepa: { lote: obtenerValorTexto('wepaEfectivoMovimiento') || obtenerValorTexto('wepaFechaMovimiento'), monto: obtenerValorParseado('wepaEfectivoMontoMovimiento') || 0, tarjeta: obtenerValorParseado('wepaTarjetaMovimiento') || 0 },
            pasajeNsa: { lote: obtenerValorTexto('pasajeNsaEfectivoMovimiento') || obtenerValorTexto('pasajeNsaLoteMovimiento'), monto: obtenerValorParseado('pasajeNsaEfectivoMontoMovimiento') || 0, tarjeta: obtenerValorParseado('pasajeNsaTarjetaMovimiento') || 0 },
            encomiendaNsa: { lote: obtenerValorTexto('encomiendaNsaEfectivoMovimiento') || obtenerValorTexto('encomiendaNsaLoteMovimiento'), monto: obtenerValorParseado('encomiendaNsaEfectivoMontoMovimiento') || 0, tarjeta: obtenerValorParseado('encomiendaNsaTarjetaMovimiento') || 0 },
            apostala: { lote: obtenerValorTexto('apostalaEfectivoMovimiento') || obtenerValorTexto('apostalaLoteMovimiento'), monto: obtenerValorParseado('apostalaEfectivoMontoMovimiento') || 0, tarjeta: obtenerValorParseado('apostalaTarjetaMovimiento') || 0 }
        },
        otrosServicios: []
    };

    console.log('=== SERVICIOS CAPTURADOS ===');
    console.log('apLote.lote:', movimiento.servicios.apLote.lote);
    console.log('aquiPago.lote:', movimiento.servicios.aquiPago.lote);

    // Capturar desglose de efectivo
    const inputsEfectivo = document.querySelectorAll('#tablaDenominacionesMovimiento .cantidad-denominacion-movimiento');
    inputsEfectivo.forEach(input => {
        const denominacion = input.dataset.denominacion;
        const cantidad = parseInt(input.value) || 0;
        if (cantidad > 0) {
            movimiento.efectivo[denominacion] = cantidad;
        }
    });

    // Capturar otros servicios dinámicos
    document.querySelectorAll('.fila-servicio-dinamico').forEach(fila => {
        const nombre = fila.querySelector('.nombre-servicio-dinamico').value;
        const lote = fila.querySelector('.lote-servicio-dinamico').value;
        const tarjeta = parsearMoneda(fila.querySelector('.tarjeta-servicio-dinamico').value);

        if (nombre && tarjeta > 0) {
            movimiento.otrosServicios.push({ nombre, lote, monto: 0, tarjeta });
        }
    });

    // **AHORA SÍ, DESPUÉS DE CAPTURAR TODO, podemos limpiar los campos que no se usaron**
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
    if (contenidoActivoId !== 'contenido-servicios-efectivo') {
        // Si no estamos guardando desde el modal de servicios con efectivo, limpiar sus campos.
        document.querySelectorAll('#tbodyServiciosEfectivoMovimiento input').forEach(input => {
            if (input.type === 'text') input.value = '';
            if (input.type === 'text' && input.value.startsWith('0')) input.value = '0';
        });
        if (typeof limpiarFilasServicioEfectivoDinamicos === 'function') {
            limpiarFilasServicioEfectivoDinamicos();
        }
    }

    if (esEdicion) {
        // **REFACTORIZADO:** Usar la nueva función auxiliar
        if (!await registrarEdicion(movimiento)) {
            return; // Si el usuario canceló, no continuar
        }
        const original = estado.movimientosTemporales[indiceEditar];

        // --- INICIO DE DEPURACIÓN ---
        console.log('>> DATOS A ENVIAR (EDICIÓN):', { ...original, ...movimiento });
        // --- FIN DE DEPURACIÓN ---
        const actualizado = { ...original, ...movimiento };
        await window.db.guardarMovimientoTemporal(actualizado);
        estado.movimientosTemporales[indiceEditar] = actualizado;
        mostrarMensaje('Movimiento actualizado con éxito.', 'exito');
    } else {
        await window.db.guardarMovimientoTemporal(movimiento);
        estado.movimientosTemporales.push(movimiento);
        mostrarMensaje('Movimiento agregado. ' + `Total: ${estado.movimientosTemporales.length}`, 'exito');
    }

    limpiarFormularioMovimiento();

    // Cerrar el modal si está abierto
    cerrarModal();

    // Actualizar el arqueo final
    actualizarArqueoFinal();
    renderizarIngresosAgregados();
    cargarResumenDiario(); // **NUEVO:** Actualizar resumen en tiempo real
    // **CORRECCIÓN:** Actualizar métricas después de agregar movimiento (ya se llama en renderizar)
}

// Función para agregar una fila de servicio dinámico (Tarjeta)
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

// **NUEVO:** Función para agregar una fila de servicio dinámico (Efectivo)
function agregarFilaServicioEfectivoDinamico() {
    const tbody = document.getElementById('tbodyServiciosEfectivoMovimiento');
    if (!tbody) {
        console.error('No se encontró tbodyServiciosEfectivoMovimiento');
        return;
    }
    const fila = document.createElement('tr');
    fila.className = 'fila-servicio-efectivo-dinamico'; // Clase diferenciada

    fila.innerHTML = `
        <td><input type="text" class="nombre-servicio-efectivo-dinamico" placeholder="Nombre del servicio"></td>
        <td><input type="text" class="lote-servicio-efectivo-dinamico" placeholder="Lote/Ref"></td>
        <td><input type="text" inputmode="numeric" class="efectivo-servicio-dinamico" value="0"></td>
    `;
    tbody.appendChild(fila);

    // Aplicar formato de miles a los nuevos campos
    const camposNuevos = fila.querySelectorAll('.efectivo-servicio-dinamico');
    camposNuevos.forEach(aplicarFormatoMiles);
}

// Limpiar filas de servicios dinámicos
function limpiarFilasServiciosDinamicos() {
    const filasDinamicas = document.querySelectorAll('.fila-servicio-dinamico');
    filasDinamicas.forEach(fila => fila.remove());

    // **NUEVO:** Limpiar también las filas dinámicas de efectivo
    const filasEfectivoDinamicas = document.querySelectorAll('.fila-servicio-efectivo-dinamico');
    filasEfectivoDinamicas.forEach(fila => fila.remove());
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

    // Limpiar campos de Servicios con Tarjeta
    const camposServiciosTarjeta = [
        'apLoteCantMovimiento',
        'aquiPagoLoteMovimiento',
        'expressCantMovimiento',
        'wepaFechaMovimiento',
        'pasajeNsaLoteMovimiento',
        'encomiendaNsaLoteMovimiento',
        'apostalaLoteMovimiento'
    ];
    camposServiciosTarjeta.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.value = '';
        }
    });

    // Limpiar campos de Servicios con Efectivo
    const camposServiciosEfectivo = [
        'apLoteEfectivoMovimiento', 'apLoteEfectivoMontoMovimiento',
        'aquiPagoEfectivoMovimiento', 'aquiPagoEfectivoMontoMovimiento',
        'expressEfectivoMovimiento', 'expressEfectivoMontoMovimiento',
        'wepaEfectivoMovimiento', 'wepaEfectivoMontoMovimiento',
        'pasajeNsaEfectivoMovimiento', 'pasajeNsaEfectivoMontoMovimiento',
        'encomiendaNsaEfectivoMovimiento', 'encomiendaNsaEfectivoMontoMovimiento',
        'apostalaEfectivoMovimiento', 'apostalaEfectivoMontoMovimiento'
    ];
    camposServiciosEfectivo.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.value = '';
        }
    });

    limpiarFilasServiciosDinamicos();
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
    if (cajaFiltro && cajaFiltro !== 'Todas las cajas') {
        movimientosFiltrados = movimientosFiltrados.filter(m => m.caja === cajaFiltro);
    }
    if (descFiltro) {
        movimientosFiltrados = movimientosFiltrados.filter(m => m.descripcion.toLowerCase().includes(descFiltro));
    }



    // **NUEVO:** Filtrar movimientos ya arqueados, EXCEPTO para admin y tesoreria
    const userRole = sessionStorage.getItem('userRole');

    if (userRole !== 'admin' && userRole !== 'tesoreria') {
        // 1. Ocultar Arqueados
        movimientosFiltrados = movimientosFiltrados.filter(m => !m.arqueado);

        // 2. Ocultar movimientos de OTROS usuarios (segregación por cajero)
        if (usuarioPerfil && usuarioPerfil.username) {
            const nombreUsuarioActual = usuarioPerfil.username;
            movimientosFiltrados = movimientosFiltrados.filter(m => m.cajero === nombreUsuarioActual);
        }
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
        // **NUEVA CORRECCIÓN:** Asegurar que todos los valores son números válidos
        let totalGeneral = 0;
        if ((mov.valorVenta || 0) > 0) {
            totalGeneral = mov.valorVenta;
        } else {
            totalGeneral = totalEfectivo +
                (typeof mov.pagosTarjeta === 'number' ? mov.pagosTarjeta : 0) +
                (typeof mov.ventasCredito === 'number' ? mov.ventasCredito : 0) +
                (typeof mov.pedidosYa === 'number' ? mov.pedidosYa : 0) +
                (typeof mov.ventasTransferencia === 'number' ? mov.ventasTransferencia : 0) +
                totalServicios;
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
        if ((mov.pagosTarjeta || 0) > 0) detallesHTML.push(`<p><span class="detalle-icono">💳</span><strong>Pago con Tarjeta:</strong> ${formatearMoneda(mov.pagosTarjeta, 'gs')}</p>`);
        if ((mov.ventasCredito || 0) > 0) detallesHTML.push(`<p><span class="detalle-icono">🧾</span><strong>Venta a Crédito:</strong> ${formatearMoneda(mov.ventasCredito, 'gs')}</p>`);
        if ((mov.pedidosYa || 0) > 0) detallesHTML.push(`<p><span class="detalle-icono">🛵</span><strong>PedidosYA:</strong> ${formatearMoneda(mov.pedidosYa, 'gs')}</p>`);
        if ((mov.ventasTransferencia || 0) > 0) detallesHTML.push(`<p><span class="detalle-icono">💻</span><strong>Venta por Transferencia:</strong> ${formatearMoneda(mov.ventasTransferencia, 'gs')}</p>`);

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
                <div class="movimiento-info">
                    <div class="movimiento-titulo">
                        <span class="movimiento-tipo">${mov.descripcion.toUpperCase() || 'MOVIMIENTO'}${edicionHTML}</span>
                        <span class="movimiento-monto positivo">${formatearMoneda(totalGeneral, 'gs')}</span>
                    </div>
                    <div class="movimiento-fecha-hora">
                        <small>${formatearFecha(mov.fecha)}</small>
                    </div>
                    <div class="movimiento-cajero-caja">
                        <small><strong>Cajero:</strong> ${mov.cajero || 'N/A'}</small>
                        <small><strong>Caja:</strong> ${mov.caja || 'N/A'}</small>
                    </div>
                    <div class="movimiento-acciones">
                        <button class="btn-accion editar" onclick="iniciarEdicionMovimiento(${originalIndex})">Editar</button>
                        <button class="btn-accion eliminar" onclick="eliminarIngresoAgregado(${originalIndex})">Eliminar</button>
                    </div>
                </div>
            </div>
            ${observacionEdicionHTML}
            
            <!-- **NUEVO:** Contenedor para los sub-detalles -->
            ${subDetallesHTML}
        `;
        lista.appendChild(div);
    });

    // **CORRECCIÓN:** Actualizar las métricas cuando se renderiza la lista de ingresos
    if (typeof window.actualizarMetricasIngresos === 'function') {
        window.actualizarMetricasIngresos();
    }
}

function iniciarEdicionMovimiento(index) {
    const movimiento = estado.movimientosTemporales[index];
    if (!movimiento) return;

    // Marcar que estamos editando
    document.getElementById('indiceMovimientoEditar').value = index;

    // Cargar datos generales
    // Convertir fecha al formato correcto para datetime-local (sin zona horaria)
    const fechaISO = movimiento.fecha.split('+')[0].split('Z')[0].substring(0, 16);
    document.getElementById('fechaMovimiento').value = fechaISO;
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

async function eliminarIngresoAgregado(index) {
    // **MEJORA UX:** Añadir confirmación antes de eliminar.
    const confirmed = await showConfirm('¿Está seguro de que desea eliminar este movimiento?', {
        title: 'Eliminar Movimiento',
        confirmText: 'Sí, eliminar',
        type: 'danger',
        confirmButtonType: 'danger'
    });

    if (confirmed) {
        const mov = estado.movimientosTemporales[index];
        if (mov && mov.id && window.db && window.db.eliminarMovimientoTemporal) {
            await window.db.eliminarMovimientoTemporal(mov.id);
        }
        estado.movimientosTemporales.splice(index, 1);
        actualizarArqueoFinal();
        renderizarIngresosAgregados();
        cargarResumenDiario(); // **NUEVO:** Actualizar resumen en tiempo real
        guardarEnLocalStorage();
        showNotification('Movimiento eliminado correctamente', 'success');
        // **CORRECCIÓN:** Actualizar métricas después de eliminar un ingreso (ya se llama en renderizar)

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
                const montoEfectivo = mov.efectivo ? Object.entries(mov.efectivo).reduce((sum, [denom, cant]) => sum + (parseInt(denom) * cant), 0) : 0;
                totales.totalIngresosTienda += mov.valorVenta > 0 ? mov.valorVenta : montoEfectivo;
            }
        }
        // Sumar/Restar efectivo por denominación
        // **DEBUG:** Log para verificar procesamiento de billetes
        console.log('Mov ID:', mov.id, 'Tipo:', mov.tipoMovimiento, 'Tiene efectivo:', !!mov.efectivo, 'Keys:', mov.efectivo ? Object.keys(mov.efectivo) : []);

        if (mov.efectivo && mov.tipoMovimiento === 'ingreso') {
            for (const [denominacion, cantidad] of Object.entries(mov.efectivo)) {
                if (!totales.efectivo[denominacion]) totales.efectivo[denominacion] = { ingreso: 0, egreso: 0, neto: 0 };

                // console.log(`  Procesando denom ${denominacion}: cantidad=${cantidad}, tipo=${mov.tipoMovimiento}`);

                totales.efectivo[denominacion].ingreso += cantidad;
                totales.efectivo[denominacion].neto += cantidad;
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
                if (mov.servicios[nombreServicio].monto !== 0 || mov.servicios[nombreServicio].tarjeta !== 0) {
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
        // **NUEVO:** Solo contar lo que entró (Existencia basada en ingresos)
        const cantidad = data ? data.ingreso : 0;

        if (cantidad === 0) return;

        const monto = cantidad * denom.valor;
        totalEfectivoFinal += monto;
        efectivoHTML += `<tr>
            <td>${denom.nombre}</td>
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
                <td style="text-align: center;">${cantidad.toFixed(2)}</td>
                <td>${formatearMoneda(montoGs, 'gs')}</td>
            </tr>`; // Adjusted colspan removed since we have 3 columns now
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

    // **NUEVO:** Filtrar arqueados para cajeros
    const userRole = sessionStorage.getItem('userRole');
    const mostrarTodo = userRole === 'admin' || userRole === 'tesoreria';

    const egresosDeCajaFiltrados = estado.egresosCaja.filter(e =>
        e.fecha.startsWith(document.getElementById('fecha').value.split('T')[0]) &&
        (cajaFiltro === 'Todas las cajas' || e.caja === cajaFiltro) &&
        (mostrarTodo || !e.arqueado) // Ocultar arqueados para cajeros
    );
    const egresosDeOperacionesFiltrados = estado.movimientos.filter(m =>
        m.fecha.startsWith(document.getElementById('fecha').value.split('T')[0]) &&
        (m.tipo === 'gasto' || m.tipo === 'egreso') &&
        (cajaFiltro === 'Todas las cajas' || m.caja === cajaFiltro)
    );

    const totalEgresosCaja = egresosDeCajaFiltrados.reduce((sum, e) => sum + e.monto, 0) +
        egresosDeOperacionesFiltrados.reduce((sum, m) => sum + m.monto, 0);

    // **NUEVO:** Total a declarar = Egresos (positivo) + (Total Efectivo Bruto + Fondo Fijo)
    const totalADeclarar = totalEgresosCaja + totalEfectivoBruto;

    // **NUEVO REQUERIMIENTO:** Total Ingresos Tienda = Total a declarar - Total efectivo servicios - Fondo Fijo
    const totalIngresosTiendaCalculado = totalADeclarar - totalIngresoEfectivo - fondoFijo;

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

    // **NUEVO:** Preparar HTML para la tabla de Egresos
    let egresosHTML = '';
    const todosLosEgresos = [...egresosDeCajaFiltrados, ...egresosDeOperacionesFiltrados];

    if (todosLosEgresos.length > 0) {
        todosLosEgresos.forEach(egreso => {
            const desc = egreso.descripcion || egreso.categoria || 'Egreso';
            egresosHTML += `<tr>
                <td>${desc}</td>
                <td>${formatearMoneda(egreso.monto, 'gs')}</td>
             </tr>`;
        });
    } else {
        egresosHTML = '<tr><td colspan="2">No hay egresos registrados.</td></tr>';
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
                <h5>Conteo de Efectivo (Ingresos)</h5>
                <table class="tabla-detalle">
                    <thead>
                        <tr>
                            <th>Denominación</th>
                            <th>Existencia</th>
                            <th>Monto (G$)</th>
                        </tr>
                    </thead>
                    <tbody>${efectivoHTML || '<tr><td colspan="3">No hay ingresos en efectivo.</td></tr>'}</tbody>
                </table>
                <div class="resumen-totales" style="margin-top: 1rem;">
                    <div class="total-item" style="color: var(--color-info);"><span>Total Efectivo Bruto + Fondo Fijo:</span><span>${formatearMoneda(totalEfectivoBruto, 'gs')}</span></div>
                    <div class="total-item negativo"><span>- Fondo Fijo:</span><span>${formatearMoneda(fondoFijo, 'gs')}</span></div>
                    <div class="total-item final"><strong>Total a Entregar (G$):</strong><strong>${formatearMoneda(totalEfectivoBruto - fondoFijo, 'gs')}</strong></div>
                    ${totalesMonedasHTML}
                </div>
            </div>

            <!-- Columna 2: Otros Ingresos, Servicios y Egresos -->
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
                    <tfoot>
                        <tr style="font-weight: bold; background-color: var(--color-fondo-secundario, #f3f4f6);">
                            <td colspan="2" style="text-align: right;">TOTALES:</td>
                            <td>${formatearMoneda(totalServiciosEfectivo, 'gs')}</td>
                            <td>${formatearMoneda(totalServiciosArqueo - totalServiciosEfectivo, 'gs')}</td>
                        </tr>
                    </tfoot>
                </table>

                <h5 style="margin-top: 2rem;">Detalle de Egresos</h5>
                <table class="tabla-detalle">
                    <thead><tr><th>Descripción</th><th>Monto (G$)</th></tr></thead>
                    <tbody>${egresosHTML}</tbody>
                    <tfoot>
                        <tr style="font-weight: bold; background-color: var(--color-fondo-secundario, #f3f4f6);">
                            <td style="text-align: right;">TOTAL EGRESOS:</td>
                            <td>${formatearMoneda(totalEgresosCaja, 'gs')}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>

        <!-- Resumen Final del Arqueo -->
        <div class="resumen-totales" style="margin-top: 2rem; border-top: 1px solid var(--color-borde); padding-top: 1rem;">
            <div class="total-item" style="color: var(--color-advertencia); font-weight: bold;"><span>Total a declarar en Sistema:</span><span>${formatearMoneda(totalADeclarar, 'gs')}</span></div>
            <div class="total-item positivo"><span>Total Ingresos Tienda:</span><span>${formatearMoneda(totalIngresosTiendaCalculado, 'gs')}</span></div>
        </div>
    `;
}

/**
 * Actualiza el indicador visual de caja en el header del arqueo
 */
function actualizarIndicadorCaja() {
    const cajaSelect = document.getElementById('caja');
    const indicador = document.getElementById('cajaActivaArqueo');

    if (cajaSelect && indicador) {
        indicador.textContent = cajaSelect.value;
    }
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
    const userRole = sessionStorage.getItem('userRole');
    const mostrarArqueados = userRole === 'admin' || userRole === 'tesoreria';

    // **NUEVO:** Segregación por usuario para no mezclar cajas de diferentes cajeros
    let usuarioActualNombre = null;
    if (!mostrarArqueados && usuarioPerfil && usuarioPerfil.username) {
        usuarioActualNombre = usuarioPerfil.username;
    }

    // 1. Obtener ingresos del día
    // **CORRECCIÓN:** Filtrar también los ingresos por la fecha seleccionada.
    // **NUEVO:** Excluir movimientos ya arqueados (Salvo Admins) y respetar filtro caja y USUARIO
    let ingresosParaArqueo = estado.movimientosTemporales.filter(m => {
        const coincideFecha = m.fecha.split('T')[0] === fechaArqueo;
        const coincideCaja = (!cajaFiltro || cajaFiltro === 'Todas las cajas' || m.caja === cajaFiltro);
        const visible = mostrarArqueados || !m.arqueado;
        // User check
        const coincideUsuario = !usuarioActualNombre || m.cajero === usuarioActualNombre;

        return coincideFecha && coincideCaja && visible && coincideUsuario;
    });

    // 2. Obtener egresos de la sección "Egresos"
    let egresosDeCaja = estado.egresosCaja.filter(e => {
        const coincideFecha = e.fecha.split('T')[0] === fechaArqueo;
        const coincideCaja = (!cajaFiltro || cajaFiltro === 'Todas las cajas' || e.caja === cajaFiltro);
        const visible = mostrarArqueados || !e.arqueado;
        // User check
        const coincideUsuario = !usuarioActualNombre || !e.cajero || e.cajero === usuarioActualNombre;
        return coincideFecha && coincideCaja && visible && coincideUsuario;
    });

    // **CORRECCIÓN:** 3. Obtener egresos de la sección "Operaciones" que afecten a la caja
    let egresosDeOperaciones = estado.movimientos.filter(m => {
        // Solo considerar 'gasto' y 'egreso' (pago a proveedor) que tengan una caja asignada
        const esEgreso = (m.tipo === 'gasto' || m.tipo === 'egreso');
        const coincideFecha = m.fecha.split('T')[0] === fechaArqueo;
        const coincideCaja = m.caja && (!cajaFiltro || cajaFiltro === 'Todas las cajas' || m.caja === cajaFiltro);
        // Nota: Operaciones suelen ser historicas, no temporales, asi que 'arqueado' flag quizas no aplica igual,
        // pero por consistencia si tuvieran flag, lo respetamos. Si no tienen flag, !undefined es true -> ocultaria?
        // No, !undefined es true. wait. !undefined is true.
        // Si m.arqueado es undefined, !m.arqueado es true.
        // PERO si queremos OCULTAR los arqueados (true), !true es false.
        // Si m.arqueado es undefined (no tiene), !undefined -> true. Visible. Correcto.
        const visible = mostrarArqueados || !m.arqueado;
        const coincideUsuario = !usuarioActualNombre || m.cajero === usuarioActualNombre;

        return esEgreso && coincideFecha && coincideCaja && visible && coincideUsuario;
    });

    // Combinar ambos tipos de egresos
    let todosLosEgresos = [...egresosDeCaja, ...egresosDeOperaciones];

    // **NUEVO:** Filtrar por caja solo si NO es "Todas las cajas"
    if (cajaFiltro && cajaFiltro !== 'Todas las cajas') {
        ingresosParaArqueo = ingresosParaArqueo.filter(m => m.caja === cajaFiltro);
        todosLosEgresos = todosLosEgresos.filter(e => e.caja === cajaFiltro);
    }
    // Si es "Todas las cajas", no filtramos y sumamos todo

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

    // **DEBUG:** Log para verificar qué datos tenemos
    console.log('=== cargarHistorialMovimientosDia ===');
    console.log('Fecha filtro:', fechaFiltro);
    console.log('Caja filtro:', cajaFiltro);
    console.log('Total movimientosTemporales:', estado.movimientosTemporales.length);
    console.log('Total egresosCaja:', estado.egresosCaja.length);
    console.log('Total movimientos (operaciones):', estado.movimientos.length);

    // Obtener movimientos
    // Obtener movimientos
    // **CORRECCIÓN:** Manejar correctamente el filtro 'Todas las cajas'
    // **CORRECCIÓN:** Manejar correctamente el filtro 'Todas las cajas' y USUARIO

    // Configurar filtro de usuario
    const userRole = sessionStorage.getItem('userRole');
    const mostrarTodo = userRole === 'admin' || userRole === 'tesoreria';
    let usuarioActualNombre = null;
    if (!mostrarTodo && usuarioPerfil && usuarioPerfil.username) {
        usuarioActualNombre = usuarioPerfil.username;
    }

    const ingresos = estado.movimientosTemporales.filter(m => {
        const coincideFecha = m.fecha.startsWith(fechaFiltro);
        const coincideCaja = (!cajaFiltro || cajaFiltro === 'Todas las cajas' || m.caja === cajaFiltro);
        const coincideUsuario = !usuarioActualNombre || m.cajero === usuarioActualNombre;
        // **NUEVO:** Ocultar ingresos arqueados para cajeros
        const noEstaArqueado = mostrarTodo || !m.arqueado;
        return coincideFecha && coincideCaja && coincideUsuario && noEstaArqueado;
    }).map(m => ({ ...m, tipoMovimiento: 'ingreso' }));

    console.log('[DEBUG] mostrarTodo:', mostrarTodo, 'userRole:', userRole);
    console.log('[DEBUG] Total egresos antes de filtrar:', estado.egresosCaja.length);
    console.log('[DEBUG] Egresos con arqueado=true:', estado.egresosCaja.filter(e => e.arqueado).length);

    const egresosCaja = estado.egresosCaja.filter(e => {
        const coincideFecha = e.fecha.startsWith(fechaFiltro);
        const coincideCaja = (!cajaFiltro || cajaFiltro === 'Todas las cajas' || e.caja === cajaFiltro);
        const coincideUsuario = !usuarioActualNombre || !e.cajero || e.cajero === usuarioActualNombre;
        // **NUEVO:** Ocultar egresos arqueados para cajeros
        const noEstaArqueado = mostrarTodo || !e.arqueado;

        if (!noEstaArqueado) {
            console.log('[DEBUG] Egreso filtrado por arqueado:', e.id, e.categoria, 'arqueado:', e.arqueado);
        }

        return coincideFecha && coincideCaja && coincideUsuario && noEstaArqueado;
    }).map(e => ({ ...e, tipoMovimiento: 'egreso' }));

    console.log('[DEBUG] Egresos después de filtrar:', egresosCaja.length);

    const egresosOperaciones = estado.movimientos.filter(m => {
        const coincideFecha = m.fecha.startsWith(fechaFiltro);
        const esEgreso = (m.tipo === 'gasto' || m.tipo === 'egreso');
        const coincideCaja = (!cajaFiltro || cajaFiltro === 'Todas las cajas' || m.caja === cajaFiltro);
        const coincideUsuario = !usuarioActualNombre || m.cajero === usuarioActualNombre;
        return coincideFecha && esEgreso && coincideCaja && coincideUsuario;
    }).map(m => ({ ...m, tipoMovimiento: 'egreso' }));

    console.log('Ingresos filtrados:', ingresos.length);
    console.log('Egresos caja filtrados:', egresosCaja.length);
    console.log('Egresos operaciones filtrados:', egresosOperaciones.length);

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
async function guardarArqueo() {
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

    // CORRECCIÓN: Filtrar ingresos también por la fecha del arqueo.
    // **NUEVO:** Excluir movimientos ya arqueados
    const ingresosParaArqueo = estado.movimientosTemporales.filter(m =>
        m.caja === cajaFiltro && m.fecha.startsWith(fechaArqueo) && m.arqueado !== true
    );
    // **NUEVO:** Excluir egresos ya arqueados
    const egresosDeCaja = estado.egresosCaja.filter(e => e.fecha.startsWith(fechaArqueo) && e.caja === cajaFiltro && e.arqueado !== true);
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

    // Preparar datos para guardar en la base de datos
    const datosParaBD = {
        // **NOTA:** NO incluir 'id' - Supabase lo genera automáticamente como UUID
        fecha: arqueo.fecha,
        caja: arqueo.caja,
        cajero: arqueo.cajero,
        fondo_fijo: arqueo.fondoFijo,

        // **NUEVO:** Desglose completo de efectivo
        efectivo: arqueo.efectivo,
        dolares: arqueo.monedasExtranjeras.usd,
        reales: arqueo.monedasExtranjeras.brl,
        pesos: arqueo.monedasExtranjeras.ars,

        // **NUEVO:** Totales de ingresos no efectivo
        pagos_tarjeta: arqueo.pagosTarjeta,
        ventas_credito: arqueo.ventasCredito,
        pedidos_ya: arqueo.pedidosYa,
        ventas_transferencia: arqueo.ventasTransferencia,

        // **NUEVO:** Servicios detallados
        servicios: arqueo.servicios,
        total_servicios: arqueo.totalServicios,

        // Totales calculados
        total_efectivo: arqueo.totalEfectivo,
        total_ingresos: arqueo.totalIngresos,
        total_egresos: todosLosEgresos.reduce((sum, e) => sum + (e.monto || 0), 0),

        // Metadatos
        total_movimientos: movimientosParaArqueo.length,
        saldo_caja: arqueo.totalIngresos,
        diferencia: 0,
        observaciones: null
    };

    // Guardar en base de datos
    console.log('[DEBUG GUARDAR ARQUEO] Datos a enviar a Supabase:', datosParaBD);
    if (window.db && window.db.guardarArqueo) {
        const resultado = await window.db.guardarArqueo(datosParaBD);
        console.log('[DEBUG GUARDAR ARQUEO] Resultado de Supabase:', resultado);
        if (!resultado.success) {
            console.error('Error al guardar arqueo en base de datos:', resultado.error);
            mostrarMensaje('Error al guardar en base de datos: ' + resultado.error, 'peligro');
            return; // Detener si hay error
        } else {
            console.log('✅ Arqueo guardado exitosamente en Supabase');
        }
    } else {
        console.warn('⚠️ window.db.guardarArqueo no disponible');
    }

    // Guardar en el estado local
    estado.arqueos.push(arqueo);
    guardarEnLocalStorage();

    // Mostrar mensaje de éxito
    mostrarMensaje('Arqueo guardado exitosamente', 'exito');


    // **MODIFICADO:** Exportar el PDF con los datos consistentes de la pantalla
    exportarArqueoActualPDF(true); // true indica que es un guardado final

    // **NUEVO:** Marcar movimientos como arqueados en lugar de borrarlos
    const movimientosArqueados = estado.movimientosTemporales.filter(m =>
        m.caja === cajaFiltro && m.fecha.startsWith(fechaArqueo)
    );

    console.log(`Marcando ${movimientosArqueados.length} movimientos como arqueados...`);

    for (const mov of movimientosArqueados) {
        mov.arqueado = true;
        mov.fecha_arqueo = new Date().toISOString(); // Registrar cuándo fue arqueado

        if (mov.id && window.db && window.db.guardarMovimientoTemporal) {
            await window.db.guardarMovimientoTemporal(mov);
        }
    }

    // **NUEVO:** Marcar también los Egresos de Caja como arqueados
    const egresosArqueados = estado.egresosCaja.filter(e =>
        e.caja === cajaFiltro && e.fecha.startsWith(fechaArqueo)
    );
    console.log(`[DEBUG ARQUEO] Marcando ${egresosArqueados.length} egresos como arqueados...`);
    console.log(`[DEBUG ARQUEO] IDs de egresos a arquear:`, egresosArqueados.map(e => ({ id: e.id, categoria: e.categoria, arqueado: e.arqueado })));

    for (const eg of egresosArqueados) {
        eg.arqueado = true;
        eg.fecha_arqueo = new Date().toISOString();

        if (eg.id && window.db && window.db.guardarEgresoCaja) {
            await window.db.guardarEgresoCaja(eg);
        }
    }

    console.log(`[DEBUG ARQUEO] Estado de egresos después de marcar:`, egresosArqueados.map(e => ({ id: e.id, arqueado: e.arqueado })));

    // Actualizar las vistas
    cargarHistorialMovimientosDia();
    cargarHistorialEgresosCaja(); // **NUEVO:** Refrescar lista de egresos para ocultar arqueados
    renderizarIngresosAgregados();

    // **CRÍTICO:** Guardar cambios en localStorage (arqueado: true)
    guardarEnLocalStorage();

}

// Funciones de Modal
function abrirModal(contenidoId, titulo) {
    // Asegurarse de que el contenido del modal de efectivo esté generado
    if (contenidoId === 'contenido-efectivo') {
        inicializarModalEfectivo();
    }
    // **NUEVO:** Inicializar tabla de Fondo Fijo
    if (contenidoId === 'contenido-fondo-fijo') {
        inicializarTablaFondoFijo();
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
        'apLoteEfectivoMontoMovimiento', 'aquiPagoEfectivoMontoMovimiento', 'expressEfectivoMontoMovimiento', 'wepaEfectivoMontoMovimiento',
        'pasajeNsaEfectivoMontoMovimiento', 'encomiendaNsaEfectivoMontoMovimiento', 'apostalaEfectivoMontoMovimiento'
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
async function guardarGasto(event) {
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
            estado.movimientos[movimientoIndex].receptor = receptorValue || null;
            estado.movimientos[movimientoIndex].descripcion = document.getElementById('descripcionGasto').value;
            estado.movimientos[movimientoIndex].monto = parsearMoneda(document.getElementById('montoGasto').value);
            estado.movimientos[movimientoIndex].moneda = document.getElementById('monedaGasto').value;
            estado.movimientos[movimientoIndex].caja = document.getElementById('cajaGasto').value;
            estado.movimientos[movimientoIndex].referencia = document.getElementById('referenciaGasto').value || null;

            // **CORRECCIÓN FINAL:** Usar el objeto ya actualizado para la impresión.
            const movimientoActualizado = estado.movimientos[movimientoIndex]; // Este objeto ya tiene todos los datos.
            if (movimientoActualizado.tipo === 'egreso' || movimientoActualizado.tipo === 'operacion') {
                imprimirReciboGasto(movimientoActualizado);
            }
            if (window.db && window.db.guardarMovimiento) {
                await window.db.guardarMovimiento(movimientoActualizado);
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
            cajero: sessionStorage.getItem('usuarioActual'), // **NUEVO:** Guardar el usuario que realiza la operación.
            tipo: tipoGasto,
            historialEdiciones: [], // Inicializar historial
            receptor: receptorValue || null,
            descripcion: document.getElementById('descripcionGasto').value,
            numeroRecibo: numeroRecibo,
            monto: parsearMoneda(document.getElementById('montoGasto').value),
            moneda: document.getElementById('monedaGasto').value,
            // **CORREGIDO:** Asegurar que la caja de Tesorería se asigne si el campo está vacío.
            caja: document.getElementById('cajaGasto').value || (sessionStorage.getItem('userRole') === 'tesoreria' ? 'Caja Tesoreria' : ''),
            referencia: document.getElementById('referenciaGasto').value || null
        };
        estado.movimientos.push(gasto);
        if (window.db && window.db.guardarMovimiento) {
            await window.db.guardarMovimiento(gasto);
        }
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

        // **CORRECCIÓN:** Los depósitos-inversiones son ingresos (positivos), el resto son egresos (negativos)
        const esIngreso = movimiento.tipo === 'deposito-inversiones';
        const signo = esIngreso ? '+' : '-';
        const claseMonto = esIngreso ? 'positivo' : 'negativo';

        // Preparar HTML de edición
        let edicionHTML = '';
        let observacionEdicionHTML = ''; ({ edicionHTML, observacionEdicionHTML } = generarHTMLHistorial(movimiento));

        div.innerHTML = `
            <div class="movimiento-header">
                <div class="movimiento-info">
                    <div class="movimiento-titulo">
                        <span class="movimiento-tipo">${movimiento.tipo.toUpperCase()}${edicionHTML}</span>
                        <span class="movimiento-monto ${claseMonto}">${signo}${formatearMoneda(movimiento.monto, movimiento.moneda)}</span>
                    </div>
                    <div class="movimiento-fecha-hora">
                        <small>${formatearFecha(movimiento.fecha)}</small>
                    </div>
                    <div class="movimiento-cajero-caja">
                        ${movimiento.caja ? `<small><strong>Caja:</strong> ${movimiento.caja}</small>` : ''}
                        ${movimiento.referencia ? `<small><strong>Referencia:</strong> ${movimiento.referencia}</small>` : ''}
                    </div>
                    <div class="movimiento-descripcion">
                        <small><strong>Descripción:</strong> ${movimiento.descripcion}</small>
                    </div>
                    ${movimiento.numeroRecibo ? `<div class="movimiento-recibo"><small><strong>Recibo:</strong> ${String(movimiento.numeroRecibo).padStart(6, '0')}</small></div>` : ''}
                    <div class="movimiento-acciones">
                        ${movimiento.numeroRecibo ? `<button class="btn-accion reimprimir" onclick="reimprimirRecibo('${movimiento.id}')">Reimprimir</button>` : ''}
                        <button class="btn-accion editar" onclick="iniciarEdicionGasto('${movimiento.id}')">Editar</button>
                        <button class="btn-accion eliminar" onclick="eliminarGasto('${movimiento.id}')">Eliminar</button>
                    </div>
                </div>
            </div>
            ${observacionEdicionHTML}
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

async function eliminarGasto(id) {
    // **MEJORA UX:** Añadir confirmación antes de eliminar.
    const confirmed = await showConfirm('¿Está seguro de que desea eliminar este movimiento de tesorería? Esta acción no se puede deshacer.', {
        title: 'Eliminar Movimiento',
        confirmText: 'Sí, eliminar',
        type: 'danger',
        confirmButtonType: 'danger'
    });
    if (confirmed) {
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
async function guardarEgresoCaja(event) {
    event.preventDefault();

    const idEditar = document.getElementById('idEgresoCajaEditar').value;
    const esEdicion = idEditar !== '';

    // Obtener datos del formulario
    const fecha = document.getElementById('fechaEgresoCaja').value;
    const caja = document.getElementById('cajaEgreso').value;
    const categoria = document.getElementById('categoriaEgresoCaja').value;
    let descripcion = document.getElementById('descripcionEgresoCaja').value.trim();
    const monto = parsearMoneda(document.getElementById('montoEgresoCaja').value);
    const referencia = document.getElementById('referenciaEgresoCaja').value;
    const cajero = sessionStorage.getItem('usuarioActual');

    // **NUEVO:** Validación de Proveedor
    if (categoria === 'Pago a Proveedor') {
        const proveedorElement = document.getElementById('proveedorEgresoCaja');
        if (proveedorElement) {
            const proveedor = proveedorElement.value.trim();
            if (!proveedor) {
                mostrarMensaje('Por favor, ingrese el nombre del proveedor.', 'advertencia');
                return;
            }
            descripcion = `${proveedor} - ${descripcion}`;
        }
    }

    // Validaciones
    if (!fecha || !caja || !categoria || !descripcion) {
        mostrarMensaje('Por favor, complete todos los campos obligatorios.', 'peligro');
        return;
    }

    if (monto <= 0) {
        mostrarMensaje('El monto debe ser mayor a 0.', 'peligro');
        return;
    }

    // Nota: Ya no se utilizan denominaciones para egresos, solo monto total.
    const efectivo = null;

    // Crear objeto de egreso
    const egreso = {
        id: esEdicion ? idEditar : generarId(),
        fecha: new Date(fecha).toISOString(), // Asegurar formato ISO
        caja: caja,
        cajero: cajero,
        categoria: categoria,
        descripcion: descripcion,
        monto: monto,
        referencia: referencia,
        efectivo: null, // Sin desglose
        arqueado: false
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

    if (window.db && window.db.guardarEgresoCaja) {
        await window.db.guardarEgresoCaja(egreso);
    }

    // Guardar en localStorage
    localStorage.setItem('egresosCaja', JSON.stringify(estado.egresosCaja));

    // Limpiar formulario y actualizar historial
    limpiarFormularioEgresoCaja();
    cargarHistorialEgresosCaja();
    cargarResumenDiario(); // **NUEVO:** Actualizar resumen en tiempo real
}

/**
 * Carga y muestra el historial de egresos de caja
 */
function cargarHistorialEgresosCaja() {
    console.log('[DEBUG] ========== cargarHistorialEgresosCaja EJECUTADA ==========');

    const listaEgresosCaja = document.getElementById('listaEgresosCaja');
    console.log('[DEBUG] Elemento listaEgresosCaja:', listaEgresosCaja);

    // **CORRECCIÓN:** Solo ejecutar si el contenedor existe en la página actual.
    if (!listaEgresosCaja) {
        console.log('[DEBUG] No se encontró listaEgresosCaja, saliendo...');
        return;
    }

    console.log('[DEBUG] cargarHistorialEgresosCaja - INICIO');

    // **MODIFICADO:** Leer desde estado en lugar de localStorage
    let todosLosEgresos = estado.egresosCaja || [];
    console.log('[DEBUG] Total egresos en estado:', todosLosEgresos.length);
    console.log('[DEBUG] Primeros 3 egresos:', todosLosEgresos.slice(0, 3).map(e => ({ id: e.id, arqueado: e.arqueado, categoria: e.categoria })));

    let egresosFiltrados = todosLosEgresos;

    // Obtener filtros
    const fechaFiltro = document.getElementById('fechaFiltroEgresos').value;
    const cajaFiltro = document.getElementById('filtroCajaEgresos').value;

    // --- LÓGICA DE FILTRADO REVISADA ---
    const userRole = sessionStorage.getItem('userRole');
    const mostrarTodo = userRole === 'admin' || userRole === 'tesoreria';
    console.log(`[DEBUG] cargarHistorialEgresosCaja - userRole: ${userRole}, mostrarTodo: ${mostrarTodo}`);

    // 1. Filtro por Usuario (Segregación)
    if (!mostrarTodo && usuarioPerfil && usuarioPerfil.username) {
        const nombreUsuarioActual = usuarioPerfil.username;
        egresosFiltrados = egresosFiltrados.filter(e => !e.cajero || e.cajero === nombreUsuarioActual);
    }

    // 2. Filtro por Arqueado (Ocultar cerrados para cajeros)
    if (!mostrarTodo) {
        const antesArqueado = egresosFiltrados.length;
        egresosFiltrados = egresosFiltrados.filter(e => !e.arqueado);
        console.log(`[DEBUG] Egresos antes de filtrar arqueados: ${antesArqueado}, después: ${egresosFiltrados.length}`);
        console.log(`[DEBUG] Egresos arqueados ocultos: ${antesArqueado - egresosFiltrados.length}`);
    }

    // 3. Filtro por Caja
    if (cajaFiltro && cajaFiltro !== 'Todas las cajas') {
        egresosFiltrados = egresosFiltrados.filter(e => e.caja === cajaFiltro);
    } else if (!mostrarTodo) {
        // Cajero por defecto ve su caja seleccionada si no filtra?
        const cajaAsignada = sessionStorage.getItem('cajaSeleccionada');
        if (cajaAsignada) {
            egresosFiltrados = egresosFiltrados.filter(e => e.caja === cajaAsignada);
        }
    }

    // 4. Filtro por Fecha
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
                <div class="movimiento-info">
                    <div class="movimiento-titulo">
                        <span class="movimiento-tipo">${egreso.categoria.toUpperCase()}</span>
                        <span class="movimiento-monto negativo">${formatearMoneda(egreso.monto, 'gs')}</span>
                    </div>
                    <div class="movimiento-fecha-hora">
                        <small>${formatearFecha(egreso.fecha)}</small>
                    </div>
                    <div class="movimiento-cajero-caja">
                        <small><strong>Cajero:</strong> ${egreso.cajero || 'N/A'}</small>
                        <small><strong>Caja:</strong> ${egreso.caja}</small>
                    </div>
                    <div class="movimiento-descripcion">
                        <small><strong>Descripción:</strong> ${egreso.descripcion}</small>
                    </div>
                    ${egreso.referencia ? `<div class="movimiento-referencia"><small><strong>Referencia:</strong> ${egreso.referencia}</small></div>` : ''}
                    <div class="movimiento-acciones">
                        <button class="btn-accion editar" onclick="iniciarEdicionEgresoCaja('${egreso.id}')">Editar</button>
                        <button class="btn-accion eliminar" onclick="eliminarEgresoCaja('${egreso.id}')">Eliminar</button>
                    </div>
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

async function eliminarEgresoCaja(id) {
    console.log('=== ELIMINAR EGRESO DE CAJA ===');
    console.log('ID a eliminar:', id);

    // **MEJORA UX:** Añadir confirmación antes de eliminar.
    const confirmed = await showConfirm('¿Está seguro de que desea eliminar este egreso de caja? Esta acción no se puede deshacer.', {
        title: 'Eliminar Egreso',
        confirmText: 'Sí, eliminar',
        type: 'danger',
        confirmButtonType: 'danger'
    });
    if (confirmed) {
        console.log('Usuario confirmó eliminación');

        // **CORRECCIÓN:** Eliminar de Supabase primero
        if (window.db && window.db.eliminarEgresoCaja) {
            console.log('Llamando a window.db.eliminarEgresoCaja...');
            const resultado = await window.db.eliminarEgresoCaja(id);
            console.log('Resultado de Supabase:', resultado);

            if (!resultado.success) {
                console.error('Error al eliminar egreso de Supabase:', resultado.error);
                mostrarMensaje('Error al eliminar de la base de datos: ' + resultado.error, 'peligro');
                return;
            }
            console.log('✅ Eliminado de Supabase exitosamente');
        } else {
            console.warn('⚠️ window.db.eliminarEgresoCaja no está disponible');
        }

        // Eliminar de localStorage
        console.log('Eliminando de localStorage...');
        const cantidadAntes = estado.egresosCaja.length;
        estado.egresosCaja = estado.egresosCaja.filter(e => e.id !== id);
        const cantidadDespues = estado.egresosCaja.length;
        console.log(`Egresos antes: ${cantidadAntes}, después: ${cantidadDespues}`);

        guardarEnLocalStorage();
        mostrarMensaje('Egreso de caja eliminado correctamente', 'exito');
        cargarHistorialEgresosCaja();
        actualizarArqueoFinal();
        cargarResumenDiario();
        console.log('=== FIN ELIMINAR EGRESO ===');
    } else {
        console.log('Usuario canceló la eliminación');
    }
}


// Aplicar filtro general de caja a todos los filtros individuales
function aplicarFiltroCajaGeneral() {
    const cajaGeneral = document.getElementById('filtroCajaGeneral')?.value || '';

    // Lista de todos los filtros de caja individuales
    const filtrosCaja = [
        'filtroCajaSaldoAnterior',
        'filtroCajaIngresosTienda',
        'filtroCajaServiciosEfectivo',
        'filtroCajaDepositosInversiones',
        'filtroCajaServiciosTarjeta',
        'filtroCajaNoEfectivo',
        'filtroCajaEgresos'
    ];

    // Sincronizar todos los filtros individuales con el general
    filtrosCaja.forEach(filtroId => {
        const filtro = document.getElementById(filtroId);
        if (filtro) {
            filtro.value = cajaGeneral;
        }
    });

    // Recargar el resumen con los nuevos filtros
    cargarResumenDiario();
}

// Resumen de tesorería
async function cargarResumenDiario() {
    const fechaDesdeInput = document.getElementById('fechaResumenDesde');
    if (!fechaDesdeInput) return;

    // --- CAPTURA DE FILTROS ---
    const fechaDesde = fechaDesdeInput.value;
    const fechaHasta = document.getElementById('fechaResumenHasta')?.value || '';

    // **NUEVO:** Cargar arqueos del rango de fechas seleccionado desde Supabase
    if (window.db && window.db.obtenerArqueos && fechaDesde) {
        try {
            // Intentar cargar todos los arqueos (sin filtro) o del rango de fechas
            const resultado = await window.db.obtenerArqueos();
            if (resultado && resultado.success && resultado.data) {
                // Filtrar por el rango de fechas seleccionado
                estado.arqueos = resultado.data.filter(a => {
                    const fechaArqueo = a.fecha.split('T')[0];
                    const dentroRango = (!fechaDesde || fechaArqueo >= fechaDesde) &&
                        (!fechaHasta || fechaArqueo <= fechaHasta);
                    return dentroRango;
                });
                console.log(`Arqueos cargados para rango ${fechaDesde} - ${fechaHasta}:`, estado.arqueos.length);
            }
        } catch (error) {
            console.warn('Error cargando arqueos:', error);
        }
    }

    // **DEBUG:** Log para verificar qué datos tenemos
    console.log('=== cargarResumenDiario ===');
    console.log('Arqueos cargados:', estado.arqueos.length);
    console.log('Movimientos temporales (ingresos):', estado.movimientosTemporales.length);
    console.log('Egresos caja:', estado.egresosCaja.length);
    console.log('Movimientos operaciones:', estado.movimientos.length);

    // Filtros de Ingresos Tienda
    // Filtros de Ingresos Tienda
    const filtroCajaTienda = document.getElementById('filtroCajaIngresosTienda')?.value || '';
    const filtroDescTienda = (document.getElementById('filtroDescIngresosTienda')?.value || '').toLowerCase();

    // Filtros de Servicios
    const filtroCajaServiciosEfectivo = document.getElementById('filtroCajaServiciosEfectivo')?.value || '';
    const filtroNombreServicioEfectivo = (document.getElementById('filtroNombreServicioEfectivo')?.value || '').toLowerCase();

    // **NUEVO:** Filtros de Servicios (Tarjeta)
    const filtroCajaServiciosTarjeta = document.getElementById('filtroCajaServiciosTarjeta')?.value || '';
    const filtroNombreServicioTarjeta = (document.getElementById('filtroNombreServicioTarjeta')?.value || '').toLowerCase();

    // **NUEVO:** Filtros de Ingresos No Efectivo
    const filtroCajaNoEfectivo = document.getElementById('filtroCajaNoEfectivo')?.value || '';
    const filtroDescNoEfectivo = (document.getElementById('filtroDescNoEfectivo')?.value || '').toLowerCase();

    // Filtros de Egresos
    const filtroCajaEgresos = document.getElementById('filtroCajaEgresos')?.value || '';
    const filtroDescEgresos = (document.getElementById('filtroDescEgresos')?.value || '').toLowerCase();

    // **NUEVO:** Filtro de Saldo Día Anterior
    const filtroCajaSaldoAnterior = document.getElementById('filtroCajaSaldoAnterior')?.value || '';

    // --- OBTENCIÓN DE DATOS ---
    // **CORRECCIÓN:** Usar movimientos temporales para ingresos y movimientos guardados para operaciones.
    const movimientosIngresos = estado.movimientosTemporales.filter(m => { // Ingresos del día (no guardados en arqueo)
        const fechaMov = m.fecha.split('T')[0];
        return (!fechaDesde || fechaMov >= fechaDesde) && (!fechaHasta || fechaMov <= fechaHasta);
    });

    const movimientosOperaciones = estado.movimientos.filter(m => { // Gastos, Egresos, etc. (ya guardados)
        const fechaMov = m.fecha.split('T')[0];
        return (!fechaDesde || fechaMov >= fechaDesde) && (!fechaHasta || fechaMov <= fechaHasta);
    });

    // Los egresos de caja son un tipo separado de movimiento
    const egresosCajaDelPeriodo = estado.egresosCaja.filter(e => {
        const fechaEgreso = e.fecha.split('T')[0];
        return (!fechaDesde || fechaEgreso >= fechaDesde) && (!fechaHasta || fechaEgreso <= fechaHasta);
    });

    // --- RENDERIZADO DE LISTAS ---

    // 1. Ingresos de Tienda (movimientos de ingreso que no son servicios)
    const esIngresoTienda = (m) => {
        const esServicio = (m.servicios && Object.values(m.servicios).some(s => s.monto > 0 || s.tarjeta > 0)) || (m.otrosServicios && m.otrosServicios.length > 0);
        // Un ingreso de tienda es cualquier movimiento temporal que no sea un servicio.
        return !esServicio;
    };

    const listaIngresosTienda = document.getElementById('listaIngresosTienda');
    let ingresosTiendaFiltrados = movimientosIngresos.filter(m => { // **CORRECCIÓN:** Usar solo movimientosIngresos
        return esIngresoTienda(m) &&
            (!filtroCajaTienda || m.caja === filtroCajaTienda) &&
            // **CORRECCIÓN:** Mostrar solo los que tienen un componente de efectivo
            ((m.efectivo && Object.keys(m.efectivo).length > 0) || m.valorVenta > 0) &&
            (!filtroDescTienda || m.descripcion.toLowerCase().includes(filtroDescTienda));
    });
    const totalTienda = renderizarLista(listaIngresosTienda, ingresosTiendaFiltrados, 'IngresosTienda');

    // 2. Ingresos por Servicios (Efectivo)
    const listaIngresosServiciosEfectivo = document.getElementById('listaIngresosServiciosEfectivo');
    let ingresosServiciosEfectivo = movimientosIngresos.filter(m => { // **CORRECCIÓN:** Usar solo movimientosIngresos
        const esServicioEfectivo = (m.servicios && Object.values(m.servicios).some(s => s.monto > 0)) || (m.otrosServicios && m.otrosServicios.some(s => s.monto > 0));
        if (!esServicioEfectivo) return false;

        const coincideCaja = !filtroCajaServiciosEfectivo || m.caja === filtroCajaServiciosEfectivo;
        if (!coincideCaja) return false;

        if (filtroNombreServicioEfectivo) {
            const nombresServicios = [
                ...Object.keys(m.servicios || {}).filter(k => m.servicios[k].monto > 0),
                ...(m.otrosServicios || []).filter(s => s.monto > 0).map(s => s.nombre)
            ];
            return nombresServicios.some(nombre => nombre.toLowerCase().includes(filtroNombreServicioEfectivo));
        }
        return true;
    });
    const totalServiciosEfectivo = renderizarLista(listaIngresosServiciosEfectivo, ingresosServiciosEfectivo, 'IngresosServiciosEfectivo');

    // **NUEVO:** 3. Ingresos por Servicios (Tarjeta)
    const listaIngresosServiciosTarjeta = document.getElementById('listaIngresosServiciosTarjeta');
    let ingresosServiciosTarjeta = movimientosIngresos.filter(m => { // **CORRECCIÓN:** Usar solo movimientosIngresos
        const esServicioTarjeta = (m.servicios && Object.values(m.servicios).some(s => s.tarjeta > 0)) || (m.otrosServicios && m.otrosServicios.some(s => s.tarjeta > 0));
        if (!esServicioTarjeta) return false;

        const coincideCaja = !filtroCajaServiciosTarjeta || m.caja === filtroCajaServiciosTarjeta;
        if (!coincideCaja) return false;

        if (filtroNombreServicioTarjeta) {
            const nombresServicios = [
                ...Object.keys(m.servicios || {}).filter(k => m.servicios[k].tarjeta > 0),
                ...(m.otrosServicios || []).filter(s => s.tarjeta > 0).map(s => s.nombre)
            ];
            return nombresServicios.some(nombre => nombre.toLowerCase().includes(filtroNombreServicioTarjeta));
        }
        return true;
    });
    const totalServiciosTarjeta = renderizarLista(listaIngresosServiciosTarjeta, ingresosServiciosTarjeta, 'IngresosServiciosTarjeta');

    // **NUEVO:** 3. Ingresos No Efectivo - Descomponer por tipo
    const listaIngresosNoEfectivo = document.getElementById('listaIngresosNoEfectivo');

    // Filtrar movimientos que tienen componentes no efectivo
    let movimientosConNoEfectivo = movimientosIngresos.filter(m => {
        const tieneNoEfectivo = (m.pagosTarjeta > 0 || m.ventasCredito > 0 || m.pedidosYa > 0 || m.ventasTransferencia > 0);
        return esIngresoTienda(m) && tieneNoEfectivo &&
            (!filtroCajaNoEfectivo || m.caja === filtroCajaNoEfectivo);
    });

    // **NUEVO:** Descomponer cada movimiento en entradas separadas por tipo de ingreso
    let ingresosNoEfectivoDescompuestos = [];
    movimientosConNoEfectivo.forEach(m => {
        // Crear una entrada separada para cada tipo de ingreso no efectivo
        if (m.pagosTarjeta > 0) {
            ingresosNoEfectivoDescompuestos.push({
                ...m,
                monto: m.pagosTarjeta,
                categoria: 'Pago c/ Tarjeta', // Usar categoria para el título
                tipoIngreso: 'pagosTarjeta'
                // Mantener descripcion original para el filtro
            });
        }
        if (m.ventasCredito > 0) {
            ingresosNoEfectivoDescompuestos.push({
                ...m,
                monto: m.ventasCredito,
                categoria: 'Venta a Crédito',
                tipoIngreso: 'ventasCredito'
            });
        }
        if (m.pedidosYa > 0) {
            ingresosNoEfectivoDescompuestos.push({
                ...m,
                monto: m.pedidosYa,
                categoria: 'Pedidos Ya',
                tipoIngreso: 'pedidosYa'
            });
        }
        if (m.ventasTransferencia > 0) {
            ingresosNoEfectivoDescompuestos.push({
                ...m,
                monto: m.ventasTransferencia,
                categoria: 'Venta a Transferencia',
                tipoIngreso: 'ventasTransferencia'
            });
        }
    });

    // **NUEVO:** Aplicar filtro de descripción después de descomponer
    if (filtroDescNoEfectivo) {
        ingresosNoEfectivoDescompuestos = ingresosNoEfectivoDescompuestos.filter(m =>
            (m.descripcion && m.descripcion.toLowerCase().includes(filtroDescNoEfectivo)) ||
            (m.categoria && m.categoria.toLowerCase().includes(filtroDescNoEfectivo))
        );
    }

    const totalNoEfectivo = renderizarLista(listaIngresosNoEfectivo, ingresosNoEfectivoDescompuestos, 'Ingreso No Efectivo');

    // **NUEVO:** 4. Depósitos - Inversiones (movimientos de operaciones tipo deposito-inversiones)
    const listaDepositosInversiones = document.getElementById('listaDepositosInversiones');
    const filtroCajaDepositosInversiones = document.getElementById('filtroCajaDepositosInversiones') ? document.getElementById('filtroCajaDepositosInversiones').value : '';
    const filtroDescDepositosInversiones = document.getElementById('filtroDescDepositosInversiones') ? document.getElementById('filtroDescDepositosInversiones').value.toLowerCase() : '';

    let depositosInversiones = movimientosOperaciones.filter(m => {
        // Filtrar solo movimientos de tipo deposito-inversiones
        if (m.tipo !== 'deposito-inversiones') return false;

        // Aplicar filtro de caja
        if (filtroCajaDepositosInversiones && m.caja !== filtroCajaDepositosInversiones) return false;

        // Aplicar filtro de descripción
        if (filtroDescDepositosInversiones && !m.descripcion.toLowerCase().includes(filtroDescDepositosInversiones)) return false;

        return true;
    });
    const totalDepositosInversiones = renderizarLista(listaDepositosInversiones, depositosInversiones, 'DepositosInversiones');

    // 5. Egresos de Caja (solo egresos directos)
    const listaEgresos = document.getElementById('listaEgresos');

    // **MODIFICADO:** Solo egresos directos de caja
    let egresosCajaFiltrados = egresosCajaDelPeriodo.filter(e =>
        (!filtroCajaEgresos || e.caja === filtroCajaEgresos) &&
        (!filtroDescEgresos || e.descripcion.toLowerCase().includes(filtroDescEgresos) || (e.categoria && e.categoria.toLowerCase().includes(filtroDescEgresos)))
    );
    const totalEgresosCaja = renderizarLista(listaEgresos, egresosCajaFiltrados, 'Egresos');


    // **NUEVO:** 6. Egresos Tesorería (solo de operaciones: gastos y egresos)
    const listaEgresosTesoreria = document.getElementById('listaEgresosTesoreria');
    const filtroCajaEgresosTesoreria = document.getElementById('filtroCajaEgresosTesoreria') ? document.getElementById('filtroCajaEgresosTesoreria').value : '';
    const filtroDescEgresosTesoreria = document.getElementById('filtroDescEgresosTesoreria') ? document.getElementById('filtroDescEgresosTesoreria').value.toLowerCase() : '';

    // **CORRECCIÓN:** Combinar movimientos guardados y temporales para buscar operaciones
    const todosLosMovimientosOperaciones = [
        ...movimientosOperaciones,
        ...movimientosIngresos // También buscar en movimientos temporales por si hay operaciones no guardadas
    ];

    // Debug: Ver qué movimientos tienen la propiedad 'tipo'
    console.log('Total movimientos para buscar operaciones:', todosLosMovimientosOperaciones.length);
    const movimientosConTipo = todosLosMovimientosOperaciones.filter(m => m.tipo);
    console.log('Movimientos con tipo:', movimientosConTipo.map(m => ({ tipo: m.tipo, descripcion: m.descripcion, caja: m.caja })));
    console.log('Tipos únicos encontrados:', [...new Set(movimientosConTipo.map(m => m.tipo))]);

    let egresosTesoreriaFiltrados = todosLosMovimientosOperaciones.filter(m => {
        // **CORRECCIÓN:** Incluir todos los tipos de operaciones EXCEPTO deposito-inversiones (que tiene su propia sección)
        // Tipos válidos: 'gasto', 'egreso', 'operacion', 'transferencia'
        const tiposEgresosTesoreria = ['gasto', 'egreso', 'operacion', 'transferencia'];
        if (!m.tipo || !tiposEgresosTesoreria.includes(m.tipo)) return false;

        // Aplicar filtros
        if (filtroCajaEgresosTesoreria && m.caja !== filtroCajaEgresosTesoreria) return false;
        if (filtroDescEgresosTesoreria && !m.descripcion.toLowerCase().includes(filtroDescEgresosTesoreria) &&
            (!m.categoria || !m.categoria.toLowerCase().includes(filtroDescEgresosTesoreria))) return false;

        return true;
    }).map(m => ({ ...m, tipoMovimiento: m.tipo.toUpperCase() }));

    console.log('Egresos Tesorería encontrados:', egresosTesoreriaFiltrados.length);

    const totalEgresosTesoreria = renderizarLista(listaEgresosTesoreria, egresosTesoreriaFiltrados, 'EgresosTesoreria');

    // **MODIFICADO:** Calcular total de egresos (suma de ambos tipos)
    const totalEgresos = totalEgresosCaja + totalEgresosTesoreria;

    // **NUEVO:** Calcular saldo del día anterior
    const saldoDiaAnterior = calcularSaldoDiaAnterior(fechaDesde, filtroCajaSaldoAnterior);
    const totalSaldoDiaAnteriorEl = document.getElementById('totalSaldoDiaAnterior');
    if (totalSaldoDiaAnteriorEl) {
        totalSaldoDiaAnteriorEl.innerHTML = `<strong>${formatearMoneda(saldoDiaAnterior.total, 'gs')}</strong>`;
    }
    renderizarDetalleSaldoAnterior(saldoDiaAnterior.detallePorCaja, saldoDiaAnterior.fecha);

    // **NUEVO:** Calcular y mostrar totales generales (incluyendo saldo día anterior)
    const granTotalIngresos = saldoDiaAnterior.total + totalTienda + totalServiciosEfectivo + totalServiciosTarjeta + totalNoEfectivo + totalDepositosInversiones;
    const granTotalEgresos = totalEgresos;
    const diferenciaNeta = granTotalIngresos - granTotalEgresos;

    // **NUEVO:** Calcular y mostrar subtotales de ingresos
    const subTotalEfectivo = totalTienda + totalServiciosEfectivo;
    const subTotalNoEfectivo = totalServiciosTarjeta + totalNoEfectivo;

    const totalIngresosEfectivoEl = document.getElementById('totalIngresosEfectivo');
    if (totalIngresosEfectivoEl) totalIngresosEfectivoEl.innerHTML = `<strong>${formatearMoneda(subTotalEfectivo, 'gs')}</strong>`;

    const totalDepositosInversionesEl = document.getElementById('totalDepositosInversionesGeneral');
    if (totalDepositosInversionesEl) totalDepositosInversionesEl.innerHTML = `<strong>${formatearMoneda(totalDepositosInversiones, 'gs')}</strong>`;

    const totalIngresosNoEfectivoGenEl = document.getElementById('totalIngresosNoEfectivoGeneral');
    if (totalIngresosNoEfectivoGenEl) totalIngresosNoEfectivoGenEl.innerHTML = `<strong>${formatearMoneda(subTotalNoEfectivo, 'gs')}</strong>`;

    // **NUEVO:** Mostrar total de "Otros Ingresos No Efectivo" (sin servicios tarjeta)
    const totalIngresosNoEfectivoEl = document.getElementById('totalIngresosNoEfectivo');
    if (totalIngresosNoEfectivoEl) totalIngresosNoEfectivoEl.innerHTML = `<strong>${formatearMoneda(totalNoEfectivo, 'gs')}</strong>`;

    // Mostrar totales generales
    const totalGeneralIngresosEl = document.getElementById('totalGeneralIngresos');
    if (totalGeneralIngresosEl) totalGeneralIngresosEl.innerHTML = `<strong>${formatearMoneda(granTotalIngresos, 'gs')}</strong>`;

    const totalGeneralEgresosEl = document.getElementById('totalGeneralEgresos');
    if (totalGeneralEgresosEl) totalGeneralEgresosEl.innerHTML = `<strong>${formatearMoneda(granTotalEgresos, 'gs')}</strong>`;

    const diferenciaSpan = document.getElementById('totalDiferencia');
    if (diferenciaSpan) {
        diferenciaSpan.innerHTML = `<strong>${formatearMoneda(diferenciaNeta, 'gs')}</strong>`;
        diferenciaSpan.className = 'reporte-total-principal'; // Reset class
        diferenciaSpan.classList.add(diferenciaNeta >= 0 ? 'positivo' : 'negativo');
    }

    // **NUEVO:** Calcular y mostrar la diferencia de efectivo (sin incluir Depósitos - Inversiones)
    const diferenciaEfectivo = subTotalEfectivo - granTotalEgresos;
    const diferenciaEfectivoStrong = document.getElementById('diferenciaEfectivo');
    const diferenciaEfectivoItem = document.getElementById('itemDiferenciaEfectivo');

    if (diferenciaEfectivoStrong) diferenciaEfectivoStrong.textContent = formatearMoneda(diferenciaEfectivo, 'gs');
    if (diferenciaEfectivoItem) {
        diferenciaEfectivoItem.classList.remove('positivo', 'negativo');
        diferenciaEfectivoItem.classList.add(diferenciaEfectivo >= 0 ? 'positivo' : 'negativo');
    }

    // **CORRECCIÓN:** Actualizar las métricas del resumen después de cargar todos los datos
    if (typeof window.actualizarMetricasResumen === 'function') {
        window.actualizarMetricasResumen();
    }

    // **NUEVO:** Función para desplegar/colapsar los reportes
    window.toggleReporte = function (headerElement) {
        const contenido = headerElement.nextElementSibling;
        const estaVisible = contenido.style.display === 'block';
        contenido.style.display = estaVisible ? 'none' : 'block';
        headerElement.classList.toggle('activo', !estaVisible);
    }
}

/**
 * Función auxiliar para renderizar una lista de movimientos en el DOM.
 * @param {HTMLElement} contenedor - El elemento del DOM donde se renderizará la lista.
 * @param {Array} items - El array de movimientos a renderizar.
 * @param {String} tipo - El tipo de movimiento (para la cabecera).
 */
function renderizarLista(contenedor, items, tipo) {
    if (!contenedor) return 0; // Guard clause for missing container
    contenedor.innerHTML = '';
    if (items.length === 0) {
        contenedor.innerHTML = '<p class="text-center" style="color: var(--color-secundario);">No hay movimientos para los filtros seleccionados.</p>';
        // **MODIFICADO:** Limpiar el total si no hay items
        const totalizadorSpan = document.getElementById(`total${tipo.replace(/\s/g, '')}`);
        if (totalizadorSpan) {
            totalizadorSpan.innerHTML = '';
        }
        return 0; // **MODIFICADO:** Devolver 0 si no hay items.
    }

    items.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    let granTotal = 0; // **NUEVO:** Para calcular el total de la lista.

    // **NUEVO:** Crear tabla para vista desktop
    const tabla = document.createElement('table');
    tabla.className = 'tabla-resumen-excel';

    // Crear encabezado de tabla
    const thead = document.createElement('thead');
    thead.innerHTML = `
        <tr>
            <th class="col-fecha">Fecha</th>
            <th class="col-hora">Hora</th>
            <th class="col-caja">Caja</th>
            <th class="col-cajero">Cajero</th>
            <th class="col-descripcion">Descripción</th>
            <th class="col-monto">Monto</th>
        </tr>
    `;
    tabla.appendChild(thead);

    const tbody = document.createElement('tbody');

    items.forEach(item => {
        const esEgreso = tipo.toLowerCase().includes('egreso');
        const claseMonto = esEgreso ? 'negativo' : 'positivo';
        const signo = esEgreso ? '-' : '+';

        // Calcular el monto total del ítem
        let montoTotal = item.monto || 0;
        let montoParcial = 0; // Para casos específicos
        if (!montoTotal) {
            // **MODIFICADO:** Ajustar el cálculo del monto según el tipo de lista
            if (tipo === 'IngresosTienda' && item.valorVenta > 0) {
                montoTotal = item.valorVenta;
            } else if (tipo === 'IngresosTienda') {
                montoTotal = Object.entries(item.efectivo || {}).reduce((sum, [d, c]) => sum + (parseInt(d) * c), 0);
            } else if (tipo === 'Ingreso No Efectivo') {
                montoTotal = (item.pagosTarjeta || 0) + (item.ventasCredito || 0) + (item.pedidosYa || 0) + (item.ventasTransferencia || 0);
            } else if (tipo === 'IngresosServiciosEfectivo') {
                Object.values(item.servicios || {}).forEach(s => montoTotal += (s.monto || 0));
                (item.otrosServicios || []).forEach(s => montoTotal += (s.monto || 0));
            } else if (tipo === 'IngresosServiciosTarjeta') {
                Object.values(item.servicios || {}).forEach(s => montoTotal += (s.tarjeta || 0));
                (item.otrosServicios || []).forEach(s => montoTotal += (s.tarjeta || 0));
            } else {
                // Lógica original para servicios y egresos
                montoTotal += Object.entries(item.efectivo || {}).reduce((sum, [d, c]) => sum + (parseInt(d) * c), 0);
                montoTotal += (item.pagosTarjeta || 0) + (item.ventasCredito || 0) + (item.pedidosYa || 0) + (item.ventasTransferencia || 0);
                Object.values(item.servicios || {}).forEach(s => montoTotal += (s.monto || 0) + (s.tarjeta || 0));
                (item.otrosServicios || []).forEach(s => montoTotal += (s.monto || 0) + (s.tarjeta || 0));
            }
        }

        granTotal += montoTotal; // **NUEVO:** Sumar al total de la lista.

        // **NUEVO:** Construir título del movimiento según el tipo
        let tituloMovimiento = '';

        // **NUEVO:** Extraer títulos para Ingresos No Efectivo (PRIMERO)
        if (tipo === 'Ingreso No Efectivo') {
            const tiposIngreso = [];

            if (item.pagosTarjeta > 0) tiposIngreso.push('Pago c/ Tarjeta');
            if (item.ventasCredito > 0) tiposIngreso.push('Venta a Crédito');
            if (item.pedidosYa > 0) tiposIngreso.push('Pedidos Ya');
            if (item.ventasTransferencia > 0) tiposIngreso.push('Venta a Transferencia');

            if (tiposIngreso.length > 0) {
                tituloMovimiento = tiposIngreso.join(', ');
            }
        }

        if (tipo === 'IngresosServiciosTarjeta' || tipo === 'IngresosServiciosEfectivo') {
            const nombresServicios = [];

            // Mapeo de claves a nombres legibles
            const nombresLegibles = {
                'apLote': 'Aca Puedo',
                'aquiPago': 'Aquí Pago',
                'expressLote': 'Pago Express',
                'wepa': 'WEPA',
                'pasajeNsa': 'Pasaje NSA',
                'encomiendaNsa': 'Encomienda NSA',
                'apostala': 'Apostala'
            };

            // Extraer servicios según el tipo
            if (tipo === 'IngresosServiciosTarjeta') {
                // Servicios con tarjeta
                Object.entries(item.servicios || {}).forEach(([key, servicio]) => {
                    if (servicio.tarjeta > 0) {
                        nombresServicios.push(nombresLegibles[key] || key);
                    }
                });
                (item.otrosServicios || []).forEach(s => {
                    if (s.tarjeta > 0) {
                        nombresServicios.push(s.nombre);
                    }
                });
            } else if (tipo === 'IngresosServiciosEfectivo') {
                // Servicios con efectivo
                Object.entries(item.servicios || {}).forEach(([key, servicio]) => {
                    if (servicio.monto > 0) {
                        nombresServicios.push(nombresLegibles[key] || key);
                    }
                });
                (item.otrosServicios || []).forEach(s => {
                    if (s.monto > 0) {
                        nombresServicios.push(s.nombre);
                    }
                });
            }

            // Si hay servicios, usar sus nombres; si no, usar la descripción
            if (nombresServicios.length > 0) {
                tituloMovimiento = nombresServicios.join(', ');
            }
        }

        // **NUEVO:** Fallback si no se pudo determinar un título específico
        if (!tituloMovimiento) {
            tituloMovimiento = item.descripcion || item.categoria || 'Movimiento';
        }

        // **NUEVO:** Extraer fecha y hora
        const fechaCompleta = new Date(item.fecha);
        const fecha = fechaCompleta.toLocaleDateString('es-PY');
        const hora = fechaCompleta.toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' });

        // **NUEVO:** Crear fila de tabla para desktop
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="col-fecha">${fecha}</td>
            <td class="col-hora">${hora}</td>
            <td class="col-caja">${item.caja || 'N/A'}</td>
            <td class="col-cajero">${item.cajero || 'N/A'}</td>
            <td class="col-descripcion">${tituloMovimiento}</td>
            <td class="col-monto monto-${claseMonto}">${signo}${formatearMoneda(montoTotal, item.moneda || 'gs')}</td>
        `;
        tbody.appendChild(tr);

        // **MANTENER:** Crear tarjeta para vista móvil
        const div = document.createElement('div');
        div.className = 'movimiento-item';
        div.innerHTML = `
            <div class="movimiento-header">
                <span class="movimiento-tipo">${tituloMovimiento}</span>
                <span class="movimiento-monto ${claseMonto}">${signo}${formatearMoneda(montoTotal, item.moneda || 'gs')}</span>
            </div>
            <div class="movimiento-detalles">
                <small>${formatearFecha(item.fecha)} | ${item.caja || 'N/A'} | <strong>${item.cajero || 'N/A'}</strong></small>
            </div>
        `;
        contenedor.appendChild(div);
    });

    // Agregar tabla al contenedor
    tabla.appendChild(tbody);
    contenedor.insertBefore(tabla, contenedor.firstChild);

    // **MODIFICADO:** Colocar el totalizador en el span de la cabecera.
    if (items.length > 0) {
        const esEgreso = tipo.toLowerCase().includes('egreso');
        const claseTotal = esEgreso ? 'negativo' : 'positivo';

        // **CORRECCIÓN:** Construir el ID del span del totalizador. Ej: 'IngresosTienda' -> 'totalIngresosTienda'
        const idTotalizador = `total${tipo}`;
        const totalizadorSpan = document.getElementById(idTotalizador);

        if (totalizadorSpan) {
            totalizadorSpan.className = `reporte-total ${claseTotal}`;
            totalizadorSpan.innerHTML = `<strong>${formatearMoneda(granTotal, 'gs')}</strong>`;
        }
    }

    return granTotal; // **MODIFICADO:** Devolver el total calculado.
}

/**
 * Calcula el saldo de EFECTIVO del día anterior (ingresos efectivo - egresos)
 * @param {string} fechaActual - Fecha del día actual (formato YYYY-MM-DD)
 * @param {string} filtroCaja - Caja específica o "" para todas
 * @returns {object} { total: number, detallePorCaja: array, fecha: string }
 */
function calcularSaldoDiaAnterior(fechaActual, filtroCaja = '') {
    if (!fechaActual) {
        return { total: 0, detallePorCaja: [], fecha: '' };
    }

    // Calcular fecha del día anterior
    const fecha = new Date(fechaActual + 'T00:00:00');
    fecha.setDate(fecha.getDate() - 1);
    const fechaAnterior = fecha.toISOString().split('T')[0];

    // Obtener movimientos del día anterior
    const ingresosAnterior = estado.movimientosTemporales.filter(m =>
        m.fecha.startsWith(fechaAnterior) &&
        (!filtroCaja || m.caja === filtroCaja)
    );

    const egresosAnterior = estado.egresosCaja.filter(e =>
        e.fecha.startsWith(fechaAnterior) &&
        (!filtroCaja || e.caja === filtroCaja)
    );

    const movimientosAnterior = estado.movimientos.filter(m =>
        m.fecha.startsWith(fechaAnterior) &&
        (!filtroCaja || m.caja === filtroCaja)
    );

    // Calcular totales por caja
    const cajas = filtroCaja ? [filtroCaja] : ['Caja 1', 'Caja 2', 'Caja 3'];
    const detallePorCaja = [];
    let totalGeneral = 0;

    cajas.forEach(caja => {
        // Calcular SOLO ingresos en EFECTIVO de la caja
        let totalIngresosCaja = 0;

        ingresosAnterior.filter(m => m.caja === caja).forEach(m => {
            // Ingresos de tienda - SOLO EFECTIVO
            const efectivo = m.valorVenta ||
                Object.entries(m.efectivo || {}).reduce((s, [d, c]) => s + (parseInt(d) * c), 0);

            // Servicios - SOLO EFECTIVO (no tarjeta)
            let serviciosEfectivo = 0;
            Object.values(m.servicios || {}).forEach(s => {
                serviciosEfectivo += (s.monto || 0); // Solo monto, no tarjeta
            });
            (m.otrosServicios || []).forEach(s => {
                serviciosEfectivo += (s.monto || 0); // Solo monto, no tarjeta
            });

            totalIngresosCaja += efectivo + serviciosEfectivo;
        });

        // NO agregar depósitos-inversiones (no es efectivo de caja)

        // Calcular TODOS los egresos de la caja
        const totalEgresosCaja = egresosAnterior
            .filter(e => e.caja === caja)
            .reduce((sum, e) => sum + (e.monto || 0), 0) +
            movimientosAnterior
                .filter(m => m.caja === caja && (m.tipo === 'gasto' || m.tipo === 'egreso'))
                .reduce((sum, m) => sum + (m.monto || 0), 0);

        const saldoCaja = totalIngresosCaja - totalEgresosCaja;

        if (saldoCaja !== 0 || totalIngresosCaja !== 0 || totalEgresosCaja !== 0) {
            detallePorCaja.push({
                caja,
                ingresos: totalIngresosCaja,
                egresos: totalEgresosCaja,
                saldo: saldoCaja
            });
            totalGeneral += saldoCaja;
        }
    });

    return {
        total: totalGeneral,
        detallePorCaja,
        fecha: fechaAnterior
    };
}

/**
 * Renderiza el detalle del saldo del día anterior por caja
 */
function renderizarDetalleSaldoAnterior(detallePorCaja, fechaAnterior) {
    const contenedor = document.getElementById('detalleSaldoDiaAnterior');
    if (!contenedor) return;

    if (detallePorCaja.length === 0) {
        contenedor.innerHTML = `<p class="text-center" style="color: var(--color-secundario);">No hay saldo del día anterior${fechaAnterior ? ` (${fechaAnterior})` : ''}</p>`;
        return;
    }

    const tabla = document.createElement('table');
    tabla.className = 'tabla-resumen-excel';

    const thead = document.createElement('thead');
    thead.innerHTML = `
        <tr>
            <th>Caja</th>
            <th>Ingresos</th>
            <th>Egresos</th>
            <th>Saldo</th>
        </tr>
    `;
    tabla.appendChild(thead);

    const tbody = document.createElement('tbody');
    detallePorCaja.forEach(d => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${d.caja}</td>
            <td class="positivo">${formatearMoneda(d.ingresos, 'gs')}</td>
            <td class="negativo">${formatearMoneda(d.egresos, 'gs')}</td>
            <td class="${d.saldo >= 0 ? 'positivo' : 'negativo'}">
                ${formatearMoneda(d.saldo, 'gs')}
            </td>
        `;
        tbody.appendChild(tr);
    });
    tabla.appendChild(tbody);

    contenedor.innerHTML = '';
    contenedor.appendChild(tabla);
}

// Función para descargar Excel con detalles completos
async function descargarExcel() {
    // **NUEVO:** Definir tipos de egresos de tesorería una sola vez
    const tiposEgresosTesoreria = ['gasto', 'egreso', 'operacion', 'transferencia'];

    const fechaDesde = document.getElementById('fechaResumenDesde').value;
    const fechaHasta = document.getElementById('fechaResumenHasta').value;
    if (!fechaDesde || !fechaHasta) {
        mostrarMensaje('Por favor, seleccione un rango de fechas para descargar el resumen.', 'peligro');
        return;
    }

    // Mostrar mensaje de carga
    mostrarMensaje('Cargando datos para exportar...', 'info');

    // **NUEVO**: Recargar TODOS los datos antes de exportar para asegurar que tenemos el historial completo
    try {
        // Cargar todos los movimientos (ingresos guardados)
        const m = await (window.db.obtenerMovimientos ? window.db.obtenerMovimientos() : { data: [] });
        estado.movimientos = (m && m.data) || JSON.parse(localStorage.getItem('movimientos')) || [];

        // Cargar todos los egresos
        const e = await (window.db.obtenerEgresosCaja ? window.db.obtenerEgresosCaja() : { data: [] });
        estado.egresosCaja = (e && e.data) || JSON.parse(localStorage.getItem('egresosCaja')) || [];

        // Cargar movimientos temporales (ingresos del día actual)
        const t = await (window.db.obtenerMovimientosTemporales ? window.db.obtenerMovimientosTemporales() : { data: [] });
        estado.movimientosTemporales = (t && t.data) || JSON.parse(localStorage.getItem('movimientosTemporales')) || [];

        // Cargar servicios en efectivo si existen
        if (window.db.obtenerServiciosEfectivo) {
            const s = await window.db.obtenerServiciosEfectivo();
            estado.serviciosEfectivo = (s && s.data) || [];
        }

        console.log('Datos cargados para exportación:');
        console.log('- Movimientos (ingresos guardados):', estado.movimientos.length);
        console.log('- Movimientos temporales (ingresos actuales):', estado.movimientosTemporales.length);
        console.log('- Egresos:', estado.egresosCaja.length);
        console.log('- Servicios efectivo:', (estado.serviciosEfectivo || []).length);
    } catch (error) {
        console.error('Error cargando datos:', error);
        mostrarMensaje('Error al cargar datos. Usando datos en caché.', 'advertencia');
    }

    // Filtrar datos por fecha
    const arqueosDelPeriodo = estado.arqueos.filter(a => a.fecha.split('T')[0] >= fechaDesde && a.fecha.split('T')[0] <= fechaHasta);

    // Combinar movimientos temporales (ingresos del día actual) con movimientos guardados (ingresos de arqueos anteriores)
    const todosLosMovimientos = [
        ...(estado.movimientosTemporales || []),
        ...(estado.movimientos || [])
    ];

    const movimientosDelPeriodo = todosLosMovimientos.filter(m => m.fecha.split('T')[0] >= fechaDesde && m.fecha.split('T')[0] <= fechaHasta);
    const egresosCajaDelPeriodo = estado.egresosCaja.filter(e => e.fecha.split('T')[0] >= fechaDesde && e.fecha.split('T')[0] <= fechaHasta);
    const serviciosEfectivoDelPeriodo = estado.serviciosEfectivo ? estado.serviciosEfectivo.filter(s => s.fecha.split('T')[0] >= fechaDesde && s.fecha.split('T')[0] <= fechaHasta) : [];

    // Crear libro de trabajo
    const wb = XLSX.utils.book_new();

    // ========== HOJA 1: RESUMEN GENERAL ==========
    const datosResumen = [];
    datosResumen.push(['RESUMEN GENERAL DE TESORERÍA']);
    datosResumen.push(['Período:', `${fechaDesde} al ${fechaHasta}`]);
    datosResumen.push([]);

    // Calcular totales
    let totalIngresosEfectivo = 0;
    let totalIngresosNoEfectivo = 0;
    let totalEgresos = 0;

    movimientosDelPeriodo.forEach(m => {
        const efectivo = parsearMoneda(m.totalEfectivo || 0);
        const tarjeta = parsearMoneda(m.pagosTarjeta || 0);
        const credito = parsearMoneda(m.ventasCredito || 0);
        const pedidosYa = parsearMoneda(m.pedidosYa || 0);
        const transferencia = parsearMoneda(m.ventasTransferencia || 0);

        totalIngresosEfectivo += efectivo;
        totalIngresosNoEfectivo += tarjeta + credito + pedidosYa + transferencia;
    });

    serviciosEfectivoDelPeriodo.forEach(s => {
        totalIngresosEfectivo += parsearMoneda(s.efectivo || 0);
    });

    egresosCajaDelPeriodo.forEach(e => {
        totalEgresos += parsearMoneda(e.monto || 0);
    });

    // **NUEVO:** Sumar egresos de tesorería (operaciones)
    movimientosDelPeriodo.forEach(m => {
        if (tiposEgresosTesoreria.includes(m.tipo)) {
            totalEgresos += parsearMoneda(m.monto || 0);
        }
    });

    // **NUEVO:** Calcular total de Depósitos - Inversiones
    let totalDepositosInversiones = 0;
    movimientosDelPeriodo.forEach(m => {
        if (m.tipo === 'deposito-inversiones') {
            totalDepositosInversiones += parsearMoneda(m.monto || 0);
        }
    });

    datosResumen.push(['INGRESOS']);
    datosResumen.push(['Ingresos en Efectivo:', formatearMoneda(totalIngresosEfectivo, 'gs')]);
    datosResumen.push(['Depósitos - Inversiones:', formatearMoneda(totalDepositosInversiones, 'gs')]);
    datosResumen.push(['Ingresos No Efectivo:', formatearMoneda(totalIngresosNoEfectivo, 'gs')]);
    datosResumen.push(['Total Ingresos:', formatearMoneda(totalIngresosEfectivo + totalDepositosInversiones + totalIngresosNoEfectivo, 'gs')]);
    datosResumen.push([]);
    datosResumen.push(['EGRESOS']);
    datosResumen.push(['Total Egresos:', formatearMoneda(totalEgresos, 'gs')]);
    datosResumen.push([]);
    datosResumen.push(['SALDO']);
    datosResumen.push(['Efectivo en Caja:', formatearMoneda(totalIngresosEfectivo + totalDepositosInversiones - totalEgresos, 'gs')]);
    datosResumen.push(['Total General:', formatearMoneda(totalIngresosEfectivo + totalIngresosNoEfectivo - totalEgresos, 'gs')]);

    const wsResumen = XLSX.utils.aoa_to_sheet(datosResumen);
    wsResumen['!cols'] = [{ wch: 25 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen');

    // ========== HOJA 2: INGRESOS EN EFECTIVO (TIENDA) ==========
    const datosIngresosEfectivo = [];
    datosIngresosEfectivo.push(['INGRESOS EN EFECTIVO - VENTAS DE TIENDA']);
    datosIngresosEfectivo.push(['Fecha/Hora', 'Caja', 'Cajero', 'Descripción', 'Total Venta', 'Vuelto', 'Efectivo Neto']);

    movimientosDelPeriodo.forEach(m => {
        const efectivo = parsearMoneda(m.totalEfectivo || 0);
        const vuelto = parsearMoneda(m.vuelto || 0);
        if (efectivo > 0) {
            datosIngresosEfectivo.push([
                formatearFecha(m.fecha),
                m.caja || '',
                m.cajero || '',
                m.descripcion || '',
                formatearMoneda(efectivo + vuelto, 'gs'),
                formatearMoneda(vuelto, 'gs'),
                formatearMoneda(efectivo, 'gs')
            ]);
        }
    });

    const wsIngresosEfectivo = XLSX.utils.aoa_to_sheet(datosIngresosEfectivo);
    wsIngresosEfectivo['!cols'] = [{ wch: 18 }, { wch: 15 }, { wch: 20 }, { wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, wsIngresosEfectivo, 'Ingresos Efectivo');

    // ========== HOJA 3: SERVICIOS CON EFECTIVO (DETALLADO) ==========
    const datosServiciosEfectivo = [];
    datosServiciosEfectivo.push(['INGRESOS POR SERVICIOS - EFECTIVO (DETALLADO)']);
    datosServiciosEfectivo.push(['Fecha/Hora', 'Caja', 'Cajero', 'Nombre del Servicio', 'Monto Servicio']);

    // Mapeo de claves a nombres legibles
    const nombresLegibles = {
        'apLote': 'ACA PUEDO',
        'aquiPago': 'Aquí Pago',
        'expressLote': 'Pago Express',
        'wepa': 'WEPA',
        'pasajeNsa': 'Pasaje NSA',
        'encomiendaNsa': 'Encomienda NSA',
        'apostala': 'Apostala'
    };

    // Agregar servicios de efectivo desde movimientos
    movimientosDelPeriodo.forEach(m => {
        if (m.servicios) {
            const agregarServicioEfectivo = (nombre, servicio) => {
                if (servicio && servicio.monto > 0) {
                    datosServiciosEfectivo.push([
                        formatearFecha(m.fecha),
                        m.caja || '',
                        m.cajero || '',
                        nombre,
                        formatearMoneda(servicio.monto, 'gs')
                    ]);
                }
            };

            agregarServicioEfectivo('ACA PUEDO', m.servicios.apLote);
            agregarServicioEfectivo('Aquí Pago', m.servicios.aquiPago);
            agregarServicioEfectivo('Pago Express', m.servicios.expressLote);
            agregarServicioEfectivo('WEPA', m.servicios.wepa);
            agregarServicioEfectivo('Pasaje NSA', m.servicios.pasajeNsa);
            agregarServicioEfectivo('Encomienda NSA', m.servicios.encomiendaNsa);
            agregarServicioEfectivo('Apostala', m.servicios.apostala);

            if (m.otrosServicios) {
                m.otrosServicios.forEach(s => agregarServicioEfectivo(s.nombre, s));
            }
        }
    });

    // Agregar servicios de efectivo desde serviciosEfectivo
    serviciosEfectivoDelPeriodo.forEach(s => {
        datosServiciosEfectivo.push([
            formatearFecha(s.fecha),
            s.caja || '',
            s.cajero || '',
            s.nombreServicio || 'Servicio',
            formatearMoneda(s.montoServicio || s.efectivo || 0, 'gs')
        ]);
    });

    const wsServiciosEfectivo = XLSX.utils.aoa_to_sheet(datosServiciosEfectivo);
    wsServiciosEfectivo['!cols'] = [{ wch: 18 }, { wch: 15 }, { wch: 20 }, { wch: 30 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, wsServiciosEfectivo, 'Servicios Efectivo');

    // ========== HOJA 4: INGRESOS NO EFECTIVO ==========
    const datosIngresosNoEfectivo = [];
    datosIngresosNoEfectivo.push(['INGRESOS NO EFECTIVO']);
    datosIngresosNoEfectivo.push(['Fecha/Hora', 'Caja', 'Cajero', 'Descripción', 'Tarjeta', 'Crédito', 'PedidosYA', 'Transferencia', 'Total']);

    movimientosDelPeriodo.forEach(m => {
        const tarjeta = parsearMoneda(m.pagosTarjeta || 0);
        const credito = parsearMoneda(m.ventasCredito || 0);
        const pedidosYa = parsearMoneda(m.pedidosYa || 0);
        const transferencia = parsearMoneda(m.ventasTransferencia || 0);
        const total = tarjeta + credito + pedidosYa + transferencia;

        if (total > 0) {
            datosIngresosNoEfectivo.push([
                formatearFecha(m.fecha),
                m.caja || '',
                m.cajero || '',
                m.descripcion || '',
                formatearMoneda(tarjeta, 'gs'),
                formatearMoneda(credito, 'gs'),
                formatearMoneda(pedidosYa, 'gs'),
                formatearMoneda(transferencia, 'gs'),
                formatearMoneda(total, 'gs')
            ]);
        }
    });

    const wsIngresosNoEfectivo = XLSX.utils.aoa_to_sheet(datosIngresosNoEfectivo);
    wsIngresosNoEfectivo['!cols'] = [{ wch: 18 }, { wch: 15 }, { wch: 20 }, { wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, wsIngresosNoEfectivo, 'Ingresos No Efectivo');

    // ========== HOJA 5: SERVICIOS CON TARJETA ==========
    const datosServiciosTarjeta = [];
    datosServiciosTarjeta.push(['INGRESOS POR SERVICIOS - TARJETA']);
    datosServiciosTarjeta.push(['Fecha/Hora', 'Caja', 'Cajero', 'Servicio', 'Referencia/Lote', 'Monto Tarjeta']);

    movimientosDelPeriodo.forEach(m => {
        if (m.servicios) {
            const agregarServicio = (nombre, servicio) => {
                if (servicio && servicio.tarjeta > 0) {
                    datosServiciosTarjeta.push([
                        formatearFecha(m.fecha),
                        m.caja || '',
                        m.cajero || '',
                        nombre,
                        servicio.lote || servicio.referencia || '',
                        formatearMoneda(servicio.tarjeta, 'gs')
                    ]);
                }
            };

            agregarServicio('ACA PUEDO', m.servicios.apLote);
            agregarServicio('Aquí Pago', m.servicios.aquiPago);
            agregarServicio('Pago Express', m.servicios.expressLote);
            agregarServicio('WEPA', m.servicios.wepa);
            agregarServicio('Pasaje NSA', m.servicios.pasajeNsa);
            agregarServicio('Encomienda NSA', m.servicios.encomiendaNsa);
            agregarServicio('Apostala', m.servicios.apostala);

            if (m.otrosServicios) {
                m.otrosServicios.forEach(s => agregarServicio(s.nombre, s));
            }
        }
    });

    const wsServiciosTarjeta = XLSX.utils.aoa_to_sheet(datosServiciosTarjeta);
    wsServiciosTarjeta['!cols'] = [{ wch: 18 }, { wch: 15 }, { wch: 20 }, { wch: 25 }, { wch: 20 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, wsServiciosTarjeta, 'Servicios Tarjeta');

    // ========== HOJA 6: EGRESOS (COMPLETO) ==========
    const datosEgresos = [];
    datosEgresos.push(['EGRESOS DE CAJA']);
    datosEgresos.push(['Fecha/Hora', 'Caja', 'Cajero', 'Tipo', 'Categoría', 'Descripción', 'Monto', 'Referencia', 'Nro. Recibo']);

    // **MODIFICADO:** Combinar egresos directos con TODOS los egresos de tesorería (igual que en la página de resumen)
    const todosLosEgresos = [
        ...egresosCajaDelPeriodo.map(e => ({ ...e, tipoMovimiento: 'EGRESO DIRECTO' })),
        ...movimientosDelPeriodo.filter(m => tiposEgresosTesoreria.includes(m.tipo)).map(m => ({ ...m, tipoMovimiento: m.tipo.toUpperCase() }))
    ];

    // Ordenar por fecha (más recientes primero)
    todosLosEgresos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    todosLosEgresos.forEach(e => {
        datosEgresos.push([
            formatearFecha(e.fecha),
            e.caja || '',
            e.cajero || '',
            e.tipoMovimiento || 'EGRESO',
            e.categoria || '',
            e.descripcion || '',
            formatearMoneda(e.monto, e.moneda || 'gs'),
            e.referencia || '',
            e.numeroRecibo ? String(e.numeroRecibo).padStart(6, '0') : ''
        ]);
    });

    const wsEgresos = XLSX.utils.aoa_to_sheet(datosEgresos);
    wsEgresos['!cols'] = [{ wch: 18 }, { wch: 15 }, { wch: 20 }, { wch: 18 }, { wch: 20 }, { wch: 35 }, { wch: 15 }, { wch: 20 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, wsEgresos, 'Egresos');

    // ========== HOJA 7: DEPOSITOS - INVERSIONES ==========
    const datosDepositosInversiones = [];
    datosDepositosInversiones.push(['DEPÓSITOS - INVERSIONES']);
    datosDepositosInversiones.push(['Fecha/Hora', 'Caja', 'Cajero', 'Descripción', 'Monto', 'Referencia']);

    // Filtrar movimientos de tipo deposito-inversiones
    const depositosInversiones = movimientosDelPeriodo.filter(m => m.tipo === 'deposito-inversiones');

    // Ordenar por fecha (más recientes primero)
    depositosInversiones.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    depositosInversiones.forEach(d => {
        datosDepositosInversiones.push([
            formatearFecha(d.fecha),
            d.caja || '',
            d.cajero || '',
            d.descripcion || '',
            formatearMoneda(d.monto, d.moneda || 'gs'),
            d.referencia || ''
        ]);
    });

    const wsDepositosInversiones = XLSX.utils.aoa_to_sheet(datosDepositosInversiones);
    wsDepositosInversiones['!cols'] = [{ wch: 18 }, { wch: 15 }, { wch: 20 }, { wch: 35 }, { wch: 15 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, wsDepositosInversiones, 'Depositos Inversiones');

    // Descargar archivo
    const nombreArchivo = `Resumen_Detallado_${fechaDesde}_al_${fechaHasta}.xlsx`;
    XLSX.writeFile(wb, nombreArchivo);

    mostrarMensaje('Excel exportado exitosamente con todos los detalles', 'exito');
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
    console.log('=== guardarEnLocalStorage ===');
    console.log('estado.fondoFijoPorCaja:', estado.fondoFijoPorCaja);

    localStorage.setItem('arqueos', JSON.stringify(estado.arqueos));
    localStorage.setItem('movimientos', JSON.stringify(estado.movimientos));
    localStorage.setItem('egresosCaja', JSON.stringify(estado.egresosCaja));
    localStorage.setItem('ultimoNumeroRecibo', JSON.stringify(estado.ultimoNumeroRecibo));
    localStorage.setItem('fondoFijoPorCaja', JSON.stringify(estado.fondoFijoPorCaja)); // **NUEVO:** Guardar fondo fijo

    console.log('fondoFijoPorCaja guardado en localStorage:', localStorage.getItem('fondoFijoPorCaja'));
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
    const navOperaciones = document.querySelector('a[href="operaciones.html"]')?.parentElement;
    const navResumen = document.querySelector('a[href="resumen.html"]')?.parentElement;

    // Por defecto, ocultar Usuarios para todos
    if (navUsuarios) navUsuarios.style.display = 'none';

    // Control de visibilidad según rol
    if (rol === 'cajero') {
        // Cajeros solo ven: Ingresos, Egresos, Arqueo de Caja
        if (navOperaciones) navOperaciones.style.display = 'none';
        if (navResumen) navResumen.style.display = 'none';
    } else if (rol === 'tesoreria') {
        // Tesorería ve todo excepto Usuarios
        if (navOperaciones) navOperaciones.style.display = '';
        if (navResumen) navResumen.style.display = '';
    } else if (rol === 'admin') {
        // Admin ve TODO, incluyendo Usuarios
        if (navOperaciones) navOperaciones.style.display = '';
        if (navResumen) navResumen.style.display = '';
        if (navUsuarios) navUsuarios.style.display = ''; // Solo admin ve Usuarios
    } else {
        // Para cualquier otro rol o sin rol, ocultar todo excepto básico
        if (navOperaciones) navOperaciones.style.display = 'none';
        if (navResumen) navResumen.style.display = 'none';
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

// ============================
// Gestión de Usuarios (UI)
// ============================
async function cargarUsuariosUI() {
    // Validar acceso de administrador
    const userRole = sessionStorage.getItem('userRole');
    if (userRole !== 'admin') {
        mostrarMensaje('Acceso denegado. Solo los administradores pueden gestionar usuarios.', 'peligro');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
        return;
    }

    const lista = document.getElementById('listaUsuarios');
    const form = document.getElementById('formularioUsuario');
    if (!lista || !form || !window.db || !window.db.obtenerUsuarios) return;

    const res = await window.db.obtenerTodosUsuarios();
    const usuarios = res.success ? (res.data || []) : [];
    lista.innerHTML = '';
    if (usuarios.length === 0) {
        lista.innerHTML = '<p class="text-center" style="color: var(--color-secundario);">No hay usuarios.</p>';
    } else {
        usuarios.forEach(u => {
            const div = document.createElement('div');
            div.className = 'movimiento-item';
            div.innerHTML = `
                <div class="movimiento-header">
                    <span class="movimiento-tipo">${u.username}</span>
                    <span class="movimiento-monto">${u.rol.toUpperCase()} ${u.activo ? '' : '(INACTIVO)'}</span>
                </div>
                <div class="movimiento-detalles" style="display:flex; gap:10px; align-items:flex-end;">
                    <div>
                        <label>Rol</label>
                        <select data-role id="role-${u.id}">
                            <option value="cajero" ${u.rol === 'cajero' ? 'selected' : ''}>Cajero</option>
                            <option value="tesoreria" ${u.rol === 'tesoreria' ? 'selected' : ''}>Tesorería</option>
                            <option value="admin" ${u.rol === 'admin' ? 'selected' : ''}>Administrador</option>
                        </select>
                    </div>
                    <div>
                        <label>Nueva contraseña</label>
                        <input type="password" id="pass-${u.id}" placeholder="Opcional">
                    </div>
                    <div>
                        <label>Activo</label>
                        <input type="checkbox" id="activo-${u.id}" ${u.activo ? 'checked' : ''}>
                    </div>
                </div>
                <div class="movimiento-acciones" style="margin-top:8px;">
                    <button class="btn-accion editar" data-id="${u.id}">Guardar</button>
                    <button class="btn-accion eliminar" data-id-toggle="${u.id}">${u.activo ? 'Desactivar' : 'Activar'}</button>
                </div>
            `;
            lista.appendChild(div);
        });
        lista.addEventListener('click', async (e) => {
            const guardarBtn = e.target.closest('button[data-id]');
            const toggleBtn = e.target.closest('button[data-id-toggle]');
            if (guardarBtn) {
                const id = parseInt(guardarBtn.getAttribute('data-id'), 10);
                const roleSel = document.getElementById(`role-${id}`);
                const passInput = document.getElementById(`pass-${id}`);
                const activoChk = document.getElementById(`activo-${id}`);

                // Validar que los elementos existan
                if (!roleSel || !passInput || !activoChk) {
                    showNotification('Error: No se encontraron los campos del usuario', 'error');
                    console.error('Elementos no encontrados:', { roleSel, passInput, activoChk, id });
                    return;
                }

                // IMPORTANTE: Capturar valores ANTES del await
                const rolValue = roleSel.value;
                const passValue = passInput.value;
                const activoValue = activoChk.checked;

                const updates = { rol: rolValue, activo: !!activoValue };
                if (passValue) updates.password = passValue;
                const resu = await window.db.actualizarUsuario(id, updates);
                if (resu.success) {
                    showNotification('Usuario actualizado correctamente', 'success');
                    cargarUsuariosUI();
                } else {
                    showNotification('Error al actualizar usuario', 'error');
                }
            }
            if (toggleBtn) {
                const id = parseInt(toggleBtn.getAttribute('data-id-toggle'), 10);
                const activoChk = document.getElementById(`activo-${id}`);
                const nuevo = !activoChk.checked;
                const resu = await window.db.toggleUsuarioActivo(id, nuevo);
                if (resu.success) {
                    mostrarMensaje(nuevo ? 'Usuario activado' : 'Usuario desactivado', 'info');
                    cargarUsuariosUI();
                } else {
                    mostrarMensaje('Error al cambiar estado', 'peligro');
                }
            }
        });
    }

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const username = document.getElementById('nuevoUsuarioNombre').value;
        const password = document.getElementById('nuevoUsuarioPassword').value;
        const rol = document.getElementById('nuevoUsuarioRol').value;
        if (!username || !password || !rol) return;
        const crear = await window.db.crearUsuario({ username, password, rol, activo: true });
        if (crear.success) {
            mostrarMensaje('Usuario creado', 'exito');
            form.reset();
            cargarUsuariosUI();
        } else {
            mostrarMensaje('Error al crear usuario', 'peligro');
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('listaUsuarios')) {
        cargarUsuariosUI();
    }
});

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

    // **NOTA:** La gestión de usuarios ahora usa solo Supabase vía cargarUsuariosUI()
    // La función inicializarGestionUsuarios() (localStorage) ya no se usa para evitar conflictos.

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
        cargarFondoFijoEnArqueo(); // **NUEVO:** Cargar fondo fijo al inicializar la página de arqueo
        // **NUEVO:** Asegurar que la fecha y hora se establezcan al cargar la página de arqueo.
        const fechaArqueoInput = document.getElementById('fecha');
        if (fechaArqueoInput) fechaArqueoInput.value = obtenerFechaHoraLocalISO();

    }
    // **NUEVO:** Inicializar la página de Resumen
    if (document.getElementById('resumen')) {
        const fechaDesdeInput = document.getElementById('fechaResumenDesde');
        const fechaHastaInput = document.getElementById('fechaResumenHasta');
        const hoy = obtenerFechaHoraLocalISO().split('T')[0];

        fechaDesdeInput.value = hoy;
        fechaHastaInput.value = hoy;

        cargarResumenDiario(); // Cargar el resumen del día actual al entrar a la página
    }
    // ... y así sucesivamente para las otras páginas.
});

// **NUEVA FUNCIÓN AUXILIAR PARA REGISTRAR EDICIONES**
async function registrarEdicion(item) {
    const motivoEdicion = await window.showPrompt('Por favor, ingrese el motivo de la edición:', {
        title: 'Motivo de Edición',
        placeholder: 'Ej: Error en el monto'
    });

    if (motivoEdicion === null) { // El usuario presionó "Cancelar" o ESC
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
async function cerrarSesion() {
    const confirmed = await showConfirm('¿Está seguro de que desea cerrar la sesión?', {
        title: 'Cerrar Sesión',
        confirmText: 'Sí, cerrar',
        type: 'warning'
    });

    if (confirmed) {
        // Limpiar los datos de la sesión del usuario
        sessionStorage.clear();

        // Mostrar un mensaje y redirigir a la página de login
        showNotification('Sesión cerrada exitosamente', 'success');
        setTimeout(() => window.location.href = 'login.html', 500);
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

async function eliminarArqueo(arqueoId, event) {
    event.stopPropagation(); // Evita que se dispare el modal de detalles

    const confirmed = await showConfirm('¿Está seguro de que desea eliminar este arqueo de forma permanente? Esta acción no se puede deshacer.', {
        title: 'Eliminar Arqueo',
        confirmText: 'Sí, eliminar',
        type: 'danger',
        confirmButtonType: 'danger'
    });
    if (confirmed) {
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

    // **NUEVO:** Verificar si el usuario es administrador para mostrar el botón de eliminar
    const userRole = sessionStorage.getItem('userRole');
    const esAdmin = userRole === 'admin';

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

            <!-- **NUEVO:** Botones de acción en el modal -->
            <div class="modal-footer" style="display: flex; justify-content: space-between; align-items: center; margin-top: 20px;">
                <div>
                    ${esAdmin ? `<button class="btn btn-peligro" onclick="eliminarArqueo('${arqueo.id}', event); cerrarModal();" style="background-color: var(--color-peligro);">🗑️ Eliminar Arqueo</button>` : ''}
                </div>
                <div>
                    <button class="btn" onclick="exportarArqueoPDFById('${arqueo.id}')">Exportar a PDF</button>
                </div>
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

    // CORRECCIÓN: Filtrar ingresos por fecha y caja para que coincida con la vista.
    let ingresosParaArqueo = estado.movimientosTemporales.filter(m =>
        m.fecha.startsWith(fechaArqueo) && m.caja === cajaFiltro
    );
    let egresosParaArqueo = estado.egresosCaja.filter(e =>
        e.fecha.startsWith(fechaArqueo) && e.caja === cajaFiltro
    );

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

async function eliminarUsuario(username) {
    const confirmed = await showConfirm(`¿Está seguro de que desea eliminar al usuario "${username}"?`, {
        title: 'Eliminar Usuario',
        confirmText: 'Sí, eliminar',
        type: 'danger',
        confirmButtonType: 'danger'
    });
    if (confirmed) {
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
    localStorage.setItem('fondoFijoPorCaja', JSON.stringify(estado.fondoFijoPorCaja)); // **NUEVO:** Guardar fondo fijo
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
    .resumen-columnas {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: 2rem;
        margin-top: 2rem;
    }
    .resumen-card-principal {
        background-color: var(--color-fondo);
        border: 1px solid var(--color-borde);
        border-radius: 0.5rem;
        padding: 1rem;
        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }
    .reporte-header-principal {
        cursor: pointer;
        padding-bottom: 1rem;
        border-bottom: 1px solid var(--color-borde);
    }
    .reporte-header-principal.no-hover {
        cursor: default;
    }
    .reporte-total-principal {
        display: block;
        font-size: 2rem;
        font-weight: bold;
        text-align: center;
        margin-top: 0.5rem;
    }
    .titulo-columna {
        text-align: center;
        margin: 0;
        font-size: 1.5rem;
        letter-spacing: 1px;
        color: var(--color-primario);
    }
    .reporte-header-principal.no-hover:hover {
        background-color: transparent; /* Evita el cambio de color en la tarjeta de diferencia */
        cursor: default;
    }
    .sub-seccion {
        margin-left: 1rem;
        margin-top: 1rem;
    }
    /* Para pantallas más pequeñas, las columnas se apilan */
    @media (max-width: 992px) {
        .resumen-columnas {
            grid-template-columns: 1fr;
        }
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
const montoServicioEfectivoInput = servicioEfectivoSelect ? document.getElementById('montoServicioEfectivo') : null;
const montoRecibidoServicioInput = servicioEfectivoSelect ? document.getElementById('montoRecibidoServicio') : null;
const vueltoCalculadoServicioDisplay = servicioEfectivoSelect ? document.getElementById('vueltoCalculadoServicio') : null;

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
    if (servicioEfectivoSelect) {
        servicioEfectivoSelect.addEventListener('change', function () {
            const inputOtro = document.getElementById('nombreServicioOtro');
            if (inputOtro) {
                if (this.value === 'Otro...') {
                    inputOtro.style.display = 'block';
                    inputOtro.required = true;
                    inputOtro.focus();
                } else {
                    inputOtro.style.display = 'none';
                    inputOtro.required = false;
                    inputOtro.value = '';
                }
            }
        });
    }
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
    const servicioEfectivoSelect = document.getElementById('servicioEfectivoSelect');
    const loteServicioEfectivoInput = document.getElementById('loteServicioEfectivo');

    let servicioSeleccionado = servicioEfectivoSelect ? servicioEfectivoSelect.value : '';
    const loteIngresado = loteServicioEfectivoInput ? (loteServicioEfectivoInput.value.trim() || '-') : '-';

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
            lote: loteIngresado, // **CORREGIDO:** Capturar el lote del formulario
            monto: montoServicio, // Monto en efectivo
            tarjeta: 0
        };
    } else {
        otrosServicios.push({
            nombre: servicioSeleccionado,
            lote: loteIngresado, // **CORREGIDO:** Capturar el lote del formulario
            monto: montoServicio,
            tarjeta: 0
        });
    }

    // Crear el objeto de movimiento
    const nuevoMovimiento = {
        id: generarId(),
        fecha: obtenerFechaHoraLocalISO(),
        cajero: sessionStorage.getItem('usuarioActual') || 'N/A',
        caja: sessionStorage.getItem('cajaSeleccionada') || (sessionStorage.getItem('userRole') === 'tesoreria' ? 'Caja Tesoreria' : 'Caja 1'),
        descripcion: `Ingreso por servicio: ${servicioSeleccionado}`,
        valorVenta: montoServicio,
        efectivo: desgloseEfectivo,
        // **NUEVO:** Guardar el desglose del vuelto
        efectivoVuelto: desgloseVuelto,
        historialEdiciones: [],
        monedasExtranjeras: {
            usd: { cantidad: 0, cotizacion: 0 },
            brl: { cantidad: 0, cotizacion: 0 },
            ars: { cantidad: 0, cotizacion: 0 }
        },
        pagosTarjeta: 0,
        ventasCredito: 0,
        pedidosYa: 0,
        ventas_transferencia: 0, // **CORRECCIÓN:** Usar ventas_transferencia (con guion bajo) para coincidir con la BD
        servicios: servicios,
        otrosServicios: otrosServicios
    };

    estado.movimientosTemporales.push(nuevoMovimiento);

    // **CORRECCIÓN:** Guardar en base de datos de Supabase
    window.db.guardarMovimientoTemporal(nuevoMovimiento);

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

// ============================================
// QUICK STATS - INGRESOS & EGRESOS PAGES
// ============================================

/**
 * Actualiza las métricas quick stats en la página de Ingresos
 * Muestra total ingresos, total egresos, movimientos totales y último registro
 */
window.actualizarMetricasIngresos = function () {
    // Verificar que estamos en la página de ingresos
    if (!document.getElementById('metricTotalIngresosDia')) return;

    // Obtener fecha actual
    const hoy = new Date().toISOString().split('T')[0];

    // **CORRECCIÓN:** Leer desde localStorage o estado
    let movimientosHoy = [];

    // Intentar leer desde estado si existe
    if (typeof estado !== 'undefined' && estado.movimientosTemporales) {
        movimientosHoy = estado.movimientosTemporales.filter(m => {
            const fechaMov = m.fecha.split('T')[0];
            return fechaMov === hoy;
        });
    } else {
        // Si no existe estado, intentar desde localStorage
        const todosMovimientos = JSON.parse(localStorage.getItem('movimientosTemporales')) || [];
        movimientosHoy = todosMovimientos.filter(m => {
            const fechaMov = m.fecha.split('T')[0];
            return fechaMov === hoy;
        });
    }

    // Leer egresos desde localStorage
    const todosLosEgresos = JSON.parse(localStorage.getItem('egresosCaja')) || [];
    const egresosHoy = todosLosEgresos.filter(e => {
        const fechaEgreso = e.fecha.split('T')[0];
        return fechaEgreso === hoy;
    });

    // Calcular total de INGRESOS del día
    let totalIngresos = 0;
    movimientosHoy.forEach(m => {
        // Sumar efectivo
        if (m.efectivo) {
            Object.entries(m.efectivo).forEach(([denom, cant]) => {
                totalIngresos += parseInt(denom) * cant;
            });
        }
        // Sumar otros métodos de pago
        totalIngresos += (m.pagosTarjeta || 0) + (m.ventasCredito || 0) +
            (m.pedidosYa || 0) + (m.ventas_transferencia || 0);
        // Sumar servicios
        if (m.servicios) {
            Object.values(m.servicios).forEach(s => {
                totalIngresos += (s.monto || 0) + (s.tarjeta || 0);
            });
        }
    });

    // Calcular total de EGRESOS del día
    let totalEgresos = 0;
    egresosHoy.forEach(e => {
        totalEgresos += e.monto || 0;
    });

    // Cantidad total de movimientos
    const totalMovimientos = movimientosHoy.length + egresosHoy.length;

    // Último registro (el más reciente entre ingresos y egresos)
    let ultimoRegistro = '-';
    const todosMovimientos = [
        ...movimientosHoy.map(m => ({ fecha: m.fecha, tipo: 'ingreso' })),
        ...egresosHoy.map(e => ({ fecha: e.fecha, tipo: 'egreso' }))
    ];

    if (todosMovimientos.length > 0) {
        todosMovimientos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
        const ultimo = todosMovimientos[0];
        const fecha = new Date(ultimo.fecha);
        ultimoRegistro = fecha.toLocaleTimeString('es-PY', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // Actualizar UI
    document.getElementById('metricTotalIngresosDia').textContent = formatearMoneda(totalIngresos, 'gs');
    document.getElementById('metricTotalEgresosDia').textContent = formatearMoneda(totalEgresos, 'gs');
    document.getElementById('metricTotalMovimientos').textContent = totalMovimientos;
    document.getElementById('metricUltimoRegistro').textContent = ultimoRegistro;
};

/**
 * Actualiza las métricas quick stats en la página de Egresos
 * Muestra total ingresos, total egresos, movimientos totales y último registro
 */
window.actualizarMetricasEgresos = function () {
    // Verificar que estamos en la página de egresos
    if (!document.getElementById('metricTotalEgresosDia')) return;

    // Obtener fecha actual
    const hoy = new Date().toISOString().split('T')[0];

    // Leer egresos desde localStorage
    const todosLosEgresos = JSON.parse(localStorage.getItem('egresosCaja')) || [];
    const egresosHoy = todosLosEgresos.filter(e => {
        const fechaEgreso = e.fecha.split('T')[0];
        return fechaEgreso === hoy;
    });

    // **CORRECCIÓN:** Leer desde localStorage o estado
    let movimientosHoy = [];

    // Intentar leer desde estado si existe
    if (typeof estado !== 'undefined' && estado.movimientosTemporales) {
        movimientosHoy = estado.movimientosTemporales.filter(m => {
            const fechaMov = m.fecha.split('T')[0];
            return fechaMov === hoy;
        });
    } else {
        // Si no existe estado, intentar desde localStorage
        const todosMovimientos = JSON.parse(localStorage.getItem('movimientosTemporales')) || [];
        movimientosHoy = todosMovimientos.filter(m => {
            const fechaMov = m.fecha.split('T')[0];
            return fechaMov === hoy;
        });
    }

    // Calcular total de INGRESOS del día
    let totalIngresos = 0;
    movimientosHoy.forEach(m => {
        // Sumar efectivo
        if (m.efectivo) {
            Object.entries(m.efectivo).forEach(([denom, cant]) => {
                totalIngresos += parseInt(denom) * cant;
            });
        }
        // Sumar otros métodos de pago
        totalIngresos += (m.pagosTarjeta || 0) + (m.ventasCredito || 0) +
            (m.pedidosYa || 0) + (m.ventas_transferencia || 0);
        // Sumar servicios
        if (m.servicios) {
            Object.values(m.servicios).forEach(s => {
                totalIngresos += (s.monto || 0) + (s.tarjeta || 0);
            });
        }
    });

    // Calcular total de EGRESOS del día
    let totalEgresos = 0;
    egresosHoy.forEach(e => {
        totalEgresos += e.monto || 0;
    });

    // Cantidad total de movimientos
    const totalMovimientos = movimientosHoy.length + egresosHoy.length;

    // Último registro (el más reciente entre ingresos y egresos)
    let ultimoRegistro = '-';
    const todosMovimientos = [
        ...movimientosHoy.map(m => ({ fecha: m.fecha, tipo: 'ingreso' })),
        ...egresosHoy.map(e => ({ fecha: e.fecha, tipo: 'egreso' }))
    ];

    if (todosMovimientos.length > 0) {
        todosMovimientos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
        const ultimo = todosMovimientos[0];
        const fecha = new Date(ultimo.fecha);
        ultimoRegistro = fecha.toLocaleTimeString('es-PY', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // Actualizar UI
    document.getElementById('metricTotalIngresosDia').textContent = formatearMoneda(totalIngresos, 'gs');
    document.getElementById('metricTotalEgresosDia').textContent = formatearMoneda(totalEgresos, 'gs');
    document.getElementById('metricTotalMovimientos').textContent = totalMovimientos;
    document.getElementById('metricUltimoRegistro').textContent = ultimoRegistro;
};

// ============================================
// LÓGICA PARA EGRESOS DE CAJA (SIMPLIFICADA)
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // Referencias
    const formularioEgreso = document.getElementById('formularioEgresoCaja');
    const montoInput = document.getElementById('montoEgresoCaja');

    // Inicializar fecha con datetime-local compatible
    const fechaInput = document.getElementById('fechaEgresoCaja');
    if (fechaInput) {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        fechaInput.value = `${year}-${month}-${day}T${hours}:${minutes}`;
    }

    // **NUEVO:** Lógica para sincronizar la Caja Activa (igual que Ingresos)
    const cajaActivaDisplay = document.getElementById('cajaActivaEgresos');
    const cajaInput = document.getElementById('cajaEgreso');

    if (cajaActivaDisplay && cajaInput) {
        // Obtener datos de sesión
        const userRole = sessionStorage.getItem('userRole');
        let cajaSeleccionada = sessionStorage.getItem('cajaSeleccionada');

        // Si es tesorería, forzar Caja Tesorería
        if (userRole === 'tesoreria') {
            cajaSeleccionada = 'Caja Tesoreria';
            sessionStorage.setItem('cajaSeleccionada', cajaSeleccionada);
        }
        // Si no hay caja seleccionada, usar por defecto Caja 1
        else if (!cajaSeleccionada) {
            cajaSeleccionada = 'Caja 1';
            sessionStorage.setItem('cajaSeleccionada', cajaSeleccionada);
        }

        // Actualizar UI y campo oculto
        cajaActivaDisplay.textContent = cajaSeleccionada;
        cajaInput.value = cajaSeleccionada;
    }

    // **NUEVO:** Lógica para mostrar/ocultar Proveedor
    const categoriaSelect = document.getElementById('categoriaEgresoCaja');
    const grupoProveedor = document.getElementById('grupoProveedorEgreso');

    if (categoriaSelect && grupoProveedor) {
        categoriaSelect.addEventListener('change', () => {
            if (categoriaSelect.value === 'Pago a Proveedor') {
                grupoProveedor.style.display = 'block';
                document.getElementById('proveedorEgresoCaja').required = true;
            } else {
                grupoProveedor.style.display = 'none';
                document.getElementById('proveedorEgresoCaja').value = '';
                document.getElementById('proveedorEgresoCaja').required = false;
            }
        });
    }

    if (formularioEgreso && montoInput) {
        // Aplicar formato de miles al input de monto
        if (typeof aplicarFormatoMiles === 'function') {
            aplicarFormatoMiles(montoInput);
        }

        // Listener para envío del formulario (ELIMINADO: DUPLICADO)
        // Se utiliza la función global guardarEgresoCaja() vinculada en inicializarEventos()
        /* 
        formularioEgreso.addEventListener('submit', async (e) => { ... }); 
        */
    }
});

// Función global para limpiar el formulario
window.limpiarFormularioEgresoCaja = function () {
    const formulario = document.getElementById('formularioEgresoCaja');
    if (formulario) {
        formulario.reset();
        // Restaurar fecha actual
        const fechaInput = document.getElementById('fechaEgresoCaja');
        if (fechaInput) {
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            fechaInput.value = `${year}-${month}-${day}T${hours}:${minutes}`;
        }
        // Reset manual de visibilidad
        const grupoProveedor = document.getElementById('grupoProveedorEgreso');
        if (grupoProveedor) grupoProveedor.style.display = 'none';

        // Limpiar estilos de validación si los hubiera
        document.getElementById('montoEgresoCaja').value = '';
    }
};

// Función para cargar el historial de egresos
window.cargarHistorialEgresosCaja = async function () {
    const listaContainer = document.getElementById('listaEgresosCaja');
    const fechaFiltro = document.getElementById('fechaFiltroEgresos')?.value;
    const cajaFiltro = document.getElementById('filtroCajaEgresos')?.value;

    if (!listaContainer) return;

    listaContainer.innerHTML = '<div class="cargando">Cargando egresos...</div>';

    try {
        let egresos = [];
        if (window.db && window.db.obtenerEgresosCaja) {
            const resultado = await window.db.obtenerEgresosCaja();
            if (resultado.success) {
                egresos = resultado.data || [];
                if (egresos.length > 0) {
                    console.log('=== ESTRUCTURA REAL DE EGRESOS_CAJA ===');
                    console.log('Ejemplo de registro existente:', egresos[0]);
                    console.log('Columnas disponibles:', Object.keys(egresos[0]));
                }
            } else {
                throw new Error(resultado.error);
            }
        }

        // **NUEVO:** Filtrar por rol y arqueado
        const userRole = sessionStorage.getItem('userRole');
        const mostrarTodo = userRole === 'admin' || userRole === 'tesoreria';

        if (!mostrarTodo) {
            // Para cajeros, ocultar egresos arqueados
            egresos = egresos.filter(e => !e.arqueado);
        }

        // Filtrar por fecha
        if (fechaFiltro) {
            egresos = egresos.filter(e => e.fecha.startsWith(fechaFiltro));
        }
        // Filtrar por caja
        if (cajaFiltro) {
            egresos = egresos.filter(e => e.caja === cajaFiltro);
        }

        // Ordenar por fecha descendente
        egresos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

        listaContainer.innerHTML = '';

        if (egresos.length === 0) {
            listaContainer.innerHTML = '<p class="sin-resultados">No se encontraron egresos registrados.</p>';
            return;
        }

        egresos.forEach(egreso => {
            const div = document.createElement('div');
            div.className = 'movimiento-item tipo-gasto';

            // Formatear fecha
            const fecha = new Date(egreso.fecha).toLocaleString('es-PY', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });

            const montoFormateado = formatearMoneda(egreso.monto, 'gs');

            div.innerHTML = `
                <div class="movimiento-header">
                    <span class="movimiento-categoria">${egreso.categoria}</span>
                    <span class="movimiento-monto">-${montoFormateado}</span>
                </div>
                <div class="movimiento-detalles">
                    <small>${fecha} | ${egreso.caja} | Por: ${egreso.usuario || 'Desconocido'}</small>
                    <p class="movimiento-descripcion">${egreso.descripcion}</p>
                    ${egreso.referencia ? `<small class="referencia">Ref: ${egreso.referencia}</small>` : ''}
                </div>
                ${window.sessionStorage.getItem('userRole') === 'admin' ?
                    `<button class="btn-eliminar-sm" onclick="eliminarEgresoCaja('${egreso.id}')" title="Eliminar">🗑️</button>` : ''}
            `;
            listaContainer.appendChild(div);
        });

    } catch (error) {
        console.error('Error al cargar historial de egresos:', error);
        listaContainer.innerHTML = '<p class="error-msg">Error al cargar el historial.</p>';
    }
};

// Función para eliminar egreso (solo admin)
window.eliminarEgresoCaja = async function (id) {
    const confirmado = await window.showConfirm('¿Está seguro de eliminar este egreso? Esta acción no se puede deshacer.', {
        title: 'Eliminar Egreso',
        type: 'danger',
        confirmButtonType: 'danger',
        confirmText: 'Eliminar'
    });

    if (confirmado) {
        if (window.db && window.db.eliminarEgresoCaja) {
            const resultado = await window.db.eliminarEgresoCaja(id);
            if (resultado.success) {
                mostrarMensaje('Egreso eliminado correctamente.', 'exito');
                cargarHistorialEgresosCaja();
                if (typeof actualizarMetricasEgresos === 'function') {
                    actualizarMetricasEgresos();
                }
            } else {
                mostrarMensaje('Error al eliminar: ' + (resultado.error.message || 'Error desconocido'), 'error');
            }
        }
    }
};

// Cargar historial al inicio si estamos en la página correcta
if (document.getElementById('listaEgresosCaja')) {
    cargarHistorialEgresosCaja();
}

// ==========================================
// LÓGICA PARA RESUMEN DE SERVICIOS
// ==========================================

// MEJOR OPCIÓN: Usar 'load' y además un pequeño reintento si falla.
window.addEventListener('load', async () => {
    if (document.getElementById('page-resumen-servicios')) {
        // Dar un pequeño margen para que el otro listener de 'load' (initSupabase) termine de ejecutarse
        setTimeout(async () => {
            try {
                await inicializarResumenServicios();
            } catch (e) {
                console.log('Reintentando inicialización...', e);
                setTimeout(inicializarResumenServicios, 1000);
            }
        }, 500);
    }
});

async function inicializarResumenServicios() {
    console.log('Inicializando Resumen de Servicios...');
    const grid = document.getElementById('gridServicios');
    if (grid) grid.innerHTML = '<p class="cargando">Cargando datos...</p>';

    // Asegurar que los movimientos estén cargados
    if (!estado.movimientos || estado.movimientos.length === 0) {
        if (typeof window.initSupabaseData === 'function') {
            await window.initSupabaseData();
        } else {
            console.error('No se encontró función para cargar datos.');
            grid.innerHTML = '<p class="error-msg">Error al cargar datos.</p>';
            return;
        }
    }

    // Establecer fechas iniciales si están vacías
    const fechaDesde = document.getElementById('fechaServiciosDesde');
    const fechaHasta = document.getElementById('fechaServiciosHasta');
    const hoy = new Date().toISOString().slice(0, 10);

    if (fechaDesde && !fechaDesde.value) fechaDesde.value = hoy;
    if (fechaHasta && !fechaHasta.value) fechaHasta.value = hoy;

    renderizarResumenServicios();
}

function renderizarResumenServicios() {
    const grid = document.getElementById('gridServicios');
    const fechaDesde = document.getElementById('fechaServiciosDesde')?.value;
    const fechaHasta = document.getElementById('fechaServiciosHasta')?.value;
    const cajaFiltro = document.getElementById('filtroCajaServicios')?.value;

    if (!grid) return;

    // Combinar movimientos históricos y temporales y filtrar
    let todosLosMovimientos = [
        ...(estado.movimientos || []),
        ...(estado.movimientosTemporales || [])
    ];

    // Aplicar filtros
    if (fechaDesde) {
        todosLosMovimientos = todosLosMovimientos.filter(m => m.fecha.split('T')[0] >= fechaDesde);
    }
    if (fechaHasta) {
        todosLosMovimientos = todosLosMovimientos.filter(m => m.fecha.split('T')[0] <= fechaHasta);
    }
    if (cajaFiltro && cajaFiltro !== 'Todas las Cajas') {
        todosLosMovimientos = todosLosMovimientos.filter(m => m.caja === cajaFiltro);
    }

    const datosServicios = agruparMovimientosPorServicio(todosLosMovimientos);
    grid.innerHTML = '';
    grid.style.display = 'block'; // Cambiar de grid a block

    if (Object.keys(datosServicios).length === 0) {
        grid.innerHTML = '<p class="sin-resultados">No hay movimientos de servicios registrados.</p>';
        return;
    }

    // Crear tablas estilo Excel para cada servicio
    Object.keys(datosServicios).sort().forEach(nombreServicio => {
        const datos = datosServicios[nombreServicio];

        // Contenedor de tabla
        const tablaContainer = document.createElement('div');
        tablaContainer.className = 'tabla-servicio-container';
        tablaContainer.style.marginBottom = '2rem';

        // Crear tabla
        const tabla = document.createElement('table');
        tabla.className = 'tabla-servicio-excel';

        // Encabezado con nombre del servicio
        const thead = document.createElement('thead');
        thead.innerHTML = `
            <tr class="servicio-header">
                <th colspan="5" style="background: #f8f9fa; color: #374151; padding: 0.75rem; text-align: center; font-size: 1.1rem; font-weight: bold; border: 1px solid #212121;">
                    ${nombreServicio.toUpperCase()}
                </th>
            </tr>
            <tr class="servicio-subheader">
                <th>CAJERO</th>
                <th>LOTE</th>
                <th>EFECTIVO</th>
                <th>TARJETA</th>
                <th>DEPOSITADO</th>
            </tr>
        `;
        tabla.appendChild(thead);

        // Cuerpo de la tabla
        const tbody = document.createElement('tbody');
        let totalEfectivo = 0;
        let totalTarjeta = 0;
        let totalDepositado = 0;

        datos.items.forEach(item => {
            const fila = document.createElement('tr');
            fila.innerHTML = `
                <td>${item.cajero || '-'}</td>
                <td>${item.lote || '-'}</td>
                <td style="text-align: right;">${item.efectivo > 0 ? formatearMoneda(item.efectivo, 'gs') : '-'}</td>
                <td style="text-align: right;">${item.tarjeta > 0 ? formatearMoneda(item.tarjeta, 'gs') : '-'}</td>
                <td style="text-align: right;">-</td>
            `;
            tbody.appendChild(fila);

            totalEfectivo += item.efectivo;
            totalTarjeta += item.tarjeta;
        });
        tabla.appendChild(tbody);

        // Fila de totales
        const tfoot = document.createElement('tfoot');
        tfoot.innerHTML = `
            <tr class="servicio-totales">
                <td colspan="2" style="text-align: left; font-weight: bold;">TOTALES</td>
                <td style="text-align: right; font-weight: bold;">${totalEfectivo > 0 ? formatearMoneda(totalEfectivo, 'gs') : '0'}</td>
                <td style="text-align: right; font-weight: bold;">${totalTarjeta > 0 ? formatearMoneda(totalTarjeta, 'gs') : '0'}</td>
                <td style="text-align: right; font-weight: bold;">${totalDepositado > 0 ? formatearMoneda(totalDepositado, 'gs') : '0'}</td>
            </tr>
        `;
        tabla.appendChild(tfoot);

        tablaContainer.appendChild(tabla);
        grid.appendChild(tablaContainer);
    });
}

function agruparMovimientosPorServicio(movimientos) {
    const agrupado = {};

    movimientos.forEach(mov => {
        // 1. Servicios estáticos
        if (mov.servicios) {
            Object.entries(mov.servicios).forEach(([key, serv]) => {
                const efectivo = serv.monto || 0;
                const tarjeta = serv.tarjeta || 0;
                const montoTotal = efectivo + tarjeta;

                if (montoTotal !== 0 || (serv.lote && serv.lote.trim() !== '')) {
                    const nombres = {
                        apLote: 'Aca Puedo',
                        aquiPago: 'Aquí Pago',
                        expressLote: 'Pago Express',
                        wepa: 'WEPA',
                        pasajeNsa: 'Pasaje NSA',
                        encomiendaNsa: 'Encomienda NSA',
                        apostala: 'Apostala'
                    };
                    const nombreReal = nombres[key] || key;

                    if (!agrupado[nombreReal]) agrupado[nombreReal] = { total: 0, items: [] };

                    agrupado[nombreReal].items.push({
                        fecha: mov.fecha,
                        caja: mov.caja,
                        cajero: mov.cajero,
                        lote: serv.lote || '-',
                        efectivo: efectivo,
                        tarjeta: tarjeta,
                        monto: montoTotal
                    });
                    agrupado[nombreReal].total += montoTotal;
                }
            });
        }

        // 2. Servicios dinámicos
        if (mov.otrosServicios && Array.isArray(mov.otrosServicios)) {
            mov.otrosServicios.forEach(serv => {
                const efectivo = serv.monto || 0;
                const tarjeta = serv.tarjeta || 0;
                const montoTotal = efectivo + tarjeta;
                const nombreReal = serv.nombre || 'Otro Servicio';

                if (!agrupado[nombreReal]) agrupado[nombreReal] = { total: 0, items: [] };

                agrupado[nombreReal].items.push({
                    fecha: mov.fecha,
                    caja: mov.caja,
                    cajero: mov.cajero,
                    lote: serv.lote || '-',
                    efectivo: efectivo,
                    tarjeta: tarjeta,
                    monto: montoTotal
                });
                agrupado[nombreReal].total += montoTotal;
            });
        }
    });

    return agrupado;
}

function abrirModalDetalleServicio(nombreServicio, items) {
    const modal = document.getElementById('modalDetalleServicio');
    const titulo = document.getElementById('tituloModalServicio');
    const tbody = document.getElementById('tablaDetalleServicioBody');
    const totalFooter = document.getElementById('totalDetalleServicio');

    if (!modal || !tbody) return;

    titulo.textContent = `Detalle de Comprobantes: ${nombreServicio}`;
    tbody.innerHTML = '';

    let total = 0;

    items.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    items.forEach(item => {
        total += item.monto;
        const fila = document.createElement('tr');
        fila.innerHTML = `
            <td>${formatearFecha(item.fecha)}</td>
            <td>${item.caja || '-'}</td>
            <td>${item.cajero || 'Desconocido'}</td>
            <td>${item.lote || '-'}</td>
            <td>${formatearMoneda(item.monto, 'gs')}</td>
        `;
        tbody.appendChild(fila);
    });

    if (totalFooter) {
        totalFooter.textContent = formatearMoneda(total, 'gs');
    }

    modal.style.display = 'block';
}

function cerrarModalDetalleServicio() {
    const modal = document.getElementById('modalDetalleServicio');
    if (modal) {
        modal.style.display = 'none';
    }
}

window.onclick = function (event) {
    const modal = document.getElementById('modalDetalleServicio');
    if (event.target == modal) {
        cerrarModalDetalleServicio();
    }
};
