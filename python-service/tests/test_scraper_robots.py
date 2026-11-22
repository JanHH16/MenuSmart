from app.scrapers.robots import is_allowed, parse_robots

UA = "MenuSmartBot/1.0 (+https://github.com/JanHH16/MenuSmart)"

ROBOTS_JUMBO = """\
User-agent: *
Disallow: *?map=
Disallow: *?*&map=
Disallow: *?PS=
Disallow: *sc=*
Disallow: *?*?
Disallow: */*checkout*
Disallow: */mi-carro
Disallow: *.pdf

User-agent: Teoma
Disallow: /
"""


def test_ruta_de_busqueda_esta_permitida():
    reglas = parse_robots(ROBOTS_JUMBO, UA)
    assert is_allowed(reglas, "/busqueda?ft=arroz")


def test_comodines_bloquean_parametros_prohibidos():
    reglas = parse_robots(ROBOTS_JUMBO, UA)
    assert not is_allowed(reglas, "/busqueda?ft=arroz&map=c")
    assert not is_allowed(reglas, "/busqueda?map=ft")
    assert not is_allowed(reglas, "/busqueda?ft=arroz?x=1")


def test_rutas_de_usuario_estan_bloqueadas():
    reglas = parse_robots(ROBOTS_JUMBO, UA)
    assert not is_allowed(reglas, "/mi-carro")
    assert not is_allowed(reglas, "/checkout/cart")
    assert not is_allowed(reglas, "/manual.pdf")


def test_grupo_del_bot_especifico_tiene_prioridad_sobre_el_comodin():
    reglas = parse_robots(ROBOTS_JUMBO, "Teoma/2.0")
    assert not is_allowed(reglas, "/busqueda?ft=arroz")


def test_sin_grupo_aplicable_se_permite_todo():
    reglas = parse_robots("User-agent: Teoma\nDisallow: /\n", UA)
    assert is_allowed(reglas, "/cualquier/cosa")


def test_gana_la_regla_mas_especifica():
    reglas = parse_robots("User-agent: *\nDisallow: /a\nAllow: /a/b\n", UA)
    assert not is_allowed(reglas, "/a/x")
    assert is_allowed(reglas, "/a/b/c")


def test_en_empate_gana_allow():
    reglas = parse_robots("User-agent: *\nDisallow: /x\nAllow: /x\n", UA)
    assert is_allowed(reglas, "/x")


def test_disallow_vacio_no_restringe_nada():
    reglas = parse_robots("User-agent: *\nDisallow:\n", UA)
    assert is_allowed(reglas, "/lo-que-sea")


def test_ignora_comentarios_y_lineas_invalidas():
    texto = "User-agent: *  # todos\nDisallow: /priv # privado\nlinea sin dos puntos\n"
    reglas = parse_robots(texto, UA)
    assert not is_allowed(reglas, "/priv/x")
    assert is_allowed(reglas, "/ok")


def test_varios_user_agent_comparten_las_reglas_del_grupo():
    reglas = parse_robots("User-agent: otro\nUser-agent: *\nDisallow: /z\n", UA)
    assert not is_allowed(reglas, "/z")


def test_signo_dolar_ancla_el_final_del_patron():
    reglas = parse_robots("User-agent: *\nDisallow: /*.pdf$\n", UA)
    assert not is_allowed(reglas, "/a.pdf")
    assert is_allowed(reglas, "/a.pdf?x=1")


def test_robots_de_santa_isabel_bloquea_solo_sus_rutas_internas():
    texto = "User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /_next/\n"
    reglas = parse_robots(texto, UA)
    assert is_allowed(reglas, "/busqueda?ft=arroz")
    assert not is_allowed(reglas, "/api/catalog")
