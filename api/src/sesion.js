import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { pool } from './db.js';

export const COOKIE = 'opcu1_sesion';
const DURACION_HORAS = 8;

// Clave para firmar las sesiones. En producción es obligatoria (JWT_SECRET en .env).
let secreto = process.env.JWT_SECRET;
if (!secreto || secreto.length < 32) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Define JWT_SECRET en .env (al menos 32 caracteres) antes de arrancar en producción.');
  }
  secreto = crypto.randomBytes(48).toString('hex');
  if (process.env.NODE_ENV !== 'test') {
    console.warn('JWT_SECRET no está definido o es corto: se usa uno temporal y las sesiones se cierran al reiniciar la API.');
  }
}

export function opcionesCookie() {
  return {
    httpOnly: true,                                   // el JavaScript de la página no puede leerla
    sameSite: 'strict',                               // no viaja en peticiones desde otros sitios
    secure: process.env.COOKIE_SECURE === 'true',     // true cuando la página esté en HTTPS
    path: '/api',
    maxAge: DURACION_HORAS * 3600 * 1000
  };
}

export function firmarSesion(admin) {
  return jwt.sign({ sub: String(admin.id), usuario: admin.usuario }, secreto, {
    algorithm: 'HS256',
    expiresIn: `${DURACION_HORAS}h`
  });
}

function leerCookie(req, nombre) {
  const encabezado = req.headers.cookie;
  if (!encabezado) return null;
  for (const parte of encabezado.split(';')) {
    const [k, ...v] = parte.trim().split('=');
    if (k === nombre) return decodeURIComponent(v.join('='));
  }
  return null;
}

/** Middleware: exige una sesión válida y deja los datos del administrador en req.admin. */
export async function requiereSesion(req, res, next) {
  const token = leerCookie(req, COOKIE);
  if (!token) return res.status(401).json({ error: 'Inicia sesión para continuar' });

  let datos;
  try {
    datos = jwt.verify(token, secreto, { algorithms: ['HS256'] });
  } catch {
    res.clearCookie(COOKIE, { path: '/api' });
    return res.status(401).json({ error: 'Tu sesión expiró. Inicia sesión de nuevo.' });
  }

  // Se consulta en cada petición para que desactivar una cuenta surta efecto al momento.
  const { rows } = await pool.query(
    `SELECT a.id, a.usuario, a.nombre, a.resguardo_id,
            p.sigla, p.nombre AS resguardo_nombre, p.ubicacion, p.horario
     FROM administradores a JOIN puntos_resguardo p ON p.id = a.resguardo_id
     WHERE a.id = $1 AND a.activo`,
    [Number(datos.sub)]
  );
  if (!rows.length) {
    res.clearCookie(COOKIE, { path: '/api' });
    return res.status(401).json({ error: 'Tu cuenta no está activa. Habla con la coordinación del proyecto.' });
  }
  req.admin = rows[0];
  next();
}

export function adminPublico(a) {
  return {
    usuario: a.usuario,
    nombre: a.nombre,
    resguardo: { id: a.resguardo_id, sigla: a.sigla, nombre: a.resguardo_nombre, ubicacion: a.ubicacion, horario: a.horario }
  };
}
