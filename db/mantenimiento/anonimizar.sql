-- =====================================================================
-- Borra los datos personales que ya cumplieron su plazo de conservación.
-- El plazo lo fija el aviso de privacidad (propuesta: 12 meses después de la entrega).
-- Conserva la estadística (qué objeto, cuándo y dónde) pero no quién.
--
-- Ejecutar (ajusta el plazo si el aviso aprobado dice otro):
--   docker compose -f docker-compose.prod.yml exec -T db psql -U opcu1 -d objetos_perdidos -v meses=12 < db/mantenimiento/anonimizar.sql
-- =====================================================================
\set ON_ERROR_STOP on
\if :{?meses}
\else
  \set meses 12
\endif

BEGIN;

-- Quien recogió el objeto
UPDATE entregas
SET nombre = '(dato eliminado)', matricula = '000000000', observaciones = NULL
WHERE entregado_en < now() - make_interval(months => :meses)
  AND nombre <> '(dato eliminado)';

-- Quien reportó y la descripción privada de objetos ya cerrados
UPDATE objetos o
SET reportado_por = NULL, descripcion_privada = NULL
WHERE (reportado_por IS NOT NULL OR descripcion_privada IS NOT NULL)
  AND (
        (o.estado = 'entregado' AND EXISTS (
           SELECT 1 FROM entregas e WHERE e.objeto_id = o.id
             AND e.entregado_en < now() - make_interval(months => :meses)))
     OR (o.estado = 'descartado' AND o.descartado_en < now() - make_interval(months => :meses))
  );

COMMIT;
