/**
 * Configuración de Supabase con soporte para variables de entorno
 * 
 * IMPORTANTE: En producción, las credenciales deben venir de variables de entorno.
 * Los valores por defecto solo se usan en desarrollo local.
 */

// Función auxiliar para obtener variables de entorno de forma segura
function getEnvVar(key, defaultValue = '') {
    // Intentar obtener desde diferentes fuentes
    // 1. window.ENV (si se inyectan desde el build)
    if (typeof window !== 'undefined' && window.ENV && window.ENV[key]) {
        return window.ENV[key];
    }
    // 2. Variables de entorno de Node (si aplica)
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
        return process.env[key];
    }
    // 3. Fallback al valor por defecto
    return defaultValue;
}

const SUPABASE_CONFIG = {
    URL: getEnvVar('SUPABASE_URL', 'https://grfyzwfinmowqqxfegsx.supabase.co'),
    ANON_KEY: getEnvVar('SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdyZnl6d2Zpbm1vd3FxeGZlZ3N4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4MTY3ODMsImV4cCI6MjA3ODM5Mjc4M30.PSr-D8iyMv0ccLUhlFy5Vi6QO12VVWQVDFubmsrotT8')
};

// Cliente de Supabase (se inicializará cuando esté disponible)
let supabaseClient = null;
let usuarioActual = null;
let supabaseInicializado = false;

