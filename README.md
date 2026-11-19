# Objetos Perdidos CU1 · BUAP

Página web para recuperar objetos perdidos en Ciudad Universitaria (CU1) de la Benemérita Universidad Autónoma de Puebla.

- **Quien encuentra algo** lo registra, marca en el mapa dónde lo encontró y lo lleva al punto de resguardo de la facultad.
- **Quien perdió algo** busca por tipo de objeto, marca en el mapa dónde lo vio por última vez (o la ruta que hizo) y ve cuántos se han encontrado, cuándo, dónde y en qué punto de resguardo están. No se muestran fotos ni descripciones, para evitar robos.
- **La administración de cada facultad** confirma que recibió el objeto y registra la entrega con nombre y matrícula de quien lo recoge. Esos datos solo los ve la administración.

## Estado actual

| Parte | Estado |
|---|---|
| Interfaz (`frontend/index.html`) | Conectada a la API, incluida la administración con inicio de sesión real |
| Base de datos (PostgreSQL) | Lista para probar: esquema, catálogos, datos de demostración y pruebas |
| API (Node.js + Express) | Rutas públicas y de administración, con límites y cabeceras de seguridad ([docs/API.md](docs/API.md)) |
| Pruebas | 57 pruebas automáticas en GitHub Actions en cada push y pull request |
| Publicación | Lista para desplegar: `docker-compose.prod.yml` con HTTPS (Caddy), respaldos diarios y aviso de privacidad (borrador) |

El plan completo y el avance están en **[docs/MANUAL_DE_TAREAS.md](docs/MANUAL_DE_TAREAS.md)**.

## Documentación

| Documento | Para qué |
|---|---|
| [Manual de tareas](docs/MANUAL_DE_TAREAS.md) | Qué falta y cuándo está listo el proyecto |
| [API](docs/API.md) | Rutas de la API |
| [Pruebas](docs/PRUEBAS.md) | Pruebas automáticas, prueba a mano en celulares y prueba con usuarios |
| [Datos reales](docs/DATOS_REALES.md) | Cargar los puntos de resguardo confirmados y crear las cuentas |
| [Despliegue](docs/DESPLIEGUE.md) | Publicar en un servidor con HTTPS, respaldos y aviso de privacidad |
| [Guía para el personal](docs/GUIA_ADMINISTRACION.md) | Cómo recibir y entregar objetos (para imprimir) |
| [Lanzamiento](docs/LANZAMIENTO.md) | Capacitación, carteles con QR y seguimiento del primer mes |

## Ver la página

- **Con la base de datos (lo normal):** levanta el proyecto (abajo) y abre **http://localhost:8080**. Lo que reporte una persona lo ven todas.
- **Modo demostración, sin Docker:** abre `frontend/index.html` directo en el navegador. Usa datos de ejemplo guardados solo en ese navegador e incluye la demostración de «Administración» (usuario `admin`, contraseña `buap2026`). El pie de página dice en qué modo estás.

## Levantar el proyecto

Necesitas Docker Desktop abierto.

```bash
cp .env.example .env          # en Windows: copy .env.example .env
# edita .env y cambia POSTGRES_PASSWORD
docker compose up -d --build
docker compose ps             # db y api deben decir "healthy"
```

Abre **http://localhost:8080**: es la página conectada a la base (el pie de página dice «Conectado a la base de datos»). La API responde en http://localhost:8080/api/salud.

Usa `--build` la primera vez y cada vez que cambie `api/package.json`. Para lo demás basta `docker compose up -d`; la API se reinicia sola al guardar cambios en `api/src` (si no lo hace, `docker compose restart api`). Los cambios en `frontend/` se ven con solo recargar el navegador.

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

**Administración:** entra en http://localhost:8080/#admin. Las cuentas de demostración son `admin.fcc`, `admin.ing`, `admin.vig`… (una por punto de resguardo), con contraseña `buap2026`. Se crean desde `db/init/03_datos_demo.sql`, que debe borrarse antes de publicar. Para crear cuentas reales:

```bash
docker compose exec api node scripts/crear-admin.js maria.lopez "María López" fcc
```

**Clave de sesiones:** pon una clave larga en `JWT_SECRET` dentro de `.env`. Si la dejas vacía, la API usa una temporal y las sesiones se cierran cada vez que reinicia. Para generar una:

```bash
docker compose exec api node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Tecnologías

- **Interfaz:** HTML, CSS y JavaScript sin dependencias. El mapa de CU1 está dibujado en SVG a partir del plano oficial del Departamento de Planta Física de la BUAP.
- **API:** Node.js 22 + Express 5, validación con zod, pruebas con `node:test` y supertest.
- **Base de datos:** PostgreSQL 16.
- **Contenedores:** Docker y Docker Compose.

## Estructura

```
objetos-perdidos-cu1/
├── frontend/          Interfaz web y cartel imprimible (cartel.html)
├── docs/              Manual de tareas y referencia de la API
├── api/
│   ├── src/           Código de la API (Express)
│   └── test/          Pruebas (node:test + supertest)
├── db/
│   ├── init/          Esquema, catálogos y datos de demostración
│   ├── datos_reales/  Puntos de resguardo confirmados (CSV)
│   ├── reportes/      Resumen mensual
│   ├── mantenimiento/ Borrado de datos personales vencidos
│   └── pruebas/       Verificación de la base
├── deploy/            Caddy (HTTPS), respaldos y restauración
├── docker-compose.prod.yml  Producción
├── .env.example       Variables de entorno (copiar a .env)
└── docker-compose.yml
```

## Equipo

- Juan David Reynoso Carranza
- Guillermo Martínez Hernández
- Josué Benedicto Ramírez Centeno
- Gabriel Flores Calderón
