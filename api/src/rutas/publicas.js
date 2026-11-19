import { Router } from 'express';
import { pool } from '../db.js';
import { interpretarBusqueda } from '../busqueda.js';
import { esquemaBusqueda, esquemaReporte, detallesDeValidacion } from '../validacion.js';
import { ErrorDeDatos } from '../errores.js';

const router = Router();

// ---------------------------------------------------------------------
// GET /api/salud · ¿La API y la base responden?
// ---------------------------------------------------------------------
router.get('/salud', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, base: 'conectada' });
  } catch {
    res.status(503).json({ ok: false, base: 'sin conexión' });
  }
});

// ---------------------------------------------------------------------
// GET /api/resguardos · Puntos de resguardo con cuántos objetos guardan
// ---------------------------------------------------------------------
router.get('/resguardos', async (req, res) => {
  const { rows } = await pool.query(`
    SELECT p.id, p.sigla, p.nombre, p.ubicacion, p.horario, p.mapa_x, p.mapa_y, p.confirmado,
           count(o.id) FILTER (WHERE o.estado IN ('pendiente', 'resguardo'))::int AS objetos
    FROM puntos_resguardo p
    LEFT JOIN objetos o ON o.resguardo_id = p.id
    WHERE p.activo
    GROUP BY p.id
    ORDER BY p.id = 'vig', p.id = 'bib', p.sigla`);

  res.json(rows.map((r) => ({
    id: r.id,
    sigla: r.sigla,
    nombre: r.nombre,
    ubicacion: r.ubicacion,
    horario: r.horario,
    mapa: { x: Number(r.mapa_x), y: Number(r.mapa_y) },
    confirmado: r.confirmado,
    objetos: r.objetos
  })));
});

// ---------------------------------------------------------------------
// GET /api/catalogos · Tipos de objeto y zonas del mapa
// ---------------------------------------------------------------------
router.get('/catalogos', async (req, res) => {
  const [categorias, zonas] = await Promise.all([
    pool.query('SELECT id, nombre FROM categorias ORDER BY orden'),
    pool.query('SELECT id, sigla, nombre, tipo, resguardo_id FROM zonas ORDER BY id')
  ]);
  res.json({ categorias: categorias.rows, zonas: zonas.rows });
});

// ---------------------------------------------------------------------
// Objetos públicos. Todo sale de la vista objetos_publicos, que no tiene
// descripción privada, quién reportó ni datos de la entrega. Además, cada
// fila se arma campo por campo para no exponer nada por accidente.
// ---------------------------------------------------------------------
const COLUMNAS_PUBLICAS = `
  folio, tipo, tipo_nombre, tipo_otro, encontrado_en,
  to_char(encontrado_en AT TIME ZONE 'America/Mexico_City', 'YYYY-MM-DD') AS fecha,
  to_char(encontrado_en AT TIME ZONE 'America/Mexico_City', 'HH24:MI')    AS hora,
  zona_id, zona_sigla, zona_nombre, lugar, mapa_x, mapa_y, resguardo_id, estado,
  entregado_en, visible_hasta`;

function objetoPublico(r) {
  return {
    folio: r.folio,
    tipo: r.tipo,
    nombre: r.tipo === 'otro' ? r.tipo_otro : r.tipo_nombre,
    encontrado_en: r.encontrado_en,
    fecha: r.fecha,
    hora: r.hora,
    zona: { id: r.zona_id, sigla: r.zona_sigla, nombre: r.zona_nombre },
    lugar: r.lugar,
    mapa: { x: Number(r.mapa_x), y: Number(r.mapa_y) },
    resguardo_id: r.resguardo_id,
    estado: r.estado,
    entregado_en: r.entregado_en,
    visible_hasta: r.visible_hasta
  };
}

