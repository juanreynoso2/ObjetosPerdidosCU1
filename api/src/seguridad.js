import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';

/** Cabeceras de seguridad. La política de contenido permite lo que usa frontend/index.html. */
export const cabeceras = helmet({
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      scriptSrcAttr: ["'none'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"]
    }
  }
});

/**
 * Las peticiones que cambian datos (POST) solo se aceptan desde la misma página.
 * Una página de otro dominio no puede reportar, iniciar sesión ni entregar objetos.
 * Para permitir otros dominios, ponlos en ORIGENES_PERMITIDOS separados por comas.
 */
export function mismoOrigen(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const origen = req.get('origin');
  if (!origen) return next(); // sin navegador (curl, pruebas, Postman)

  const permitidos = (process.env.ORIGENES_PERMITIDOS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  let host = null;
  try {
    host = new URL(origen).host;
  } catch {
    /* origen inválido */
  }
  if (host === req.get('host') || permitidos.includes(origen)) return next();
  return res.status(403).json({ error: 'Esta petición no viene de la página de Objetos Perdidos CU1' });
}

function limitador(limite, ventanaMin, mensaje, extra = {}) {
  return rateLimit({
    windowMs: ventanaMin * 60 * 1000,
    limit: limite,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: mensaje },
    ...extra
  });
}

/** Máximo de reportes de objetos por minuto desde la misma conexión. */
export const limitadorReportes = (limite) =>
  limitador(limite, 1, 'Enviaste demasiados reportes seguidos. Espera un minuto e intenta de nuevo.');

/** Máximo de intentos fallidos de inicio de sesión cada 15 minutos. */
export const limitadorLogin = (limite) =>
  limitador(limite, 15, 'Demasiados intentos de inicio de sesión. Espera 15 minutos.', { skipSuccessfulRequests: true });
