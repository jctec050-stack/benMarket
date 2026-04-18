-- ============================================
-- MIGRACIÓN: Tabla para Depósitos de Servicios
-- Fecha: 2026-02-09
-- Propósito: Guardar histórico de montos a depositar
--            del resumen de servicios
-- ============================================

-- ============================================
-- 1. CREAR TABLA depositos_servicios
-- ============================================

CREATE TABLE IF NOT EXISTS public.depositos_servicios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Datos del depósito
    fecha DATE NOT NULL,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Filtros aplicados al resumen
    fecha_desde TIMESTAMP WITH TIME ZONE,
    fecha_hasta TIMESTAMP WITH TIME ZONE,
    caja TEXT,
    
    -- Desglose por servicio (JSONB para flexibilidad)
    servicios JSONB NOT NULL,
    /* Estructura esperada:
    {
      "Aca Puedo": {
        "monto_tarjeta": 150000,
        "monto_efectivo": 50000,
        "total": 200000,
        "lotes": ["L001", "L002"],
        "cantidad_comprobantes": 5
      },
      "Aqui Pago": { ... }
    }
    */
    
    -- Totales generales
    total_tarjeta INTEGER NOT NULL DEFAULT 0,
    total_efectivo INTEGER NOT NULL DEFAULT 0,
    total_general INTEGER NOT NULL DEFAULT 0,
    
    -- Estado del depósito
    depositado BOOLEAN DEFAULT FALSE,
    fecha_deposito TIMESTAMP WITH TIME ZONE,
    usuario_deposito TEXT,
    comprobante_deposito TEXT,
    notas TEXT,
    
    -- Auditoría
    usuario_creacion TEXT NOT NULL,
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 2. ÍNDICES PARA OPTIMIZACIÓN
-- ============================================

CREATE INDEX IF NOT EXISTS idx_depositos_servicios_fecha 
    ON public.depositos_servicios(fecha DESC);

CREATE INDEX IF NOT EXISTS idx_depositos_servicios_depositado 
    ON public.depositos_servicios(depositado);

CREATE INDEX IF NOT EXISTS idx_depositos_servicios_caja 
    ON public.depositos_servicios(caja);

CREATE INDEX IF NOT EXISTS idx_depositos_servicios_usuario 
    ON public.depositos_servicios(usuario_creacion);

-- Índice para búsquedas JSONB por servicio
CREATE INDEX IF NOT EXISTS idx_depositos_servicios_jsonb 
    ON public.depositos_servicios USING GIN (servicios);

-- ============================================
-- 3. HABILITAR ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE public.depositos_servicios ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. POLÍTICAS RLS
-- ============================================

-- SELECT: Todos los usuarios autenticados y activos
CREATE POLICY "depositos_servicios_select"
    ON public.depositos_servicios
    FOR SELECT
    USING (
        auth.uid() IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM public.perfiles_usuarios
            WHERE id = auth.uid() AND activo = TRUE
        )
    );

COMMENT ON POLICY "depositos_servicios_select" ON public.depositos_servicios IS 
    'Permite a usuarios autenticados y activos ver los depósitos de servicios';

-- INSERT: Todos los usuarios autenticados y activos
CREATE POLICY "depositos_servicios_insert"
    ON public.depositos_servicios
    FOR INSERT
    WITH CHECK (
        auth.uid() IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM public.perfiles_usuarios
            WHERE id = auth.uid() AND activo = TRUE
        )
    );

COMMENT ON POLICY "depositos_servicios_insert" ON public.depositos_servicios IS 
    'Permite a usuarios autenticados y activos crear depósitos de servicios';

-- UPDATE: Todos los usuarios autenticados y activos
CREATE POLICY "depositos_servicios_update"
    ON public.depositos_servicios
    FOR UPDATE
    USING (
        auth.uid() IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM public.perfiles_usuarios
            WHERE id = auth.uid() AND activo = TRUE
        )
    );