// GET /api/objetos?q=botella&desde=2026-11-10&tipo=botella&limite=300
router.get('/objetos', async (req, res) => {
  const filtros = esquemaBusqueda.safeParse(req.query);
  if (!filtros.success) {
    throw new ErrorDeDatos('Revisa los filtros de la búsqueda', detallesDeValidacion(filtros.error));
  }
  const { q, tipo, desde, limite } = filtros.data;
  const busqueda = interpretarBusqueda(q);

  const { rows } = await pool.query(
    `SELECT ${COLUMNAS_PUBLICAS}
     FROM objetos_publicos
     WHERE ($1::text[] IS NULL
            OR tipo = ANY($1)
            OR (tipo = 'otro' AND translate(lower(tipo_otro), 'áéíóúüñ', 'aeiouun') LIKE ANY($2::text[])))
       AND ($3::date IS NULL OR encontrado_en >= ($3::date::timestamp AT TIME ZONE 'America/Mexico_City'))
       AND ($4::text IS NULL OR tipo = $4)
     ORDER BY encontrado_en DESC
     LIMIT $5`,
    [busqueda?.tipos ?? null, busqueda?.patrones ?? null, desde ?? null, tipo ?? null, limite]
  );

  const objetos = rows.map(objetoPublico);
  res.json({
    total: objetos.length,
    resumen: {
      por_llegar: objetos.filter((o) => o.estado === 'pendiente').length,
      en_resguardo: objetos.filter((o) => o.estado === 'resguardo').length,
      entregados: objetos.filter((o) => o.estado === 'entregado').length
    },
    objetos
  });
});

// GET /api/objetos/CU1-0101 · Consultar un folio
router.get('/objetos/:folio', async (req, res) => {
  const folio = String(req.params.folio).toUpperCase();
  if (!/^CU1-\d{4,}$/.test(folio)) {
    throw new ErrorDeDatos('El folio tiene el formato CU1-0000');
  }
  const { rows } = await pool.query(`SELECT ${COLUMNAS_PUBLICAS} FROM objetos_publicos WHERE folio = $1`, [folio]);
  if (!rows.length) {
    return res.status(404).json({ error: 'No hay un objeto visible con ese folio' });
  }
  res.json(objetoPublico(rows[0]));
});

// ---------------------------------------------------------------------
// POST /api/objetos · Reportar un objeto encontrado
// ---------------------------------------------------------------------
router.post('/objetos', async (req, res) => {
  const lectura = esquemaReporte.safeParse(req.body ?? {});
  if (!lectura.success) {
    throw new ErrorDeDatos('Revisa los datos del reporte', detallesDeValidacion(lectura.error));
  }
  const d = lectura.data;

  const [categoria, zona] = await Promise.all([
    pool.query('SELECT 1 FROM categorias WHERE id = $1', [d.tipo]),
    pool.query('SELECT resguardo_id FROM zonas WHERE id = $1', [d.zona_id])
  ]);
  if (!categoria.rowCount) throw new ErrorDeDatos('Revisa los datos del reporte', [{ campo: 'tipo', mensaje: 'Ese tipo de objeto no existe' }]);
  if (!zona.rowCount) throw new ErrorDeDatos('Revisa los datos del reporte', [{ campo: 'zona_id', mensaje: 'Esa zona del mapa no existe' }]);

  const resguardoId = d.resguardo_id || zona.rows[0].resguardo_id;
  const resguardo = await pool.query(
    'SELECT id, nombre, ubicacion, horario FROM puntos_resguardo WHERE id = $1 AND activo',
    [resguardoId]
  );
  if (!resguardo.rowCount) {
    throw new ErrorDeDatos('Revisa los datos del reporte', [{ campo: 'resguardo_id', mensaje: 'Ese punto de resguardo no existe' }]);
  }

  const { rows } = await pool.query(
    `INSERT INTO objetos (tipo, tipo_otro, descripcion_privada, encontrado_en, zona_id, lugar,
                          mapa_x, mapa_y, resguardo_id, reportado_por)
     VALUES ($1, $2, $3, (($4 || ' ' || $5)::timestamp AT TIME ZONE 'America/Mexico_City'),
             $6, $7, $8, $9, $10, $11)
     RETURNING folio, estado, encontrado_en`,
    [
      d.tipo,
      d.tipo === 'otro' ? d.tipo_otro : null,
      d.descripcion || null,
      d.fecha,
      d.hora,
      d.zona_id,
      d.lugar,
      d.x,
      d.y,
      resguardoId,
      d.reportado_por || null
    ]
  );

  res.status(201).location(`/api/objetos/${rows[0].folio}`).json({
    folio: rows[0].folio,
    estado: rows[0].estado,
    encontrado_en: rows[0].encontrado_en,
    resguardo: resguardo.rows[0]
  });
});

export default router;
