// Funciones de utilidad generales y formateo

/**
 * Formatea un número como moneda
 * @param {number|string} monto - El valor a formatear
 * @param {string} moneda - El código de la moneda (gs, usd, brl, ars)
 * @returns {string} El valor formateado
 */
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

/**
 * Parsea un string de moneda a número
 * @param {string|number} valor - El valor a parsear
 * @returns {number} El valor numérico
 */
window.parsearMoneda = function (valor) {
    if (typeof valor === 'number') return valor;
    // Elimina puntos de miles y cualquier otro caracter no numérico EXCEPTO el signo menos
    const negativo = String(valor).includes('-');
    const numero = parseInt(String(valor).replace(/\D/g, ''), 10) || 0;
    return negativo ? -numero : numero;
};

/**
 * Muestra/Oculta una sección desplegable
 * @param {string} seccionId - El ID del elemento a alternar
 */
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

/**
 * Función para debouncing
 * @param {Function} func - La función a ejecutar
 * @param {number} wait - Tiempo de espera en ms
 * @returns {Function} Función debounced
 */
window.debounce = function (func, wait) {
    let timeout;
    return function (...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
};

/**
 * Formatea una fecha para visualización en español (es-PY)
 * @param {string|Date} fecha - La fecha a formatear
 * @returns {string} Fecha formateada
 */
window.formatearFecha = function (fecha) {
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
};

/**
 * Obtiene la fecha y hora actual en formato ISO local (YYYY-MM-DDTHH:mm)
 * Útil para campos datetime-local
 * @returns {string} ISO local
 */
window.obtenerFechaHoraLocalISO = function () {
    const ahora = new Date();
    const offset = ahora.getTimezoneOffset() * 60000;
    return new Date(ahora.getTime() - offset).toISOString().slice(0, 16);
};

/**
 * Formatea una fecha para ser enviada a Supabase (TIMESTAMP literal local)
 * @param {string} valorInput - El valor del input de fecha
 * @returns {string} YYYY-MM-DDTHH:mm:ss
 */
window.formatearFechaParaSupa = function (valorInput) {
    if (!valorInput) {
        const ahora = new Date();
        const offset = ahora.getTimezoneOffset() * 60000;
        return new Date(ahora.getTime() - offset).toISOString().slice(0, 19);
    }
    if (valorInput.includes('T')) {
        let localISO = valorInput.split('.')[0].replace('Z', '');
        if (localISO.includes('+')) localISO = localISO.split('+')[0];
        if (localISO.length === 16) localISO += ':00';
        return localISO.slice(0, 19);
    }
    return valorInput;
};

/**
 * Obtiene la fecha actual en formato ISO local (YYYY-MM-DD)
 * @param {Date} date - Fecha opcional a formatear
 * @returns {string} YYYY-MM-DD
 */
window.obtenerFechaLocalISO = function (date) {
    const d = date || new Date();
    const offset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - offset).toISOString().slice(0, 10);
};

/**
 * Genera un ID único (UUID o fallback)
 * @returns {string} ID único
 */
window.generarId = function () {
    try {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }
        return Date.now().toString(36) + Math.random().toString(36).substring(2);
    } catch (e) {
        return Date.now().toString(36) + Math.random().toString(36).substring(2);
    }
};

/**
 * Obtiene el offset de la zona horaria en formato ISO (+HH:mm)
 * @returns {string} Offset ISO
 */
window.getTimezoneOffsetISO = function () {
    const now = new Date();
    const offset = -now.getTimezoneOffset();
    const sign = offset >= 0 ? '+' : '-';
    const hours = String(Math.floor(Math.abs(offset) / 60)).padStart(2, '0');
    const minutes = String(Math.abs(offset) % 60).padStart(2, '0');
    return `${sign}${hours}:${minutes}`;
};

// Alias para compatibilidad
window.getLocalOffset = window.getTimezoneOffsetISO;
