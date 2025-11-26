const SUPABASE_CONFIG = {
    URL: 'https://grfyzwfinmowqqxfegsx.supabase.co',
    ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdyZnl6d2Zpbm1vd3FxeGZlZ3N4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4MTY3ODMsImV4cCI6MjA3ODM5Mjc4M30.PSr-D8iyMv0ccLUhlFy5Vi6QO12VVWQVDFubmsrotT8'
};

// Cliente de Supabase (se inicializará cuando esté disponible)
let supabaseClient = null;

// Función para inicializar Supabase cuando esté disponible
function inicializarSupabase() {
    if (typeof supabase !== 'undefined') {
        supabaseClient = supabase.createClient(SUPABASE_CONFIG.URL, SUPABASE_CONFIG.ANON_KEY);
        console.log('Supabase inicializado correctamente');
        return true;
    }
    console.warn('Supabase no está disponible. Usando localStorage.');
    return false;
}

// Funciones de base de datos (se usarán cuando Supabase esté configurado)
const db = {
    // Guardar arqueo
    async guardarArqueo(arqueo) {
        if (supabaseClient) {
            try {
                const { data, error } = await supabaseClient
                    .from('arqueos')
                    .upsert([arqueo]);
                if (error) throw error;
                return { success: true, data };
            } catch (error) {
                return { success: false, error };
            }
        } else {
            return this.guardarEnLocalStorage('arqueos', arqueo);
        }
    },
    async guardarEgresoCaja(egreso) {
        if (supabaseClient) {
            try {
                const { data, error } = await supabaseClient
                    .from('egresos_caja')
                    .upsert([egreso]);
                if (error) throw error;
                return { success: true, data };
            } catch (error) {
                return { success: false, error };
            }
        } else {
            return this.guardarEnLocalStorage('egresosCaja', egreso);
        }
    },
    async obtenerEgresosCajaPorFecha(fecha) {
        if (supabaseClient) {
            try {
                const { data, error } = await supabaseClient
                    .from('egresos_caja')
                    .select('*')
                    .gte('fecha', fecha)
                    .lt('fecha', fecha + 'T23:59:59')
                    .order('fecha', { ascending: false });
                if (error) throw error;
                return { success: true, data };
            } catch (error) {
                return { success: false, error };
            }
        } else {
            return this.obtenerDeLocalStorage('egresosCaja', fecha);
        }
    },
    
    // Obtener arqueos por fecha
    async obtenerArqueosPorFecha(fecha) {
        if (supabaseClient) {
            try {
                const { data, error } = await supabaseClient
                    .from('arqueos')
                    .select('*')
                    .gte('fecha', fecha)
                    .lt('fecha', fecha + 'T23:59:59');
                
                if (error) throw error;
                return { success: true, data };
            } catch (error) {
                console.error('Error obteniendo arqueos:', error);
                return { success: false, error };
            }
        } else {
            // Usar localStorage
            return this.obtenerDeLocalStorage('arqueos', fecha);
        }
    },
    
    // Guardar movimiento
    async guardarMovimiento(movimiento) {
        if (supabaseClient) {
            try {
                const { data, error } = await supabaseClient
                    .from('movimientos')
                    .upsert([movimiento]);
                if (error) throw error;
                return { success: true, data };
            } catch (error) {
                return { success: false, error };
            }
        } else {
            return this.guardarEnLocalStorage('movimientos', movimiento);
        }
    },
    
    // Obtener movimientos por fecha
    async obtenerMovimientosPorFecha(fecha) {
        if (supabaseClient) {
            try {
                const { data, error } = await supabaseClient
                    .from('movimientos')
                    .select('*')
                    .gte('fecha', fecha)
                    .lt('fecha', fecha + 'T23:59:59')
                    .order('fecha', { ascending: false });
                
                if (error) throw error;
                return { success: true, data };
            } catch (error) {
                console.error('Error obteniendo movimientos:', error);
                return { success: false, error };
            }
        } else {
            return this.obtenerDeLocalStorage('movimientos', fecha);
        }
    },
    
    // Funciones auxiliares para localStorage
    guardarEnLocalStorage(tipo, item) {
        try {
            const items = JSON.parse(localStorage.getItem(tipo)) || [];
            items.push(item);
            localStorage.setItem(tipo, JSON.stringify(items));
            return { success: true };
        } catch (error) {
            return { success: false, error };
        }
    },
    
    obtenerDeLocalStorage(tipo, fecha) {
        try {
            const items = JSON.parse(localStorage.getItem(tipo)) || [];
            const itemsFiltrados = items.filter(item => 
                item.fecha && item.fecha.startsWith(fecha)
            );
            return { success: true, data: itemsFiltrados };
        } catch (error) {
            return { success: false, error };
        }
    }
};

