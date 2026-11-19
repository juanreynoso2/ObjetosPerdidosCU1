# Objetos Perdidos CU1 · BUAP

Página web para recuperar objetos perdidos en Ciudad Universitaria (CU1) de la Benemérita Universidad Autónoma de Puebla.

- **Quien encuentra algo** lo registra, marca en el mapa dónde lo encontró y lo lleva al punto de resguardo de la facultad.
- **Quien perdió algo** busca por tipo de objeto, marca en el mapa dónde lo vio por última vez (o la ruta que hizo) y ve cuántos se han encontrado, cuándo, dónde y en qué punto de resguardo están. No se muestran fotos ni descripciones, para evitar robos.
- **La administración de cada facultad** confirma que recibió el objeto y registra la entrega con nombre y matrícula de quien lo recoge. Esos datos solo los ve la administración.

## Estado actual

| Parte | Estado |
|---|---|
| Interfaz (`frontend/index.html`) | Prototipo funcional, con datos de ejemplo guardados en el navegador |
| Base de datos (PostgreSQL) | Lista para probar: esquema, catálogos, datos de demostración y pruebas |
| API (Node.js + Express) | Rutas públicas listas para probar: buscar, reportar, resguardos ([docs/API.md](docs/API.md)) |
| Publicación | Pendiente |

El plan completo y el avance están en **[docs/MANUAL_DE_TAREAS.md](docs/MANUAL_DE_TAREAS.md)**.

## Ver el prototipo

Abre `frontend/index.html` en el navegador. Para entrar a «Administración» en la demostración: usuario `admin`, contraseña `buap2026`.

## Levantar el proyecto

Necesitas Docker Desktop abierto.

```bash
cp .env.example .env          # en Windows: copy .env.example .env
# edita .env y cambia POSTGRES_PASSWORD
docker compose up -d --build
docker compose ps             # db y api deben decir "healthy"
```

Abre **http://localhost:8080/api/salud** en el navegador: debe decir `{"ok":true,"base":"conectada"}`. Prueba también http://localhost:8080/api/objetos?q=termo.

Usa `--build` la primera vez y cada vez que cambie `api/package.json`. Para lo demás basta `docker compose up -d`; la API se reinicia sola al guardar cambios en `api/src` (si no lo hace, `docker compose restart api`).

Verificar la base de datos:

```bash
docker compose exec db psql -U opcu1 -d objetos_perdidos -f /pruebas/fase1.sql
```

Debe terminar con **«TODO BIEN: Fase 1 verificada»**.

Pruebas de la API:

```bash
docker compose exec api npm test
```

Debe terminar con `# fail 0`.

Entrar a la base para explorar:

```bash
docker compose exec db psql -U opcu1 -d objetos_perdidos
```

Algunas consultas útiles: `SELECT * FROM objetos_publicos;`, `\dt` (tablas), `\q` (salir).

**Empezar de cero:** los scripts de `db/init/` solo corren la primera vez. Para volver a crear la base con datos limpios:

```bash
docker compose down -v        # ⚠ borra todos los datos de la base
docker compose up -d
```

**Cuentas de demostración:** `admin.fcc`, `admin.ing`, `admin.vig`… (una por punto de resguardo), contraseña `buap2026`. Se crean desde `db/init/03_datos_demo.sql`, que debe borrarse antes de publicar.

## Tecnologías

- **Interfaz:** HTML, CSS y JavaScript sin dependencias. El mapa de CU1 está dibujado en SVG a partir del plano oficial del Departamento de Planta Física de la BUAP.
- **API:** Node.js 22 + Express 5, validación con zod, pruebas con `node:test` y supertest.
- **Base de datos:** PostgreSQL 16.
- **Contenedores:** Docker y Docker Compose.

## Estructura

```
objetos-perdidos-cu1/
├── frontend/          Interfaz web
├── docs/              Manual de tareas y referencia de la API
├── api/
│   ├── src/           Código de la API (Express)
│   └── test/          Pruebas (node:test + supertest)
├── db/
│   ├── init/          Esquema, catálogos y datos de demostración
│   └── pruebas/       Verificación de la base
├── .env.example       Variables de entorno (copiar a .env)
└── docker-compose.yml
```

## Equipo

- Juan David Reynoso Carranza
- Guillermo Martínez Hernández
- Josué Benedicto Ramírez Centeno
- Gabriel Flores Calderón
