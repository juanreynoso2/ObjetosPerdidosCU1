// Pruebas de administración (Fase 4). Usan las cuentas de demostración (admin.fcc, admin.ing…).
import { describe, test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { crearApp } from '../src/app.js';
import { pool } from '../src/db.js';

const app = crearApp({ limiteReportes: 1000, limiteLogin: 1000 });
const folios = [];
let galletaFcc; // cookie de sesión de admin.fcc

after(async () => {
  if (folios.length) {
    await pool.query('DELETE FROM entregas WHERE objeto_id IN (SELECT id FROM objetos WHERE folio = ANY($1))', [folios]);
    await pool.query('DELETE FROM objetos WHERE folio = ANY($1)', [folios]);
  }
  await pool.end();
});

function hoy() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Reporta un objeto por la ruta pública y devuelve su folio. */
async function reportar(zona = 'fcc', x = 240, y = 226) {
  const r = await request(app).post('/api/objetos').send({
    tipo: 'cargador', descripcion: 'Cargador de prueba de administración', fecha: hoy(), hora: '00:01',
    zona_id: zona, lugar: 'Prueba', x, y
  }).expect(201);
  folios.push(r.body.folio);
  return r.body.folio;
}

async function iniciarSesion(usuario) {
  const r = await request(app).post('/api/admin/login').send({ usuario, contrasena: 'buap2026' }).expect(200);
  return r.headers['set-cookie'][0].split(';')[0];
}

before(async () => {
  galletaFcc = await iniciarSesion('admin.fcc');
});

describe('4.1 Inicio de sesión', () => {
  test('contraseña incorrecta → 401', async () => {
    const r = await request(app).post('/api/admin/login').send({ usuario: 'admin.fcc', contrasena: 'nop' }).expect(401);
    assert.equal(r.body.error, 'Usuario o contraseña incorrectos');
    assert.ok(!r.headers['set-cookie']);
  });

  test('usuario que no existe → mismo mensaje 401', async () => {
    const r = await request(app).post('/api/admin/login').send({ usuario: 'nadie', contrasena: 'buap2026' }).expect(401);
    assert.equal(r.body.error, 'Usuario o contraseña incorrectos');
  });

  test('sin datos → 400', async () => {
    await request(app).post('/api/admin/login').send({}).expect(400);
  });

  test('inicio correcto: cookie httpOnly, SameSite=Strict y datos del punto', async () => {
    const r = await request(app).post('/api/admin/login').send({ usuario: 'ADMIN.FCC', contrasena: 'buap2026' }).expect(200);
    const cookie = r.headers['set-cookie'][0];
    assert.match(cookie, /^opcu1_sesion=/);
    assert.match(cookie, /HttpOnly/);
    assert.match(cookie, /SameSite=Strict/);
    assert.match(cookie, /Path=\/api/);
    assert.equal(r.body.resguardo.id, 'fcc');
    assert.ok(!('password_hash' in r.body));
  });

  test('GET /api/admin/sesion con y sin sesión', async () => {
    await request(app).get('/api/admin/sesion').expect(401);
    await request(app).get('/api/admin/sesion').set('Cookie', 'opcu1_sesion=falsa').expect(401);
    const r = await request(app).get('/api/admin/sesion').set('Cookie', galletaFcc).expect(200);
    assert.equal(r.body.usuario, 'admin.fcc');
  });

  test('cerrar sesión borra la cookie', async () => {
    const galleta = await iniciarSesion('admin.fcc');
    const r = await request(app).post('/api/admin/logout').set('Cookie', galleta).expect(200);
    assert.match(r.headers['set-cookie'][0], /opcu1_sesion=;/);
  });
});

describe('4.2 Inventario', () => {
  test('sin sesión → 401', async () => {
    await request(app).get('/api/admin/objetos').expect(401);
  });

  test('con sesión incluye la descripción privada de su punto', async () => {
    const folio = await reportar();
    const r = await request(app).get('/api/admin/objetos').set('Cookie', galletaFcc).expect(200);
    const o = r.body.find((x) => x.folio === folio);
    assert.ok(o, 'el objeto nuevo debe salir en el inventario');
    assert.equal(o.descripcion, 'Cargador de prueba de administración');
    assert.ok(r.body.every((x) => x.resguardo_id === 'fcc'));
  });

  test('«todo CU1» muestra otros puntos sin sus datos privados', async () => {
    await reportar('ing', 460, 410);
    const r = await request(app).get('/api/admin/objetos?estado=todos&todo=1').set('Cookie', galletaFcc).expect(200);
    const ajenos = r.body.filter((x) => x.resguardo_id !== 'fcc');
    assert.ok(ajenos.length > 0);
    for (const o of ajenos) {
      assert.equal(o.propio, false);
      assert.equal(o.descripcion, null);
      assert.equal(o.reportado_por, null);
      if (o.entrega) assert.deepEqual(Object.keys(o.entrega), ['entregado_en']);
    }
  });

  test('estado inválido → 400', async () => {
    await request(app).get('/api/admin/objetos?estado=perdido').set('Cookie', galletaFcc).expect(400);
  });
});

describe('4.3 Acciones', () => {
  test('confirmar recepción: pendiente → resguardo; repetir → 409', async () => {
    const folio = await reportar();
    const r = await request(app).post(`/api/admin/objetos/${folio}/recibir`).set('Cookie', galletaFcc).expect(200);
    assert.equal(r.body.estado, 'resguardo');
    await request(app).post(`/api/admin/objetos/${folio}/recibir`).set('Cookie', galletaFcc).expect(409);
  });

  test('un administrador no puede actuar sobre otro punto → 403', async () => {
    const folio = await reportar('ing', 460, 410);
    await request(app).post(`/api/admin/objetos/${folio}/recibir`).set('Cookie', galletaFcc).expect(403);
    await request(app).post(`/api/admin/objetos/${folio}/descartar`).set('Cookie', galletaFcc).expect(403);
  });

  test('sin sesión → 401; folio inexistente → 404', async () => {
    await request(app).post('/api/admin/objetos/CU1-0101/recibir').expect(401);
    await request(app).post('/api/admin/objetos/CU1-9999/recibir').set('Cookie', galletaFcc).expect(404);
  });

  test('descartar: deja de verse en el buscador', async () => {
    const folio = await reportar();
    await request(app).get(`/api/objetos/${folio}`).expect(200);
    const r = await request(app).post(`/api/admin/objetos/${folio}/descartar`).set('Cookie', galletaFcc).expect(200);
    assert.equal(r.body.estado, 'descartado');
    await request(app).get(`/api/objetos/${folio}`).expect(404);
  });

  test('entregar: valida datos, cambia a «entregado» y no expone al público quién lo recogió', async () => {
    const folio = await reportar();
    const url = `/api/admin/objetos/${folio}/entregar`;
    const datos = { nombre: 'Persona De Prueba', matricula: '202399999', verifico_descripcion: true, verifico_identificacion: true };

    // Todavía está por llegar: no se puede entregar
    await request(app).post(url).set('Cookie', galletaFcc).send(datos).expect(409);
    await request(app).post(`/api/admin/objetos/${folio}/recibir`).set('Cookie', galletaFcc).expect(200);

    await request(app).post(url).set('Cookie', galletaFcc).send({ ...datos, matricula: '2023999' }).expect(400);
    await request(app).post(url).set('Cookie', galletaFcc).send({ ...datos, nombre: 'Persona' }).expect(400);
    await request(app).post(url).set('Cookie', galletaFcc).send({ ...datos, verifico_identificacion: false }).expect(400);

    const r = await request(app).post(url).set('Cookie', galletaFcc).send(datos).expect(200);
    assert.equal(r.body.estado, 'entregado');
    assert.ok(r.body.visible_hasta);

    const publico = await request(app).get(`/api/objetos/${folio}`).expect(200);
    assert.equal(publico.body.estado, 'entregado');
    const texto = JSON.stringify(publico.body);
    assert.ok(!texto.includes('Persona De Prueba') && !texto.includes('202399999'));

    // 4.4 La bitácora sí lo registra
    const bitacora = await request(app).get('/api/admin/entregas').set('Cookie', galletaFcc).expect(200);
    const fila = bitacora.body.find((e) => e.folio === folio);
    assert.equal(fila.nombre, 'Persona De Prueba');
    assert.equal(fila.matricula, '202399999');
    assert.equal(fila.atendio, 'admin.fcc');

    await request(app).post(url).set('Cookie', galletaFcc).send(datos).expect(409);
  });

  test('la administración registra un objeto: entra directo a resguardo en su punto', async () => {
    const r = await request(app).post('/api/admin/objetos').set('Cookie', galletaFcc).send({
      tipo: 'lentes', fecha: hoy(), hora: '00:02', zona_id: 'ing', lugar: 'Lo trajo un alumno', x: 460, y: 410
    }).expect(201);
    folios.push(r.body.folio);
    assert.equal(r.body.estado, 'resguardo');
    assert.equal(r.body.resguardo.id, 'fcc');
  });
});

describe('4.4 Bitácora', () => {
  test('sin sesión → 401; solo trae entregas de su punto', async () => {
    await request(app).get('/api/admin/entregas').expect(401);
    const galletaIng = await iniciarSesion('admin.ing');
    const r = await request(app).get('/api/admin/entregas').set('Cookie', galletaIng).expect(200);
    const { rows } = await pool.query(
      "SELECT count(*)::int AS n FROM entregas e JOIN objetos o ON o.id = e.objeto_id WHERE o.resguardo_id = 'ing'"
    );
    assert.equal(r.body.length, rows[0].n);
  });
});
