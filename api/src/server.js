import { crearApp } from './app.js';
import { pool } from './db.js';

const puerto = Number(process.env.PORT || 3000);
const servidor = crearApp().listen(puerto, () => {
  console.log(`API de Objetos Perdidos CU1 escuchando en el puerto ${puerto}`);
});

// Apagado ordenado (docker compose stop)
for (const senal of ['SIGTERM', 'SIGINT']) {
  process.on(senal, () => {
    servidor.close(() => pool.end().finally(() => process.exit(0)));
  });
}
