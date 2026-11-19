# Datos reales (Fase 6)

Antes de abrir la página al público hay que cambiar todo lo que hoy es «de ejemplo»:

1. Dónde guarda cada facultad los objetos (6.1).
2. Los nombres del mapa que no están confirmados (6.2).
3. Las cuentas de administración (6.3).
4. Los datos de demostración (6.4).

---

## 6.1 Puntos de resguardo reales

### Qué preguntar en cada facultad

Ve a la Secretaría Administrativa o Dirección de cada facultad con esta hoja (una por punto):

```
Facultad / punto: ______________________   (id en el sistema: ____ )

1. ¿Dónde guardan hoy los objetos perdidos que les entregan?
   Oficina: ____________________________  Edificio: ______  Piso/ventanilla: ______
2. ¿En qué horario se pueden entregar y recoger?  ____________________________
3. ¿Quién es la persona responsable?  Nombre: ___________________  Puesto: ______________
   Correo institucional: ____________________   Extensión: ______
4. ¿Esa persona usará el sistema para confirmar recepciones y entregas?  Sí / No
   Si no, ¿quién? ___________________
5. ¿Aceptan pedir credencial y anotar nombre y matrícula al entregar?  Sí / No
6. ¿Cuánto tiempo guardan los objetos antes de donarlos o desecharlos?  ________

Firma o sello de conformidad: ______________________   Fecha: ___________
```

En las áreas comunes (canchas, estadio, parque, Arena, Multiaulas, zona sur y zona este) los objetos van hoy al **Módulo de Vigilancia**. Pregunten en la Dirección de Seguridad Universitaria cuál es el lugar correcto.

### Cargar lo que respondieron

1. Abre `db/datos_reales/puntos_resguardo.csv` con Excel. Está separado por «;» y trae los datos de ejemplo actuales.
2. Corrige `nombre`, `ubicacion`, `horario` y `responsable`. Pon `sí` en `confirmado` cuando la facultad haya firmado la hoja.
3. Guarda el archivo como **CSV (delimitado por punto y coma)**, con el mismo nombre.
4. Revisa los cambios sin guardar nada:
   ```bash
   docker compose exec api node scripts/cargar-puntos.js --probar
   ```
5. Si se ven bien, guárdalos:
   ```bash
   docker compose exec api node scripts/cargar-puntos.js
   ```
   Al final dice cuántos puntos están confirmados, por ejemplo «Puntos confirmados por su facultad: 16 de 16».

La página toma los nombres y horarios de la base, así que el cambio se ve al recargarla. No hay que tocar el código.

Si una facultad tiene **más de un** punto o **no tiene** ninguno, hay que agregar o quitar filas en la base y ajustar las zonas del mapa. Eso es un cambio de código: abran un issue.

---

## 6.2 Nombres del mapa por confirmar

| Zona en el mapa | Lo que pusimos | Qué confirmar |
|---|---|---|
| `cc` | «Edificio CC, alberca y DCF» | Qué es el edificio CC y el nombre oficial del área deportiva |
| `ema` | «Multiaulas EMA 4 a 6» | Que EMA sea Edificio Multiaulas |
| `sur` | «Zona sur (DCyTIC, US, DASU)» | Nombres de DCyTIC, US, DASU, LIMA e IC12 |
| `este` | «Zona este (DAE, FIL, SUA, STU)» | Nombres de DAE, FIL, SUA, STU y DITCo |
| `ifuap` | «Instituto de Física» (lo resguarda FCFM) | Si el Instituto de Física tiene su propio punto |
| `inst` | «Institutos (IC, IFI)» | Nombre de los institutos junto a Prol. 14 Sur |

Para corregir un nombre:

```bash
docker compose exec db psql -U opcu1 -d objetos_perdidos -c "UPDATE zonas SET nombre = 'Nombre correcto' WHERE id = 'cc'"
```

La página toma de la base el nombre que se muestra en los resultados. Las siglas dibujadas sobre el mapa (CC, EMA…) están en `frontend/index.html`, en la lista `ZONES`.

---

## 6.3 Cuentas de administración

Una cuenta por persona que atiende un punto, no una cuenta compartida. Así la bitácora dice quién entregó cada objeto.

```bash
# Crear la cuenta (pide la contraseña dos veces sin mostrarla; mínimo 10 caracteres)
docker compose exec api node scripts/crear-admin.js ana.perez "Ana Pérez López" fcc

# Cambiar la contraseña: el mismo comando con el mismo usuario
# Desactivar a alguien que deja el puesto:
docker compose exec api node scripts/crear-admin.js --desactivar ana.perez
```

- **Usuario:** `nombre.apellido`, en minúsculas y sin acentos.
- **Contraseña:** la escribe la persona responsable en el momento, o se le entrega **en persona**. Nunca por WhatsApp ni por correo.
- En producción **no existen** las cuentas `admin.*` de demostración (ver 6.4). En desarrollo, si quieres quitarlas: `--desactivar admin.fcc`, etc.

---

## 6.4 Sin datos de demostración

`docker-compose.prod.yml` crea la base **solo** con el esquema y los catálogos (`01_esquema.sql` y `02_catalogos.sql`). Nunca carga `03_datos_demo.sql`, así que en producción no hay objetos de ejemplo ni cuentas `admin.*`.

Para comprobarlo en el servidor:

```bash
docker compose -f docker-compose.prod.yml exec db psql -U opcu1 -d objetos_perdidos -c "SELECT count(*) AS objetos FROM objetos; SELECT usuario FROM administradores;"
```

Antes del lanzamiento, `objetos` debe ser 0 y en administradores solo deben salir las cuentas reales.

Si ya se probó la página en el servidor con datos de prueba, para dejar la base vacía de objetos (las cuentas y los puntos se conservan):

```bash
docker compose -f docker-compose.prod.yml exec db psql -U opcu1 -d objetos_perdidos -c "TRUNCATE entregas, objetos RESTART IDENTITY; ALTER SEQUENCE folio_seq RESTART WITH 101;"
```
