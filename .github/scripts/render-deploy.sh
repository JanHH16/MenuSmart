#!/usr/bin/env bash
# Despliega un servicio de Render por API y espera a que quede "live".
#
# Uso:    bash render-deploy.sh <service_id> [commit_sha]
# Entorno:
#   RENDER_API_KEY            (obligatorio) API key de Render; nunca se imprime.
#   RENDER_DEPLOY_TIMEOUT     segundos maximos de espera (por defecto 900).
#   RENDER_POLL_INTERVAL      segundos entre consultas (por defecto 10).
#   RENDER_API_BASE           base de la API (por defecto https://api.render.com/v1).
#   PYTHON_BIN                interprete para leer JSON (por defecto python3).
#
# Si se indica commit_sha, Render despliega exactamente ese commit (sirve para
# rollback). Si no, despliega el ultimo commit de la rama conectada al servicio.
# Sale con 0 solo si el deploy termina en "live".
set -euo pipefail

SERVICE_ID="${1:?Falta el ID del servicio (srv-xxxx)}"
COMMIT_SHA="${2:-}"
: "${RENDER_API_KEY:?Falta la variable RENDER_API_KEY}"
API="${RENDER_API_BASE:-https://api.render.com/v1}"
TIMEOUT="${RENDER_DEPLOY_TIMEOUT:-900}"
INTERVAL="${RENDER_POLL_INTERVAL:-10}"
PY="${PYTHON_BIN:-python3}"

# json_get <campo>: lee un campo de primer nivel del JSON recibido por stdin.
json_get() {
  "$PY" -c 'import json,sys; d=json.load(sys.stdin); print(d.get(sys.argv[1], ""))' "$1"
}

# api <metodo> <ruta> [cuerpo_json]: imprime "<cuerpo>\n<codigo http>".
api() {
  local metodo="$1" ruta="$2" cuerpo="${3:-}"
  local args=(-sS --max-time 60 -X "$metodo" -H "Authorization: Bearer ${RENDER_API_KEY}"
    -H "Accept: application/json" -w '\n%{http_code}')
  if [ -n "$cuerpo" ]; then
    args+=(-H "Content-Type: application/json" -d "$cuerpo")
  fi
  curl "${args[@]}" "${API}${ruta}"
}

if [ -n "$COMMIT_SHA" ]; then
  CUERPO="{\"commitId\":\"${COMMIT_SHA}\"}"
  echo "Disparando deploy de ${SERVICE_ID} en el commit ${COMMIT_SHA}"
else
  CUERPO="{}"
  echo "Disparando deploy de ${SERVICE_ID} (ultimo commit de la rama conectada)"
fi

RESPUESTA="$(api POST "/services/${SERVICE_ID}/deploys" "$CUERPO")"
CODIGO="$(printf '%s\n' "$RESPUESTA" | tail -n 1)"
JSON="$(printf '%s\n' "$RESPUESTA" | sed '$d')"

case "$CODIGO" in
  201) DEPLOY_ID="$(printf '%s' "$JSON" | json_get id)" ;;
  202)
    # Render dejo el deploy en cola y no entrego su id: se toma el mas reciente.
    echo "Deploy en cola (202); buscando el mas reciente"
    LISTA="$(api GET "/services/${SERVICE_ID}/deploys?limit=1")"
    DEPLOY_ID="$(printf '%s\n' "$LISTA" | sed '$d' |
      "$PY" -c 'import json,sys; d=json.load(sys.stdin); print(d[0]["deploy"]["id"] if d else "")')"
    ;;
  *)
    echo "Render rechazo el deploy (HTTP ${CODIGO}): ${JSON}" >&2
    exit 1
    ;;
esac

if [ -z "${DEPLOY_ID:-}" ]; then
  echo "No se pudo obtener el ID del deploy" >&2
  exit 1
fi
echo "Deploy ${DEPLOY_ID} creado; esperando a que termine (maximo ${TIMEOUT}s)"

INICIO="$(date +%s)"
while true; do
  RESPUESTA="$(api GET "/services/${SERVICE_ID}/deploys/${DEPLOY_ID}")" || RESPUESTA=$'\n000'
  CODIGO="$(printf '%s\n' "$RESPUESTA" | tail -n 1)"
  ESTADO=""
  if [ "$CODIGO" = "200" ]; then
    ESTADO="$(printf '%s\n' "$RESPUESTA" | sed '$d' | json_get status)"
  fi

  case "$ESTADO" in
    live)
      echo "Deploy ${DEPLOY_ID} en estado live"
      exit 0
      ;;
    build_failed | update_failed | pre_deploy_failed | canceled | deactivated)
      echo "El deploy ${DEPLOY_ID} termino en estado ${ESTADO}" >&2
      exit 1
      ;;
    *)
      echo "Estado actual: ${ESTADO:-sin respuesta (HTTP ${CODIGO})}"
      ;;
  esac

  if [ $(($(date +%s) - INICIO)) -ge "$TIMEOUT" ]; then
    echo "Tiempo agotado esperando el deploy ${DEPLOY_ID}" >&2
    exit 1
  fi
  sleep "$INTERVAL"
done
