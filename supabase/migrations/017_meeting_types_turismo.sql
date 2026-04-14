-- Actualizar CHECK constraint de meetings.type para turismo
-- Los valores de escuela ('docentes','padres','individual','direccion')
-- se reemplazan por los de turismo ('equipo','proveedor','cliente','gerencia')

ALTER TABLE meetings DROP CONSTRAINT IF EXISTS meetings_type_check;

ALTER TABLE meetings
  ADD CONSTRAINT meetings_type_check
  CHECK (type IN ('equipo', 'proveedor', 'cliente', 'gerencia'));

-- Mismo cambio para threads si tiene el constraint
ALTER TABLE threads DROP CONSTRAINT IF EXISTS threads_type_check;

ALTER TABLE threads
  ADD CONSTRAINT threads_type_check
  CHECK (type IN ('equipo', 'proveedor', 'cliente', 'gerencia'));
