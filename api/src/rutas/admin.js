import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { pool } from '../db.js';
import { ErrorDeDatos } from '../errores.js';
import { detallesDeValidacion } from '../validacion.js';
import { crearObjeto } from '../reportes.js';
import { COOKIE, opcionesCookie, firmarSesion, requiereSesion, adminPublico } from '../sesion.js';

// Hash de relleno: si el usuario no existe se compara igual, para tardar lo mismo
// y no revelar qué usuarios existen.
const HASH_RELLENO = bcrypt.hashSync('contraseña-de-relleno', 10);

export function rutasAdmin({ limitadorLogin }) {
  const router = Router();

  // -------------------------------------------------------------------
  // Sesión
  // -------------------------------------------------------------------
  const esquemaLogin = z.strictObject({
    usuario: z.string({ error: 'Escribe tu usuario' }).trim().toLowerCase().min(1, 'Escribe tu usuario').max(40),
    contrasena: z.string({ error: 'Escribe tu contraseña' }).min(1, 'Escribe tu contraseña').max(200)
  });

  router.post('/login', limitadorLogin, async (req, res) => {
    const lectura = esquemaLogin.safeParse(req.body ?? {});
    if (!lectura.success) throw new ErrorDeDatos('Escribe tu usuario y contraseña', detallesDeValidacion(lectura.error));
    const { usuario, contrasena } = lectura.data;

    const { rows } = await pool.query(
      'SELECT id, usuario, password_hash, activo FROM administradores WHERE usuario = $1',
      [usuario]
    );
    const admin = rows[0];
    const correcta = await bcrypt.compare(contrasena, admin?.password_hash ?? HASH_RELLENO);
    if (!admin || !correcta || !admin.activo) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    await pool.query('UPDATE administradores SET ultimo_acceso = now() WHERE id = $1', [admin.id]);
    res.cookie(COOKIE, firmarSesion(admin), opcionesCookie());

    req.admin = (await pool.query(
      `SELECT a.id, a.usuario, a.nombre, a.resguardo_id, p.sigla, p.nombre AS resguardo_nombre, p.ubicacion, p.horario
       FROM administradores a JOIN puntos_resguardo p ON p.id = a.resguardo_id WHERE a.id = $1`,
      [admin.id]
    )).rows[0];
    res.json(adminPublico(req.admin));
  });

  router.post('/logout', (req, res) => {
    res.clearCookie(COOKIE, { path: '/api' });
    res.json({ ok: true });
  });

  // Todo lo que sigue exige sesión iniciada.
  router.use(requiereSesion);

  router.get('/sesion', (req, res) => {
    res.json(adminPublico(req.admin));
  });

  // -------------------------------------------------------------------
  // GET /api/admin/objetos?estado=activos&todo=1
  // Incluye la descripción privada y la entrega, pero solo de los objetos
  // del propio punto. De otros puntos se ve lo mismo que en el buscador.
  // -------------------------------------------------------------------
  const ESTADOS = {
    activos: ['pendiente', 'resguardo'],
    pendiente: ['pendiente'],
    resguardo: ['resguardo'],
    entregado: ['entregado'],
    descartado: ['descartado'],
    todos: ['pendiente', 'resguardo', 'entregado', 'descartado']
  };

  router.get('/objetos', async (req, res) => {
    const estados = ESTADOS[req.query.estado || 'activos'];
    if (!estados) throw new ErrorDeDatos('estado debe ser activos, pendiente, resguardo, entregado, descartado o todos');
    const todo = req.query.todo === '1' || req.query.todo === 'true';

    const { rows } = await pool.query(
      `SELECT o.folio, o.tipo, c.nombre AS tipo_nombre, o.tipo_otro, o.descripcion_privada, o.reportado_por,
              o.encontrado_en,
              to_char(o.encontrado_en AT TIME ZONE 'America/Mexico_City', 'YYYY-MM-DD') AS fecha,
              to_char(o.encontrado_en AT TIME ZONE 'America/Mexico_City', 'HH24:MI')    AS hora,
              o.zona_id, z.sigla AS zona_sigla, z.nombre AS zona_nombre, o.lugar, o.mapa_x, o.mapa_y,
              o.resguardo_id, o.estado, o.creado_en, o.recibido_en, o.descartado_en,
              e.nombre AS e_nombre, e.matricula AS e_matricula, e.verifico_descripcion AS e_desc,
              e.verifico_identificacion AS e_ident, e.observaciones AS e_obs, e.entregado_en,
              ad.usuario AS e_atendio
       FROM objetos o
       JOIN categorias c ON c.id = o.tipo
       JOIN zonas z ON z.id = o.zona_id
       LEFT JOIN entregas e ON e.objeto_id = o.id
       LEFT JOIN administradores ad ON ad.id = e.administrador_id
       WHERE o.estado = ANY($1::estado_objeto[])
         AND ($2 OR o.resguardo_id = $3)
       ORDER BY o.encontrado_en DESC
       LIMIT 1000`,
      [estados, todo, req.admin.resguardo_id]
    );

    res.json(rows.map((r) => {
      const propio = r.resguardo_id === req.admin.resguardo_id;
      return {
        folio: r.folio,
        tipo: r.tipo,
        nombre: r.tipo === 'otro' ? r.tipo_otro : r.tipo_nombre,
        descripcion: propio ? r.descripcion_privada : null,
        reportado_por: propio ? r.reportado_por : null,
        encontrado_en: r.encontrado_en,
        fecha: r.fecha,
        hora: r.hora,
        zona: { id: r.zona_id, sigla: r.zona_sigla, nombre: r.zona_nombre },
        lugar: r.lugar,
        mapa: { x: Number(r.mapa_x), y: Number(r.mapa_y) },
        resguardo_id: r.resguardo_id,
        estado: r.estado,
        creado_en: r.creado_en,
        recibido_en: r.recibido_en,
        descartado_en: r.descartado_en,
        propio,
        entrega: r.entregado_en
          ? propio
            ? {
                nombre: r.e_nombre,
                matricula: r.e_matricula,
                verifico_descripcion: r.e_desc,
                verifico_identificacion: r.e_ident,
                observaciones: r.e_obs,
                entregado_en: r.entregado_en,
                atendio: r.e_atendio
              }
            : { entregado_en: r.entregado_en }
          : null
      };
    }));
  });

  // POST /api/admin/objetos · La administración registra un objeto que ya tiene en su punto
  router.post('/objetos', async (req, res) => {
    const creado = await crearObjeto(req.body, {
      resguardoForzado: req.admin.resguardo_id,
      comoAdministracion: `Administración ${req.admin.sigla}`
    });
    res.status(201).location(`/api/objetos/${creado.folio}`).json(creado);
  });

  // -------------------------------------------------------------------
  // Acciones sobre un objeto
  // -------------------------------------------------------------------
  /** Busca el objeto y responde 404/403/409 si no se puede actuar sobre él. */
  async function objetoParaAccion(req, res, estadoRequerido) {
    const folio = String(req.params.folio).toUpperCase();
    const { rows } = await pool.query('SELECT id, folio, estado, resguardo_id FROM objetos WHERE folio = $1', [folio]);
    const o = rows[0];
    if (!o) {
      res.status(404).json({ error: `No existe el folio ${folio}` });
      return null;
    }
    if (o.resguardo_id !== req.admin.resguardo_id) {
      res.status(403).json({ error: `El folio ${folio} pertenece a otro punto de resguardo` });
      return null;
    }
    if (o.estado !== estadoRequerido) {
      const texto = { pendiente: 'por llegar', resguardo: 'en resguardo', entregado: 'entregado', descartado: 'descartado' };
      res.status(409).json({ error: `El folio ${folio} está ${texto[o.estado]}; esta acción no aplica` });
      return null;
    }
    return o;
  }

  router.post('/objetos/:folio/recibir', async (req, res) => {
    const o = await objetoParaAccion(req, res, 'pendiente');
    if (!o) return;
    const { rows } = await pool.query(
      "UPDATE objetos SET estado = 'resguardo', recibido_en = now() WHERE id = $1 AND estado = 'pendiente' RETURNING folio, estado, recibido_en",
      [o.id]
    );
    if (!rows.length) return res.status(409).json({ error: 'Otra persona cambió este objeto. Recarga la lista.' });
    res.json(rows[0]);
  });

  router.post('/objetos/:folio/descartar', async (req, res) => {
    const o = await objetoParaAccion(req, res, 'pendiente');
    if (!o) return;
    const { rows } = await pool.query(
      "UPDATE objetos SET estado = 'descartado', descartado_en = now() WHERE id = $1 AND estado = 'pendiente' RETURNING folio, estado, descartado_en",
      [o.id]
    );
    if (!rows.length) return res.status(409).json({ error: 'Otra persona cambió este objeto. Recarga la lista.' });
    res.json(rows[0]);
  });

  const esquemaEntrega = z.strictObject({
    nombre: z
      .string({ error: 'Escribe nombre y apellidos' })
      .trim()
      .min(5, 'Escribe nombre y apellidos')
      .max(80, 'El nombre admite hasta 80 caracteres')
      .refine((v) => v.split(/\s+/).length >= 2, 'Escribe nombre y apellidos'),
    matricula: z.string({ error: 'Escribe la matrícula' }).trim().regex(/^\d{9}$/, 'La matrícula BUAP tiene 9 dígitos'),
    verifico_descripcion: z.literal(true, { error: 'Confirma que describió el objeto y coincide' }),
    verifico_identificacion: z.literal(true, { error: 'Confirma que presentó identificación' }),
    observaciones: z.string().trim().max(120, 'Las observaciones admiten hasta 120 caracteres').optional().nullable()
  });

  router.post('/objetos/:folio/entregar', async (req, res) => {
    const lectura = esquemaEntrega.safeParse(req.body ?? {});
    if (!lectura.success) throw new ErrorDeDatos('Revisa los datos de la entrega', detallesDeValidacion(lectura.error));
    const d = lectura.data;

    const o = await objetoParaAccion(req, res, 'resguardo');
    if (!o) return;

    const { rows } = await pool.query(
      `INSERT INTO entregas (objeto_id, nombre, matricula, verifico_descripcion, verifico_identificacion,
                             observaciones, administrador_id)
       VALUES ($1, $2, $3, true, true, $4, $5)
       RETURNING entregado_en, entregado_en + interval '7 days' AS visible_hasta`,
      [o.id, d.nombre, d.matricula, d.observaciones || null, req.admin.id]
    );
    res.json({ folio: o.folio, estado: 'entregado', ...rows[0] });
  });

  // -------------------------------------------------------------------
  // GET /api/admin/entregas · Bitácora privada del propio punto
  // -------------------------------------------------------------------
  router.get('/entregas', async (req, res) => {
    const { rows } = await pool.query(
      `SELECT o.folio, CASE WHEN o.tipo = 'otro' THEN o.tipo_otro ELSE c.nombre END AS objeto,
              o.descripcion_privada AS descripcion, e.nombre, e.matricula,
              e.verifico_descripcion, e.verifico_identificacion, e.observaciones, e.entregado_en,
              a.usuario AS atendio
       FROM entregas e
       JOIN objetos o ON o.id = e.objeto_id
       JOIN categorias c ON c.id = o.tipo
       JOIN administradores a ON a.id = e.administrador_id
       WHERE o.resguardo_id = $1
       ORDER BY e.entregado_en DESC`,
      [req.admin.resguardo_id]
    );
    res.json(rows);
  });

  return router;
}