COMMENT ON POLICY "depositos_servicios_update" ON public.depositos_servicios IS 
    'Permite a usuarios autenticados y activos actualizar depósitos de servicios';

-- DELETE: Solo admin y tesorería
CREATE POLICY "depositos_servicios_delete"
    ON public.depositos_servicios
    FOR DELETE
    USING (
        auth.uid() IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM public.perfiles_usuarios
            WHERE id = auth.uid() 
            AND activo = TRUE 
            AND rol IN ('admin', 'tesoreria')
        )
    );

COMMENT ON POLICY "depositos_servicios_delete" ON public.depositos_servicios IS 
    'Permite solo a admin y tesorería eliminar depósitos de servicios';

-- ============================================
-- 5. FUNCIÓN HELPER: Obtener depósitos pendientes
-- ============================================

CREATE OR REPLACE FUNCTION obtener_depositos_pendientes()
RETURNS TABLE (
    id UUID,
    fecha DATE,
    caja TEXT,
    total_general INTEGER,
    servicios JSONB,
    usuario_creacion TEXT,
    fecha_creacion TIMESTAMP WITH TIME ZONE
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.id,
        d.fecha,
        d.caja,
        d.total_general,
        d.servicios,
        d.usuario_creacion,
        d.fecha_creacion
    FROM public.depositos_servicios d
    WHERE d.depositado = FALSE
    ORDER BY d.fecha DESC, d.fecha_creacion DESC;
END;
$$;

COMMENT ON FUNCTION obtener_depositos_pendientes() IS 
    'Retorna todos los depósitos que aún no han sido marcados como realizados';

-- ============================================
-- 6. COMENTARIOS EN LA TABLA
-- ============================================

COMMENT ON TABLE public.depositos_servicios IS 
    'Almacena el histórico de montos a depositar del resumen de servicios';

COMMENT ON COLUMN public.depositos_servicios.servicios IS 
    'Desglose detallado por servicio en formato JSON';

COMMENT ON COLUMN public.depositos_servicios.depositado IS 
    'Indica si el depósito fue realizado en el banco';

-- ============================================
-- 7. VERIFICACIÓN
-- ============================================

-- Consulta para verificar que la tabla se creó correctamente
SELECT 
    table_name, 
    column_name, 
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'depositos_servicios'
ORDER BY ordinal_position;

-- Verificar políticas RLS
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd as operacion,
    roles
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename = 'depositos_servicios'
ORDER BY cmd;

-- ============================================
-- NOTAS DE IMPLEMENTACIÓN
-- ============================================

/*
CÓMO USAR:
1. Ejecutar este script completo en Supabase SQL Editor
2. Verificar que la tabla se creó correctamente
3. Verificar que las 4 políticas RLS están activas (SELECT, INSERT, UPDATE, DELETE)
4. Probar inserción desde la aplicación

EJEMPLO DE INSERCIÓN:
INSERT INTO public.depositos_servicios (
    fecha,
    fecha_desde,
    fecha_hasta,
    caja,
    servicios,
    total_tarjeta,
    total_efectivo,
    total_general,
    usuario_creacion
) VALUES (
    '2026-02-09',
    '2026-02-09T00:00:00Z',
    '2026-02-09T23:59:59Z',
    'Caja 1',
    '{"Aca Puedo": {"monto_tarjeta": 150000, "total": 150000, "lotes": ["L001"]}}'::jsonb,
    150000,
    0,
    150000,
    'admin'
);

EJEMPLO DE CONSULTA:
SELECT 
    fecha,
    caja,
    total_general,
    depositado,
    servicios->>'Aca Puedo' as aca_puedo_monto
FROM depositos_servicios
WHERE fecha >= '2026-02-01'
ORDER BY fecha DESC;

ROLLBACK (si es necesario):
DROP TABLE IF EXISTS public.depositos_servicios CASCADE;
DROP FUNCTION IF EXISTS obtener_depositos_pendientes();
*/
