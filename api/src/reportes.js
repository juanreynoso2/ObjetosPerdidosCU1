import { pool } from './db.js';
import { esquemaReporte, detallesDeValidacion } from './validacion.js';
import { ErrorDeDatos } from './errores.js';

/**
 * Valida y guarda un objeto encontrado. Lo usan el reporte público (queda «pendiente»)
 * y la administración (entra directo a «resguardo» en su propio punto).
 */
export async function crearObjeto(cuerpo, { resguardoForzado = null, comoAdministracion = null } = {}) {
  const lectura = esquemaReporte.safeParse(cuerpo ?? {});
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

  const resguardoId = resguardoForzado || d.resguardo_id || zona.rows[0].resguardo_id;
  const resguardo = await pool.query(
    'SELECT id, nombre, ubicacion, horario FROM puntos_resguardo WHERE id = $1 AND activo',
    [resguardoId]
  );
  if (!resguardo.rowCount) {
    throw new ErrorDeDatos('Revisa los datos del reporte', [{ campo: 'resguardo_id', mensaje: 'Ese punto de resguardo no existe' }]);
  }

  const enResguardo = Boolean(comoAdministracion);
  const { rows } = await pool.query(
    `INSERT INTO objetos (tipo, tipo_otro, descripcion_privada, encontrado_en, zona_id, lugar,
                          mapa_x, mapa_y, resguardo_id, reportado_por, estado, recibido_en)
     VALUES ($1, $2, $3, (($4 || ' ' || $5)::timestamp AT TIME ZONE 'America/Mexico_City'),
             $6, $7, $8, $9, $10, $11, $12, CASE WHEN $13 THEN now() END)
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
      comoAdministracion || d.reportado_por || null,
      enResguardo ? 'resguardo' : 'pendiente',
      enResguardo
    ]
  );

  return {
    folio: rows[0].folio,
    estado: rows[0].estado,
    encontrado_en: rows[0].encontrado_en,
    resguardo: resguardo.rows[0]
  };
}
