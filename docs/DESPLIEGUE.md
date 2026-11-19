# Publicar la página (Fase 7)

Esta guía deja la página en internet, con HTTPS, respaldos diarios y aviso de privacidad. Todo corre con un solo archivo: `docker-compose.prod.yml`.

Incluye cuatro servicios:

| Servicio | Qué hace |
|---|---|
| `db` | PostgreSQL. Se crea **sin** datos de demostración y no se expone a internet. |
| `api` | La API y la página, en modo producción. |
| `caddy` | Recibe el tráfico en los puertos 80 y 443, obtiene y renueva solo el certificado HTTPS, y lo pasa a la API. |
| `respaldos` | Respalda la base todos los días en la carpeta `respaldos/`. |

---

## 7.1 Servidor

**Opción A: servidor de la BUAP.** Pídanlo a la Dirección de Tecnologías de la Información (o el área que corresponda) con esta solicitud:

> Servidor virtual Linux (Ubuntu 24.04 LTS), 2 vCPU, 2 GB de RAM y 20 GB de disco, con Docker instalado. Debe tener los puertos 80 y 443 abiertos a internet y un subdominio institucional (por ejemplo `objetosperdidos.buap.mx`) apuntando a su IP. El acceso para administrarlo es por SSH.

**Opción B: VPS propio.** Cualquier proveedor con Ubuntu 24.04 y al menos 1 GB de RAM sirve.

Instalar Docker en Ubuntu, si no viene instalado:

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER   # luego cierra la sesión SSH y vuelve a entrar
docker --version && docker compose version
```

*Terminado cuando:* `docker compose version` responde en el servidor.

---

## 7.2 Dominio, HTTPS y primer arranque

1. **DNS:** crea un registro **A** del dominio con la IP pública del servidor. Comprueba que ya apunta con `ping objetosperdidos.buap.mx`.

2. **Descargar el proyecto** en el servidor:
   ```bash
   git clone https://github.com/juanreynoso2/ObjetosPerdidosCU1.git
   cd ObjetosPerdidosCU1
   ```
   Si el repositorio es privado, usa un token de GitHub o una «deploy key» de solo lectura.

3. **Configuración:**
   ```bash
   cp .env.produccion.example .env
   openssl rand -base64 32   # copia el resultado en POSTGRES_PASSWORD
   openssl rand -hex 32      # copia el resultado en JWT_SECRET
   nano .env                 # pon también DOMINIO
   ```

4. **Arrancar:**
   ```bash
   docker compose -f docker-compose.prod.yml up -d --build
   docker compose -f docker-compose.prod.yml ps
   ```
   Los cuatro servicios deben decir `running`, y `db` y `api` además `healthy`. La primera vez Caddy tarda unos segundos en obtener el certificado.

5. **Comprobar:**
   - Abre `https://TU-DOMINIO`: debe salir el candado y, en el pie, «Conectado a la base de datos».
   - Revisa que no queden objetos de prueba: `docker compose -f docker-compose.prod.yml exec db psql -U opcu1 -d objetos_perdidos -c "SELECT count(*) FROM objetos"` debe dar 0.

6. **Cargar los datos reales** (ver `docs/DATOS_REALES.md`). En producción los comandos llevan `-f docker-compose.prod.yml`:
   ```bash
   docker compose -f docker-compose.prod.yml exec api node scripts/cargar-puntos.js --probar
   docker compose -f docker-compose.prod.yml exec api node scripts/cargar-puntos.js
   docker compose -f docker-compose.prod.yml exec api node scripts/crear-admin.js ana.perez "Ana Pérez López" fcc
   ```

7. Entra a `https://TU-DOMINIO/#admin` con una de las cuentas para confirmar que el inicio de sesión funciona con HTTPS.

*Terminado cuando:* la página abre con candado y se puede iniciar sesión en Administración.

