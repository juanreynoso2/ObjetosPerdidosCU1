#!/bin/sh
# Restaura un respaldo. ⚠ Reemplaza TODOS los datos actuales de la base.
# Uso en el servidor, desde la carpeta del proyecto:
#   sh deploy/restaurar.sh respaldos/opcu1-20261118-0300.dump
# Para probar un respaldo SIN tocar la base real (tarea 7.3), usa --prueba:
#   sh deploy/restaurar.sh respaldos/opcu1-20261118-0300.dump --prueba
set -eu
ARCHIVO="${1:?Indica el archivo .dump a restaurar}"
MODO="${2:-}"
COMPOSE="docker compose -f docker-compose.prod.yml"
USUARIO="$(grep -E '^POSTGRES_USER=' .env | cut -d= -f2)"; USUARIO="${USUARIO:-opcu1}"
BASE="$(grep -E '^POSTGRES_DB=' .env | cut -d= -f2)"; BASE="${BASE:-objetos_perdidos}"

[ -f "$ARCHIVO" ] || { echo "No existe $ARCHIVO"; exit 1; }

if [ "$MODO" = "--prueba" ]; then
  $COMPOSE exec -T db psql -U "$USUARIO" -d postgres -qc "DROP DATABASE IF EXISTS prueba_restauracion" -c "CREATE DATABASE prueba_restauracion"
  $COMPOSE exec -T db pg_restore -U "$USUARIO" -d prueba_restauracion --no-owner < "$ARCHIVO"
  echo "Datos restaurados en la base de prueba:"
  $COMPOSE exec -T db psql -U "$USUARIO" -d prueba_restauracion -c \
    "SELECT (SELECT count(*) FROM objetos) AS objetos, (SELECT count(*) FROM entregas) AS entregas, (SELECT count(*) FROM administradores) AS cuentas, (SELECT max(creado_en) FROM objetos) AS ultimo_reporte"
  $COMPOSE exec -T db psql -U "$USUARIO" -d postgres -qc "DROP DATABASE prueba_restauracion"
  echo "Prueba terminada: la base real no se tocó."
  exit 0
fi

printf "Esto REEMPLAZA todos los datos de «%s» con %s. Escribe RESTAURAR para continuar: " "$BASE" "$ARCHIVO"
read -r respuesta
[ "$respuesta" = "RESTAURAR" ] || { echo "Cancelado."; exit 1; }
$COMPOSE stop api
$COMPOSE exec -T db pg_restore -U "$USUARIO" -d "$BASE" --clean --if-exists --no-owner < "$ARCHIVO"
$COMPOSE start api
echo "Restauración terminada."
