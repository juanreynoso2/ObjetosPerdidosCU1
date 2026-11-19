-- =====================================================================
-- Resumen para el seguimiento (tarea 8.3). Por defecto, los últimos 30 días.
--   docker compose exec db psql -U opcu1 -d objetos_perdidos -f /reportes/resumen_mensual.sql
-- Otro periodo:
--   ... -v desde=2026-11-01 -v hasta=2026-12-01 -f /reportes/resumen_mensual.sql
-- No muestra datos personales.
-- =====================================================================
\set QUIET on
\pset footer off
\if :{?desde}
\else
  SELECT to_char(now() - interval '30 days', 'YYYY-MM-DD') AS desde \gset
\endif
\if :{?hasta}
\else
  SELECT to_char(now() + interval '1 day', 'YYYY-MM-DD') AS hasta \gset
\endif
\echo
\echo Resumen de Objetos Perdidos CU1 del :desde al :hasta (sin incluir)
\echo

CREATE TEMP VIEW periodo AS
SELECT o.*, e.entregado_en
FROM objetos o LEFT JOIN entregas e ON e.objeto_id = o.id
WHERE o.creado_en >= :'desde'::date AND o.creado_en < :'hasta'::date;

\echo == Totales
SELECT
  count(*)                                              AS reportados,
  count(*) FILTER (WHERE recibido_en IS NOT NULL)       AS llegaron_al_resguardo,
  count(*) FILTER (WHERE estado = 'entregado')          AS entregados_a_su_dueno,
  count(*) FILTER (WHERE estado = 'descartado')         AS nunca_llegaron,
  count(*) FILTER (WHERE estado IN ('pendiente','resguardo')) AS siguen_abiertos,
  round(100.0 * count(*) FILTER (WHERE estado = 'entregado') / nullif(count(*) FILTER (WHERE estado <> 'descartado'), 0), 1)
                                                        AS porcentaje_recuperado,
  round(avg(extract(epoch FROM entregado_en - encontrado_en) / 86400)::numeric, 1)
                                                        AS dias_promedio_hasta_entrega
FROM periodo;

\echo == Por tipo de objeto
SELECT c.nombre AS tipo, count(*) AS reportados,
       count(*) FILTER (WHERE p.estado = 'entregado') AS entregados
FROM periodo p JOIN categorias c ON c.id = p.tipo
GROUP BY c.nombre ORDER BY reportados DESC, tipo;

\echo == Por zona donde se encontraron
SELECT z.nombre AS zona, count(*) AS reportados
FROM periodo p JOIN zonas z ON z.id = p.zona_id
GROUP BY z.nombre ORDER BY reportados DESC, zona;

\echo == Por punto de resguardo
SELECT r.nombre AS punto, count(*) AS recibidos,
       count(*) FILTER (WHERE p.estado = 'entregado') AS entregados,
       count(*) FILTER (WHERE p.estado = 'resguardo') AS en_resguardo,
       count(*) FILTER (WHERE p.estado = 'pendiente') AS por_llegar
FROM periodo p JOIN puntos_resguardo r ON r.id = p.resguardo_id
GROUP BY r.nombre ORDER BY recibidos DESC, punto;

\echo == En resguardo desde hace más de 30 días (revisar si se donan o se desechan)
SELECT r.sigla AS punto, count(*) AS objetos
FROM objetos o JOIN puntos_resguardo r ON r.id = o.resguardo_id
WHERE o.estado = 'resguardo' AND o.recibido_en < now() - interval '30 days'
GROUP BY r.sigla ORDER BY objetos DESC;