**Si Caddy no obtiene el certificado:** revisa `docker compose -f docker-compose.prod.yml logs caddy`. Casi siempre es que el dominio todavía no apunta al servidor o que el puerto 80 o 443 está cerrado. Para probar antes de tener dominio, pon `DOMINIO=:80` en `.env`: la página abre por `http://IP-DEL-SERVIDOR`, pero el inicio de sesión de administración **no funcionará**, porque la cookie exige HTTPS.

---

## 7.3 Respaldos

El servicio `respaldos` guarda un archivo `respaldos/opcu1-AAAAMMDD-HHMM.dump`:

- al arrancar, y luego todos los días a las `HORA_RESPALDO` (03:00 por defecto);
- borra en el servidor los que tengan más de `DIAS_A_CONSERVAR` días (30 por defecto).

Para ver los respaldos y su registro:

```bash
ls -lh respaldos/
docker compose -f docker-compose.prod.yml logs respaldos
```

**Copia fuera del servidor (obligatorio).** Un respaldo que vive en el mismo servidor se pierde junto con él. Elijan una:

- **Otro servidor por SSH:** en el servidor, `crontab -e` y agrega:
  ```
  30 3 * * * rsync -a ~/ObjetosPerdidosCU1/respaldos/ usuario@otro-servidor:respaldos-opcu1/
  ```
- **Google Drive o OneDrive institucional** con [rclone](https://rclone.org): `rclone copy ~/ObjetosPerdidosCU1/respaldos remoto:respaldos-opcu1` en el mismo `crontab`.

**Probar que un respaldo sirve** (sin tocar la base real). Hazlo una vez al mes:

```bash
sh deploy/restaurar.sh respaldos/opcu1-20261118-0300.dump --prueba
```

Muestra cuántos objetos, entregas y cuentas trae el respaldo y luego borra la base de prueba.

**Restaurar de verdad** (por ejemplo, después de un error grave). ⚠ Reemplaza todos los datos actuales y pide escribir `RESTAURAR` para confirmar:

```bash
sh deploy/restaurar.sh respaldos/opcu1-20261118-0300.dump
```

*Terminado cuando:* hay copias fuera del servidor y una prueba de restauración mostró los datos completos.

---

## 7.4 Aviso de privacidad

La página ya incluye un **borrador** en `https://TU-DOMINIO/#privacidad`, enlazado en el pie y en el formulario de reporte. Lo que falta definir está marcado en amarillo:

- área responsable y domicilio;
- plazo de conservación (propuesta: 12 meses);
- datos de contacto de la Unidad de Transparencia;
- fecha de aprobación.

Pasos:

1. Llevar el texto (sección `view-privacidad` en `frontend/index.html`) al área de la BUAP responsable de protección de datos personales o a la Unidad de Transparencia, para que lo revise y lo apruebe.
2. Con sus cambios, actualizar el texto, quitar el recuadro de «Borrador» y las marcas amarillas (clase `pend`), y publicar.
3. Aplicar el plazo aprobado. Este script borra los datos personales vencidos y conserva la estadística. Prográmenlo una vez al mes con `crontab`:
   ```bash
   docker compose -f docker-compose.prod.yml exec -T db psql -U opcu1 -d objetos_perdidos -v meses=12 < db/mantenimiento/anonimizar.sql
   ```

*Terminado cuando:* el aviso aprobado está publicado, sin marcas de borrador.

---

## Mantenimiento

| Tarea | Comando (en el servidor, dentro de la carpeta del proyecto) |
|---|---|
| Publicar cambios de `main` | `git pull && docker compose -f docker-compose.prod.yml up -d --build` |
| Ver errores de la API | `docker compose -f docker-compose.prod.yml logs api --tail 100` |
| Reiniciar todo | `docker compose -f docker-compose.prod.yml restart` |
| Resumen del mes (Fase 8.3) | `docker compose -f docker-compose.prod.yml exec db psql -U opcu1 -d objetos_perdidos -f /reportes/resumen_mensual.sql` |
| Actualizar el sistema operativo | `sudo apt update && sudo apt upgrade -y` (una vez al mes) |

Cada cambio entra por pull request a `main`, con las pruebas de GitHub en verde, y se publica con la primera fila de la tabla.
