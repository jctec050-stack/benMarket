-- Habilitar Row Level Security en la tabla perfiles_usuarios
-- Esta migración soluciona el warning de Supabase sobre RLS no habilitado

-- 1. Habilitar RLS en la tabla perfiles_usuarios
ALTER TABLE public.perfiles_usuarios ENABLE ROW LEVEL SECURITY;

-- 2. Política para SELECT: Todos los usuarios autenticados pueden ver todos los perfiles
-- Esto es necesario para que las políticas de otras tablas puedan verificar roles
CREATE POLICY "perfiles_select_all"
    ON public.perfiles_usuarios
    FOR SELECT
    USING (
        auth.uid() IS NOT NULL
    );

-- 3. Política para INSERT: Solo el sistema puede insertar perfiles (vía trigger)
-- Los usuarios normales NO pueden crear perfiles directamente
CREATE POLICY "perfiles_insert_system"
    ON public.perfiles_usuarios
    FOR INSERT
    WITH CHECK (
        -- Permitir inserts desde el trigger (SECURITY DEFINER bypass RLS)
        -- O desde un admin
        EXISTS (
            SELECT 1 FROM public.perfiles_usuarios
            WHERE id = auth.uid() AND rol = 'admin'
        )
    );

-- 4. Política para UPDATE: Los usuarios pueden actualizar su propio perfil
-- Los administradores pueden actualizar cualquier perfil
CREATE POLICY "perfiles_update_own_or_admin"
    ON public.perfiles_usuarios
    FOR UPDATE
    USING (
        -- El usuario puede actualizar su propio perfil
        id = auth.uid()
        OR
        -- O es un administrador
        EXISTS (
            SELECT 1 FROM public.perfiles_usuarios
            WHERE id = auth.uid() AND rol = 'admin'
        )
    )
    WITH CHECK (
        -- El usuario puede actualizar su propio perfil
        id = auth.uid()
        OR
        -- O es un administrador
        EXISTS (
            SELECT 1 FROM public.perfiles_usuarios
            WHERE id = auth.uid() AND rol = 'admin'
        )
    );

-- 5. Política para DELETE: Solo administradores pueden eliminar perfiles
CREATE POLICY "perfiles_delete_admin"
    ON public.perfiles_usuarios
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.perfiles_usuarios
            WHERE id = auth.uid() AND rol = 'admin'
        )
    );

-- 6. IMPORTANTE: Actualizar la función del trigger para que use SECURITY DEFINER
-- Esto permite que el trigger bypass RLS al crear perfiles
-- La función ya está definida con SECURITY DEFINER en setup_auth.sql
-- por lo que no necesitamos modificarla aquí.

-- Verificación: Mostrar las políticas creadas
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename = 'perfiles_usuarios';
