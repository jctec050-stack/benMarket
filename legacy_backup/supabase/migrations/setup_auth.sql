-- Configurar política de autenticación para usuarios

-- 0. LIMPIEZA PREVIA
DROP TRIGGER IF EXISTS trigger_crear_perfil_usuario ON auth.users;
DROP FUNCTION IF EXISTS crear_perfil_usuario();
DROP TABLE IF EXISTS perfiles_usuarios CASCADE;

-- Limpiar políticas antiguas
ALTER TABLE IF EXISTS arqueos DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS movimientos DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS egresos_caja DISABLE ROW LEVEL SECURITY;

-- 1. Crear tabla de perfiles SIN RLS (para que el trigger funcione)
CREATE TABLE public.perfiles_usuarios (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    rol TEXT NOT NULL DEFAULT 'cajero' CHECK (rol IN ('admin','cajero','tesoreria')),
    activo BOOLEAN DEFAULT TRUE,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Crear índices
CREATE INDEX idx_perfiles_username ON public.perfiles_usuarios(username);
CREATE INDEX idx_perfiles_rol ON public.perfiles_usuarios(rol);
CREATE INDEX idx_perfiles_activo ON public.perfiles_usuarios(activo);

-- 3. Función para crear usuario automáticamente (SECURITY DEFINER para bypass RLS)
CREATE OR REPLACE FUNCTION public.crear_perfil_usuario()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.perfiles_usuarios (id, username, rol, activo)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'username', NEW.email), 'cajero', TRUE)
    ON CONFLICT (username) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. Trigger para crear perfil cuando se registra un usuario
CREATE TRIGGER trigger_crear_perfil_usuario
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.crear_perfil_usuario();

-- 5. Políticas para ARQUEOS (permite acceso a usuarios autenticados y activos)
ALTER TABLE public.arqueos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "arqueos_select"
    ON public.arqueos
    FOR SELECT
    USING (
        auth.uid() IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM public.perfiles_usuarios
            WHERE id = auth.uid() AND activo = TRUE
        )
    );

CREATE POLICY "arqueos_insert"
    ON public.arqueos
    FOR INSERT
    WITH CHECK (
        auth.uid() IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM public.perfiles_usuarios
            WHERE id = auth.uid() AND activo = TRUE
        )
    );

CREATE POLICY "arqueos_update"
    ON public.arqueos
    FOR UPDATE
    USING (
        auth.uid() IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM public.perfiles_usuarios
            WHERE id = auth.uid() AND activo = TRUE
        )
    );

-- 6. Políticas para MOVIMIENTOS
ALTER TABLE public.movimientos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "movimientos_select"
    ON public.movimientos
    FOR SELECT
    USING (
        auth.uid() IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM public.perfiles_usuarios
            WHERE id = auth.uid() AND activo = TRUE
        )
    );

CREATE POLICY "movimientos_insert"
    ON public.movimientos
    FOR INSERT
    WITH CHECK (
        auth.uid() IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM public.perfiles_usuarios
            WHERE id = auth.uid() AND activo = TRUE
        )
    );

CREATE POLICY "movimientos_update"
    ON public.movimientos
    FOR UPDATE
    USING (
        auth.uid() IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM public.perfiles_usuarios
            WHERE id = auth.uid() AND activo = TRUE
        )
    );

-- 7. Políticas para EGRESOS_CAJA
ALTER TABLE public.egresos_caja ENABLE ROW LEVEL SECURITY;

CREATE POLICY "egresos_select"
    ON public.egresos_caja
    FOR SELECT
    USING (
        auth.uid() IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM public.perfiles_usuarios
            WHERE id = auth.uid() AND activo = TRUE
        )
    );

CREATE POLICY "egresos_insert"
    ON public.egresos_caja
    FOR INSERT
    WITH CHECK (
        auth.uid() IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM public.perfiles_usuarios
            WHERE id = auth.uid() AND activo = TRUE
        )
    );

CREATE POLICY "egresos_update"
    ON public.egresos_caja
    FOR UPDATE
    USING (
        auth.uid() IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM public.perfiles_usuarios
            WHERE id = auth.uid() AND activo = TRUE
        )
    );
