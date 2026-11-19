import express from 'express';
import publicas from './rutas/publicas.js';
import { manejadorDeErrores } from './errores.js';

/** Crea la aplicación de Express (las pruebas la usan sin abrir un puerto). */
export function crearApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '10kb' }));

  app.use('/api', publicas);

  app.use('/api', (req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada' });
  });
  app.use(manejadorDeErrores);
  return app;
}
