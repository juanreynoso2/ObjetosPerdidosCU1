-- =====================================================================
-- Catálogos: puntos de resguardo, zonas del mapa y tipos de objeto.
-- Son los mismos identificadores que usa frontend/index.html.
-- OJO: ubicaciones y horarios son de ejemplo hasta confirmarlos con
-- cada facultad (tarea 6.1); al confirmarlos, poner confirmado = true.
-- =====================================================================

INSERT INTO puntos_resguardo (id, sigla, nombre, ubicacion, horario, mapa_x, mapa_y) VALUES
  ('fcc',  'FCC',  'Secretaría Administrativa FCC',          'Edificio CCO1, planta baja', 'Lun a vie · 8:00–20:00', 204, 224),
  ('fcq',  'FCQ',  'Secretaría Administrativa FCQ',          'Edificio FCQ1, planta baja', 'Lun a vie · 8:00–19:00', 320, 262),
  ('fiq',  'FIQ',  'Secretaría Administrativa FIQ',          'Edificio FIQ1, planta baja', 'Lun a vie · 8:00–19:00', 420, 212),
  ('fcfm', 'FCFM', 'Secretaría Administrativa FCFM',         'Edificio FM1, planta baja',  'Lun a vie · 8:00–19:00', 586, 212),
  ('fce',  'FCE',  'Secretaría Administrativa FCE',          'Edificio FCE1, planta baja', 'Lun a vie · 8:00–19:00', 446, 302),
  ('ing',  'ING',  'Control Escolar de Ingeniería',          'Edificio ING1, planta baja', 'Lun a vie · 8:00–20:00', 514, 366),
  ('arq',  'ARQ',  'Secretaría Administrativa ARQ',          'Edificio ARQ1, planta baja', 'Lun a vie · 8:00–20:00', 312, 338),
  ('der',  'DER',  'Secretaría Administrativa DER',          'Edificio DER1, planta baja', 'Lun a vie · 8:00–20:00', 748, 236),
  ('adm',  'ADM',  'Secretaría Administrativa ADM',          'Edificio ADM1, planta baja', 'Lun a vie · 7:00–21:00', 608, 210),
  ('eco',  'ECO',  'Secretaría Administrativa ECO',          'Edificio ECO1, planta baja', 'Lun a vie · 8:00–19:00', 830, 214),
  ('len',  'LEN',  'Secretaría Administrativa LEN',          'Edificio LEN1, planta baja', 'Lun a vie · 8:00–19:00', 877, 208),
  ('fcf',  'FCF',  'Coordinación Administrativa FCF',        'Edificio FCF1, planta baja', 'Lun a vie · 7:00–20:00', 1052, 212),
  ('bio',  'FCB',  'Secretaría Administrativa FCB',          'Edificio BIO1, planta baja', 'Lun a vie · 8:00–18:00', 610, 430),
  ('cont', 'FCP',  'Secretaría Administrativa FCP',          'Edificio FCP1, planta baja', 'Lun a vie · 7:00–21:00', 432, 660),
  ('bib',  'BC',   'Módulo de Préstamo · Biblioteca Central', 'Edificio BC, planta baja',  'Lun a sáb · 8:00–21:00', 688, 830),
  ('vig',  'VIG',  'Módulo de Vigilancia CU1',               'Av. Central. Recibe lo hallado en áreas comunes, canchas, estadio y parque', 'Todos los días · 7:00–22:00', 760, 449);

INSERT INTO zonas (id, sigla, nombre, tipo, resguardo_id) VALUES
  ('fcc',     'FCC',  'Ciencias de la Computación',      'facultad', 'fcc'),
  ('fcq',     'FCQ',  'Ciencias Químicas',               'facultad', 'fcq'),
  ('fiq',     'FIQ',  'Ingeniería Química',              'facultad', 'fiq'),
  ('ifuap',   'IF',   'Instituto de Física',             'facultad', 'fcfm'),
  ('fce',     'FCE',  'Ciencias de la Electrónica',      'facultad', 'fce'),
  ('fcfm',    'FCFM', 'Ciencias Físico Matemáticas',     'facultad', 'fcfm'),
  ('adm',     'ADM',  'Administración',                  'facultad', 'adm'),
  ('der',     'DER',  'Derecho y Ciencias Sociales',     'facultad', 'der'),
  ('eco',     'ECO',  'Economía',                        'facultad', 'eco'),
  ('len',     'LEN',  'Lenguas',                         'facultad', 'len'),
  ('fcf',     'FCF',  'Cultura Física',                  'facultad', 'fcf'),
  ('arq',     'ARQ',  'Arquitectura',                    'facultad', 'arq'),
  ('ing',     'ING',  'Ingeniería',                      'facultad', 'ing'),
  ('bio',     'FCB',  'Ciencias Biológicas',             'facultad', 'bio'),
  ('cont',    'FCP',  'Contaduría Pública',              'facultad', 'cont'),
  ('laguna',  NULL,   'Laguna y jardín poniente',        'comun',    'arq'),
  ('parque',  NULL,   'Parque y lago de CU',             'comun',    'vig'),
  ('este',    NULL,   'Zona este (DAE, FIL, SUA, STU)',  'comun',    'vig'),
  ('cc',      'CC',   'Edificio CC, alberca y DCF',      'comun',    'vig'),
  ('arena',   'AB',   'Arena BUAP',                      'comun',    'vig'),
  ('ema',     'EMA',  'Multiaulas EMA 4 a 6',            'comun',    'vig'),
  ('canchas', NULL,   'Campos deportivos',               'comun',    'vig'),
  ('estadio', 'EU',   'Estadio Universitario',           'comun',    'vig'),
  ('bib',     'BC',   'Biblioteca Central',              'comun',    'bib'),
  ('sur',     NULL,   'Zona sur (DCyTIC, US, DASU)',     'comun',    'vig'),
  ('inst',    NULL,   'Institutos (IC, IFI)',            'comun',    'vig'),
  ('and',     NULL,   'Áreas comunes de CU1',            'comun',    'vig');

INSERT INTO categorias (id, nombre, orden) VALUES
  ('botella',     'Botella o termo',     1),
  ('cargador',    'Cargador',            2),
  ('llaves',      'Llaves',              3),
  ('sueter',      'Suéter o chamarra',   4),
  ('libreta',     'Libreta o cuaderno',  5),
  ('audifonos',   'Audífonos',           6),
  ('laptop',      'Laptop',              7),
  ('celular',     'Celular',             8),
  ('credencial',  'Credencial',          9),
  ('cartera',     'Cartera',            10),
  ('calculadora', 'Calculadora',        11),
  ('lentes',      'Lentes',             12),
  ('paraguas',    'Paraguas',           13),
  ('mochila',     'Mochila o bolsa',    14),
  ('usb',         'Memoria USB',        15),
  ('tablet',      'Tablet',             16),
  ('libro',       'Libro',              17),
  ('casco',       'Casco',              18),
  ('otro',        'Otro',               99);
