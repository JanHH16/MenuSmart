import asyncio
import logging
import time
from datetime import UTC, datetime

import httpx

from app.scrapers.config import ScraperSettings
from app.scrapers.normalizer import ItemInvalido, construir_producto
from app.scrapers.parser import ParseError, extract_product_list
from app.scrapers.robots import Rule, is_allowed, parse_robots
from app.scrapers.schemas import (
    ErrorScrape,
    EstadisticasScrape,
    ProductoScrapeado,
    ScrapeResponse,
    Tienda,
)
from app.scrapers.stores import STORES, Store

logger = logging.getLogger("menusmart.scraper")

_ROBOTS_TTL_SECONDS = 3600.0


class FetchError(Exception):
    def __init__(self, tipo: str, detalle: str) -> None:
        super().__init__(detalle)
        self.tipo = tipo
        self.detalle = detalle


class ScraperService:
    def __init__(self, client: httpx.AsyncClient, settings: ScraperSettings) -> None:
        self._client = client
        self._settings = settings
        self._robots: dict[str, tuple[float, list[Rule]]] = {}
        self._locks = {key: asyncio.Lock() for key in STORES}
        self._ultima_solicitud: dict[str, float] = {}

    async def search(
        self, tienda: Tienda, consultas: list[str], max_resultados: int
    ) -> ScrapeResponse:
        store = STORES[tienda]
        inicio = time.monotonic()
        resultados: list[ProductoScrapeado] = []
        errores: list[ErrorScrape] = []
        vistos: set[str] = set()
        descartes: dict[str, int] = {}
        extraidos = duplicados = consultas_ok = 0

        try:
            reglas = await self._robots_rules(store)
        except FetchError as exc:
            errores.append(
                ErrorScrape(consulta=None, tipo=exc.tipo, detalle=f"robots.txt: {exc.detalle}")
            )
            return self._respuesta(
                store, len(consultas), consultas_ok, resultados, errores,
                extraidos, duplicados, descartes, inicio,
            )

        for consulta in consultas:
            if not is_allowed(reglas, f"{store.search_path}?{store.query_param}={consulta}"):
                errores.append(
                    ErrorScrape(
                        consulta=consulta, tipo="robots", detalle="robots.txt no permite la ruta"
                    )
                )
                continue
            try:
                items = await self._buscar(store, consulta)
            except FetchError as exc:
                errores.append(ErrorScrape(consulta=consulta, tipo=exc.tipo, detalle=exc.detalle))
                continue
            except ParseError as exc:
                errores.append(ErrorScrape(consulta=consulta, tipo="estructura", detalle=str(exc)))
                continue

            consultas_ok += 1
            for item in items[:max_resultados]:
                extraidos += 1
                try:
                    producto = construir_producto(item, store=store, consulta=consulta)
                except ItemInvalido as exc:
                    descartes[exc.motivo] = descartes.get(exc.motivo, 0) + 1
                    continue
                if producto.external_id in vistos:
                    duplicados += 1
                    continue
                vistos.add(producto.external_id)
                resultados.append(producto)

        respuesta = self._respuesta(
            store, len(consultas), consultas_ok, resultados, errores,
            extraidos, duplicados, descartes, inicio,
        )
        logger.info(
            "scrape tienda=%s estado=%s consultas=%d validos=%d errores=%d duracion_ms=%d",
            store.key, respuesta.estado, len(consultas), len(resultados), len(errores),
            respuesta.estadisticas.duracion_ms,
        )
        return respuesta

    @staticmethod
    def _respuesta(
        store: Store,
        total_consultas: int,
        consultas_ok: int,
        resultados: list[ProductoScrapeado],
        errores: list[ErrorScrape],
        extraidos: int,
        duplicados: int,
        descartes: dict[str, int],
        inicio: float,
    ) -> ScrapeResponse:
        if not errores:
            estado = "ok"
        elif resultados:
            estado = "parcial"
        else:
            estado = "fallido"
        return ScrapeResponse(
            tienda=store.key,
            estado=estado,
            obtenido_en=datetime.now(UTC),
            resultados=resultados,
            errores=errores,
            estadisticas=EstadisticasScrape(
                consultas_total=total_consultas,
                consultas_ok=consultas_ok,
                consultas_fallidas=total_consultas - consultas_ok,
                registros_extraidos=extraidos,
                registros_validos=len(resultados),
                registros_duplicados=duplicados,
                registros_descartados=sum(descartes.values()),
                descartes_por_motivo=descartes,
                duracion_ms=round((time.monotonic() - inicio) * 1000),
            ),
        )

    async def _buscar(self, store: Store, consulta: str) -> list[dict]:
        respuesta = await self._get(
            store, f"{store.base_url}{store.search_path}", params={store.query_param: consulta}
        )
        if respuesta.url.host not in store.hosts:
            raise FetchError("respuesta_invalida", "la tienda redirigió fuera de su dominio")
        if respuesta.status_code != 200:
            raise FetchError("http", f"la tienda respondió {respuesta.status_code}")
        if len(respuesta.content) > self._settings.max_response_bytes:
            raise FetchError("respuesta_invalida", "la respuesta supera el tamaño máximo")
        return extract_product_list(respuesta.text)

    async def _robots_rules(self, store: Store) -> list[Rule]:
        guardado = self._robots.get(store.key)
        if guardado and time.monotonic() - guardado[0] < _ROBOTS_TTL_SECONDS:
            return guardado[1]
        respuesta = await self._get(store, f"{store.base_url}/robots.txt")
        if respuesta.status_code == 404:
            reglas: list[Rule] = []
        elif respuesta.status_code == 200:
            reglas = parse_robots(respuesta.text, self._settings.user_agent)
        else:
            raise FetchError("robots", f"respondió {respuesta.status_code}")
        self._robots[store.key] = (time.monotonic(), reglas)
        return reglas

    async def _throttle(self, store: Store) -> None:
        async with self._locks[store.key]:
            espera = (
                self._ultima_solicitud.get(store.key, 0.0)
                + self._settings.min_interval_seconds
                - time.monotonic()
            )
            if espera > 0:
                await asyncio.sleep(espera)
            self._ultima_solicitud[store.key] = time.monotonic()

    async def _get(
        self, store: Store, url: str, params: dict[str, str] | None = None
    ) -> httpx.Response:
        ultimo = FetchError("red", "no se pudo contactar a la tienda")
        for intento in range(self._settings.max_retries + 1):
            if intento:
                await asyncio.sleep(self._settings.retry_backoff_seconds * 2 ** (intento - 1))
            await self._throttle(store)
            try:
                respuesta = await self._client.get(
                    url,
                    params=params,
                    headers={"User-Agent": self._settings.user_agent, "Accept": "text/html"},
                )
            except httpx.TimeoutException:
                segundos = self._settings.timeout_seconds
                ultimo = FetchError("timeout", f"sin respuesta en {segundos}s")
                continue
            except httpx.TransportError as exc:
                ultimo = FetchError("red", f"error de red: {type(exc).__name__}")
                continue
            if respuesta.status_code in (403, 429):
                raise FetchError("bloqueo", f"la tienda respondió {respuesta.status_code}")
            if respuesta.status_code >= 500:
                ultimo = FetchError("http", f"la tienda respondió {respuesta.status_code}")
                continue
            return respuesta
        raise ultimo
