-- ============================================
-- MIGRACIÓN: Cambiar TIMESTAMP WITH TIME ZONE a TIMESTAMP WITHOUT TIME ZONE
-- Fecha: 2026-03-21
-- Propósito: Evitar desfases horarios (UTC) y guardar la hora literal ingresada.
-- ============================================

-- 1. Cambiar la columna fecha en arqueos
-- Convertimos la fecha existente a la hora local actual (UTC-3) antes de quitar la zona horaria
ALTER TABLE public.arqueos 
    ALTER COLUMN fecha TYPE TIMESTAMP WITHOUT TIME ZONE 
    USING (fecha AT TIME ZONE 'UTC-3')::TIMESTAMP;

-- 2. Cambiar la columna fecha en movimientos
ALTER TABLE public.movimientos 
    ALTER COLUMN fecha TYPE TIMESTAMP WITHOUT TIME ZONE 
    USING (fecha AT TIME ZONE 'UTC-3')::TIMESTAMP;

-- 3. Cambiar la columna fecha en movimientos_temporales
ALTER TABLE public.movimientos_temporales 
    ALTER COLUMN fecha TYPE TIMESTAMP WITHOUT TIME ZONE 
    USING (fecha AT TIME ZONE 'UTC-3')::TIMESTAMP;

-- 4. Cambiar la columna fecha en egresos_caja
ALTER TABLE public.egresos_caja 
    ALTER COLUMN fecha TYPE TIMESTAMP WITHOUT TIME ZONE 
    USING (fecha AT TIME ZONE 'UTC-3')::TIMESTAMP;

-- Comentario para auditoría
COMMENT ON COLUMN public.arqueos.fecha IS 'Fecha y hora literal del arqueo (Sin zona horaria)';
COMMENT ON COLUMN public.movimientos.fecha IS 'Fecha y hora literal del movimiento (Sin zona horaria)';
COMMENT ON COLUMN public.movimientos_temporales.fecha IS 'Fecha y hora literal del movimiento temporal (Sin zona horaria)';
COMMENT ON COLUMN public.egresos_caja.fecha IS 'Fecha y hora literal del egreso (Sin zona horaria)';
