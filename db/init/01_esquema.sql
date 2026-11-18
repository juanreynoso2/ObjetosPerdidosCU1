-- =====================================================================
-- Objetos Perdidos CU1 · Esquema de la base de datos (PostgreSQL 16)
-- Se ejecuta solo la primera vez que se crea el volumen de la base.
-- =====================================================================

SET timezone = 'America/Mexico_City';
CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- cifrado de contraseñas (bcrypt)

-- ---------------------------------------------------------------------
-- Catálogos
-- ---------------------------------------------------------------------

-- Lugar físico de cada facultad donde se guardan y se recogen los objetos.
CREATE TABLE puntos_resguardo (
  id           TEXT PRIMARY KEY CHECK (id ~ '^[a-z]{2,10}$'),       -- 'fcc', 'vig'
  sigla        TEXT NOT NULL,                                        -- 'FCC'
  nombre       TEXT NOT NULL,                                        -- 'Secretaría Administrativa FCC'
  ubicacion    TEXT NOT NULL,                                        -- 'Edificio CCO1, planta baja'
  horario      TEXT NOT NULL,                                        -- 'Lun a vie · 8:00–20:00'
  responsable  TEXT,
  mapa_x       NUMERIC(6,1) NOT NULL,
  mapa_y       NUMERIC(6,1) NOT NULL,
  confirmado   BOOLEAN NOT NULL DEFAULT false,   -- true cuando la facultad confirmó los datos (tarea 6.1)
  activo       BOOLEAN NOT NULL DEFAULT true
);

-- Zonas del mapa de CU1. Cada zona manda sus objetos a un punto de resguardo.
CREATE TABLE zonas (
  id            TEXT PRIMARY KEY CHECK (id ~ '^[a-z]{2,10}$'),      -- 'fcc', 'canchas'
  sigla         TEXT,                                                -- 'FCC' (vacío en áreas comunes)
  nombre        TEXT NOT NULL,                                       -- 'Ciencias de la Computación'
  tipo          TEXT NOT NULL CHECK (tipo IN ('facultad', 'comun')),
  resguardo_id  TEXT NOT NULL REFERENCES puntos_resguardo(id)
);

-- Tipos de objeto que aparecen como botones al reportar.
CREATE TABLE categorias (
  id      TEXT PRIMARY KEY CHECK (id ~ '^[a-z]{2,15}$'),            -- 'botella'
  nombre  TEXT NOT NULL,                                             -- 'Botella o termo'
  orden   SMALLINT NOT NULL
);

-- ---------------------------------------------------------------------
-- Objetos encontrados
-- ---------------------------------------------------------------------

CREATE TYPE estado_objeto AS ENUM ('pendiente', 'resguardo', 'entregado', 'descartado');
-- pendiente  = alguien lo reportó y dijo que lo llevará al punto de resguardo
-- resguardo  = la administración confirmó que ya lo tiene
-- entregado  = se entregó a su dueño (se ve 7 días en el buscador como «Encontrado»)
-- descartado = el objeto nunca llegó; ya no se muestra

CREATE SEQUENCE folio_seq START 101;

CREATE TABLE objetos (
  id                   BIGSERIAL PRIMARY KEY,
  folio                TEXT NOT NULL UNIQUE
                         DEFAULT ('CU1-' || lpad(nextval('folio_seq')::text, 4, '0')),
  tipo                 TEXT NOT NULL REFERENCES categorias(id),
  tipo_otro            TEXT,
  descripcion_privada  TEXT CHECK (char_length(descripcion_privada) <= 240),  -- solo la ve la administración
  encontrado_en        TIMESTAMPTZ NOT NULL,                                    -- día y hora del hallazgo
  zona_id              TEXT NOT NULL REFERENCES zonas(id),
  lugar                TEXT NOT NULL CHECK (char_length(trim(lugar)) BETWEEN 1 AND 80),
  mapa_x               NUMERIC(6,1) NOT NULL CHECK (mapa_x BETWEEN 20 AND 1270),
  mapa_y               NUMERIC(6,1) NOT NULL CHECK (mapa_y BETWEEN 140 AND 980),
  resguardo_id         TEXT NOT NULL REFERENCES puntos_resguardo(id),
  estado               estado_objeto NOT NULL DEFAULT 'pendiente',
  reportado_por        TEXT CHECK (char_length(reportado_por) <= 60),         -- opcional y privado
  creado_en            TIMESTAMPTZ NOT NULL DEFAULT now(),
  recibido_en          TIMESTAMPTZ,
  descartado_en        TIMESTAMPTZ,

  -- «Otro» exige escribir qué objeto es; los demás tipos no llevan ese texto.
  CONSTRAINT tipo_otro_coherente CHECK (
    (tipo = 'otro' AND tipo_otro IS NOT NULL AND char_length(trim(tipo_otro)) BETWEEN 1 AND 40)
    OR (tipo <> 'otro' AND tipo_otro IS NULL)
  ),
  -- Un objeto en resguardo o entregado tuvo que haberse recibido.
  CONSTRAINT recepcion_coherente CHECK (
    estado NOT IN ('resguardo', 'entregado') OR recibido_en IS NOT NULL
  ),
  CONSTRAINT descarte_coherente CHECK (
    (estado = 'descartado') = (descartado_en IS NOT NULL)
  )
);

