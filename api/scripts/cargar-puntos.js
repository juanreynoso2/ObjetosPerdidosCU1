// Actualiza los puntos de resguardo con los datos confirmados por cada facultad (tarea 6.1).
// 1. Edita db/datos_reales/puntos_resguardo.csv (se abre con Excel; separado por «;»).
// 2. Revisa los cambios sin guardar:
//      docker compose exec api node scripts/cargar-puntos.js --probar
// 3. Guárdalos:
//      docker compose exec api node scripts/cargar-puntos.js
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from '../src/db.js';

const probar = process.argv.includes('--probar');
const ruta = process.argv.slice(2).find((a) => !a.startsWith('--')) ||
  ['/app/datos/puntos_resguardo.csv',
   path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../db/datos_reales/puntos_resguardo.csv')]
    .find((r) => fs.existsSync(r));

/** Lee un CSV separado por «;» (como lo guarda Excel en español), con campos opcionalmente entre comillas. */
function leerCSV(texto) {
  const filas = [];
  let fila = [], campo = '', comillas = false;
  texto = texto.replace(/^﻿/, '');
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (comillas) {
      if (c === '"' && texto[i + 1] === '"') { campo += '"'; i++; }
      else if (c === '"') comillas = false;
      else campo += c;
    } else if (c === '"') comillas = true;
    else if (c === ';') { fila.push(campo); campo = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && texto[i + 1] === '\n') i++;
      fila.push(campo); campo = '';
      if (fila.some((v) => v.trim())) filas.push(fila);
      fila = [];
    } else campo += c;
  }
  fila.push(campo);
  if (fila.some((v) => v.trim())) filas.push(fila);
  return filas;
}

async function principal() {
  if (!ruta) throw new Error('No encontré puntos_resguardo.csv. Pasa la ruta como argumento.');
  const [encabezado, ...filas] = leerCSV(fs.readFileSync(ruta, 'utf8'));
  const col = Object.fromEntries(encabezado.map((h, i) => [h.trim().toLowerCase(), i]));
  for (const requerida of ['id', 'nombre', 'ubicacion', 'horario', 'responsable', 'confirmado']) {
    if (!(requerida in col)) throw new Error(`Falta la columna «${requerida}» en ${ruta}`);
  }

  const { rows: actuales } = await pool.query('SELECT id, nombre, ubicacion, horario, responsable, confirmado FROM puntos_resguardo');
  const porId = Object.fromEntries(actuales.map((p) => [p.id, p]));
  const errores = [];
  const cambios = [];

  filas.forEach((f, n) => {
    const v = (k) => (f[col[k]] ?? '').trim();
    const linea = n + 2;
    const id = v('id').toLowerCase();
    if (!porId[id]) return errores.push(`Línea ${linea}: no existe el punto «${id}»`);
    const nuevo = {
      nombre: v('nombre'),
      ubicacion: v('ubicacion'),
      horario: v('horario'),
      responsable: v('responsable') || null,
      confirmado: /^(si|sí|x|true|1)$/i.test(v('confirmado'))
    };
    for (const k of ['nombre', 'ubicacion', 'horario']) {
      if (!nuevo[k]) errores.push(`Línea ${linea} (${id}): «${k}» está vacío`);
    }
    const antes = porId[id];
    const diferencias = Object.keys(nuevo).filter((k) => (antes[k] ?? null) !== nuevo[k]);
    if (diferencias.length) cambios.push({ id, nuevo, diferencias, antes });
  });

  if (errores.length) {
    console.log('No se guardó nada. Corrige estos errores:\n- ' + errores.join('\n- '));
    process.exitCode = 1;
    return;
  }
  if (!cambios.length) {
    console.log('No hay cambios: la base ya tiene los mismos datos que el archivo.');
    return;
  }

  for (const c of cambios) {
    console.log(`\n${c.id}:`);
    for (const k of c.diferencias) console.log(`  ${k}: «${c.antes[k] ?? ''}» → «${c.nuevo[k] ?? ''}»`);
  }
  if (probar) {
    console.log(`\n${cambios.length} punto(s) cambiarían. Para guardarlos, ejecuta el comando sin --probar.`);
    return;
  }

  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');
    for (const { id, nuevo } of cambios) {
      await cliente.query(
        'UPDATE puntos_resguardo SET nombre = $2, ubicacion = $3, horario = $4, responsable = $5, confirmado = $6 WHERE id = $1',
        [id, nuevo.nombre, nuevo.ubicacion, nuevo.horario, nuevo.responsable, nuevo.confirmado]
      );
    }
    await cliente.query('COMMIT');
  } catch (e) {
    await cliente.query('ROLLBACK');
    throw e;
  } finally {
    cliente.release();
  }
  const { rows } = await pool.query('SELECT count(*) FILTER (WHERE confirmado)::int AS si, count(*)::int AS total FROM puntos_resguardo');
  console.log(`\nGuardado. Puntos confirmados por su facultad: ${rows[0].si} de ${rows[0].total}.`);
}

principal()
  .catch((e) => { console.error('Error:', e.message); process.exitCode = 1; })
  .finally(() => pool.end());
