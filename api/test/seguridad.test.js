// Pruebas de seguridad (Fase 4.5 y 4.6).
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { crearApp } from '../src/app.js';
import { pool } from '../src/db.js';

after(() => pool.end());

test('4.5 a partir del reporte 4 en un minuto responde 429 (límite de prueba: 3)', async () => {
  const app = crearApp({ limiteReportes: 3 });
  // Cuerpos inválidos: cuentan para el límite pero no guardan nada.
  for (let i = 0; i < 3; i++) await request(app).post('/api/objetos').send({}).expect(400);
  const r = await request(app).post('/api/objetos').send({}).expect(429);
  assert.match(r.body.error, /demasiados reportes/i);
});

test('4.5 demasiados intentos fallidos de inicio de sesión → 429', async () => {
  const app = crearApp({ limiteLogin: 2 });
  for (let i = 0; i < 2; i++) {
    await request(app).post('/api/admin/login').send({ usuario: 'admin.fcc', contrasena: 'mala' }).expect(401);
  }
  await request(app).post('/api/admin/login').send({ usuario: 'admin.fcc', contrasena: 'mala' }).expect(429);
});

test('4.6 una página de otro dominio no puede reportar ni iniciar sesión', async () => {
  const app = crearApp();
  await request(app).post('/api/objetos').set('Origin', 'https://otro-sitio.example').send({}).expect(403);
  await request(app).post('/api/admin/login').set('Origin', 'https://otro-sitio.example')
    .send({ usuario: 'admin.fcc', contrasena: 'buap2026' }).expect(403);
});

test('4.6 la API no da permiso CORS a otros dominios', async () => {
  const app = crearApp();
  const r = await request(app).get('/api/objetos').set('Origin', 'https://otro-sitio.example').expect(200);
  assert.equal(r.headers['access-control-allow-origin'], undefined);
});

test('4.6 cabeceras de seguridad en la página', async () => {
  const app = crearApp();
  const r = await request(app).get('/').expect(200);
  assert.match(r.headers['content-security-policy'], /frame-ancestors 'none'/);
  assert.match(r.headers['content-security-policy'], /connect-src 'self'/);
  assert.equal(r.headers['x-content-type-options'], 'nosniff');
  assert.equal(r.headers['x-powered-by'], undefined);
});