CREATE INDEX objetos_estado_idx     ON objetos (estado);
CREATE INDEX objetos_tipo_idx       ON objetos (tipo);
CREATE INDEX objetos_resguardo_idx  ON objetos (resguardo_id, estado);
CREATE INDEX objetos_encontrado_idx ON objetos (encontrado_en DESC);

-- ---------------------------------------------------------------------
-- Administración
-- ---------------------------------------------------------------------

CREATE TABLE administradores (
  id             SERIAL PRIMARY KEY,
  usuario        TEXT NOT NULL UNIQUE CHECK (usuario ~ '^[a-z0-9._-]{3,40}$'),
  nombre         TEXT NOT NULL,
  password_hash  TEXT NOT NULL,                       -- bcrypt; nunca la contraseña en texto
  resguardo_id   TEXT NOT NULL REFERENCES puntos_resguardo(id),
  activo         BOOLEAN NOT NULL DEFAULT true,
  creado_en      TIMESTAMPTZ NOT NULL DEFAULT now(),
  ultimo_acceso  TIMESTAMPTZ
);

-- Registro privado de quién se llevó cada objeto.
CREATE TABLE entregas (
  id                       SERIAL PRIMARY KEY,
  objeto_id                BIGINT NOT NULL UNIQUE REFERENCES objetos(id),  -- un objeto se entrega una sola vez
  nombre                   TEXT NOT NULL CHECK (char_length(trim(nombre)) BETWEEN 5 AND 80),
  matricula                CHAR(9) NOT NULL CHECK (matricula ~ '^[0-9]{9}$'),
  verifico_descripcion     BOOLEAN NOT NULL CHECK (verifico_descripcion),     -- obligatorio
  verifico_identificacion  BOOLEAN NOT NULL CHECK (verifico_identificacion),  -- obligatorio
  observaciones            TEXT CHECK (char_length(observaciones) <= 120),
  entregado_en             TIMESTAMPTZ NOT NULL DEFAULT now(),
  administrador_id         INT NOT NULL REFERENCES administradores(id)
);

CREATE INDEX entregas_fecha_idx ON entregas (entregado_en DESC);

-- Al registrar una entrega: el objeto debe estar en resguardo, el administrador
-- debe ser de ese mismo punto, y el objeto pasa a «entregado».
CREATE FUNCTION registrar_entrega() RETURNS trigger AS $$
DECLARE
  obj  objetos%ROWTYPE;
  adm  administradores%ROWTYPE;
BEGIN
  SELECT * INTO obj FROM objetos WHERE id = NEW.objeto_id FOR UPDATE;
  SELECT * INTO adm FROM administradores WHERE id = NEW.administrador_id;

  IF obj.estado <> 'resguardo' THEN
    RAISE EXCEPTION 'El objeto % no está en resguardo (estado: %)', obj.folio, obj.estado
      USING ERRCODE = 'check_violation';
  END IF;
  IF NOT adm.activo OR adm.resguardo_id <> obj.resguardo_id THEN
    RAISE EXCEPTION 'El administrador % no puede entregar objetos de otro punto de resguardo', adm.usuario
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  UPDATE objetos SET estado = 'entregado' WHERE id = NEW.objeto_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER entregas_registrar
  BEFORE INSERT ON entregas
  FOR EACH ROW EXECUTE FUNCTION registrar_entrega();

-- ---------------------------------------------------------------------
-- Vista pública: lo ÚNICO que el buscador puede consultar.
-- No incluye descripción privada, quién lo reportó ni datos de la entrega.
-- ---------------------------------------------------------------------

CREATE VIEW objetos_publicos AS
SELECT
  o.folio,
  o.tipo,
  c.nombre                          AS tipo_nombre,
  o.tipo_otro,
  o.encontrado_en,
  o.zona_id,
  z.nombre                          AS zona_nombre,
  z.sigla                           AS zona_sigla,
  o.lugar,
  o.mapa_x,
  o.mapa_y,
  o.resguardo_id,
  o.estado,
  e.entregado_en,
  e.entregado_en + interval '7 days' AS visible_hasta
FROM objetos o
JOIN categorias c ON c.id = o.tipo
JOIN zonas      z ON z.id = o.zona_id
LEFT JOIN entregas e ON e.objeto_id = o.id
WHERE o.estado IN ('pendiente', 'resguardo')
   OR (o.estado = 'entregado' AND e.entregado_en > now() - interval '7 days');