// Función para migrar datos de localStorage a Supabase
async function migrarDatosALocalStorage() {
    if (!supabaseClient) {
        console.warn('Supabase no está configurado');
        return;
    }
    
    try {
        // Obtener todos los datos de localStorage
        const arqueosLocal = JSON.parse(localStorage.getItem('arqueos')) || [];
        const movimientosLocal = JSON.parse(localStorage.getItem('movimientos')) || [];
        
        console.log(`Migrando ${arqueosLocal.length} arqueos y ${movimientosLocal.length} movimientos...`);
        
        // Migrar arqueos
        if (arqueosLocal.length > 0) {
            const { data, error } = await supabaseClient
                .from('arqueos')
                .insert(arqueosLocal);
            
            if (error) throw error;
            console.log('Arqueos migrados exitosamente');
        }
        
        // Migrar movimientos
        if (movimientosLocal.length > 0) {
            const { data, error } = await supabaseClient
                .from('movimientos')
                .insert(movimientosLocal);
            
            if (error) throw error;
            console.log('Movimientos migrados exitosamente');
        }
        
        // Limpiar localStorage después de migrar
        localStorage.removeItem('arqueos');
        localStorage.removeItem('movimientos');
        
        console.log('Migración completada exitosamente');
        
    } catch (error) {
        console.error('Error durante la migración:', error);
    }
}

// Esquema de tablas para Supabase
const ESQUEMA_TABLAS = {
    arqueos: `
        CREATE TABLE arqueos (
            id TEXT PRIMARY KEY,
            fecha TIMESTAMP WITH TIME ZONE NOT NULL,
            cajero TEXT NOT NULL,
            caja TEXT NOT NULL,
            fondo_fijo INTEGER DEFAULT 0,
            cotizaciones JSONB,
            efectivo JSONB,
            dolares JSONB,
            reales JSONB,
            pesos JSONB,
            total_efectivo INTEGER DEFAULT 0,
            pagos_tarjeta INTEGER DEFAULT 0,
            ventas_credito INTEGER DEFAULT 0,
            pedidos_ya INTEGER DEFAULT 0,
            ventas_transferencia INTEGER DEFAULT 0,
            servicios JSONB,
            total_servicios INTEGER DEFAULT 0,
            total_ingresos INTEGER DEFAULT 0,
            creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Índices para búsquedas rápidas
        CREATE INDEX idx_arqueos_fecha ON arqueos(fecha);
        CREATE INDEX idx_arqueos_caja ON arqueos(caja);
        CREATE INDEX idx_arqueos_cajero ON arqueos(cajero);
    `,
    
    movimientos: `
        CREATE TABLE movimientos (
            id TEXT PRIMARY KEY,
            fecha TIMESTAMP WITH TIME ZONE NOT NULL,
            tipo TEXT NOT NULL CHECK (tipo IN ('gasto', 'egreso', 'transferencia', 'operacion')),
            categoria TEXT NOT NULL,
            descripcion TEXT NOT NULL,
            monto DECIMAL(15,2) NOT NULL,
            moneda TEXT NOT NULL CHECK (moneda IN ('gs', 'usd', 'brl', 'ars')),
            caja TEXT,
            referencia TEXT,
            creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Índices para búsquedas rápidas
        CREATE INDEX idx_movimientos_fecha ON movimientos(fecha);
        CREATE INDEX idx_movimientos_tipo ON movimientos(tipo);
        CREATE INDEX idx_movimientos_categoria ON movimientos(categoria);
        CREATE INDEX idx_movimientos_caja ON movimientos(caja);
    `
};

// Exportar para uso en app.js
window.SUPABASE_CONFIG = SUPABASE_CONFIG;
window.db = db;
window.inicializarSupabase = inicializarSupabase;
window.migrarDatosALocalStorage = migrarDatosALocalStorage;
window.ESQUEMA_TABLAS = ESQUEMA_TABLAS;
