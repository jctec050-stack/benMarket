-- Tabla para guardar los registros de recaudación (Resumen Tesorería)
CREATE TABLE IF NOT EXISTS recaudacion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fecha DATE NOT NULL,
    cajero VARCHAR(255) NOT NULL,
    caja VARCHAR(255) NOT NULL,
    efectivo_ingresado BIGINT NOT NULL DEFAULT 0,
    usuario_id UUID REFERENCES public.perfiles_usuarios(id) ON DELETE SET NULL,
    usuario VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(fecha, cajero, caja)
);

-- Índices para búsquedas rápidas
CREATE INDEX idx_recaudacion_fecha ON recaudacion(fecha);
CREATE INDEX idx_recaudacion_cajero ON recaudacion(cajero);
CREATE INDEX idx_recaudacion_caja ON recaudacion(caja);
CREATE INDEX idx_recaudacion_fecha_cajero ON recaudacion(fecha, cajero);
CREATE INDEX idx_recaudacion_fecha_caja ON recaudacion(fecha, caja);

-- Habilitar RLS (Row Level Security)
ALTER TABLE recaudacion ENABLE ROW LEVEL SECURITY;

-- Política: Todos pueden leer
CREATE POLICY "Recaudacion select policy" ON recaudacion
    FOR SELECT USING (true);

-- Política: Solo usuarios autenticados pueden insertar/actualizar
CREATE POLICY "Recaudacion insert policy" ON recaudacion
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Recaudacion update policy" ON recaudacion
    FOR UPDATE USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);

-- Política: Solo administradores pueden eliminar
-- (Esta política asume que tienes un campo 'rol' en la tabla perfiles_usuarios)
CREATE POLICY "Recaudacion delete policy" ON recaudacion
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.perfiles_usuarios 
            WHERE id = auth.uid() 
            AND rol = 'admin'
        )
    );

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_recaudacion_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER recaudacion_updated_at_trigger
BEFORE UPDATE ON recaudacion
FOR EACH ROW
EXECUTE FUNCTION update_recaudacion_updated_at();
