-- =====================================================================
-- DATOS DE DEMOSTRACIÓN · SOLO PARA DESARROLLO
-- Cuentas de administración de prueba y 30 objetos de ejemplo con fechas
-- relativas al día en que se crea la base.
-- Antes de publicar (tarea 6.4) borra este archivo de db/init/.
-- =====================================================================

SET timezone = 'America/Mexico_City';

-- Una cuenta por punto de resguardo: usuario admin.<punto>, contraseña buap2026.
INSERT INTO administradores (usuario, nombre, password_hash, resguardo_id)
SELECT 'admin.' || id, 'Administración ' || sigla, crypt('buap2026', gen_salt('bf', 10)), id
FROM puntos_resguardo;

WITH datos (n, tipo, tipo_otro, descripcion, dias, hora, zona, lugar, x, y, estado) AS (VALUES
  ( 1, 'botella',     NULL, 'Termo metálico azul marino con sticker de la NASA y asa en la tapa', 1, '13:40', 'fcc',     'Salón 204, edificio CCO3',            240, 226, 'resguardo'),
  ( 2, 'botella',     NULL, 'Botella de plástico transparente de 1 L con tapa rosa',             2, '10:15', 'ing',     'Edificio ING 4, planta alta',         460, 410, 'resguardo'),
  ( 3, 'botella',     NULL, 'Termo verde con abolladura en la base',                             4, '17:05', 'cc',      'Gradas de la alberca',                630, 480, 'resguardo'),
  ( 4, 'botella',     NULL, 'Botella deportiva negra con el nombre «Dani» en marcador',          6, '09:20', 'fcfm',    'Aula 105, edificio FM 1',             572, 308, 'resguardo'),
  ( 5, 'botella',     NULL, 'Cilindro blanco con logo BUAP',                                     3, '12:30', 'bib',     'Sala de lectura, segundo piso',       735, 815, 'pendiente'),
  ( 6, 'botella',     NULL, 'Termo rojo, tapa a presión, cinta adhesiva con iniciales J.R.',     8, '15:50', 'canchas', 'Banca de la cancha de futbol 2',      830, 600, 'resguardo'),
  ( 7, 'cargador',    NULL, 'Cargador USB-C 65 W marca Lenovo, cable gris',                      1, '11:10', 'fcc',     'Laboratorio, edificio CCO 4',         270, 215, 'resguardo'),
  ( 8, 'cargador',    NULL, 'Cargador de iPhone blanco con cubo, cinta azul en el cable',        3, '16:45', 'fce',     'Salón, edificio FCE 6',               455, 338, 'resguardo'),
  ( 9, 'cargador',    NULL, 'Power bank Xiaomi 10 000 mAh negro',                                5, '08:30', 'adm',     'Auditorio, edificio ADM 7',           675, 302, 'resguardo'),
  (10, 'cargador',    NULL, 'Cargador de laptop HP con punta azul',                              8, '19:00', 'fcc',     'Pasillo planta baja, CCO 1',          212, 258, 'resguardo'),
  (11, 'llaves',      NULL, 'Llavero con 3 llaves y un peluche de gato',                         2, '14:20', 'der',     'Jardinera frente a DER 3',            712, 240, 'resguardo'),
  (12, 'llaves',      NULL, 'Llave de auto Nissan con control',                                  7, '18:10', 'arq',     'Estacionamiento de Arquitectura',     330, 445, 'resguardo'),
  (13, 'sueter',      NULL, 'Sudadera gris talla M con logo de Lobos BUAP',                      1, '09:55', 'fcq',     'Laboratorio FCQ 4, perchero',         318, 276, 'resguardo'),
  (14, 'sueter',      NULL, 'Chamarra de mezclilla con parche en el codo',                       5, '13:00', 'cont',    'Salón, edificio FCP 3',               400, 695, 'resguardo'),
  (15, 'sueter',      NULL, 'Suéter azul marino tejido',                                         2, '13:30', 'parque',  'Bancas junto al lago',                850, 410, 'resguardo'),
  (16, 'libreta',     NULL, 'Cuaderno profesional de cálculo, forro verde, nombre en la primera hoja', 2, '12:00', 'fcfm', 'Mesas del patio, FM 4',       575, 292, 'resguardo'),
  (17, 'libreta',     NULL, 'Libreta pequeña negra con apuntes de química orgánica',             4, '10:40', 'fiq',     'Salón, edificio FIQ 1',               395, 300, 'pendiente'),
  (18, 'audifonos',   NULL, 'Audífonos inalámbricos blancos en estuche, raya en la tapa',        1, '15:30', 'bib',     'Cubículo de estudio 6',               760, 860, 'resguardo'),
  (19, 'audifonos',   NULL, 'Audífonos de diadema negros marca Sony',                            6, '11:45', 'eco',     'Aula magna, ECO 3',                   820, 285, 'resguardo'),
  (20, 'laptop',      NULL, 'Laptop Dell gris de 14", sticker de Linux en la tapa',              3, '20:10', 'fcc',     'Sala de cómputo, CCO 2',              230, 242, 'resguardo'),
  (21, 'celular',     NULL, 'Samsung con funda transparente y una foto adentro',                 1, '10:05', 'bio',     'Laboratorio, edificio BIO 1',         620, 395, 'pendiente'),
  (22, 'credencial',  NULL, 'Credencial BUAP de estudiante (se verifica con nombre y foto)',     2, '08:15', 'ing',     'Entrada del edificio ING 1',          430, 462, 'resguardo'),
  (23, 'cartera',     NULL, 'Cartera café de piel con INE y dos tarjetas',                       3, '14:55', 'len',     'Pasillo del edificio LEN 1',          915, 236, 'resguardo'),
  (24, 'calculadora', NULL, 'Calculadora Casio fx-991 con iniciales grabadas',                   4, '12:25', 'fcfm',    'Salón, edificio FM 7',                577, 243, 'resguardo'),
  (25, 'paraguas',    NULL, 'Paraguas negro plegable con mango de madera',                       2, '18:30', 'fcf',     'Entrada del gimnasio FCF 2',          1084, 240, 'resguardo'),
  (26, 'lentes',      NULL, 'Lentes de armazón negro en estuche azul',                           5, '09:10', 'der',     'Biblioteca de la facultad, DER 8',    774, 268, 'resguardo'),
  (27, 'mochila',     NULL, 'Mochila negra con dos llaveros',                                   10, '17:40', 'eco',     'Pasillo central',                     810, 240, 'resguardo'),
  (28, 'otro', 'Bata de laboratorio', 'Bata blanca talla CH bordada «M. López»',                 3, '13:15', 'fcq',     'Vestidor del laboratorio FCQ 1',      288, 303, 'resguardo'),
  (29, 'otro', 'Tupper',              'Tupper azul con tapa morada',                             1, '15:00', 'arena',   'Explanada de la Arena BUAP',          490, 600, 'resguardo'),
  (30, 'usb',         NULL, 'Memoria USB Kingston 32 GB roja',                                   6, '11:00', 'fce',     'Laboratorio de microcontroladores',   500, 345, 'resguardo')
)
INSERT INTO objetos (tipo, tipo_otro, descripcion_privada, encontrado_en, zona_id, lugar,
                     mapa_x, mapa_y, resguardo_id, estado, creado_en, recibido_en)
