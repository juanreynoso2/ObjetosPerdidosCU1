# API · Objetos Perdidos CU1

Dirección en desarrollo: `http://localhost:8080/api` (el puerto se cambia con `API_PORT` en `.env`).

Todas las respuestas son JSON. Los errores tienen la forma:

```json
{ "error": "Revisa los datos del reporte", "detalles": [{ "campo": "lugar", "mensaje": "Escribe en qué parte lo encontraste" }] }
```

| Código | Significa |
|---|---|
| 200 / 201 | Todo bien / se creó |
| 400 | Datos inválidos (ver `detalles`) |
| 404 | No existe |
| 409 | Ya existe |
| 500 | Falla del servidor (no debería pasar con datos inválidos) |

---

## Rutas públicas (no necesitan iniciar sesión)

### `GET /api/salud`
¿La API y la base de datos responden?

```json
{ "ok": true, "base": "conectada" }
```

### `GET /api/resguardos`
Los puntos de resguardo y cuántos objetos guarda cada uno (por llegar + en resguardo).

```json
[{ "id": "fcc", "sigla": "FCC", "nombre": "Secretaría Administrativa FCC", "ubicacion": "Edificio CCO1, planta baja",
   "horario": "Lun a vie · 8:00–20:00", "mapa": { "x": 204, "y": 224 }, "confirmado": false, "objetos": 4 }]
```

### `GET /api/catalogos`
Tipos de objeto (para los botones de «¿Qué encontraste?») y zonas del mapa.

```json
{ "categorias": [{ "id": "botella", "nombre": "Botella o termo" }],
  "zonas": [{ "id": "fcc", "sigla": "FCC", "nombre": "Ciencias de la Computación", "tipo": "facultad", "resguardo_id": "fcc" }] }
```

### `GET /api/objetos`
Busca objetos encontrados. **Nunca** devuelve la descripción privada, quién reportó ni datos de la entrega. Solo incluye objetos por llegar, en resguardo, y entregados hace menos de 7 días.

| Parámetro | Ejemplo | Para qué |
|---|---|---|
| `q` | `termo` | Texto libre. Entiende sinónimos, plurales y falta de acentos («termo» → botellas, «audifono» → audífonos). También busca en el nombre de los objetos «Otro». |
| `tipo` | `botella` | Solo un tipo exacto. |
| `desde` | `2026-11-10` | Solo objetos encontrados ese día o después. |
| `limite` | `300` | Máximo de resultados (1 a 500; 300 por defecto). |

```json
{
  "total": 6,
  "resumen": { "por_llegar": 1, "en_resguardo": 4, "entregados": 1 },
  "objetos": [{
    "folio": "CU1-0101", "tipo": "botella", "nombre": "Botella o termo",
    "encontrado_en": "2026-11-17T19:40:00.000Z", "fecha": "2026-11-17", "hora": "13:40",
    "zona": { "id": "fcc", "sigla": "FCC", "nombre": "Ciencias de la Computación" },
    "lugar": "Salón 204, edificio CCO3", "mapa": { "x": 240, "y": 226 },
    "resguardo_id": "fcc", "estado": "resguardo", "entregado_en": null, "visible_hasta": null
  }]
}
```

`estado` puede ser `pendiente` (por llegar al resguardo), `resguardo` o `entregado`. Para un objeto entregado, `visible_hasta` dice hasta cuándo se mostrará.

La coincidencia por marcador o ruta en el mapa la calcula la página con `mapa.x` y `mapa.y`.

### `GET /api/objetos/:folio`
Un objeto por su folio (por ejemplo `CU1-0101`). Responde 404 si no existe o ya no es visible.

### `POST /api/objetos`
Reporta un objeto encontrado. Queda como `pendiente` hasta que la administración confirme que lo recibió.

```json
{
  "tipo": "otro",
  "tipo_otro": "Balón de futbol",
  "descripcion": "Balón blanco con firma",
  "fecha": "2026-11-18",
  "hora": "13:30",
  "zona_id": "canchas",
  "lugar": "Cancha de futbol 3",
  "x": 830,
  "y": 600,
  "resguardo_id": "vig",
  "reportado_por": "202312345"
}
```

| Campo | Obligatorio | Reglas |
|---|---|---|
| `tipo` | Sí | Un `id` de `/api/catalogos` |
| `tipo_otro` | Solo si `tipo` es `otro` | Hasta 40 caracteres. Se ignora en otros tipos. |
| `descripcion` | No | Hasta 240 caracteres. **Privada:** solo la ve la administración. |
| `fecha`, `hora` | Sí | `AAAA-MM-DD` y `HH:MM`, hora de Puebla. No puede ser futura ni de hace más de 90 días. |
| `zona_id` | Sí | Zona del mapa donde se encontró |
| `lugar` | Sí | 1 a 80 caracteres |
| `x`, `y` | Sí | Números (coordenadas del mapa de la página) |
| `resguardo_id` | No | Si no se manda, se usa el de la zona |
| `reportado_por` | No | Hasta 60 caracteres. **Privado.** |

