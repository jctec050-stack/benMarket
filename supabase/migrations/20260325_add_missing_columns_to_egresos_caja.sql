-- ============================================
-- MIGRACIÓN: Agregar columnas faltantes a egresos_caja
-- Fecha: 2026-03-25
-- Propósito: Soportar "Retiro de Fondos" con receptor y nro de recibo
-- ============================================

ALTER TABLE public.egresos_caja 
ADD COLUMN IF NOT EXISTS receptor TEXT,
ADD COLUMN IF NOT EXISTS numero_recibo INTEGER,
ADD COLUMN IF NOT EXISTS arqueado BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS moneda TEXT DEFAULT 'gs';

-- Actualizar comentarios
COMMENT ON COLUMN public.egresos_caja.receptor IS 'Nombre del receptor del fondo (para Retiro de Fondos/Proveedores)';
COMMENT ON COLUMN public.egresos_caja.numero_recibo IS 'Número correlativo de recibo impreso';
COMMENT ON COLUMN public.egresos_caja.arqueado IS 'Indica si el movimiento ya fue incluido en un arqueo de caja';
COMMENT ON COLUMN public.egresos_caja.moneda IS 'Moneda del movimiento (predeterminado: gs)';
