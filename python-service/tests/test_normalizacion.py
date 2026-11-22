import pytest

from app.normalizacion import (
    IngredienteEntrada,
    buscar_termino,
    convertir_cantidad,
    limpiar_texto,
    normalizar_ingredientes,
)
from app.normalizacion_datos import CATALOGO


def _uno(nombre: str, cantidad: float, unidad: str):
    return normalizar_ingredientes([IngredienteEntrada(nombre, cantidad, unidad)])[0]


class TestLimpiarTexto:
    @pytest.mark.parametrize(
        ("entrada", "esperado"),
        [
            ("  Tomates  ", "tomates"),
            ("Azúcar Blanca", "azucar blanca"),
            ("Cebolla (grande)", "cebolla"),
            ("pollo, entero.", "pollo entero"),
            ("Ñoquis", "noquis"),
        ],
    )
    def test_limpia(self, entrada, esperado):
        assert limpiar_texto(entrada) == esperado


class TestBuscarTermino:
    @pytest.mark.parametrize(
        ("nombre", "termino", "regla"),
        [
            ("arroz", "arroz", "nombre:exacto"),
            ("Tomates", "tomate", "nombre:singular"),
            ("limones", "limon", "nombre:singular"),
            ("papas", "papa", "nombre:singular"),
            ("pechuga de pollo", "pollo", "nombre:exacto"),
            ("pechuga de pollo deshuesada", "pollo", "nombre:exacto"),
            ("Tallarines", "fideos", "nombre:singular"),
            ("aguacate", "palta", "nombre:exacto"),
            ("cebolla fresca picada", "cebolla", "nombre:exacto"),
            ("filete de salmón ahumado", "salmon", "nombre:contiene(filete de salmon)"),
        ],
    )
    def test_mapea_al_catalogo(self, nombre, termino, regla):
        encontrado, regla_usada = buscar_termino(limpiar_texto(nombre))
        assert encontrado is not None
        assert encontrado.nombre == termino
        assert regla_usada == regla

    def test_gana_el_sinonimo_mas_largo(self):
        # "salsa de tomate" no debe resolverse como "tomate".
        encontrado, _ = buscar_termino(limpiar_texto("salsa de tomate casera"))
        assert encontrado is not None
        assert encontrado.nombre == "salsa de tomate"

    @pytest.mark.parametrize("nombre", ["cilantro", "levadura", "salsa de soya", ""])
    def test_sin_coincidencia(self, nombre):
        assert buscar_termino(limpiar_texto(nombre)) == (None, None)

    @pytest.mark.parametrize(
        ("nombre", "termino"),
        [
            ("pasta de tomate", "salsa de tomate"),
            ("puré de tomate", "salsa de tomate"),
            ("leche entera", "leche"),
            ("harina de trigo", "harina"),
        ],
    )
    def test_sinonimos_explicitos_ganan_a_la_palabra_suelta(self, nombre, termino):
        encontrado, _ = buscar_termino(limpiar_texto(nombre))
        assert encontrado is not None
        assert encontrado.nombre == termino

    @pytest.mark.parametrize(
        "nombre",
        [
            "leche condensada",
            "leche de coco",
            "leche evaporada",
            "harina de maíz",
            "aceite de coco",
        ],
    )
    def test_no_mapea_productos_distintos_que_contienen_un_termino(self, nombre):
        assert buscar_termino(limpiar_texto(nombre)) == (None, None)

    def test_no_confunde_palabras_que_contienen_un_termino(self):
        # "salsa" contiene las letras de "sal", pero no es la palabra "sal".
        assert buscar_termino("salsa verde") == (None, None)


