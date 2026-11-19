# Lanzamiento (Fase 8)

Empieza cuando la Fase 7 está terminada: la página publicada con HTTPS, los puntos de resguardo confirmados, las cuentas creadas y el aviso de privacidad aprobado.

---

## 8.1 Capacitación del personal (15 minutos por punto)

Llévenle a cada responsable la [Guía rápida](GUIA_ADMINISTRACION.md) impresa y hagan esto **en su computadora o celular**:

| Min | Actividad |
|---|---|
| 0–3 | Qué es la página y por qué ayuda (ver el documento del proyecto: 7 de 10 estudiantes describen el manejo actual como malo o inexistente) |
| 3–5 | Entrar con su cuenta. Cambiar la contraseña si se la dieron ustedes |
| 5–8 | Un integrante reporta un objeto de prueba desde su celular. El responsable lo ve en «Por recibir» y **confirma la recepción** |
| 8–12 | El integrante llega a «recogerlo». El responsable pide la descripción y la credencial y **registra la entrega** |
| 12–14 | Revisar la **bitácora** y **Ver todo CU1** |
| 14–15 | Dudas. Dejar la guía impresa y un contacto del equipo |

*Terminado cuando:* cada responsable registró y entregó un objeto de prueba. Usen como «lugar» el texto `PRUEBA DE CAPACITACIÓN`, para reconocerlos en la bitácora. En el buscador dejan de verse a los 7 días.

---

## 8.2 Carteles con código QR

La página tiene un cartel listo para imprimir en **`https://TU-DOMINIO/cartel.html`**:

1. Elige el **punto de resguardo** para el cartel de cada facultad. Así el cartel dice dónde entregar y recoger ahí. Para espacios comunes, déjalo como «cartel general».
2. Revisa que la **dirección del QR** sea la de producción.
3. **Escanea el QR con un celular** antes de imprimir.
4. **Imprimir:** tamaño carta, sin márgenes. A color se ve mejor, pero en blanco y negro funciona.

Dónde pegarlos:

- **Junto a cada punto de resguardo** (16), con su punto seleccionado.
- **Espacios comunes** (cartel general): comedor, Biblioteca Central, explanadas, Arena, canchas, paradas de transporte y entradas de CU.
- **Salones y laboratorios** con más pérdidas. Según la encuesta, salones y laboratorios suman 6 de 10 pérdidas.

*Terminado cuando:* hay al menos un cartel por facultad.

Extra: publiquen el enlace en los grupos de WhatsApp y Facebook de cada facultad. Son el medio que hoy usan 3 de cada 10 estudiantes para buscar objetos.

---

## 8.3 Seguimiento del primer mes

Al cumplir un mes, saca el resumen (no muestra datos personales):

```bash
docker compose -f docker-compose.prod.yml exec db psql -U opcu1 -d objetos_perdidos -f /reportes/resumen_mensual.sql
```

Para un periodo exacto:

```bash
docker compose -f docker-compose.prod.yml exec db psql -U opcu1 -d objetos_perdidos -v desde=2026-12-01 -v hasta=2027-01-01 -f /reportes/resumen_mensual.sql
```

El resumen trae:

- **Totales:** reportados, cuántos llegaron al resguardo, cuántos se entregaron a su dueño, cuántos nunca llegaron, cuántos siguen abiertos, porcentaje recuperado y días promedio hasta la entrega.
- Desglose **por tipo de objeto**, **por zona** y **por punto de resguardo**.
- Objetos con **más de 30 días** en resguardo.

Comparen con la línea base del documento del proyecto: **3 de 10** estudiantes recuperaron su objeto, y **ninguno** de los que lo perdieron en espacios comunes.

Junten también comentarios:

- a los responsables de cada punto: qué les costó trabajo;
- a 5 o 10 estudiantes que la hayan usado.

*Terminado cuando:* hay un documento con los números del resumen, los comentarios y una lista de mejoras. Las mejoras se vuelven issues en GitHub.