SELECT d.tipo, d.tipo_otro, d.descripcion,
       (current_date - d.dias) + d.hora::time,
       d.zona, d.lugar, d.x, d.y, z.resguardo_id,
       d.estado::estado_objeto,
       (current_date - d.dias) + d.hora::time + interval '20 minutes',
       CASE WHEN d.estado = 'resguardo' THEN (current_date - d.dias) + d.hora::time + interval '2 hours' END
FROM datos d
JOIN zonas z ON z.id = d.zona
ORDER BY d.n;

-- Cuatro objetos ya entregados a su dueño (el trigger los pasa a «entregado»).
INSERT INTO entregas (objeto_id, nombre, matricula, verifico_descripcion, verifico_identificacion,
                      entregado_en, administrador_id)
SELECT o.id, e.nombre, e.matricula, true, true,
       now() - e.dias * interval '1 day' - interval '3 hours', a.id
FROM (VALUES
  ('CU1-0104', 'Daniela Ortiz Ramos',   '202245318', 2),
  ('CU1-0110', 'Luis Ángel Pérez Soto', '202158804', 5),
  ('CU1-0123', 'Mariana Juárez Téllez', '202331207', 1),
  ('CU1-0127', 'Carlos Méndez Rojas',   '202067721', 9)   -- hace más de 7 días: ya no sale en el buscador
) AS e (folio, nombre, matricula, dias)
JOIN objetos o         ON o.folio = e.folio
JOIN administradores a ON a.resguardo_id = o.resguardo_id;
