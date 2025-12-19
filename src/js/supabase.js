const SUPABASE_CONFIG = {
    URL: 'https://grfyzwfinmowqqxfegsx.supabase.co',
    ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdyZnl6d2Zpbm1vd3FxeGZlZ3N4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4MTY3ODMsImV4cCI6MjA3ODM5Mjc4M30.PSr-D8iyMv0ccLUhlFy5Vi6QO12VVWQVDFubmsrotT8'
};

// Cliente de Supabase (se inicializará cuando esté disponible)
let supabaseClient = null;
let usuarioActual = null;
let supabaseInicializado = false;

// Función para inicializar Supabase cuando esté disponible
function inicializarSupabase() {
    // Si ya se inicializó, no hacer nada
    if (supabaseInicializado) {
        return true;
    }

    if (typeof supabase !== 'undefined') {
        supabaseClient = supabase.createClient(SUPABASE_CONFIG.URL, SUPABASE_CONFIG.ANON_KEY);
        supabaseInicializado = true;
        console.log('Supabase inicializado correctamente');

        // Escuchar cambios en autenticación
        supabaseClient.auth.onAuthStateChange((event, session) => {
            if (session) {
                usuarioActual = session.user;
                console.log('Usuario autenticado:', usuarioActual.email);
                localStorage.setItem('usuario_actual', JSON.stringify(usuarioActual));
            } else {
                usuarioActual = null;
                localStorage.removeItem('usuario_actual');
                console.log('Usuario desautenticado');
            }
        });

        return true;
    }
    console.warn('Supabase no está disponible. Usando localStorage.');
    return false;
}

