import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import publicas from './rutas/publicas.js';
import { manejadorDeErrores } from './errores.js';

// Carpeta de la página: FRONTEND_DIR, /app/public (Docker) o ../../frontend (API corriendo directo).
const DIR_PAGINA = [
  process.env.FRONTEND_DIR,
  '/app/public',
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../frontend')
].find((dir) => dir && fs.existsSync(path.join(dir, 'index.html')));

if (!DIR_PAGINA) console.warn('No se encontró frontend/index.html: solo responderá la API.');

/** Crea la aplicación de Express (las pruebas la usan sin abrir un puerto). */
export function crearApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '10kb' }));

  app.use('/api', publicas);
  app.use('/api', (req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada' });
  });

  // La página (frontend/index.html) se sirve desde la misma dirección que la API.
  if (DIR_PAGINA) app.use(express.static(DIR_PAGINA, { index: 'index.html' }));

  app.use(manejadorDeErrores);
  return app;
}