// Función para inicializar Supabase cuando esté disponible
if (typeof logger !== 'undefined') {
    logger.info("Inicializando módulo Supabase");
}
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

                // **NUEVO:** Intentar sincronizar datos pendientes al autenticarse
                if (navigator.onLine) {
                    setTimeout(() => window.sincronizarDatosOffline(), 1000);
                }
            } else {
                usuarioActual = null;
                localStorage.removeItem('usuario_actual');
                console.log('Usuario desautenticado');
            }
        });

        // **NUEVO:** Listeners globales de conexión
        window.addEventListener('online', () => {
            console.log('🌐 Conexión restaurada. Iniciando sincronización...');
            showNotification('Conexión restaurada. Sincronizando datos...', 'info');
            window.sincronizarDatosOffline();
        });

        window.addEventListener('offline', () => {
            console.log('🔌 Conexión perdida. Modo Offline activado.');
            showNotification('Sin conexión. Los datos se guardarán localmente.', 'warning');
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

    async obtenerEmailPorUsername(username) {
        if (supabaseClient) {
            try {
                // Llamar a la función RPC que hace el JOIN entre perfiles_usuarios y auth.users
                const { data: email, error } = await supabaseClient
                    .rpc('get_user_email_by_username', { p_username: username });

                if (error) {
                    console.error('Error obteniendo email por username:', error);
                    return { success: false, error };
                }

                if (!email) {
                    return { success: false, error: { message: 'Usuario no encontrado' } };
                }

                return { success: true, email: email };
            } catch (error) {
                console.error('Error obteniendo email por username:', error);
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
                const { user_id, ...egresoLimpio } = egreso;
                const { data, error } = await supabaseClient
                    .from('egresos_caja')
                    .upsert([egresoLimpio]);
                if (error) throw error;
                return { success: true, data };
            } catch (error) {
                console.error('Error completo al guardar egreso (Offline Fallback):', error);
                const itemOffline = { ...egreso, pending_sync: true };
                this.guardarEnLocalStorage('egresosCaja', itemOffline);
                return { success: true, offline: true, error };
            }
        } else {
            return this.guardarEnLocalStorage('egresosCaja', egreso);
        }
    },
    async guardarEgresoCajaV5(egreso) {
        if (supabaseClient) {
            try {
                // Forzamos un objeto limpio con TODOS los campos que existen en la tabla
                const payload = {
                    id: egreso.id,
                    fecha: egreso.fecha,
                    caja: egreso.caja,
                    categoria: egreso.categoria,
                    descripcion: egreso.descripcion,
                    monto: egreso.monto,
                    referencia: egreso.referencia,
                    cajero: egreso.usuario,
                    // Agregamos valores por defecto para evitar errores NOT NULL
                    efectivo: null,
                    arqueado: false
                };

                // Debug Payload
                console.log('Payload V5:', JSON.stringify(payload));

                // Usamos insert sin select
                const { error } = await supabaseClient
                    .from('egresos_caja')
                    .insert([payload]);

                if (error) throw error;
                return { success: true };
            } catch (error) {
                console.error("Error guardarEgresoCajaV5:", error);
                alert("Error Supabase V5: " + JSON.stringify(error, null, 2));
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
                const { user_id, ...movimientoLimpio } = movimiento;
                const { data, error } = await supabaseClient
                    .from('movimientos')
                    .upsert([movimientoLimpio]);
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

    async eliminarMovimiento(id) {
        if (supabaseClient) {
            try {
                const { error } = await supabaseClient
                    .from('movimientos')
                    .delete()
                    .eq('id', id);
                if (error) throw error;
                return { success: true };
            } catch (error) {
                console.error('Error eliminando movimiento:', error);
                return { success: false, error };
            }
        } else {
            const items = JSON.parse(localStorage.getItem('movimientos')) || [];
            const next = items.filter(m => m.id !== id);
            localStorage.setItem('movimientos', JSON.stringify(next));
            return { success: true };
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

            // **MEJORA:** Upsert en localStorage para evitar duplicados al editar offline
            const index = items.findIndex(i => i.id === item.id);
            if (index >= 0) {
                items[index] = item;
            } else {
                items.push(item);
            }

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
                // **NUEVO:** Asegurar que el campo arqueado esté presente y eliminar user_id
                const { user_id, ...itemLimpio } = item;
                const itemConEstado = { ...itemLimpio, arqueado: item.arqueado !== undefined ? item.arqueado : false };

                // **DEBUG:** Log para verificar qué se está guardando
                console.log('=== GUARDANDO EN SUPABASE ===');
                console.log('Item completo:', itemConEstado);
                console.log('Efectivo a guardar:', itemConEstado.efectivo);
                console.log('Keys de efectivo:', Object.keys(itemConEstado.efectivo || {}));

                const { data, error } = await supabaseClient
                    .from('movimientos_temporales')
                    .upsert([itemConEstado]);

                if (error) {
                    console.error('Error de Supabase:', error);
                    throw error;
                }

                console.log('Guardado exitoso. Data devuelta:', data);
                return { success: true, data };
            } catch (error) {
                console.error('Error completo al guardar (Offline Fallback):', error);
                // Fallback: Guardar en localStorage si falla Supabase
                const itemOffline = { ...item, arqueado: item.arqueado !== undefined ? item.arqueado : false, pending_sync: true };
                this.guardarEnLocalStorage('movimientosTemporales', itemOffline);
                console.warn('Datos guardados localmente por error de red.');
                return { success: true, offline: true, error: error };
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

                // **DEBUG:** Log para verificar qué se está recuperando
                console.log('=== RECUPERANDO DE SUPABASE ===');
                console.log('Total movimientos recuperados:', data?.length || 0);
                if (data && data.length > 0) {
                    console.log('Primer movimiento:', data[0]);
                    console.log('Efectivo del primer movimiento:', data[0].efectivo);
                    console.log('Tipo de efectivo:', typeof data[0].efectivo);
                }

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
// Función ROBUSTA para sincronizar datos offline
window.sincronizarDatosOffline = async function () {
    if (!supabaseClient || !navigator.onLine) {
        console.log('No se puede sincronizar: Offline o Supabase no listo.');
        return;
    }

    console.log('🔄 Iniciando sincronización de datos...');
    let cambiosRealizados = false;

    // Helper para sincronizar una colección específica
    const sincronizarColeccion = async (keyStorage, tablaSupabase, idField = 'id') => {
        try {
            const items = JSON.parse(localStorage.getItem(keyStorage)) || [];
            // Filtrar items que tienen flag de pendiente o simplemente intentar sincronizar todos los que no estén en BD?
            // Estrategia segura: Sincronizar items marcados como 'pending_sync' O items creados offline
            // Para simplificar y ser robusto: Intentamos upsert de TODO lo que hay en local que tenga 'pending_sync'
            // O si queremos ser agresivos: Upsert de todo (puede ser costoso si hay muchos datos).

            // Filtramos por pending_sync para ser eficientes
            const pendientes = items.filter(i => i.pending_sync === true);

            if (pendientes.length === 0) return 0;



            let sincronizados = 0;
            for (const item of pendientes) {
                // Limpiar campos locales antes de enviar
                const { pending_sync, ...itemLimpio } = item;

                // Asegurar que user_id no vaya si causa problemas (aunque RLS lo suele manejar)
                delete itemLimpio.user_id;

                const { error } = await supabaseClient
                    .from(tablaSupabase)
                    .upsert(itemLimpio);

                if (!error) {
                    // Éxito: Actualizar item local para quitar flag pending_sync
                    item.pending_sync = false;
                    sincronizados++;
                } else {
                    console.error(`Error sincronizando ${keyStorage} ID ${item[idField]}:`, error);
                }
            }

            // Guardar cambios en localStorage (para quitar los flags pending_sync)
            if (sincronizados > 0) {
                localStorage.setItem(keyStorage, JSON.stringify(items));
                cambiosRealizados = true;
            }

            return sincronizados;

        } catch (e) {
            console.error(`Error general sincronizando ${keyStorage}:`, e);
            return 0;
        }
    };

    // 1. Arqueos
    const arqueosSync = await sincronizarColeccion('arqueos', 'arqueos');

    // 2. Movimientos (Operaciones)
    const movimientosSync = await sincronizarColeccion('movimientos', 'movimientos');

    // 3. Egresos Caja
    const egresosSync = await sincronizarColeccion('egresosCaja', 'egresos_caja');

    // 4. Movimientos Temporales (Ingresos)
    const temporalesSync = await sincronizarColeccion('movimientosTemporales', 'movimientos_temporales');

    const totalSync = arqueosSync + movimientosSync + egresosSync + temporalesSync;

    if (totalSync > 0) {
        console.log(`✅ Sincronización completada. ${totalSync} registros subidos.`);
        showNotification(`${totalSync} registros sincronizados con la nube.`, 'success');

        // Opcional: Recargar datos desde la nube para asegurar consistencia total
        // if (window.initSupabaseData) window.initSupabaseData(); 
    } else {
        console.log('Todo está actualizado.');
    }
};

// Mantener compatibilidad con nombre anterior si es necesario, o eliminar
window.migrarDatosALocalStorage = window.sincronizarDatosOffline;

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
        const { user_id, ...datosLimpios } = datosArqueo;
        const datosCompletos = { ...datosLimpios, usuario_id: usuario.id };

        const { data, error } = await supabaseClient
            .from('arqueos')
            .insert([datosCompletos])
            .select(); // CORRECCIÓN: Pedir que devuelva los datos insertados.

        if (error) throw error;

        return { success: true, data: data ? data[0] : null };
    } catch (error) {
        console.error('Error al guardar arqueo (Offline Fallback):', error);

        let userId = null;
        try {
            const userStored = JSON.parse(localStorage.getItem('usuario_actual'));
            userId = userStored?.id;
        } catch (e) { console.warn('No se pudo recuperar usuario local'); }

        const datosCompletosOffline = { ...datosArqueo, usuario_id: userId, pending_sync: true };

        if (window.db && window.db.guardarEnLocalStorage) {
            window.db.guardarEnLocalStorage('arqueos', datosCompletosOffline);
            console.warn('Arqueo guardado localmente por error de red.');
            return { success: true, offline: true, error: error.message };
        }

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
// ===== FUNCIONES PARA RECAUDACIÓN =====
async function guardarRecaudacion(fecha, cajero, caja, efectivo_ingresado) {
    if (!supabaseClient) {
        console.warn('Supabase no disponible. Usar localStorage.');
        return false;
    }

    try {
        const usuario = usuarioActual ? usuarioActual.email : 'desconocido';

        const { data, error } = await supabaseClient
            .from('recaudacion')
            .upsert({
                fecha: fecha,
                cajero: cajero,
                caja: caja,
                efectivo_ingresado: parseInt(efectivo_ingresado) || 0,
                usuario_id: usuarioActual?.id,
                usuario: usuario
            }, {
                onConflict: 'fecha,cajero,caja'
            });

        if (error) {
            console.error('[DB] Error al guardar recaudación:', error);
            return false;
        }

        console.log('[DB] Recaudación guardada:', { fecha, cajero, caja, efectivo_ingresado });
        return true;
    } catch (err) {
        console.error('[DB] Error en guardarRecaudacion:', err);
        return false;
    }
}

async function obtenerRecaudacion(fecha, cajero = null, caja = null) {
    if (!supabaseClient) {
        console.warn('Supabase no disponible. Usar localStorage.');
        return [];
    }

    try {
        let query = supabaseClient
            .from('recaudacion')
            .select('*')
            .eq('fecha', fecha);

        if (cajero) query = query.eq('cajero', cajero);
        if (caja) query = query.eq('caja', caja);

        const { data, error } = await query;

        if (error) {
            console.error('[DB] Error al obtener recaudación:', error);
            return [];
        }


        return data || [];
    } catch (err) {
        console.error('[DB] Error en obtenerRecaudacion:', err);
        return [];
    }
}

async function obtenerRecaudacionPorRango(fechaDesde, fechaHasta) {
    if (!supabaseClient) {
        console.warn('Supabase no disponible. Usar localStorage.');
        return [];
    }

    try {
        const { data, error } = await supabaseClient
            .from('recaudacion')
            .select('*')
            .gte('fecha', fechaDesde)
            .lte('fecha', fechaHasta)
            .order('fecha', { ascending: false });

        if (error) {
            console.error('[DB] Error al obtener recaudación por rango:', error);
            return [];
        }

        console.log('[DB] Recaudación por rango recuperada:', data);
        return data || [];
    } catch (err) {
        console.error('[DB] Error en obtenerRecaudacionPorRango:', err);
        return [];
    }
}

// ===== DEPÓSITOS DE SERVICIOS =====

/**
 * Guardar un resumen de depósitos de servicios
 * @param {Object} deposito - Objeto con los datos del depósito
 * @returns {Promise<{success: boolean, data?: any, error?: any}>}
 */
db.guardarDepositoServicios = async function (deposito) {
    if (supabaseClient) {
        try {
            const { data, error } = await supabaseClient
                .from('depositos_servicios')
                .insert([deposito])
                .select();

            if (error) throw error;

            if (typeof logger !== 'undefined') {
                logger.info('Depósito de servicios guardado:', data);
            }

            return { success: true, data };
        } catch (error) {
            if (typeof logger !== 'undefined') {
                logger.error('Error guardando depósito servicios:', error);
            }
            // Fallback a localStorage en caso de error
            return this.guardarEnLocalStorage('depositosServicios', deposito);
        }
    } else {
        return this.guardarEnLocalStorage('depositosServicios', deposito);
    }
};

/**
 * Obtener depósitos de servicios por rango de fechas
 * @param {string} fechaDesde - Fecha desde (formato YYYY-MM-DD)
 * @param {string} fechaHasta - Fecha hasta (formato YYYY-MM-DD)
 * @param {string} caja - Filtro opcional por caja
 * @returns {Promise<{success: boolean, data?: array, error?: any}>}
 */
db.obtenerDepositosServicios = async function (fechaDesde, fechaHasta, caja = null) {
    if (supabaseClient) {
        try {
            let query = supabaseClient
                .from('depositos_servicios')
                .select('*')
                .gte('fecha', fechaDesde)
                .lte('fecha', fechaHasta)
                .order('fecha', { ascending: false })
                .order('fecha_creacion', { ascending: false });

            if (caja) {
                query = query.eq('caja', caja);
            }

            const { data, error } = await query;

            if (error) throw error;

            return { success: true, data };
        } catch (error) {
            if (typeof logger !== 'undefined') {
                logger.error('Error obteniendo depósitos servicios:', error);
            }
            return { success: false, error };
        }
    } else {
        const items = this.obtenerDeLocalStorage('depositosServicios', fechaDesde);
        return { success: true, data: items };
    }
};

/**
 * Obtener depósitos pendientes (no depositados)
 * @returns {Promise<{success: boolean, data?: array, error?: any}>}
 */
db.obtenerDepositosPendientes = async function () {
    if (supabaseClient) {
        try {
            const { data, error } = await supabaseClient
                .from('depositos_servicios')
                .select('*')
                .eq('depositado', false)
                .order('fecha', { ascending: false });

            if (error) throw error;

            return { success: true, data };
        } catch (error) {
            if (typeof logger !== 'undefined') {
                logger.error('Error obteniendo depósitos pendientes:', error);
            }
            return { success: false, error };
        }
    } else {
        const items = JSON.parse(localStorage.getItem('depositosServicios')) || [];
        const pendientes = items.filter(d => !d.depositado);
        return { success: true, data: pendientes };
    }
};

/**
 * Marcar un depósito como realizado
 * @param {string} id - ID del depósito
 * @param {string} comprobante - Número de comprobante bancario
 * @param {string} notas - Notas adicionales
 * @returns {Promise<{success: boolean, data?: any, error?: any}>}
 */
db.marcarDepositoRealizado = async function (id, comprobante, notas = '') {
    if (supabaseClient) {
        try {
            // Obtener perfil actual para registrar usuario
            const perfil = await this.obtenerPerfilActual();
            const usuario = perfil.data?.username || 'desconocido';

            const { data, error } = await supabaseClient
                .from('depositos_servicios')
                .update({
                    depositado: true,
                    fecha_deposito: new Date().toISOString(),
                    usuario_deposito: usuario,
                    comprobante_deposito: comprobante,
                    notas: notas,
                    actualizado_en: new Date().toISOString()
                })
                .eq('id', id)
                .select();

            if (error) throw error;

            if (typeof logger !== 'undefined') {
                logger.info('Depósito marcado como realizado:', id);
            }

            return { success: true, data };
        } catch (error) {
            if (typeof logger !== 'undefined') {
                logger.error('Error marcando depósito:', error);
            }
            return { success: false, error };
        }
    } else {
        // Actualizar en localStorage
        const items = JSON.parse(localStorage.getItem('depositosServicios')) || [];
        const index = items.findIndex(d => d.id === id);
        if (index !== -1) {
            items[index] = {
                ...items[index],
                depositado: true,
                fecha_deposito: new Date().toISOString(),
                comprobante_deposito: comprobante,
                notas: notas
            };
            localStorage.setItem('depositosServicios', JSON.stringify(items));
            return { success: true, data: items[index] };
        }
        return { success: false, error: { message: 'Depósito no encontrado' } };
    }
};

/**
 * Eliminar un depósito de servicios (solo admin/tesorería)
 * @param {string} id - ID del depósito a eliminar
 * @returns {Promise<{success: boolean, error?: any}>}
 */
db.eliminarDepositoServicios = async function (id) {
    if (supabaseClient) {
        try {
            const { error } = await supabaseClient
                .from('depositos_servicios')
                .delete()
                .eq('id', id);

            if (error) throw error;

            if (typeof logger !== 'undefined') {
                logger.info('Depósito eliminado:', id);
            }

            return { success: true };
        } catch (error) {
            if (typeof logger !== 'undefined') {
                logger.error('Error eliminando depósito:', error);
            }
            return { success: false, error };
        }
    } else {
        const items = JSON.parse(localStorage.getItem('depositosServicios')) || [];
        const filtrados = items.filter(d => d.id !== id);
        localStorage.setItem('depositosServicios', JSON.stringify(filtrados));
        return { success: true };
    }
};


// Exportar funciones de recaudación
db.guardarRecaudacion = guardarRecaudacion;
db.obtenerRecaudacion = obtenerRecaudacion;
db.obtenerRecaudacionPorRango = obtenerRecaudacionPorRango;