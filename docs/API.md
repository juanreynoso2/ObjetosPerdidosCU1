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

## Rutas de administración

Pendientes (Fase 4).
