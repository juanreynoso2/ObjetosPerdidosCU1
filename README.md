# Objetos Perdidos CU1 · BUAP

Página web para recuperar objetos perdidos en Ciudad Universitaria (CU1) de la Benemérita Universidad Autónoma de Puebla.

- **Quien encuentra algo** lo registra, marca en el mapa dónde lo encontró y lo lleva al punto de resguardo de la facultad.
- **Quien perdió algo** busca por tipo de objeto, marca en el mapa dónde lo vio por última vez (o la ruta que hizo) y ve cuántos se han encontrado, cuándo, dónde y en qué punto de resguardo están. No se muestran fotos ni descripciones, para evitar robos.
- **La administración de cada facultad** confirma que recibió el objeto y registra la entrega con nombre y matrícula de quien lo recoge. Esos datos solo los ve la administración.

## Estado actual

| Parte | Estado |
|---|---|
| Interfaz (`frontend/index.html`) | Prototipo funcional, con datos de ejemplo guardados en el navegador |
| Base de datos (PostgreSQL) | Pendiente |
| API (Node.js + Express) | Pendiente |
| Publicación | Pendiente |

El plan completo y el avance están en **[docs/MANUAL_DE_TAREAS.md](docs/MANUAL_DE_TAREAS.md)**.

## Ver el prototipo

Abre `frontend/index.html` en el navegador. Para entrar a «Administración» en la demostración: usuario `admin`, contraseña `buap2026`.

## Tecnologías

- **Interfaz:** HTML, CSS y JavaScript sin dependencias. El mapa de CU1 está dibujado en SVG a partir del plano oficial del Departamento de Planta Física de la BUAP.
- **API:** Node.js 20 + Express.
- **Base de datos:** PostgreSQL 16.
- **Contenedores:** Docker y Docker Compose.

## Estructura

```
objetos-perdidos-cu1/
├── frontend/          Interfaz web
├── docs/              Manual de tareas y documentación
├── api/               API en Node.js (fase 2)
├── db/init/           Esquema y datos iniciales de PostgreSQL (fase 1)
└── docker-compose.yml (fase 1)
```

## Equipo

- Juan David Reynoso Carranza
- Guillermo Martínez Hernández
- Josué Benedicto Ramírez Centeno
- Gabriel Flores Calderón
