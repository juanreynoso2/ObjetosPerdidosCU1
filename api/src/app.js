import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import publicas from './rutas/publicas.js';
import { rutasAdmin } from './rutas/admin.js';
import { manejadorDeErrores } from './errores.js';
import { cabeceras, mismoOrigen, limitadorReportes, limitadorLogin } from './seguridad.js';

// Carpeta de la página: FRONTEND_DIR, /app/public (Docker) o ../../frontend (API corriendo directo).
const DIR_PAGINA = [
  process.env.FRONTEND_DIR,
  '/app/public',
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../frontend')
].find((dir) => dir && fs.existsSync(path.join(dir, 'index.html')));

if (!DIR_PAGINA) console.warn('No se encontró frontend/index.html: solo responderá la API.');

/**
 * Crea la aplicación de Express (las pruebas la usan sin abrir un puerto).
 * opciones.limiteReportes y opciones.limiteLogin permiten ajustar los límites en las pruebas.
 */
export function crearApp(opciones = {}) {
  const limiteReportes = opciones.limiteReportes ?? Number(process.env.LIMITE_REPORTES_POR_MINUTO || 10);
  const limiteLogin = opciones.limiteLogin ?? Number(process.env.LIMITE_INTENTOS_LOGIN || 10);

  const app = express();
  app.disable('x-powered-by');
  // Detrás de un proxy (Caddy/nginx en producción) pon TRUST_PROXY=1 para que el límite use la IP real.
  if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY);

  app.use(cabeceras);
  app.use('/api', mismoOrigen);
  app.use(express.json({ limit: '10kb' }));

  app.post('/api/objetos', limitadorReportes(limiteReportes));
  app.use('/api', publicas);
  app.use('/api/admin', rutasAdmin({ limitadorLogin: limitadorLogin(limiteLogin) }));

  app.use('/api', (req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada' });
  });

  // La página (frontend/index.html) se sirve desde la misma dirección que la API.
  if (DIR_PAGINA) app.use(express.static(DIR_PAGINA, { index: 'index.html' }));

  app.use(manejadorDeErrores);
  return app;
}