class TestConvertirCantidad:
    def _termino(self, nombre):
        return next(t for t in CATALOGO if t.nombre == nombre)

    def test_gramos_a_kg(self):
        cantidad, unidad, reglas = convertir_cantidad(500, "g", self._termino("arroz"))
        assert (cantidad, unidad) == (0.5, "kg")
        assert "unidad:g->kg(x0.001)" in reglas

    def test_ml_a_litros_para_un_liquido(self):
        cantidad, unidad, _ = convertir_cantidad(250, "ml", self._termino("leche"))
        assert (cantidad, unidad) == (0.25, "l")

    def test_taza_de_solido_pasa_a_kg_con_densidad(self):
        cantidad, unidad, reglas = convertir_cantidad(1, "taza", self._termino("arroz"))
        assert unidad == "kg"
        assert cantidad == pytest.approx(0.24 * 0.85)
        assert any(r.startswith("equivalencia:l->kg") for r in reglas)

    def test_unidades_a_kg_con_peso_de_la_unidad(self):
        cantidad, unidad, _ = convertir_cantidad(4, "unidades", self._termino("tomate"))
        assert unidad == "kg"
        assert cantidad == pytest.approx(0.6)

    def test_kg_a_unidades_cuando_se_vende_por_unidad(self):
        cantidad, unidad, _ = convertir_cantidad(0.6, "kg", self._termino("lechuga"))
        assert unidad == "un"
        assert cantidad == pytest.approx(2)

    def test_docena_de_huevos(self):
        cantidad, unidad, _ = convertir_cantidad(1, "docena", self._termino("huevos"))
        assert (cantidad, unidad) == (12, "un")

    def test_masa_a_litros_para_aceite(self):
        cantidad, unidad, _ = convertir_cantidad(0.91, "kg", self._termino("aceite"))
        assert unidad == "l"
        assert cantidad == pytest.approx(1)

    def test_sin_equivalencia_conserva_la_unidad_y_lo_informa(self):
        cantidad, unidad, reglas = convertir_cantidad(2, "unidades", self._termino("zapallo"))
        assert (cantidad, unidad) == (2, "un")
        assert "equivalencia:faltante(un->kg)" in reglas

    def test_unidad_desconocida_no_se_convierte(self):
        cantidad, unidad, reglas = convertir_cantidad(3, "pizcas", self._termino("sal"))
        assert (cantidad, unidad) == (3, "pizcas")
        assert reglas == ["unidad:desconocida(pizcas)"]

    def test_sin_termino_solo_lleva_a_la_base_del_tipo(self):
        cantidad, unidad, _ = convertir_cantidad(200, "gr", None)
        assert (cantidad, unidad) == (0.2, "kg")


class TestNormalizarIngredientes:
    def test_une_lineas_distintas_del_mismo_ingrediente(self):
        resultado = normalizar_ingredientes(
            [
                IngredienteEntrada("Tomates", 500, "g"),
                IngredienteEntrada("tomate", 1, "kg"),
                IngredienteEntrada("Tomate cherry", 2, "unidades"),
            ]
        )
        assert len(resultado) == 1
        tomate = resultado[0]
        assert tomate.termino == "tomate"
        assert tomate.unidad == "kg"
        assert tomate.cantidad == pytest.approx(0.5 + 1 + 0.3)
        assert tomate.lineas_unidas == 3
        assert tomate.nombres_originales == ["Tomates", "tomate", "Tomate cherry"]

    def test_no_une_lo_que_quedo_en_unidades_distintas(self):
        resultado = normalizar_ingredientes(
            [IngredienteEntrada("zapallo", 1, "kg"), IngredienteEntrada("zapallo", 2, "unidades")]
        )
        assert {(r.nombre, r.unidad) for r in resultado} == {("zapallo", "kg"), ("zapallo", "un")}

    def test_ingrediente_sin_termino_queda_sin_categoria_pero_se_une(self):
        resultado = normalizar_ingredientes(
            [
                IngredienteEntrada("Cilantro", 1, "cucharada"),
                IngredienteEntrada("cilantro", 2, "cda"),
            ]
        )
        assert len(resultado) == 1
        assert resultado[0].termino is None
        assert resultado[0].categoria is None
        assert resultado[0].cantidad == pytest.approx(0.045)
        assert resultado[0].unidad == "l"

    def test_conserva_el_orden_de_primera_aparicion(self):
        resultado = normalizar_ingredientes(
            [
                IngredienteEntrada("pan", 2, "un"),
                IngredienteEntrada("arroz", 1, "kg"),
                IngredienteEntrada("pan", 1, "un"),
            ]
        )
        assert [r.nombre for r in resultado] == ["pan", "arroz"]

    def test_deja_las_reglas_aplicadas_para_poder_explicar(self):
        item = _uno("Pechuga de pollo", 800, "gramos")
        assert item.reglas == ["nombre:exacto", "unidad:gramos->kg(x0.001)"]
        assert (item.nombre, item.cantidad, item.unidad) == ("pollo", 0.8, "kg")

    def test_cantidades_pequenas_siguen_visibles(self):
        assert _uno("Levadura", 0.004, "kg").cantidad == 0.004

    def test_todos_los_terminos_del_catalogo_se_mapean_a_si_mismos(self):
        for termino in CATALOGO:
            encontrado, _ = buscar_termino(limpiar_texto(termino.nombre))
            assert encontrado is not None
            assert encontrado.nombre == termino.nombre

    def test_todos_los_sinonimos_apuntan_a_su_termino(self):
        for termino in CATALOGO:
            for sinonimo in termino.sinonimos:
                encontrado, _ = buscar_termino(limpiar_texto(sinonimo))
                assert encontrado is not None
                assert encontrado.nombre == termino.nombre, sinonimo
