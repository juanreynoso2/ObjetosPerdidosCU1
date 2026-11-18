# Manual de tareas · Objetos Perdidos CU1

Este manual es la lista de trabajo del proyecto. Cada tarea tiene un **criterio de terminado**: la tarea solo se marca `[x]` cuando ese criterio se cumple y está en la rama `main`.

El programa está **listo** cuando todas las casillas de la sección final, [«El programa está listo cuando…»](#el-programa-está-listo-cuando), están marcadas.

---

## Cómo trabajamos

- **Una rama por tarea.** Nombre: `fase-N/descripcion-corta` (por ejemplo, `fase-1/esquema-sql`).
- **Pull request para entrar a `main`.** Otra persona del equipo lo revisa antes de unirlo.
- **Nada de contraseñas en el repositorio.** Las claves van en `.env`, que está en `.gitignore`; en el repo solo se sube `.env.example`.
- **Al terminar una tarea**, márquenla aquí en el mismo pull request.
- **Responsable:** pongan su nombre entre corchetes al tomar una tarea, por ejemplo `— [Gabriel]`.

---

## Fase 0 · Preparación

- [ ] **0.1 Repositorio creado** con README, este manual y la interfaz en `frontend/`.
  *Terminado cuando:* los cuatro integrantes pueden clonar el repo y abrir `frontend/index.html`.
- [ ] **0.2 Entorno de cada integrante.** Docker Desktop, Node.js 20 LTS y Git instalados.
  *Terminado cuando:* `docker --version`, `node --version` y `git --version` responden en las cuatro computadoras.
- [ ] **0.3 Reglas de `main`.** Proteger la rama `main` en GitHub para exigir pull request con una revisión.
  *Terminado cuando:* no se puede hacer `git push` directo a `main`.

## Fase 1 · Base de datos (PostgreSQL en Docker)

- [ ] **1.1 `docker-compose.yml`** con el servicio `db` (PostgreSQL 16) y un volumen para que los datos no se borren.
  *Terminado cuando:* `docker compose up db` levanta la base y se puede conectar con `psql`.
- [ ] **1.2 Esquema SQL** en `db/init/01_esquema.sql` con las tablas:
  - `puntos_resguardo` (nombre, ubicación, horario, responsable, coordenadas en el mapa, si ya lo confirmó la facultad)
  - `zonas` (zonas del mapa y a qué punto de resguardo mandan sus objetos)
  - `categorias` (tipos de objeto: botella, cargador, casco, otro…)
  - `objetos` (folio, tipo, tipo_otro, descripción privada, fecha y hora del hallazgo, zona, lugar, coordenadas, punto de resguardo, estado, quién reportó, fechas de registro y recepción)
  - `entregas` (objeto, nombre, matrícula, verificó descripción, verificó identificación, observaciones, fecha, administrador)
  - `administradores` (usuario, contraseña cifrada, punto de resguardo)
  - Vista `objetos_publicos`: lo único que podrá consultar el buscador; no incluye datos privados.

  *Terminado cuando:* al levantar la base vacía, todo se crea solo.
- [ ] **1.3 Reglas en la base.** `estado` solo acepta `pendiente`, `resguardo`, `entregado` o `descartado`; la matrícula tiene 9 dígitos; el folio es único; «Otro» exige nombre; solo se entrega un objeto en resguardo y solo lo puede entregar un administrador de ese mismo punto.
  *Terminado cuando:* insertar un estado inválido o una matrícula de 8 dígitos da error.
- [ ] **1.4 Datos iniciales:** catálogos en `db/init/02_catalogos.sql` (16 puntos de resguardo, 27 zonas, 19 tipos de objeto) y datos de demostración en `db/init/03_datos_demo.sql` (30 objetos y una cuenta de prueba por punto).
  *Terminado cuando:* `SELECT count(*) FROM puntos_resguardo` devuelve 16.
- [ ] **1.5 Verificación automática** con `db/pruebas/fase1.sql`.
  *Terminado cuando:* en la computadora de cada integrante el resumen dice «TODO BIEN: Fase 1 verificada».

## Fase 2 · API pública (Node.js + Express)

- [ ] **2.1 Proyecto `api/`** con Express, conexión a PostgreSQL (`pg`) y su `Dockerfile`; agregado a `docker-compose.yml`.
  *Terminado cuando:* `docker compose up` levanta base y API, y `GET /api/salud` responde `{ "ok": true }`.
- [ ] **2.2 `GET /api/resguardos`** devuelve los puntos de resguardo con cuántos objetos tiene cada uno.
  *Terminado cuando:* la respuesta coincide con los datos iniciales.
- [ ] **2.3 `GET /api/objetos?q=&desde=`** busca objetos.
  - Solo devuelve objetos `pendiente` o `resguardo`, y los `entregado` con menos de 7 días.
  - **Nunca** incluye la descripción privada ni los datos de la entrega.

  *Terminado cuando:* una prueba automática confirma que la respuesta no trae `descripcion`, `nombre` ni `matricula`.
- [ ] **2.4 `POST /api/objetos`** registra un objeto encontrado y devuelve su folio.
  *Terminado cuando:* un reporte válido crea el objeto en estado `pendiente`, y uno sin tipo o sin ubicación responde 400 con un mensaje claro.
- [ ] **2.5 Validación de datos** en todas las rutas (por ejemplo con `zod`).
  *Terminado cuando:* mandar texto donde va un número o un campo vacío obligatorio da 400, nunca 500.

## Fase 3 · Conectar la página

- [ ] **3.1 Servir `frontend/`** desde la API (o con nginx) en `http://localhost:8080`.
  *Terminado cuando:* la página abre desde Docker, no como archivo suelto.
- [ ] **3.2 Buscador conectado.** Reemplazar los datos guardados en el navegador por llamadas a `GET /api/objetos`.
  *Terminado cuando:* un objeto reportado en una computadora aparece en el buscador de otra.
- [ ] **3.3 Reporte conectado** a `POST /api/objetos`.
  *Terminado cuando:* el folio que muestra la confirmación es el que guardó la base.
- [ ] **3.4 Puntos de resguardo** cargados desde `GET /api/resguardos`.
  *Terminado cuando:* cambiar un horario en la base se refleja en la página sin tocar el código.
- [ ] **3.5 Errores visibles.** Si la API no responde, la página lo dice y no se queda en blanco.
  *Terminado cuando:* al apagar la API, el buscador muestra un aviso y el formulario no pierde lo escrito.

## Fase 4 · Administración y seguridad

- [ ] **4.1 Inicio de sesión real.** `POST /api/admin/login` con contraseñas cifradas (`bcrypt`) y sesión con token (JWT en cookie `httpOnly`).
  *Terminado cuando:* se quita la contraseña de demostración de la página y cada punto de resguardo tiene su propia cuenta.
- [ ] **4.2 Inventario:** `GET /api/admin/objetos`, solo con sesión iniciada; incluye la descripción privada.
  *Terminado cuando:* sin sesión responde 401.
- [ ] **4.3 Acciones:** `POST /api/admin/objetos/:folio/recibir`, `/entregar` y `/descartar`.
  *Terminado cuando:* un administrador solo puede actuar sobre objetos de **su** punto de resguardo (si lo intenta con otro, responde 403).
- [ ] **4.4 Bitácora:** `GET /api/admin/entregas` con nombre, matrícula, verificaciones y quién atendió.
  *Terminado cuando:* cada entrega hecha desde la página aparece con fecha y hora del servidor.
- [ ] **4.5 Límite de reportes:** como máximo 10 reportes por minuto desde la misma conexión (`express-rate-limit`).
  *Terminado cuando:* el reporte número 11 en un minuto responde 429.
- [ ] **4.6 Cabeceras de seguridad** (`helmet`) y CORS limitado al dominio de la página.
  *Terminado cuando:* una página de otro dominio no puede llamar a la API.

## Fase 5 · Pruebas

- [ ] **5.1 Pruebas de la API** con `vitest` o `jest` + `supertest`: búsqueda, reporte, privacidad de datos, login y permisos.
  *Terminado cuando:* `npm test` pasa en verde.
- [ ] **5.2 Prueba completa a mano**, de principio a fin: reportar → confirmar recepción → buscar → entregar → ver «Encontrado» en el buscador → desaparece a los 7 días.
  *Terminado cuando:* el recorrido funciona en celular Android, iPhone y computadora.
- [ ] **5.3 Prueba con usuarios:** 5 estudiantes de distintas facultades usan la página sin ayuda.
  *Terminado cuando:* al menos 4 de 5 logran reportar y buscar un objeto solos; anotar lo que les confundió y corregirlo.

## Fase 6 · Datos reales

- [ ] **6.1 Puntos de resguardo reales:** confirmar con cada facultad dónde guardan los objetos perdidos, el horario y quién atiende.
  *Terminado cuando:* los 16 puntos tienen datos confirmados por la facultad (no de ejemplo).
- [ ] **6.2 Nombres del mapa:** confirmar qué son CC, EMA, la zona sur (DCyTIC, US, DASU) y si el Instituto de Física tiene su propio punto.
  *Terminado cuando:* todas las zonas del mapa tienen nombre confirmado.
- [ ] **6.3 Cuentas de administración** creadas para cada punto, con contraseñas entregadas en persona.
  *Terminado cuando:* cada responsable entró al menos una vez.
- [ ] **6.4 Borrar los datos de ejemplo** antes de abrir al público.
  *Terminado cuando:* la base de producción solo tiene datos reales.

## Fase 7 · Publicación

- [ ] **7.1 Servidor:** conseguir uno (de la BUAP o un VPS) con Docker instalado.
  *Terminado cuando:* `docker compose up -d` corre en el servidor.
- [ ] **7.2 Dominio y HTTPS:** dirección propia con certificado (por ejemplo con Caddy o nginx + Let’s Encrypt).
  *Terminado cuando:* la página abre con candado en el navegador.
- [ ] **7.3 Respaldos diarios** de la base (`pg_dump`) guardados fuera del servidor.
  *Terminado cuando:* se restauró un respaldo en una base de prueba y los datos estaban completos.
- [ ] **7.4 Aviso de privacidad:** texto que explique qué datos se piden (nombre y matrícula al recoger), para qué y quién los ve.
  *Terminado cuando:* está visible en la página y lo aprobó la persona responsable en la universidad.

## Fase 8 · Lanzamiento

- [ ] **8.1 Capacitación** de 15 minutos al personal de cada punto de resguardo.
  *Terminado cuando:* cada responsable registró y entregó un objeto de prueba.
- [ ] **8.2 Difusión:** carteles con código QR en cada punto de resguardo y en espacios comunes (explanadas, comedor, biblioteca).
  *Terminado cuando:* hay al menos un cartel por facultad.
- [ ] **8.3 Seguimiento del primer mes:** objetos reportados, objetos entregados y comentarios de usuarios.
  *Terminado cuando:* hay un resumen con esos números y una lista de mejoras.

---

## El programa está listo cuando…

- [ ] Cualquier persona puede **reportar** un objeto encontrado desde el celular y recibe un folio.
- [ ] Cualquier persona puede **buscar** por tipo de objeto, marcar un punto o una ruta en el mapa, y ve cuántos hay, cuándo y dónde se encontraron, y en qué punto de resguardo están.
- [ ] El buscador **nunca** muestra la descripción privada ni los datos de quien recogió un objeto.
- [ ] Cada punto de resguardo tiene su cuenta y puede **confirmar recepción**, **entregar** (con nombre, matrícula y verificación) y **descartar** solo sus objetos.
- [ ] Los objetos entregados aparecen como **«Encontrado · entregado»** durante 7 días y luego desaparecen del buscador, pero siguen en la bitácora.
- [ ] La página funciona en **celular y computadora**, con datos compartidos entre todos los usuarios.
- [ ] Los **16 puntos de resguardo** tienen ubicación, horario y responsable confirmados.
- [ ] La página está **publicada con HTTPS**, tiene **respaldos diarios** y **aviso de privacidad**.
- [ ] `npm test` pasa y la **prueba completa a mano** (5.2) funcionó en Android, iPhone y computadora.
