// 3.1 La API sirve la página en la misma dirección.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { crearApp } from '../src/app.js';
import { pool } from '../src/db.js';

const app = crearApp();
after(() => pool.end());

test('GET / devuelve la página de Objetos Perdidos CU1', async () => {
  const r = await request(app).get('/').expect(200);
  assert.match(r.headers['content-type'], /text\/html/);
  assert.match(r.text, /<title>Objetos Perdidos CU1 BUAP<\/title>/);
});

test('una ruta de la API que no existe sigue respondiendo JSON', async () => {
  const r = await request(app).get('/api/nada').expect(404);
  assert.equal(r.body.error, 'Ruta no encontrada');
});

test('8.2 el cartel imprimible y su librería de QR se sirven', async () => {
  const r = await request(app).get('/cartel.html').expect(200);
  assert.match(r.text, /¿Perdiste o encontraste algo en CU\?/);
  await request(app).get('/vendor/qrcode.js').expect(200);
});

test('7.4 la página incluye el aviso de privacidad', async () => {
  const r = await request(app).get('/').expect(200);
  assert.match(r.text, /id="view-privacidad"/);
  assert.match(r.text, /href="#privacidad"/);
});
