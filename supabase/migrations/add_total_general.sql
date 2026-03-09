-- Migration: add_total_general
-- Description: Create table to store 'Total General' per date and caja.

CREATE TABLE IF NOT EXISTS public.total_general (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    fecha DATE NOT NULL,
    caja TEXT NOT NULL DEFAULT 'Todas las Cajas',
    total NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(fecha, caja)
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.total_general ENABLE ROW LEVEL SECURITY;

-- Políticas de Seguridad
-- 1. Los usuarios logeados pueden leer todos los totales
CREATE POLICY "Usuarios autenticados pueden ver totales" 
ON public.total_general 
FOR SELECT 
TO authenticated 
USING (true);

-- 2. Los usuarios logeados pueden insertar nuevos totales
CREATE POLICY "Usuarios autenticados pueden insertar totales" 
ON public.total_general 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- 3. Los usuarios logeados pueden actualizar los totales
CREATE POLICY "Usuarios autenticados pueden actualizar totales" 
ON public.total_general 
FOR UPDATE 
TO authenticated 
USING (true)
WITH CHECK (true);

-- Trigger para actualizar updated_at automáticamente
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

-- Otorgar permisos al rol autenticado
GRANT ALL ON TABLE public.total_general TO authenticated;
