# Pruebas · Objetos Perdidos CU1

Hay tres niveles de prueba:

| Nivel | Qué revisa | Quién y cuándo |
|---|---|---|
| **Automáticas** (5.1) | Base de datos, API, privacidad, permisos, límites | GitHub las corre solas en cada push y pull request (pestaña **Actions**). En tu computadora: `docker compose exec api npm test` |
| **Prueba completa a mano** (5.2) | Que el recorrido funcione en celulares y computadora reales | El equipo, antes de cada publicación |
| **Prueba con usuarios** (5.3) | Que estudiantes la entiendan sin ayuda | 5 estudiantes de distintas facultades, una vez antes del lanzamiento |

---

## 5.1 Pruebas automáticas

En cada pull request aparece una marca junto al último commit:

- ✓ verde: pasaron la verificación de la base, las pruebas de la API y la revisión de la página. Se puede unir.
- ✗ roja: algo falló. Entra a **Details** para ver qué prueba falló y corrígelo antes de unir.

Para exigirlo, en GitHub ve a **Settings → Branches → Branch protection rules → main** y activa:

- **Require a pull request before merging**, con 1 aprobación (tarea 0.3).
- **Require status checks to pass**, eligiendo **pruebas**.

---

## 5.2 Prueba completa a mano

Hazla en los tres dispositivos: **Android**, **iPhone** y **computadora**. Usa la dirección donde esté publicada la página. En desarrollo, desde el celular, usa la IP de tu computadora en la misma red Wi‑Fi; ver la nota al final.

Copia esta tabla en el pull request o en un issue y marca cada paso.

| # | Paso | Resultado esperado | Android | iPhone | Compu |
|---|---|---|---|---|---|
| 1 | Abrir la página | Carga en menos de 3 s; el pie dice «Conectado a la base de datos» | ☐ | ☐ | ☐ |
| 2 | **Encontré algo** → elegir «Otro», escribir «Balón» → Guardar | El botón dice «Otro: Balón» | ☐ | ☐ | ☐ |
| 3 | Tocar el mapa en Ingeniería, escribir el lugar y una descripción → Registrar | Sale un folio `CU1-…` y el punto de resguardo de Ingeniería | ☐ | ☐ | ☐ |
| 4 | **Busco algo** → escribir «balon» | Aparece el balón como «Por llegar al resguardo», **sin** la descripción | ☐ | ☐ | ☐ |
| 5 | Marcar un punto en el mapa cerca de donde se reportó | El balón sale en «Coinciden con tu búsqueda» | ☐ | ☐ | ☐ |
| 6 | Cambiar a **Trazar ruta** y marcar 3 puntos que pasen por Ingeniería | El balón sigue coincidiendo («sobre tu ruta» o «zona por la que pasaste») | ☐ | ☐ | ☐ |
| 7 | **Administración** con la cuenta de Ingeniería | Se ve el balón en «Por recibir» con su descripción | ☐ | ☐ | ☐ |
| 8 | Confirmar recepción | Pasa a «En resguardo»; en el buscador también | ☐ | ☐ | ☐ |
| 9 | Entregar con nombre, matrícula de 9 dígitos y las dos verificaciones | Mensaje «Entregado…»; aparece en la bitácora | ☐ | ☐ | ☐ |
| 10 | Buscar «balon» como público | Sale «Encontrado · entregado» **sin** nombre ni matrícula | ☐ | ☐ | ☐ |
| 11 | Con la cuenta de **otro** punto, activar «Ver todo CU1» | El balón se ve sin descripción y sin botones de acción | ☐ | ☐ | ☐ |
| 12 | Cerrar sesión y volver a **Administración** | Pide usuario y contraseña | ☐ | ☐ | ☐ |
| 13 | Modo avión → intentar reportar → quitar modo avión → Reportar | Aviso de «No hay conexión…» sin perder lo escrito; luego se envía | ☐ | ☐ | ☐ |
| 14 | Rotar el celular y hacer zoom | Nada se corta ni se sale de la pantalla; el mapa se desliza | ☐ | ☐ | ☐ |

Al terminar, en Administración descarta los objetos de prueba que queden por llegar.

**Celular en desarrollo:** la API solo escucha en tu computadora (`127.0.0.1`). Para probar desde el celular en la misma red, en `docker-compose.yml` cambia temporalmente `"127.0.0.1:${API_PORT:-8080}:3000"` por `"${API_PORT:-8080}:3000"`, ejecuta `docker compose up -d` y entra a `http://IP-DE-TU-COMPU:8080`. Para ver la IP en Windows: `ipconfig` → «Dirección IPv4». Al terminar, regresa la línea como estaba.

---

## 5.3 Prueba con usuarios

**Objetivo:** confirmar que una persona que nunca vio la página puede buscar y reportar sola.

**Participantes:** 5 estudiantes, de preferencia de 5 facultades distintas y que no sean de Computación. Todos desde **su propio celular**.

**Duración:** 10 minutos por persona.

### Cómo hacerla

1. Explica solo esto: «Es una página para objetos perdidos en CU. Te voy a pedir unas tareas. No hay respuestas incorrectas: estamos probando la página, no a ti.»
2. Pídele que **piense en voz alta** mientras usa la página.
3. **No ayudes.** Si se atora más de 1 minuto, anota dónde y pasa a la siguiente tarea.
4. Una persona da las tareas y otra anota.

### Tareas (léelas tal cual)

| # | Tarea | Se cumple si… |
|---|---|---|
| A | «Ayer perdiste una botella en tu facultad. Revisa si alguien la encontró.» | Escribe o elige «botella» **y** marca su facultad en el mapa |
| B | «Viste que hay una. ¿A dónde tendrías que ir por ella y qué tienes que llevar?» | Abre el objeto y dice el punto de resguardo **y** que hay que llevar credencial o describirla |
| C | «Encontraste unos audífonos en la biblioteca. Repórtalos.» | Llega a la pantalla con el folio |
| D | «¿Dónde está el punto de resguardo de Arquitectura?» | Lo encuentra en «Puntos de resguardo» |

### Hoja de observación (una por persona)

```
Participante: __   Facultad: ____________   Semestre: __   Celular: Android / iPhone

Tarea A:  ☐ Sola  ☐ Con dificultad  ☐ No pudo     Tiempo: ___ s
Tarea B:  ☐ Sola  ☐ Con dificultad  ☐ No pudo     Tiempo: ___ s
Tarea C:  ☐ Sola  ☐ Con dificultad  ☐ No pudo     Tiempo: ___ s
Tarea D:  ☐ Sola  ☐ Con dificultad  ☐ No pudo     Tiempo: ___ s

¿Dónde dudó o se confundió? (palabras exactas si las dijo)
_____________________________________________________________

Preguntas al final:
1. Del 1 al 5, ¿qué tan fácil fue?  ___
2. ¿Qué fue lo más confuso?  ________________________________
3. ¿La usarías si pierdes algo?  Sí / No / Tal vez — ¿por qué? ____
```

### Cómo decidir

- **Se aprueba** si al menos **4 de 5** personas completan las tareas **A** y **C** solas.
- Toda confusión que se repita en **2 o más** personas se vuelve un issue en GitHub con la etiqueta `usabilidad`. Corríjanlas antes del lanzamiento.
- Guarden las hojas: sirven como evidencia del proyecto, igual que el cuestionario del documento original.
