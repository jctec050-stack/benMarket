-- Migración para agregar 'deposito-inversiones' al constraint de tipo en la tabla movimientos
-- Fecha: 2025-12-17

-- Eliminar el constraint antiguo (nombre correcto: movimientos_tipo_check1)
ALTER TABLE movimientos DROP CONSTRAINT IF EXISTS movimientos_tipo_check1;

-- Agregar el nuevo constraint con 'deposito-inversiones' incluido
ALTER TABLE movimientos ADD CONSTRAINT movimientos_tipo_check1 
CHECK (tipo IN ('gasto','egreso','transferencia','operacion','deposito-inversiones'));
