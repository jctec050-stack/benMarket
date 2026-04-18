-- Crear tabla de arqueos
CREATE TABLE IF NOT EXISTS arqueos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fecha TIMESTAMP NOT NULL,
    caja VARCHAR(50) NOT NULL,
    cajero VARCHAR(255) NOT NULL,
    fondo_fijo INTEGER NOT NULL DEFAULT 0,
    
    -- Totales de ingresos
    total_ingresos INTEGER NOT NULL DEFAULT 0,
    total_servicios INTEGER NOT NULL DEFAULT 0,
    
    -- Totales de egresos
    total_egresos INTEGER NOT NULL DEFAULT 0,
    
    -- Totales generales
    total_movimientos INTEGER NOT NULL DEFAULT 0,
    saldo_caja INTEGER NOT NULL DEFAULT 0,
    
    -- Diferencia (si existe discrepancia)
    diferencia INTEGER NOT NULL DEFAULT 0,
    observaciones TEXT,
    
    -- Auditoría
    usuario_id UUID REFERENCES auth.users(id),
    creado_en TIMESTAMP DEFAULT NOW(),
    actualizado_en TIMESTAMP DEFAULT NOW(),
    
    -- Índices
    CONSTRAINT unique_arqueo_caja_fecha UNIQUE(caja, fecha)
);

-- Crear índices (si no existen)
CREATE INDEX IF NOT EXISTS idx_arqueos_caja ON arqueos(caja);
CREATE INDEX IF NOT EXISTS idx_arqueos_fecha ON arqueos(fecha);
CREATE INDEX IF NOT EXISTS idx_arqueos_usuario ON arqueos(usuario_id);

-- Habilitar RLS
ALTER TABLE arqueos ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios pueden ver sus propios arqueos
DROP POLICY IF EXISTS "usuarios_ven_arqueos_propios" ON arqueos;
CREATE POLICY "usuarios_ven_arqueos_propios" ON arqueos
    FOR SELECT
    USING (usuario_id = auth.uid() OR 
           EXISTS (
               SELECT 1 FROM perfiles_usuarios
               WHERE perfiles_usuarios.id = auth.uid() 
               AND perfiles_usuarios.rol = 'admin'
           ));

-- Política: Los usuarios pueden crear arqueos
DROP POLICY IF EXISTS "usuarios_crean_arqueos" ON arqueos;
CREATE POLICY "usuarios_crean_arqueos" ON arqueos
    FOR INSERT
    WITH CHECK (usuario_id = auth.uid());

-- Política: Los usuarios pueden actualizar sus propios arqueos
DROP POLICY IF EXISTS "usuarios_actualizan_arqueos_propios" ON arqueos;
CREATE POLICY "usuarios_actualizan_arqueos_propios" ON arqueos
    FOR UPDATE
    USING (usuario_id = auth.uid() OR 
           EXISTS (
               SELECT 1 FROM perfiles_usuarios
               WHERE perfiles_usuarios.id = auth.uid() 
               AND perfiles_usuarios.rol = 'admin'
           ))
    WITH CHECK (usuario_id = auth.uid() OR 
                EXISTS (
                    SELECT 1 FROM perfiles_usuarios
                    WHERE perfiles_usuarios.id = auth.uid() 
                    AND perfiles_usuarios.rol = 'admin'
                ));

-- Política: Solo admins pueden eliminar
DROP POLICY IF EXISTS "solo_admins_eliminan_arqueos" ON arqueos;
CREATE POLICY "solo_admins_eliminan_arqueos" ON arqueos
    FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM perfiles_usuarios
        WHERE perfiles_usuarios.id = auth.uid() 
        AND perfiles_usuarios.rol = 'admin'
    ));
