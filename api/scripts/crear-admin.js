// Crea una cuenta de administración o cambia su contraseña.
// Uso (con el proyecto levantado):
//   docker compose exec api node scripts/crear-admin.js <usuario> "<Nombre completo>" <punto>
// Ejemplo:
//   docker compose exec api node scripts/crear-admin.js maria.lopez "María López" fcc
// Para desactivar una cuenta:
//   docker compose exec api node scripts/crear-admin.js --desactivar <usuario>
import readline from 'node:readline';
import { Writable } from 'node:stream';
import bcrypt from 'bcryptjs';
import { pool } from '../src/db.js';

// Pregunta sin mostrar lo que se escribe (para contraseñas).
let silencio = false;
const salida = new Writable({
  write(chunk, enc, cb) { if (!silencio) process.stdout.write(chunk, enc); cb(); }
});
let rl = null;
let lineas = null;
async function preguntarOculto(texto) {
  if (!rl) {
    rl = readline.createInterface({ input: process.stdin, output: salida, terminal: Boolean(process.stdin.isTTY) });
    lineas = rl[Symbol.asyncIterator]();
  }
  process.stdout.write(texto);
  silencio = true;
  const { value } = await lineas.next();
  silencio = false;
  process.stdout.write('\n');
  return value ?? '';
}

async function principal() {
  const args = process.argv.slice(2);

  if (args[0] === '--desactivar') {
    const r = await pool.query('UPDATE administradores SET activo = false WHERE usuario = $1', [args[1]]);
    console.log(r.rowCount ? `Cuenta ${args[1]} desactivada.` : `No existe la cuenta ${args[1]}.`);
    return;
  }

  const [usuario, nombre, punto] = args;
  if (!usuario || !nombre || !punto) {
    console.log('Uso: node scripts/crear-admin.js <usuario> "<Nombre completo>" <punto>');
    const { rows } = await pool.query('SELECT id, nombre FROM puntos_resguardo ORDER BY id');
    console.log('Puntos de resguardo:', rows.map((p) => `${p.id} (${p.nombre})`).join(', '));
    process.exitCode = 1;
    return;
  }
  if (!/^[a-z0-9._-]{3,40}$/.test(usuario)) {
    console.log('El usuario solo puede tener minúsculas, números, punto, guion o guion bajo (3 a 40).');
    process.exitCode = 1;
    return;
  }
  const existePunto = await pool.query('SELECT 1 FROM puntos_resguardo WHERE id = $1', [punto]);
  if (!existePunto.rowCount) {
    console.log(`No existe el punto de resguardo «${punto}».`);
    process.exitCode = 1;
    return;
  }

  const contrasena = await preguntarOculto('Contraseña nueva (mínimo 10 caracteres): ');
  if (contrasena.length < 10) {
    console.log('La contraseña debe tener al menos 10 caracteres.');
    process.exitCode = 1;
    return;
  }
  const repetida = await preguntarOculto('Repite la contraseña: ');
  if (contrasena !== repetida) {
    console.log('Las contraseñas no coinciden.');
    process.exitCode = 1;
    return;
  }

  const hash = await bcrypt.hash(contrasena, 12);
  const { rows } = await pool.query(
    `INSERT INTO administradores (usuario, nombre, password_hash, resguardo_id)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (usuario) DO UPDATE
       SET nombre = EXCLUDED.nombre, password_hash = EXCLUDED.password_hash,
           resguardo_id = EXCLUDED.resguardo_id, activo = true
     RETURNING (xmax = 0) AS nueva`,
    [usuario, nombre, hash, punto]
  );
  console.log(rows[0].nueva ? `Cuenta ${usuario} creada para ${punto}.` : `Cuenta ${usuario} actualizada.`);
}

principal()
  .catch((e) => { console.error('Error:', e.message); process.exitCode = 1; })
  .finally(() => { rl?.close(); pool.end(); });