Cualquier otro campo (por ejemplo `estado`) se rechaza con 400.

Respuesta `201`:

```json
{ "folio": "CU1-0131", "estado": "pendiente", "encontrado_en": "2026-11-18T19:30:00.000Z",
  "resguardo": { "id": "vig", "nombre": "Módulo de Vigilancia CU1", "ubicacion": "Av. Central…", "horario": "Todos los días · 7:00–22:00" } }
```

---

## Seguridad

- **Peticiones de otros sitios:** las peticiones que cambian datos (POST) solo se aceptan desde la misma página. Si traen la cabecera `Origin` de otro dominio responden `403`. Para permitir otro dominio, agrégalo a `ORIGENES_PERMITIDOS` en `.env`, separado por comas. La API no envía cabeceras CORS, así que otro sitio tampoco puede leer sus respuestas.
- **Límite de reportes:** `POST /api/objetos` admite 10 por minuto desde la misma conexión (`LIMITE_REPORTES_POR_MINUTO`). Después responde `429`.
- **Límite de inicio de sesión:** 10 intentos fallidos cada 15 minutos (`LIMITE_INTENTOS_LOGIN`). Después responde `429`.
- **Cabeceras:** `helmet`, con política de contenido (CSP) que solo permite lo que usa la página.

## Rutas de administración

La sesión viaja en la cookie `opcu1_sesion`:

- Es `httpOnly`, así que el JavaScript de la página no puede leerla.
- Es `SameSite=Strict`, así que no viaja en peticiones que vienen de otros sitios.
- Dura 8 horas.
- En producción con HTTPS hay que poner `COOKIE_SECURE=true`.

Sin sesión, todas las rutas de administración responden `401`, excepto `login`.

### `POST /api/admin/login`
```json
{ "usuario": "admin.fcc", "contrasena": "…" }
```
`200` con los datos de la cuenta y su punto, y deja la cookie. Si el usuario o la contraseña son incorrectos, responde `401` con el mismo mensaje en los dos casos.

```json
{ "usuario": "admin.fcc", "nombre": "Administración FCC",
  "resguardo": { "id": "fcc", "sigla": "FCC", "nombre": "Secretaría Administrativa FCC", "ubicacion": "…", "horario": "…" } }
```

### `POST /api/admin/logout`
Borra la cookie.

### `GET /api/admin/sesion`
La cuenta con sesión iniciada (mismo formato que `login`) o `401`.

### `GET /api/admin/objetos?estado=activos&todo=1`
Inventario. `estado`: `activos` (por defecto; por llegar y en resguardo), `pendiente`, `resguardo`, `entregado`, `descartado` o `todos`. Con `todo=1` incluye los objetos de todos los puntos.

De los objetos **del propio punto** incluye `descripcion`, `reportado_por` y la `entrega` completa (`nombre`, `matricula`, verificaciones, `observaciones`, `entregado_en`, `atendio`). De los objetos de otros puntos esos campos vienen en `null`; la `entrega` solo trae `entregado_en`. El campo `propio` dice si el objeto es del punto de la sesión.

### `POST /api/admin/objetos`
La administración registra un objeto que ya tiene en su punto. Usa el mismo cuerpo que `POST /api/objetos`. Entra directo a `resguardo` y siempre en el punto de la sesión.

### `POST /api/admin/objetos/:folio/recibir`
De `pendiente` a `resguardo`.

### `POST /api/admin/objetos/:folio/descartar`
De `pendiente` a `descartado`, para cuando el objeto nunca llegó. Deja de verse en el buscador.

### `POST /api/admin/objetos/:folio/entregar`
```json
{ "nombre": "Ana Ruiz Gómez", "matricula": "202312345",
  "verifico_descripcion": true, "verifico_identificacion": true, "observaciones": "Opcional" }
```
De `resguardo` a `entregado`. El nombre debe tener nombre y apellido. La matrícula tiene 9 dígitos. Las dos verificaciones deben ser `true`.

```json
{ "folio": "CU1-0131", "estado": "entregado", "entregado_en": "…", "visible_hasta": "…" }
```

En las tres acciones:
- `404`: el folio no existe.
- `403`: el objeto es de otro punto de resguardo.
- `409`: el objeto no está en el estado que pide la acción, por ejemplo entregar algo que todavía no llega.

### `GET /api/admin/entregas`
Bitácora privada del propio punto. Por cada entrega trae `folio`, `objeto`, `descripcion`, `nombre`, `matricula`, las verificaciones, `observaciones`, `entregado_en` y `atendio` (el usuario que la registró).

## Cuentas de administración

Con el proyecto levantado:

```bash
# Crear una cuenta o cambiar su contraseña (la pide sin mostrarla; mínimo 10 caracteres)
docker compose exec api node scripts/crear-admin.js maria.lopez "María López" fcc

# Desactivar una cuenta
docker compose exec api node scripts/crear-admin.js --desactivar maria.lopez
```

Sin datos, el script muestra cómo usarlo y la lista de puntos de resguardo.
