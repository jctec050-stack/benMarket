/**
 * Sistema de Logging Condicional para BenMarket
 * 
 * Este archivo reemplaza los console.log directos con un sistema
 * que puede activarse/desactivarse según el entorno.
 * 
 * Uso:
 *   logger.debug('Mensaje de debug', datos);
 *   logger.info('Información general');
 *   logger.warn('Advertencia');
 *   logger.error('Error', errorObject);
 */

const LOG_LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
    NONE: 4
};

class Logger {
    constructor() {
        // Detectar si estamos en producción
        // En Vercel, NODE_ENV se setea automáticamente
        this.isProduction = typeof window !== 'undefined'
            && window.location.hostname !== 'localhost'
            && window.location.hostname !== '127.0.0.1';

        // En producción: solo errores
        // En desarrollo: todos los logs
        this.currentLevel = this.isProduction ? LOG_LEVELS.ERROR : LOG_LEVELS.DEBUG;

        // Mostrar estado al iniciar
        if (!this.isProduction) {
            console.log(`%c[Logger] Modo: ${this.isProduction ? 'PRODUCCIÓN' : 'DESARROLLO'}`,
                'background: #222; color: #bada55; padding: 2px 5px; border-radius: 3px;');
        }
    }

    /**
     * Verifica si el nivel de log está habilitado
     */
    _shouldLog(level) {
        return level >= this.currentLevel;
    }

    /**
     * Formatea el mensaje con timestamp
     */
    _formatMessage(level, message) {
        const timestamp = new Date().toLocaleTimeString('es-PY');
        const levelName = Object.keys(LOG_LEVELS).find(key => LOG_LEVELS[key] === level);
        return `[${timestamp}] [${levelName}] ${message}`;
    }

    /**
     * Log nivel DEBUG - Solo en desarrollo
     * Usar para: debugging detallado, dumps de datos, flujo de ejecución
     */
    debug(message, ...args) {
        if (this._shouldLog(LOG_LEVELS.DEBUG)) {
            console.log(this._formatMessage(LOG_LEVELS.DEBUG, message), ...args);
        }
    }

    /**
     * Log nivel INFO - En desarrollo
     * Usar para: información general, confirmaciones de operaciones
     */
    info(message, ...args) {
        if (this._shouldLog(LOG_LEVELS.INFO)) {
            console.info(this._formatMessage(LOG_LEVELS.INFO, message), ...args);
        }
    }

    /**
     * Log nivel WARN - En desarrollo y producción (puede ser útil)
     * Usar para: situaciones anómalas que no son errores críticos
     */
    warn(message, ...args) {
        if (this._shouldLog(LOG_LEVELS.WARN)) {
            console.warn(this._formatMessage(LOG_LEVELS.WARN, message), ...args);
        }
    }

    /**
     * Log nivel ERROR - Siempre habilitado
     * Usar para: errores que requieren atención
     */
    error(message, ...args) {
        if (this._shouldLog(LOG_LEVELS.ERROR)) {
            console.error(this._formatMessage(LOG_LEVELS.ERROR, message), ...args);
        }
    }

    /**
     * Configurar nivel de logging manualmente (útil para debugging temporal)
     */
    setLevel(level) {
        if (typeof level === 'string') {
            this.currentLevel = LOG_LEVELS[level.toUpperCase()] || LOG_LEVELS.DEBUG;
        } else {
            this.currentLevel = level;
        }
        this.info(`Nivel de logging cambiado a: ${Object.keys(LOG_LEVELS).find(k => LOG_LEVELS[k] === this.currentLevel)}`);
    }

    /**
     * Grupo de logs (útil para debugging de flujos complejos)
     */
    group(label) {
        if (!this.isProduction) {
            console.group(label);
        }
    }

    groupEnd() {
        if (!this.isProduction) {
            console.groupEnd();
        }
    }
}

// Exportar instancia única (singleton)
const logger = new Logger();

// Para debugging en consola del navegador
if (typeof window !== 'undefined') {
    window.logger = logger;
}
