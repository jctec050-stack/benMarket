-- ============================================================
-- SCHEMA COMPLETO - BENMARKET (benmark2)
-- Proyecto Supabase: grfyzwfinmowqqxfegsx.supabase.co
-- Fecha generación: 2026-04-16
-- ============================================================
-- INSTRUCCIONES: Ejecutar este script en el SQL Editor de Supabase
-- Panel: https://supabase.com/dashboard/project/grfyzwfinmowqqxfegsx/sql/new
-- ============================================================


-- ============================================================
-- PASO 1: TABLA perfiles_usuarios
-- ============================================================

-- Limpiar trigger/función anterior
DROP TRIGGER IF EXISTS trigger_crear_perfil_usuario ON auth.users;
DROP FUNCTION IF EXISTS public.crear_perfil_usuario();

-- Crear tabla de perfiles (sin RLS para que el trigger funcione)
CREATE TABLE IF NOT EXISTS public.perfiles_usuarios (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    rol TEXT NOT NULL DEFAULT 'cajero' CHECK (rol IN ('admin','cajero','tesoreria')),
    activo BOOLEAN DEFAULT TRUE,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_perfiles_username ON public.perfiles_usuarios(username);
CREATE INDEX IF NOT EXISTS idx_perfiles_rol ON public.perfiles_usuarios(rol);
CREATE INDEX IF NOT EXISTS idx_perfiles_activo ON public.perfiles_usuarios(activo);

-- Trigger: crear perfil automáticamente al registrar usuario
CREATE OR REPLACE FUNCTION public.crear_perfil_usuario()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.perfiles_usuarios (id, username, rol, activo)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'username', NEW.email), 'cajero', TRUE)
    ON CONFLICT (username) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_crear_perfil_usuario
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.crear_perfil_usuario();

-- Habilitar RLS en perfiles_usuarios
ALTER TABLE public.perfiles_usuarios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "perfiles_select_all" ON public.perfiles_usuarios;
CREATE POLICY "perfiles_select_all"
    ON public.perfiles_usuarios
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "perfiles_insert_system" ON public.perfiles_usuarios;
CREATE POLICY "perfiles_insert_system"
    ON public.perfiles_usuarios
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.perfiles_usuarios
            WHERE id = auth.uid() AND rol = 'admin'
        )
    );

DROP POLICY IF EXISTS "perfiles_update_own_or_admin" ON public.perfiles_usuarios;
CREATE POLICY "perfiles_update_own_or_admin"
    ON public.perfiles_usuarios
    FOR UPDATE
    USING (
        id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.perfiles_usuarios
            WHERE id = auth.uid() AND rol = 'admin'
        )
    )
    WITH CHECK (
        id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.perfiles_usuarios
            WHERE id = auth.uid() AND rol = 'admin'
        )
    );

DROP POLICY IF EXISTS "perfiles_delete_admin" ON public.perfiles_usuarios;
CREATE POLICY "perfiles_delete_admin"
    ON public.perfiles_usuarios
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.perfiles_usuarios
            WHERE id = auth.uid() AND rol = 'admin'
        )
    );


-- ============================================================
-- PASO 2: TABLA movimientos
-- ============================================================

