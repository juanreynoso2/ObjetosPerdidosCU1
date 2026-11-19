import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import publicas from './rutas/publicas.js';
import { manejadorDeErrores } from './errores.js';

// Carpeta de la página. En Docker es /app/public; al correr la API directo, ../../frontend.
const DIR_PAGINA =
  process.env.FRONTEND_DIR || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../frontend');

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
  app.use(express.static(DIR_PAGINA, { index: 'index.html' }));

  app.use(manejadorDeErrores);
  return app;
}
