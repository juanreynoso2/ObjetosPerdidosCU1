import pg from 'pg';

// La conexión se configura con las variables estándar de PostgreSQL
// (PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE) que define docker-compose.yml.
export const pool = new pg.Pool({
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  // Todas las fechas se interpretan en la hora de Puebla.
  options: '-c timezone=America/Mexico_City'
});

pool.on('error', (err) => {
  console.error('Error inesperado en la conexión a la base de datos:', err.message);
});