CREATE TABLE IF NOT EXISTS public.movimientos (
    id TEXT PRIMARY KEY,
    fecha TIMESTAMP WITH TIME ZONE NOT NULL,
    cajero TEXT,
    tipo TEXT NOT NULL,
    "historialEdiciones" JSONB DEFAULT '[]'::jsonb,
    receptor TEXT,
    descripcion TEXT NOT NULL,
    "numeroRecibo" INTEGER,
    monto INTEGER NOT NULL,
    moneda TEXT NOT NULL CHECK (moneda IN ('gs','usd','brl','ars')),
    caja TEXT,
    referencia TEXT,
    categoria TEXT,
    usuario_id UUID REFERENCES auth.users(id),
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Constraint de tipo con todos los valores válidos
ALTER TABLE public.movimientos DROP CONSTRAINT IF EXISTS movimientos_tipo_check;
ALTER TABLE public.movimientos DROP CONSTRAINT IF EXISTS movimientos_tipo_check1;
ALTER TABLE public.movimientos ADD CONSTRAINT movimientos_tipo_check1
    CHECK (tipo IN ('gasto','egreso','transferencia','operacion','deposito-inversiones'));

CREATE INDEX IF NOT EXISTS idx_movimientos_fecha ON public.movimientos(fecha);
CREATE INDEX IF NOT EXISTS idx_movimientos_tipo ON public.movimientos(tipo);
CREATE INDEX IF NOT EXISTS idx_movimientos_caja ON public.movimientos(caja);
CREATE INDEX IF NOT EXISTS idx_movimientos_cajero ON public.movimientos(cajero);
CREATE INDEX IF NOT EXISTS idx_movimientos_receptor ON public.movimientos(receptor);

-- RLS para MOVIMIENTOS
ALTER TABLE public.movimientos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "movimientos_select" ON public.movimientos;
CREATE POLICY "movimientos_select"
    ON public.movimientos FOR SELECT
    USING (
        auth.uid() IS NOT NULL AND
        EXISTS (SELECT 1 FROM public.perfiles_usuarios WHERE id = auth.uid() AND activo = TRUE)
    );

DROP POLICY IF EXISTS "movimientos_insert" ON public.movimientos;
CREATE POLICY "movimientos_insert"
    ON public.movimientos FOR INSERT
    WITH CHECK (
        auth.uid() IS NOT NULL AND
        EXISTS (SELECT 1 FROM public.perfiles_usuarios WHERE id = auth.uid() AND activo = TRUE)
    );

DROP POLICY IF EXISTS "movimientos_update" ON public.movimientos;
CREATE POLICY "movimientos_update"
    ON public.movimientos FOR UPDATE
    USING (
        auth.uid() IS NOT NULL AND
        EXISTS (SELECT 1 FROM public.perfiles_usuarios WHERE id = auth.uid() AND activo = TRUE)
    );

DROP POLICY IF EXISTS "movimientos_delete" ON public.movimientos;
CREATE POLICY "movimientos_delete"
    ON public.movimientos FOR DELETE
    USING (
        auth.uid() IS NOT NULL AND
        EXISTS (SELECT 1 FROM public.perfiles_usuarios WHERE id = auth.uid() AND activo = TRUE)
    );


-- ============================================================
-- PASO 3: TABLA egresos_caja
-- ============================================================

CREATE TABLE IF NOT EXISTS public.egresos_caja (
    id TEXT PRIMARY KEY,
    fecha TIMESTAMP WITH TIME ZONE NOT NULL,
    caja TEXT NOT NULL,
    cajero TEXT,
    categoria TEXT NOT NULL,
    descripcion TEXT NOT NULL,
    monto INTEGER NOT NULL,
    referencia TEXT,
    efectivo JSONB,
    receptor TEXT,
    numero_recibo INTEGER,
    arqueado BOOLEAN DEFAULT FALSE,
    moneda TEXT DEFAULT 'gs',
    usuario_id UUID REFERENCES auth.users(id),
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_egresos_caja_fecha ON public.egresos_caja(fecha);
CREATE INDEX IF NOT EXISTS idx_egresos_caja_caja ON public.egresos_caja(caja);
CREATE INDEX IF NOT EXISTS idx_egresos_caja_categoria ON public.egresos_caja(categoria);

-- RLS para EGRESOS_CAJA
ALTER TABLE public.egresos_caja ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "egresos_select" ON public.egresos_caja;
CREATE POLICY "egresos_select"
    ON public.egresos_caja FOR SELECT
    USING (
        auth.uid() IS NOT NULL AND
        EXISTS (SELECT 1 FROM public.perfiles_usuarios WHERE id = auth.uid() AND activo = TRUE)
    );

DROP POLICY IF EXISTS "egresos_insert" ON public.egresos_caja;
CREATE POLICY "egresos_insert"
    ON public.egresos_caja FOR INSERT
    WITH CHECK (
        auth.uid() IS NOT NULL AND
        EXISTS (SELECT 1 FROM public.perfiles_usuarios WHERE id = auth.uid() AND activo = TRUE)
    );

DROP POLICY IF EXISTS "egresos_update" ON public.egresos_caja;
CREATE POLICY "egresos_update"
    ON public.egresos_caja FOR UPDATE
    USING (
        auth.uid() IS NOT NULL AND
        EXISTS (SELECT 1 FROM public.perfiles_usuarios WHERE id = auth.uid() AND activo = TRUE)
    );

DROP POLICY IF EXISTS "egresos_delete" ON public.egresos_caja;
CREATE POLICY "egresos_delete"
    ON public.egresos_caja FOR DELETE
    USING (
        auth.uid() IS NOT NULL AND
        EXISTS (SELECT 1 FROM public.perfiles_usuarios WHERE id = auth.uid() AND activo = TRUE)
    );


-- ============================================================
-- PASO 4: TABLA movimientos_temporales (Ingresos Dashboard)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.movimientos_temporales (
    id TEXT PRIMARY KEY,
    fecha TIMESTAMP WITH TIME ZONE NOT NULL,
    cajero TEXT,
    caja TEXT NOT NULL,
    descripcion TEXT,
    "valorVenta" INTEGER DEFAULT 0,
    efectivo JSONB,
    "efectivoVuelto" JSONB,
    "monedasExtranjeras" JSONB,
    "pagosTarjeta" INTEGER DEFAULT 0,
    "ventasCredito" INTEGER DEFAULT 0,
    "pedidosYa" INTEGER DEFAULT 0,
    ventas_transferencia INTEGER DEFAULT 0,
    servicios JSONB,
    "otrosServicios" JSONB,
    "historialEdiciones" JSONB,
    usuario_id UUID REFERENCES auth.users(id),
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_movtmp_fecha ON public.movimientos_temporales(fecha);
CREATE INDEX IF NOT EXISTS idx_movtmp_caja ON public.movimientos_temporales(caja);

-- RLS para MOVIMIENTOS_TEMPORALES
ALTER TABLE public.movimientos_temporales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "movimientos_temporales_select" ON public.movimientos_temporales;
CREATE POLICY "movimientos_temporales_select"
    ON public.movimientos_temporales FOR SELECT
    USING (
        auth.uid() IS NOT NULL AND
        EXISTS (SELECT 1 FROM public.perfiles_usuarios WHERE id = auth.uid() AND activo = TRUE)
    );

DROP POLICY IF EXISTS "movimientos_temporales_insert" ON public.movimientos_temporales;
CREATE POLICY "movimientos_temporales_insert"
    ON public.movimientos_temporales FOR INSERT
    WITH CHECK (
        auth.uid() IS NOT NULL AND
        EXISTS (SELECT 1 FROM public.perfiles_usuarios WHERE id = auth.uid() AND activo = TRUE)
    );

DROP POLICY IF EXISTS "movimientos_temporales_update" ON public.movimientos_temporales;
CREATE POLICY "movimientos_temporales_update"
    ON public.movimientos_temporales FOR UPDATE
    USING (
        auth.uid() IS NOT NULL AND
        EXISTS (SELECT 1 FROM public.perfiles_usuarios WHERE id = auth.uid() AND activo = TRUE)
    );

DROP POLICY IF EXISTS "movimientos_temporales_delete" ON public.movimientos_temporales;
CREATE POLICY "movimientos_temporales_delete"
    ON public.movimientos_temporales FOR DELETE
    USING (
        auth.uid() IS NOT NULL AND
        EXISTS (SELECT 1 FROM public.perfiles_usuarios WHERE id = auth.uid() AND activo = TRUE)
    );


-- ============================================================
-- PASO 5: TABLA arqueos
-- ============================================================

CREATE TABLE IF NOT EXISTS public.arqueos (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    fecha TIMESTAMP WITH TIME ZONE NOT NULL,
    cajero TEXT NOT NULL,
    caja TEXT NOT NULL,
    "fondoFijo" INTEGER DEFAULT 0,
    cotizaciones JSONB,
    efectivo JSONB,
    dolares JSONB,
    reales JSONB,
    pesos JSONB,
    "totalEfectivo" INTEGER DEFAULT 0,
    "pagosTarjeta" INTEGER DEFAULT 0,
    "ventasCredito" INTEGER DEFAULT 0,
    "pedidosYa" INTEGER DEFAULT 0,
    ventas_transferencia INTEGER DEFAULT 0,
    servicios JSONB,
    "totalServicios" INTEGER DEFAULT 0,
    "totalIngresos" INTEGER DEFAULT 0,
    "totalEgresos" INTEGER DEFAULT 0,
    "totalMovimientos" INTEGER DEFAULT 0,
    "saldoCaja" INTEGER DEFAULT 0,
    diferencia INTEGER DEFAULT 0,
    observaciones TEXT,
    "monedasExtranjeras" JSONB,
    usuario_id UUID REFERENCES auth.users(id),
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_arqueos_fecha ON public.arqueos(fecha);
CREATE INDEX IF NOT EXISTS idx_arqueos_caja ON public.arqueos(caja);
CREATE INDEX IF NOT EXISTS idx_arqueos_cajero ON public.arqueos(cajero);
CREATE INDEX IF NOT EXISTS idx_arqueos_usuario ON public.arqueos(usuario_id);

-- RLS para ARQUEOS
ALTER TABLE public.arqueos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "arqueos_select" ON public.arqueos;
CREATE POLICY "arqueos_select"
    ON public.arqueos FOR SELECT
    USING (
        auth.uid() IS NOT NULL AND
        EXISTS (SELECT 1 FROM public.perfiles_usuarios WHERE id = auth.uid() AND activo = TRUE)
    );

DROP POLICY IF EXISTS "arqueos_insert" ON public.arqueos;
CREATE POLICY "arqueos_insert"
    ON public.arqueos FOR INSERT
    WITH CHECK (
        auth.uid() IS NOT NULL AND
        EXISTS (SELECT 1 FROM public.perfiles_usuarios WHERE id = auth.uid() AND activo = TRUE)
    );

DROP POLICY IF EXISTS "arqueos_update" ON public.arqueos;
CREATE POLICY "arqueos_update"
    ON public.arqueos FOR UPDATE
    USING (
        auth.uid() IS NOT NULL AND
        EXISTS (SELECT 1 FROM public.perfiles_usuarios WHERE id = auth.uid() AND activo = TRUE)
    );

DROP POLICY IF EXISTS "arqueos_delete" ON public.arqueos;
CREATE POLICY "arqueos_delete"
    ON public.arqueos FOR DELETE
    USING (
        auth.uid() IS NOT NULL AND
        EXISTS (SELECT 1 FROM public.perfiles_usuarios WHERE id = auth.uid() AND activo = TRUE)
    );


-- ============================================================
-- PASO 6: TABLA recaudacion (Resumen Tesorería)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.recaudacion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fecha DATE NOT NULL,
    cajero VARCHAR(255) NOT NULL,
    caja VARCHAR(255) NOT NULL,
    "efectivoIngresado" BIGINT NOT NULL DEFAULT 0,
    usuario_id UUID REFERENCES public.perfiles_usuarios(id) ON DELETE SET NULL,
    usuario VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(fecha, cajero, caja)
);

CREATE INDEX IF NOT EXISTS idx_recaudacion_fecha ON public.recaudacion(fecha);
CREATE INDEX IF NOT EXISTS idx_recaudacion_cajero ON public.recaudacion(cajero);
CREATE INDEX IF NOT EXISTS idx_recaudacion_caja ON public.recaudacion(caja);
CREATE INDEX IF NOT EXISTS idx_recaudacion_fecha_cajero ON public.recaudacion(fecha, cajero);
CREATE INDEX IF NOT EXISTS idx_recaudacion_fecha_caja ON public.recaudacion(fecha, caja);

-- RLS para RECAUDACION
ALTER TABLE public.recaudacion ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Recaudacion select policy" ON public.recaudacion;
CREATE POLICY "Recaudacion select policy" ON public.recaudacion
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Recaudacion insert policy" ON public.recaudacion;
CREATE POLICY "Recaudacion insert policy" ON public.recaudacion
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Recaudacion update policy" ON public.recaudacion;
CREATE POLICY "Recaudacion update policy" ON public.recaudacion
    FOR UPDATE USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Recaudacion delete policy" ON public.recaudacion;
CREATE POLICY "Recaudacion delete policy" ON public.recaudacion
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.perfiles_usuarios
            WHERE id = auth.uid() AND rol = 'admin'
        )
    );

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_recaudacion_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS recaudacion_updated_at_trigger ON public.recaudacion;
CREATE TRIGGER recaudacion_updated_at_trigger
BEFORE UPDATE ON public.recaudacion
FOR EACH ROW
EXECUTE FUNCTION update_recaudacion_updated_at();


-- ============================================================
-- PASO 7: TABLA cotizaciones
-- ============================================================

CREATE TABLE IF NOT EXISTS public.cotizaciones (
    id TEXT PRIMARY KEY,
    usd TEXT NOT NULL DEFAULT '7.000',
    brl TEXT NOT NULL DEFAULT '1.250',
    ars TEXT NOT NULL DEFAULT '0',
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insertar registro inicial
INSERT INTO public.cotizaciones (id, usd, brl, ars)
VALUES ('actual', '7.000', '1.250', '0')
ON CONFLICT (id) DO NOTHING;

-- RLS para COTIZACIONES
ALTER TABLE public.cotizaciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir lectura para todos" ON public.cotizaciones;
CREATE POLICY "Permitir lectura para todos" ON public.cotizaciones FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir actualización para todos" ON public.cotizaciones;
CREATE POLICY "Permitir actualización para todos" ON public.cotizaciones FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Permitir inserción para todos" ON public.cotizaciones;
CREATE POLICY "Permitir inserción para todos" ON public.cotizaciones FOR INSERT WITH CHECK (true);


-- ============================================================
-- PASO 8: TABLA total_general
-- ============================================================

CREATE TABLE IF NOT EXISTS public.total_general (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    fecha DATE NOT NULL,
    caja TEXT NOT NULL DEFAULT 'Todas las Cajas',
    total NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    UNIQUE(fecha, caja)
);

-- RLS para TOTAL_GENERAL
ALTER TABLE public.total_general ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios autenticados pueden ver totales" ON public.total_general;
CREATE POLICY "Usuarios autenticados pueden ver totales"
    ON public.total_general FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Usuarios autenticados pueden insertar totales" ON public.total_general;
CREATE POLICY "Usuarios autenticados pueden insertar totales"
    ON public.total_general FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar totales" ON public.total_general;
CREATE POLICY "Usuarios autenticados pueden actualizar totales"
    ON public.total_general FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION set_current_timestamp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_timestamp ON public.total_general;
CREATE TRIGGER trigger_set_timestamp
BEFORE UPDATE ON public.total_general
FOR EACH ROW
EXECUTE FUNCTION set_current_timestamp_updated_at();

GRANT ALL ON TABLE public.total_general TO authenticated;


-- ============================================================
-- FIN DEL SCRIPT
-- ============================================================
-- Tablas creadas:
--   1. perfiles_usuarios  - Usuarios del sistema con roles
--   2. movimientos        - Movimientos generales (transferencias, gastos, etc.)
--   3. egresos_caja       - Egresos diarios de caja
--   4. movimientos_temporales - Ingresos diarios (arqueo de ingresos)
--   5. arqueos            - Arqueos de caja completos
--   6. recaudacion        - Resumen tesorería
--   7. cotizaciones       - Tipo de cambio USD/BRL/ARS
--   8. total_general      - Totales generales por fecha/caja
-- ============================================================
