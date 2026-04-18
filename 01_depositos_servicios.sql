-- ============================================================
-- SQL para crear tabla depositos_servicios
-- ============================================================

CREATE TABLE IF NOT EXISTS public.depositos_servicios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fecha DATE NOT NULL,
    caja TEXT NOT NULL,
    servicios JSONB DEFAULT '{}'::jsonb,
    usuario_id UUID REFERENCES auth.users(id),
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(fecha, caja)
);

CREATE INDEX IF NOT EXISTS idx_depositos_fecha ON public.depositos_servicios(fecha);
CREATE INDEX IF NOT EXISTS idx_depositos_caja ON public.depositos_servicios(caja);

-- RLS
ALTER TABLE public.depositos_servicios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "depositos_select" ON public.depositos_servicios;
CREATE POLICY "depositos_select"
    ON public.depositos_servicios FOR SELECT
    USING (
        auth.uid() IS NOT NULL AND
        EXISTS (SELECT 1 FROM public.perfiles_usuarios WHERE id = auth.uid() AND activo = TRUE)
    );

DROP POLICY IF EXISTS "depositos_insert" ON public.depositos_servicios;
CREATE POLICY "depositos_insert"
    ON public.depositos_servicios FOR INSERT
    WITH CHECK (
        auth.uid() IS NOT NULL AND
        EXISTS (SELECT 1 FROM public.perfiles_usuarios WHERE id = auth.uid() AND activo = TRUE)
    );

DROP POLICY IF EXISTS "depositos_update" ON public.depositos_servicios;
CREATE POLICY "depositos_update"
    ON public.depositos_servicios FOR UPDATE
    USING (
        auth.uid() IS NOT NULL AND
        EXISTS (SELECT 1 FROM public.perfiles_usuarios WHERE id = auth.uid() AND activo = TRUE)
    );

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION set_depositos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.actualizado_en = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_depositos_updated_at ON public.depositos_servicios;
CREATE TRIGGER trigger_depositos_updated_at
BEFORE UPDATE ON public.depositos_servicios
FOR EACH ROW
EXECUTE FUNCTION set_depositos_updated_at();

GRANT ALL ON TABLE public.depositos_servicios TO authenticated;
