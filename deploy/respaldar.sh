#!/bin/sh
# Respaldo diario de la base. Corre dentro del servicio «respaldos» de docker-compose.prod.yml.
# - Hace un respaldo al arrancar y luego todos los días a las HORA_RESPALDO (03 por defecto).
# - Guarda en /respaldos (carpeta ./respaldos del servidor) y borra los de más de DIAS_A_CONSERVAR días.
# - Copiar ./respaldos FUERA del servidor es parte de la tarea 7.3 (ver docs/DESPLIEGUE.md).
set -u
mkdir -p /respaldos

respaldar() {
  archivo="/respaldos/opcu1-$(date +%Y%m%d-%H%M).dump"
  if pg_dump --format=custom --no-owner --file="$archivo.tmp"; then
    mv "$archivo.tmp" "$archivo"
    echo "$(date '+%F %T') Respaldo listo: $archivo ($(du -h "$archivo" | cut -f1))"
  else
    rm -f "$archivo.tmp"
    echo "$(date '+%F %T') ERROR: no se pudo hacer el respaldo" >&2
  fi
  find /respaldos -name 'opcu1-*.dump' -mtime +"${DIAS_A_CONSERVAR:-30}" -print -delete
}

respaldar
while true; do
  ahora=$(date +%s)
  objetivo=$(date -d "$(date +%F) ${HORA_RESPALDO:-03}:00" +%s 2>/dev/null || echo 0)
  [ "$objetivo" -le "$ahora" ] && objetivo=$((objetivo + 86400))
  [ "$objetivo" -le "$ahora" ] && objetivo=$((ahora + 86400))
  sleep $((objetivo - ahora))
  respaldar
done
