#!/usr/bin/env bash
# Health check con reintentos: consulta una URL hasta que responda 200 y, si se
# indica, hasta que el campo "status" del JSON tenga el valor esperado.
#
# Uso:    bash health-check.sh <url> [status_json_esperado]
# Entorno:
#   HEALTH_ATTEMPTS   intentos maximos (por defecto 30)
#   HEALTH_INTERVAL   segundos entre intentos (por defecto 10)
#   PYTHON_BIN        interprete para leer JSON (por defecto python3)
#
# Un servicio recien desplegado (o dormido en un plan gratuito) puede tardar en
# responder, por eso se reintenta. Sale con 1 si agota los intentos.
set -uo pipefail

URL="${1:?Falta la URL a consultar}"
ESPERADO="${2:-}"
INTENTOS="${HEALTH_ATTEMPTS:-30}"
INTERVALO="${HEALTH_INTERVAL:-10}"
PY="${PYTHON_BIN:-python3}"
CUERPO="$(mktemp)"
trap 'rm -f "$CUERPO"' EXIT

for ((i = 1; i <= INTENTOS; i++)); do
  CODIGO="$(curl -sS --max-time 30 -o "$CUERPO" -w '%{http_code}' "$URL" 2>/dev/null)" || CODIGO="000"
  if [ "$CODIGO" = "200" ]; then
    if [ -z "$ESPERADO" ]; then
      echo "OK ${URL} respondio 200 (intento ${i})"
      exit 0
    fi
    ESTADO="$("$PY" -c 'import json,sys; print(json.load(open(sys.argv[1])).get("status",""))' "$CUERPO" 2>/dev/null || true)"
    if [ "$ESTADO" = "$ESPERADO" ]; then
      echo "OK ${URL} respondio 200 con status=${ESTADO} (intento ${i})"
      exit 0
    fi
    echo "Intento ${i}/${INTENTOS}: ${URL} respondio 200 pero status='${ESTADO}' (se esperaba '${ESPERADO}')"
  else
    echo "Intento ${i}/${INTENTOS}: ${URL} respondio HTTP ${CODIGO}"
  fi
  [ "$i" -lt "$INTENTOS" ] && sleep "$INTERVALO"
done

echo "FALLO: ${URL} no quedo saludable tras ${INTENTOS} intentos" >&2
echo "Ultima respuesta:" >&2
head -c 1000 "$CUERPO" >&2 || true
echo >&2
exit 1
