// Pruebas de la API pública (Fase 2). Necesitan la base de datos con los datos de demostración.
// Ejecutar con: docker compose exec api npm test
import { describe, test, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { crearApp } from '../src/app.js';
import { pool } from '../src/db.js';

const app = crearApp({ limiteReportes: 1000 });
const folios = []; // objetos creados por las pruebas; se borran al final

after(async () => {
  if (folios.length) await pool.query('DELETE FROM objetos WHERE folio = ANY($1)', [folios]);
  await pool.end();
});

function hoy() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const reporteValido = () => ({
  tipo: 'botella',
  descripcion: 'Termo de prueba automática',
  fecha: hoy(),
  hora: '00:01',
  zona_id: 'fcc',
  lugar: 'Salón de prueba',
  x: 240,
  y: 226
});

describe('2.1 Salud', () => {
  test('GET /api/salud responde ok', async () => {
    const r = await request(app).get('/api/salud').expect(200);
    assert.deepEqual(r.body, { ok: true, base: 'conectada' });
  });

  test('una ruta que no existe responde 404 en JSON', async () => {
    const r = await request(app).get('/api/no-existe').expect(404);
    assert.ok(r.body.error);
  });
});

describe('2.2 Puntos de resguardo', () => {
  test('GET /api/resguardos devuelve los 16 puntos con su conteo', async () => {
    const r = await request(app).get('/api/resguardos').expect(200);
    assert.equal(r.body.length, 16);
    for (const p of r.body) {
      assert.ok(p.id && p.nombre && p.ubicacion && p.horario);
      assert.equal(typeof p.objetos, 'number');
      assert.equal(typeof p.mapa.x, 'number');
    }
    const { rows } = await pool.query(
      "SELECT count(*)::int AS n FROM objetos WHERE resguardo_id = 'fcc' AND estado IN ('pendiente','resguardo')"
    );
    assert.equal(r.body.find((p) => p.id === 'fcc').objetos, rows[0].n);
  });

  test('GET /api/catalogos incluye «Casco», «Otro» y las zonas del mapa', async () => {
    const r = await request(app).get('/api/catalogos').expect(200);
    const ids = r.body.categorias.map((c) => c.id);
    assert.ok(ids.includes('casco') && ids.includes('otro'));
    assert.ok(r.body.zonas.some((z) => z.id === 'fcc' && z.resguardo_id === 'fcc'));
  });
});

describe('2.3 Búsqueda pública', () => {
  test('sin filtros devuelve objetos visibles con resumen', async () => {
    const r = await request(app).get('/api/objetos').expect(200);
    assert.ok(r.body.total > 0);
    assert.equal(r.body.total, r.body.objetos.length);
    for (const o of r.body.objetos) {
      assert.ok(['pendiente', 'resguardo', 'entregado'].includes(o.estado));
      assert.match(o.folio, /^CU1-\d{4,}$/);
      assert.match(o.fecha, /^\d{4}-\d{2}-\d{2}$/);
      assert.match(o.hora, /^\d{2}:\d{2}$/);
    }
  });

  test('PRIVACIDAD: nunca incluye descripción privada, quién reportó ni datos de la entrega', async () => {
    const r = await request(app).get('/api/objetos?limite=500').expect(200);
    const texto = JSON.stringify(r.body);

    for (const campo of ['descripcion', 'reportado_por', 'matricula', 'administrador', 'verifico']) {
      assert.ok(!texto.includes(`"${campo}`), `la respuesta contiene el campo ${campo}`);
    }

    const privados = await pool.query(`
      SELECT descripcion_privada AS v FROM objetos WHERE descripcion_privada IS NOT NULL
      UNION ALL SELECT reportado_por FROM objetos WHERE reportado_por IS NOT NULL
      UNION ALL SELECT nombre FROM entregas
      UNION ALL SELECT matricula FROM entregas`);
    for (const { v } of privados.rows) {
      assert.ok(!texto.includes(v), `la respuesta contiene un dato privado: ${v}`);
    }
  });

  test('no muestra entregados de hace más de 7 días ni descartados', async () => {
    const r = await request(app).get('/api/objetos?limite=500').expect(200);
    const visibles = new Set(r.body.objetos.map((o) => o.folio));
    const ocultos = await pool.query(`
      SELECT o.folio FROM objetos o LEFT JOIN entregas e ON e.objeto_id = o.id
      WHERE o.estado = 'descartado'
         OR (o.estado = 'entregado' AND e.entregado_en <= now() - interval '7 days')`);
    for (const { folio } of ocultos.rows) assert.ok(!visibles.has(folio), `${folio} no debería verse`);
  });

  test('«botella», «botellas» y «termo» encuentran lo mismo', async () => {
    const a = await request(app).get('/api/objetos?q=botella').expect(200);
    const b = await request(app).get('/api/objetos?q=botellas').expect(200);
    const c = await request(app).get('/api/objetos?q=Termo').expect(200);
    assert.ok(a.body.total > 0);
    assert.ok(a.body.objetos.every((o) => o.tipo === 'botella'));
    assert.deepEqual(b.body.objetos.map((o) => o.folio), a.body.objetos.map((o) => o.folio));
    assert.deepEqual(c.body.objetos.map((o) => o.folio), a.body.objetos.map((o) => o.folio));
  });

  test('acentos opcionales: «audifonos» encuentra audífonos', async () => {
    const r = await request(app).get('/api/objetos?q=audifonos').expect(200);
    assert.ok(r.body.total > 0 && r.body.objetos.every((o) => o.tipo === 'audifonos'));
  });

  test('filtro «desde» solo devuelve objetos encontrados ese día o después', async () => {
    const r = await request(app).get(`/api/objetos?desde=${hoy()}`).expect(200);
    for (const o of r.body.objetos) assert.ok(o.fecha >= hoy());
  });

  test('filtros inválidos responden 400', async () => {
    await request(app).get('/api/objetos?desde=ayer').expect(400);
    await request(app).get('/api/objetos?limite=mil').expect(400);
  });

  test('consultar un folio: existe → 200, no existe → 404', async () => {
    const lista = await request(app).get('/api/objetos').expect(200);
    const folio = lista.body.objetos[0].folio;
    const r = await request(app).get(`/api/objetos/${folio}`).expect(200);
    assert.equal(r.body.folio, folio);
    assert.ok(!('descripcion' in r.body));
    await request(app).get('/api/objetos/CU1-9999').expect(404);
    await request(app).get('/api/objetos/hola').expect(400);
  });
});

describe('2.4 Reportar un objeto', () => {
  test('un reporte válido crea el objeto como «pendiente» y devuelve su folio', async () => {
    const r = await request(app).post('/api/objetos').send(reporteValido()).expect(201);
    folios.push(r.body.folio);
    assert.match(r.body.folio, /^CU1-\d{4,}$/);
    assert.equal(r.body.estado, 'pendiente');
    assert.equal(r.body.resguardo.id, 'fcc'); // la zona FCC manda al resguardo FCC
    assert.equal(r.headers.location, `/api/objetos/${r.body.folio}`);

    const { rows } = await pool.query('SELECT estado, descripcion_privada FROM objetos WHERE folio = $1', [r.body.folio]);
    assert.equal(rows[0].estado, 'pendiente');
    assert.equal(rows[0].descripcion_privada, 'Termo de prueba automática');

    const visible = await request(app).get(`/api/objetos/${r.body.folio}`).expect(200);
    assert.equal(visible.body.estado, 'pendiente');
  });

  test('«Otro» con nombre se guarda y se encuentra buscando ese nombre', async () => {
    const r = await request(app)
      .post('/api/objetos')
      .send({ ...reporteValido(), tipo: 'otro', tipo_otro: 'Balón de futbol', zona_id: 'canchas', x: 830, y: 600 })
      .expect(201);
    folios.push(r.body.folio);
    assert.equal(r.body.resguardo.id, 'vig'); // las canchas mandan a Vigilancia

    const busqueda = await request(app).get('/api/objetos?q=balon').expect(200);
    assert.ok(busqueda.body.objetos.some((o) => o.folio === r.body.folio && o.nombre === 'Balón de futbol'));
  });

  test('si no es «Otro», se ignora tipo_otro', async () => {
    const r = await request(app).post('/api/objetos').send({ ...reporteValido(), tipo_otro: 'algo' }).expect(201);
    folios.push(r.body.folio);
    const { rows } = await pool.query('SELECT tipo_otro FROM objetos WHERE folio = $1', [r.body.folio]);
    assert.equal(rows[0].tipo_otro, null);
  });
});

describe('2.5 Validación: datos inválidos dan 400, nunca 500', () => {
  const casos = [
    ['sin tipo', (d) => { delete d.tipo; }],
    ['«Otro» sin decir qué es', (d) => { d.tipo = 'otro'; }],
    ['tipo que no existe', (d) => { d.tipo = 'nave'; }],
    ['zona que no existe', (d) => { d.zona_id = 'marte'; }],
    ['resguardo que no existe', (d) => { d.resguardo_id = 'nada'; }],
    ['x como texto', (d) => { d.x = '240'; }],
    ['y fuera del mapa', (d) => { d.y = 5000; }],
    ['lugar vacío', (d) => { d.lugar = '   '; }],
    ['fecha con formato incorrecto', (d) => { d.fecha = '18/11/2026'; }],
    ['fecha que no existe', (d) => { d.fecha = '2026-02-31'; }],
    ['fecha futura', (d) => { d.fecha = '2999-01-01'; }],
    ['hora inválida', (d) => { d.hora = '25:00'; }],
    ['descripción demasiado larga', (d) => { d.descripcion = 'x'.repeat(241); }],
    ['intenta fijar el estado', (d) => { d.estado = 'entregado'; }]
  ];

  for (const [nombre, modificar] of casos) {
    test(nombre, async () => {
      const datos = reporteValido();
      modificar(datos);
      const r = await request(app).post('/api/objetos').send(datos);
      assert.equal(r.status, 400, `esperaba 400 y fue ${r.status}: ${JSON.stringify(r.body)}`);
      assert.ok(r.body.error);
      if (r.body.folio) folios.push(r.body.folio);
    });
  }

  test('JSON mal formado', async () => {
    const r = await request(app).post('/api/objetos').set('Content-Type', 'application/json').send('{"tipo": ');
    assert.equal(r.status, 400);
  });

  test('cuerpo vacío', async () => {
    const r = await request(app).post('/api/objetos');
    assert.equal(r.status, 400);
  });
});