// Funciones de base de datos (se usarán cuando Supabase esté configurado)
const db = {
    // ===== AUTENTICACIÓN =====
    async registrarUsuario(email, password, username, rol = 'cajero') {
        if (supabaseClient) {
            try {
                // Registrar con Supabase Auth
                const { data, error } = await supabaseClient.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            username
                        }
                    }
                });

                if (error) throw error;

                // El perfil se crea automáticamente por el trigger
                // Pero podemos asignar el rol específico
                const { error: perfilError } = await supabaseClient
                    .from('perfiles_usuarios')
                    .update({ rol })
                    .eq('id', data.user.id);

                if (perfilError) console.warn('Error asignando rol:', perfilError);

                return { success: true, data };
            } catch (error) {
                return { success: false, error };
            }
        } else {
            return { success: false, error: 'Supabase no disponible' };
        }
    },

    async iniciarSesion(email, password) {
        if (supabaseClient) {
            try {
                const { data, error } = await supabaseClient.auth.signInWithPassword({
                    email,
                    password
                });

                if (error) throw error;
                usuarioActual = data.user;
                localStorage.setItem('usuario_actual', JSON.stringify(usuarioActual));
                return { success: true, data };
            } catch (error) {
                return { success: false, error };
            }
        } else {
            return { success: false, error: 'Supabase no disponible' };
        }
    },

    async cerrarSesion() {
        if (supabaseClient) {
            try {
                const { error } = await supabaseClient.auth.signOut();
                if (error) throw error;
                usuarioActual = null;
                localStorage.removeItem('usuario_actual');
                return { success: true };
            } catch (error) {
                return { success: false, error };
            }
        } else {
            localStorage.removeItem('usuario_actual');
            return { success: true };
        }
    },

    async obtenerSesionActual() {
        if (supabaseClient) {
            try {
                const { data, error } = await supabaseClient.auth.getSession();
                if (error) throw error;
                return { success: true, data };
            } catch (error) {
                return { success: false, error };
            }
        } else {
            return { success: false, error: 'Supabase no disponible' };
        }
    },

    async obtenerPerfilActual() {
        if (supabaseClient && usuarioActual) {
            try {
                const { data, error } = await supabaseClient
                    .from('perfiles_usuarios')
                    .select('*')
                    .eq('id', usuarioActual.id)
                    .single();

                if (error) throw error;
                return { success: true, data };
            } catch (error) {
                return { success: false, error };
            }
        } else {
            return { success: false, error: 'No hay sesión activa' };
        }
    },

    async restablecerContraseña(email) {
        if (supabaseClient) {
            try {
                const { data, error } = await supabaseClient.auth.resetPasswordForEmail(email);
                if (error) throw error;
                return { success: true, data };
            } catch (error) {
                return { success: false, error };
            }
        } else {
            return { success: false, error: 'Supabase no disponible' };
        }
    },

    async actualizarContraseña(nuevoPassword) {
        if (supabaseClient) {
            try {
                const { data, error } = await supabaseClient.auth.updateUser({
                    password: nuevoPassword
                });
                if (error) throw error;
                return { success: true, data };
            } catch (error) {
                return { success: false, error };
            }
        } else {
            return { success: false, error: 'Supabase no disponible' };
        }
    },

    // ===== GESTIÓN DE USUARIOS =====
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
    async obtenerEgresosCaja() {
        if (supabaseClient) {
            try {
                const { data, error } = await supabaseClient
                    .from('egresos_caja')
                    .select('*')
                    .order('fecha', { ascending: false });
                if (error) throw error;
                return { success: true, data };
            } catch (error) {
                console.error('Error obteniendo egresos caja:', error);
                return { success: false, error };
            }
        } else {
            const all = JSON.parse(localStorage.getItem('egresosCaja')) || [];
            return { success: true, data: all };
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

    async eliminarEgresoCaja(id) {
        console.log('[Supabase] eliminarEgresoCaja llamado con ID:', id);
        if (supabaseClient) {
            console.log('[Supabase] Cliente disponible, intentando eliminar...');
            try {
                // Intentar eliminar y pedir que devuelva los registros eliminados
                const { data, error, count } = await supabaseClient
                    .from('egresos_caja')
                    .delete()
                    .eq('id', id)
                    .select();

                if (error) {
                    console.error('[Supabase] Error en delete:', error);
                    throw error;
                }

                console.log('[Supabase] Respuesta del DELETE:', { data, count });
                console.log('[Supabase] Registros eliminados:', data?.length || 0);

                // Verificar que realmente se eliminó
                if (!data || data.length === 0) {
                    console.error('[Supabase] ❌ PROBLEMA: DELETE no eliminó ningún registro');
                    console.error('[Supabase] Esto indica un problema con políticas RLS');

                    // Verificar si el registro aún existe
                    const { data: verify } = await supabaseClient
                        .from('egresos_caja')
                        .select('*')
                        .eq('id', id)
                        .single();

                    if (verify) {
                        console.error('[Supabase] El registro AÚN EXISTE:', verify);
                        return {
                            success: false,
                            error: {
                                message: 'El registro no se eliminó. Las políticas RLS están bloqueando la eliminación.',
                                code: 'RLS_POLICY_BLOCK',
                                hint: 'Verifica las políticas de DELETE en la tabla egresos_caja'
                            }
                        };
                    }
                }

                console.log('[Supabase] ✅ Eliminación exitosa y verificada');
                return { success: true };
            } catch (error) {
                console.error('[Supabase] ❌ Error eliminando egreso de caja:', error);
                console.error('[Supabase] Error code:', error.code);
                console.error('[Supabase] Error message:', error.message);
                console.error('[Supabase] Error details:', error.details);
                return { success: false, error };
            }
        } else {
            console.warn('[Supabase] Cliente no disponible, usando localStorage');
            const items = JSON.parse(localStorage.getItem('egresosCaja')) || [];
            const next = items.filter(e => e.id !== id);
            localStorage.setItem('egresosCaja', JSON.stringify(next));
            return { success: true };
        }
    },

    // Guardar movimiento
    async guardarMovimiento(movimiento) {
        if (supabaseClient) {
            try {
                const { data, error } = await supabaseClient
                    .from('movimientos')
                    .upsert([movimiento]);
                if (error) {
                    console.error('Error de Supabase al guardar movimiento:', error);
                    console.error('Datos del movimiento:', movimiento);
                    throw error;
                }
                return { success: true, data };
            } catch (error) {
                console.error('Error completo:', error);
                return { success: false, error };
            }
        } else {
            return this.guardarEnLocalStorage('movimientos', movimiento);
        }
    },

    // Obtener movimientos por fecha
    async obtenerMovimientos() {
        if (supabaseClient) {
            try {
                const { data, error } = await supabaseClient
                    .from('movimientos')
                    .select('*')
                    .order('fecha', { ascending: false });
                if (error) throw error;
                return { success: true, data };
            } catch (error) {
                console.error('Error obteniendo movimientos:', error);
                return { success: false, error };
            }
        } else {
            const all = JSON.parse(localStorage.getItem('movimientos')) || [];
            return { success: true, data: all };
        }
    },

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
    async obtenerUsuarios() {
        if (supabaseClient) {
            try {
                const { data, error } = await supabaseClient
                    .from('perfiles_usuarios')
                    .select('*')
                    .eq('activo', true)
                    .order('username');
                if (error) throw error;
                return { success: true, data };
            } catch (error) {
                return { success: false, error };
            }
        } else {
            const data = JSON.parse(localStorage.getItem('usuarios')) || [];
            return { success: true, data };
        }
    },
    async crearUsuario(usuario) {
        if (supabaseClient) {
            try {
                // Usar el username como email para Supabase Auth
                const email = usuario.username;
                const password = usuario.password;
                const rol = usuario.rol || 'cajero';

                // Registrar con Supabase Auth
                const { data, error } = await supabaseClient.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            username: email
                        }
                    }
                });

                if (error) throw error;

                // El perfil se crea automáticamente por el trigger
                // Actualizar el rol específico si es diferente de 'cajero'
                if (data.user && rol !== 'cajero') {
                    const { error: perfilError } = await supabaseClient
                        .from('perfiles_usuarios')
                        .update({ rol })
                        .eq('id', data.user.id);

                    if (perfilError) console.warn('Error asignando rol:', perfilError);
                }

                return { success: true, data };
            } catch (error) {
                console.error('Error creando usuario:', error);
                return { success: false, error };
            }
        } else {
            const usuarios = JSON.parse(localStorage.getItem('usuarios')) || [];
            usuarios.push(usuario);
            localStorage.setItem('usuarios', JSON.stringify(usuarios));
            return { success: true };
        }
    },
    async eliminarUsuario(idOrUsername) {
        if (supabaseClient) {
            try {
                const { error } = await supabaseClient
                    .from('perfiles_usuarios')
                    .delete()
                    .or(`id.eq.${idOrUsername},username.eq.${idOrUsername}`);
                if (error) throw error;
                return { success: true };
            } catch (error) {
                return { success: false, error };
            }
        } else {
            const usuarios = JSON.parse(localStorage.getItem('usuarios')) || [];
            const next = usuarios.filter(u => u.username !== idOrUsername && u.id !== idOrUsername);
            localStorage.setItem('usuarios', JSON.stringify(next));
            return { success: true };
        }
    },
    async obtenerTodosUsuarios() {
        if (supabaseClient) {
            try {
                const { data, error } = await supabaseClient
                    .from('perfiles_usuarios')
                    .select('*')
                    .order('username');
                if (error) throw error;
                return { success: true, data };
            } catch (error) {
                return { success: false, error };
            }
        } else {
            const data = JSON.parse(localStorage.getItem('usuarios')) || [];
            return { success: true, data };
        }
    },
    async actualizarUsuario(id, updates) {
        if (supabaseClient) {
            try {
                const { data, error } = await supabaseClient
                    .from('perfiles_usuarios')
                    .update(updates)
                    .eq('id', id)
                    .select('*');
                if (error) throw error;
                return { success: true, data };
            } catch (error) {
                return { success: false, error };
            }
        } else {
            const usuarios = JSON.parse(localStorage.getItem('usuarios')) || [];
            const next = usuarios.map(u => u.id === id ? { ...u, ...updates } : u);
            localStorage.setItem('usuarios', JSON.stringify(next));
            return { success: true };
        }
    },
    async toggleUsuarioActivo(id, activo) {
        return this.actualizarUsuario(id, { activo });
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
    },
    async guardarMovimientoTemporal(item) {
        if (supabaseClient) {
            try {
                // **NUEVO:** Asegurar que el campo arqueado esté presente
                const itemConEstado = { ...item, arqueado: item.arqueado !== undefined ? item.arqueado : false };

                const { data, error } = await supabaseClient
                    .from('movimientos_temporales')
                    .upsert([itemConEstado]);
                if (error) throw error;
                return { success: true, data };
            } catch (error) {
                return { success: false, error };
            }
        } else {
            return this.guardarEnLocalStorage('movimientosTemporales', item);
        }
    },
    async obtenerMovimientosTemporales() {
        if (supabaseClient) {
            try {
                const { data, error } = await supabaseClient
                    .from('movimientos_temporales')
                    .select('*')
                    .order('fecha', { ascending: false });
                if (error) throw error;
                return { success: true, data };
            } catch (error) {
                console.error('Error obteniendo movimientos temporales:', error);
                return { success: false, error };
            }
        } else {
            const all = JSON.parse(localStorage.getItem('movimientosTemporales')) || [];
            return { success: true, data: all };
        }
    },

    async obtenerMovimientosTemporalesPorFechaCaja(fecha, caja) {
        if (supabaseClient) {
            try {
                let query = supabaseClient
                    .from('movimientos_temporales')
                    .select('*')
                    .gte('fecha', fecha)
                    .lt('fecha', fecha + 'T23:59:59')
                    .order('fecha', { ascending: false });
                if (caja) query = query.eq('caja', caja);
                const { data, error } = await query;
                if (error) throw error;
                return { success: true, data };
            } catch (error) {
                return { success: false, error };
            }
        } else {
            const all = JSON.parse(localStorage.getItem('movimientosTemporales')) || [];
            const data = all.filter(m => m.fecha && m.fecha.startsWith(fecha) && (!caja || m.caja === caja));
            return { success: true, data };
        }
    },
    async eliminarMovimientoTemporal(id) {
        if (supabaseClient) {
            try {
                const { error } = await supabaseClient
                    .from('movimientos_temporales')
                    .delete()
                    .eq('id', id);
                if (error) throw error;
                return { success: true };
            } catch (error) {
                return { success: false, error };
            }
        } else {
            const items = JSON.parse(localStorage.getItem('movimientosTemporales')) || [];
            const next = items.filter(i => i.id !== id);
            localStorage.setItem('movimientosTemporales', JSON.stringify(next));
            return { success: true };
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

// ==================== FUNCIONES PARA ARQUEOS ====================

/**
 * Guardar un arqueo en la base de datos
 */
async function guardarArqueo(datosArqueo) {
    try {
        if (!supabaseClient) {
            throw new Error('Supabase no está inicializado');
        }

        // CORRECCIÓN: Usar getSession() que es asíncrono en Supabase v2
        const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
        if (sessionError) throw sessionError;

        const usuario = session?.user;
        if (!usuario) {
            throw new Error('Usuario no autenticado');
        }

        // Añadir el usuario_id a los datos del arqueo
        const datosCompletos = { ...datosArqueo, usuario_id: usuario.id };

        const { data, error } = await supabaseClient
            .from('arqueos')
            .insert([datosCompletos])
            .select(); // CORRECCIÓN: Pedir que devuelva los datos insertados.

        if (error) throw error;

        return { success: true, data: data ? data[0] : null };
    } catch (error) {
        console.error('Error al guardar arqueo:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Obtener todos los arqueos
 */
async function obtenerArqueos() {
    try {
        if (!supabaseClient) {
            throw new Error('Supabase no está inicializado');
        }

        const { data, error } = await supabaseClient
            .from('arqueos')
            .select('*')
            .order('fecha', { ascending: false });

        if (error) throw error;

        return { success: true, data: data || [] };
    } catch (error) {
        console.error('Error al obtener arqueos:', error);
        return { success: false, error: error.message, data: [] };
    }
}

/**
 * Obtener arqueos por caja
 */
async function obtenerArqueosPorCaja(caja) {
    try {
        if (!supabaseClient) {
            throw new Error('Supabase no está inicializado');
        }

        const { data, error } = await supabaseClient
            .from('arqueos')
            .select('*')
            .eq('caja', caja)
            .order('fecha', { ascending: false });

        if (error) throw error;

        return { success: true, data: data || [] };
    } catch (error) {
        console.error('Error al obtener arqueos por caja:', error);
        return { success: false, error: error.message, data: [] };
    }
}

/**
 * Obtener arqueos por fecha
 */
async function obtenerArqueosPorFecha(fecha) {
    try {
        if (!supabaseClient) {
            throw new Error('Supabase no está inicializado');
        }

        const fechaInicio = `${fecha}T00:00:00`;
        const fechaFin = `${fecha}T23:59:59`;

        const { data, error } = await supabaseClient
            .from('arqueos')
            .select('*')
            .gte('fecha', fechaInicio)
            .lte('fecha', fechaFin)
            .order('fecha', { ascending: false });

        if (error) throw error;

        return { success: true, data: data || [] };
    } catch (error) {
        console.error('Error al obtener arqueos por fecha:', error);
        return { success: false, error: error.message, data: [] };
    }
}

/**
 * Actualizar arqueo
 */
async function actualizarArqueo(arqueoId, datosActualizados) {
    try {
        if (!supabaseClient) {
            throw new Error('Supabase no está inicializado');
        }

        const { data, error } = await supabaseClient
            .from('arqueos')
            .update(datosActualizados)
            .eq('id', arqueoId)
            .select(); // CORRECCIÓN: Pedir que devuelva los datos actualizados.

        if (error) throw error;

        return { success: true, data: data ? data[0] : null };
    } catch (error) {
        console.error('Error al actualizar arqueo:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Eliminar arqueo (solo admins)
 */
async function eliminarArqueo(arqueoId) {
    try {
        if (!supabaseClient) {
            throw new Error('Supabase no está inicializado');
        }

        const { error } = await supabaseClient
            .from('arqueos')
            .delete()
            .eq('id', arqueoId);

        if (error) throw error;

        return { success: true };
    } catch (error) {
        console.error('Error al eliminar arqueo:', error);
        return { success: false, error: error.message };
    }
}

// Exportar para uso en app.js
window.SUPABASE_CONFIG = SUPABASE_CONFIG;
window.db = db;
window.inicializarSupabase = inicializarSupabase;
window.migrarDatosALocalStorage = migrarDatosALocalStorage;

// Exportar funciones de arqueos
db.guardarArqueo = guardarArqueo;
db.obtenerArqueos = obtenerArqueos;
db.obtenerArqueosPorCaja = obtenerArqueosPorCaja;
db.obtenerArqueosPorFecha = obtenerArqueosPorFecha;
db.actualizarArqueo = actualizarArqueo;
db.eliminarArqueo = eliminarArqueo;
