-- Migración para corregir inconsistencias en esquemas y políticas RLS
-- Fecha: 2026-03-25

-- 1. Arreglar tabla MOVIMIENTOS
ALTER TABLE public.movimientos 
ADD COLUMN IF NOT EXISTS categoria TEXT,
ADD COLUMN IF NOT EXISTS usuario_id UUID REFERENCES auth.users(id);

-- Actualizar políticas de MOVIMIENTOS para usar usuario_id si es posible, 
-- pero al menos asegurar acceso a autenticados.
DROP POLICY IF EXISTS "Usuarios autenticados pueden insertar movimientos" ON movimientos;
CREATE POLICY "Usuarios autenticados pueden insertar movimientos" ON movimientos
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 2. Arreglar tabla EGRESOS_CAJA
ALTER TABLE public.egresos_caja 
ADD COLUMN IF NOT EXISTS receptor TEXT,
ADD COLUMN IF NOT EXISTS numero_recibo INTEGER,
ADD COLUMN IF NOT EXISTS arqueado BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS moneda TEXT DEFAULT 'gs',
ADD COLUMN IF NOT EXISTS usuario_id UUID REFERENCES auth.users(id);

-- Habilitar RLS en EGRESOS_CAJA si no lo estaba
ALTER TABLE public.egresos_caja ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios autenticados pueden insertar egresos" ON egresos_caja;
CREATE POLICY "Usuarios autenticados pueden insertar egresos" ON egresos_caja
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Usuarios autenticados pueden ver egresos" ON egresos_caja;
CREATE POLICY "Usuarios autenticados pueden ver egresos" ON egresos_caja
    FOR SELECT USING (auth.role() = 'authenticated');

-- 3. Arreglar tabla MOVIMIENTOS_TEMPORALES
ALTER TABLE public.movimientos_temporales 
ADD COLUMN IF NOT EXISTS usuario_id UUID REFERENCES auth.users(id);

-- Habilitar RLS en MOVIMIENTOS_TEMPORALES
ALTER TABLE public.movimientos_temporales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios autenticados pueden insertar mov_temp" ON movimientos_temporales;
CREATE POLICY "Usuarios autenticados pueden insertar mov_temp" ON movimientos_temporales
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Usuarios autenticados pueden ver mov_temp" ON movimientos_temporales;
CREATE POLICY "Usuarios autenticados pueden ver mov_temp" ON movimientos_temporales
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar mov_temp" ON movimientos_temporales;
CREATE POLICY "Usuarios autenticados pueden actualizar mov_temp" ON movimientos_temporales
    FOR UPDATE USING (auth.role() = 'authenticated');
