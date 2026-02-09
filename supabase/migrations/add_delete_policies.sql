-- ============================================
-- MIGRACIÓN: Agregar Políticas RLS DELETE
-- Fecha: 2026-02-09
-- Propósito: Completar las políticas de Row Level Security
--            para permitir eliminación de registros
-- ============================================

-- ============================================
-- 1. POLÍTICAS DELETE PARA EGRESOS_CAJA
-- ============================================

CREATE POLICY "egresos_delete"
    ON public.egresos_caja
    FOR DELETE
    USING (
        auth.uid() IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM public.perfiles_usuarios
            WHERE id = auth.uid() AND activo = TRUE
        )
    );

COMMENT ON POLICY "egresos_delete" ON public.egresos_caja IS 
    'Permite a usuarios autenticados y activos eliminar egresos de caja';

-- ============================================
-- 2. POLÍTICAS DELETE PARA MOVIMIENTOS
-- ============================================

CREATE POLICY "movimientos_delete"
    ON public.movimientos
    FOR DELETE
    USING (
        auth.uid() IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM public.perfiles_usuarios
            WHERE id = auth.uid() AND activo = TRUE
        )
    );

COMMENT ON POLICY "movimientos_delete" ON public.movimientos IS 
    'Permite a usuarios autenticados y activos eliminar movimientos';

-- ============================================
-- 3. POLÍTICAS DELETE PARA ARQUEOS
-- ============================================

CREATE POLICY "arqueos_delete"
    ON public.arqueos
    FOR DELETE
    USING (
        auth.uid() IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM public.perfiles_usuarios
            WHERE id = auth.uid() AND activo = TRUE
        )
    );

COMMENT ON POLICY "arqueos_delete" ON public.arqueos IS 
    'Permite a usuarios autenticados y activos eliminar arqueos';

-- ============================================
-- 4. POLÍTICAS PARA MOVIMIENTOS_TEMPORALES
-- ============================================

-- Verificar si la tabla existe y tiene RLS habilitado
ALTER TABLE IF EXISTS public.movimientos_temporales ENABLE ROW LEVEL SECURITY;

-- SELECT
CREATE POLICY "movimientos_temporales_select"
    ON public.movimientos_temporales
    FOR SELECT
    USING (
        auth.uid() IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM public.perfiles_usuarios
            WHERE id = auth.uid() AND activo = TRUE
        )
    );

-- INSERT
CREATE POLICY "movimientos_temporales_insert"
    ON public.movimientos_temporales
    FOR INSERT
    WITH CHECK (
        auth.uid() IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM public.perfiles_usuarios
            WHERE id = auth.uid() AND activo = TRUE
        )
    );

-- UPDATE
CREATE POLICY "movimientos_temporales_update"
    ON public.movimientos_temporales
    FOR UPDATE
    USING (
        auth.uid() IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM public.perfiles_usuarios
            WHERE id = auth.uid() AND activo = TRUE
        )
    );

-- DELETE
CREATE POLICY "movimientos_temporales_delete"
    ON public.movimientos_temporales
    FOR DELETE
    USING (
        auth.uid() IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM public.perfiles_usuarios
            WHERE id = auth.uid() AND activo = TRUE
        )
    );

-- ============================================
-- 5. VERIFICACIÓN DE POLÍTICAS
-- ============================================

-- Consulta para verificar que las políticas se crearon correctamente
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd as operacion,
    roles
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename IN ('egresos_caja', 'movimientos', 'arqueos', 'movimientos_temporales')
ORDER BY tablename, cmd;

-- ============================================
-- NOTAS DE IMPLEMENTACIÓN
-- ============================================

/*
IMPORTANTE:
1. Esta migración AGREGA capacidades, no las quita
2. Los usuarios siguen necesitando estar autenticados y activos
3. Probar en staging antes de ejecutar en producción

CÓMO PROBAR:
1. Iniciar sesión con un usuario de prueba
2. Intentar eliminar un egreso desde la UI
3. Verificar que se elimina correctamente
4. Con usuario desactivado, verificar que NO puede eliminar

ROLLBACK (si es necesario):
DROP POLICY IF EXISTS "egresos_delete" ON public.egresos_caja;
DROP POLICY IF EXISTS "movimientos_delete" ON public.movimientos;
DROP POLICY IF EXISTS "arqueos_delete" ON public.arqueos;
DROP POLICY IF EXISTS "movimientos_temporales_select" ON public.movimientos_temporales;
DROP POLICY IF EXISTS "movimientos_temporales_insert" ON public.movimientos_temporales;
DROP POLICY IF EXISTS "movimientos_temporales_update" ON public.movimientos_temporales;
DROP POLICY IF EXISTS "movimientos_temporales_delete" ON public.movimientos_temporales;
*/
