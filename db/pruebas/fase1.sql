-- =====================================================================
-- Verificación de la Fase 1. Ejecutar con:
--   docker compose exec db psql -U opcu1 -d objetos_perdidos -f /pruebas/fase1.sql
-- Cada línea debe decir OK. No modifica datos (todo corre dentro de una
-- transacción que se deshace al final).
-- =====================================================================

\set ON_ERROR_STOP on
\set QUIET on
\pset footer off
BEGIN;
\o /dev/null

CREATE TEMP TABLE resultados (prueba TEXT, resultado TEXT);

-- Ejecuta una sentencia que DEBE fallar; registra OK si falla.
CREATE FUNCTION pg_temp.debe_fallar(nombre TEXT, sentencia TEXT) RETURNS void AS $$
BEGIN
  BEGIN
    EXECUTE sentencia;
    INSERT INTO resultados VALUES (nombre, 'FALLO: se aceptó');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO resultados VALUES (nombre, 'OK');
  END;
END;
$$ LANGUAGE plpgsql;

-- 1.2 Tablas creadas
INSERT INTO resultados
SELECT '1.2 Existen las tablas principales',
       CASE WHEN count(*) = 6 THEN 'OK' ELSE 'FALLO: faltan tablas' END
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('puntos_resguardo','zonas','categorias','objetos','entregas','administradores');

-- 1.3 Reglas de la base
SELECT pg_temp.debe_fallar('1.3 Rechaza un estado inválido',
  $q$INSERT INTO objetos (tipo, encontrado_en, zona_id, lugar, mapa_x, mapa_y, resguardo_id, estado)
     VALUES ('botella', now(), 'fcc', 'Salón', 240, 226, 'fcc', 'perdido')$q$);

SELECT pg_temp.debe_fallar('1.3 Rechaza matrícula de 8 dígitos',
  $q$INSERT INTO entregas (objeto_id, nombre, matricula, verifico_descripcion, verifico_identificacion, administrador_id)
     SELECT o.id, 'Prueba Uno Dos', '20231234', true, true, a.id
     FROM objetos o JOIN administradores a ON a.resguardo_id = o.resguardo_id
     WHERE o.estado = 'resguardo' LIMIT 1$q$);

SELECT pg_temp.debe_fallar('1.3 Rechaza folio repetido',
  $q$INSERT INTO objetos (folio, tipo, encontrado_en, zona_id, lugar, mapa_x, mapa_y, resguardo_id)
     VALUES ('CU1-0101', 'botella', now(), 'fcc', 'Salón', 240, 226, 'fcc')$q$);

SELECT pg_temp.debe_fallar('1.3 «Otro» exige escribir qué objeto es',
  $q$INSERT INTO objetos (tipo, encontrado_en, zona_id, lugar, mapa_x, mapa_y, resguardo_id)
     VALUES ('otro', now(), 'fcc', 'Salón', 240, 226, 'fcc')$q$);

SELECT pg_temp.debe_fallar('1.3 No se entrega un objeto que no está en resguardo',
  $q$INSERT INTO entregas (objeto_id, nombre, matricula, verifico_descripcion, verifico_identificacion, administrador_id)
     SELECT o.id, 'Prueba Uno Dos', '202312345', true, true, a.id
     FROM objetos o JOIN administradores a ON a.resguardo_id = o.resguardo_id
     WHERE o.estado = 'pendiente' LIMIT 1$q$);

SELECT pg_temp.debe_fallar('1.3 Un administrador no entrega objetos de otro punto',
  $q$INSERT INTO entregas (objeto_id, nombre, matricula, verifico_descripcion, verifico_identificacion, administrador_id)
     SELECT o.id, 'Prueba Uno Dos', '202312345', true, true, a.id
     FROM objetos o JOIN administradores a ON a.resguardo_id <> o.resguardo_id
     WHERE o.estado = 'resguardo' LIMIT 1$q$);

SELECT pg_temp.debe_fallar('1.3 La entrega exige verificar la descripción',
  $q$INSERT INTO entregas (objeto_id, nombre, matricula, verifico_descripcion, verifico_identificacion, administrador_id)
     SELECT o.id, 'Prueba Uno Dos', '202312345', false, true, a.id
     FROM objetos o JOIN administradores a ON a.resguardo_id = o.resguardo_id
     WHERE o.estado = 'resguardo' LIMIT 1$q$);

-- Una entrega válida sí funciona y cambia el estado
INSERT INTO entregas (objeto_id, nombre, matricula, verifico_descripcion, verifico_identificacion, administrador_id)
SELECT o.id, 'Prueba Uno Dos', '202312345', true, true, a.id
FROM objetos o JOIN administradores a ON a.resguardo_id = o.resguardo_id
WHERE o.folio = 'CU1-0101';
INSERT INTO resultados
SELECT '1.3 Una entrega válida pasa el objeto a «entregado»',
       CASE WHEN estado = 'entregado' THEN 'OK' ELSE 'FALLO: estado ' || estado END
FROM objetos WHERE folio = 'CU1-0101';

-- 1.4 Datos iniciales
INSERT INTO resultados
SELECT '1.4 Hay 16 puntos de resguardo',
       CASE WHEN count(*) = 16 THEN 'OK' ELSE 'FALLO: hay ' || count(*) END
FROM puntos_resguardo;

INSERT INTO resultados
SELECT '1.4 Cada zona manda a un punto de resguardo',
       CASE WHEN count(*) = 0 THEN 'OK' ELSE 'FALLO: ' || count(*) || ' zonas sin punto' END
FROM zonas z LEFT JOIN puntos_resguardo p ON p.id = z.resguardo_id WHERE p.id IS NULL;

-- Privacidad de la vista pública
INSERT INTO resultados
SELECT 'Vista pública sin datos privados',
       CASE WHEN count(*) = 0 THEN 'OK' ELSE 'FALLO: expone ' || string_agg(column_name, ', ') END
FROM information_schema.columns
WHERE table_name = 'objetos_publicos'
  AND column_name IN ('descripcion_privada','reportado_por','nombre','matricula','id');

INSERT INTO resultados
SELECT 'Vista pública oculta entregados de hace más de 7 días',
       CASE WHEN count(*) = 0 THEN 'OK' ELSE 'FALLO' END
FROM objetos_publicos WHERE folio = 'CU1-0127';

INSERT INTO resultados
SELECT 'Vista pública muestra entregados recientes como «entregado»',
       CASE WHEN count(*) = 1 THEN 'OK' ELSE 'FALLO' END
FROM objetos_publicos WHERE folio = 'CU1-0104' AND estado = 'entregado';

\o
SELECT prueba AS "Prueba", resultado AS "Resultado" FROM resultados;
SELECT CASE WHEN bool_and(resultado = 'OK') THEN 'TODO BIEN: Fase 1 verificada'
            ELSE 'HAY FALLOS: revisa las líneas de arriba' END AS "Resumen"
FROM resultados;

ROLLBACK;
