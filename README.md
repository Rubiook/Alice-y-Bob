# Alice & Bob y el patio

Herramienta interactiva para aprender exclusión mutua en Sistemas Operativos: Cartel, Banderas, espera aleatoria, Dekker y Peterson. Hecha con HTML, CSS y JavaScript puros, sin dependencias.

## Ver online

**https://rubiook.github.io/Alice-y-Bob/**

Se publica automáticamente con GitHub Pages (workflow `.github/workflows/pages.yml`) cada vez que se sube un cambio a `main`.

## Qué hace

- Muestra a Alice, Bob, sus perros, las banderas y el cartel en el patio compartido (el RSR).
- Presenta el pseudocódigo de cada algoritmo, con las líneas numeradas como en clase.
- Permite avanzar una línea de Alice o de Bob por vez, o al azar, para encontrar la secuencia que rompe el algoritmo.
- Arma el entrelazado de cada algoritmo: a mano o con la solución paso a paso, por niveles o completa.
- Avisa cuando los dos perros coinciden en el patio (violación de exclusión mutua) o un deadlock.

## Estructura

- `index.html`: página principal.
- `css/estilos.css`: estilos (modo claro y oscuro, versión computadora y celular).
- `js/algoritmos.js`: los 6 algoritmos con su pseudocódigo y la lógica de cada línea.
- `js/app.js`: motor de ejecución paso a paso, dibujo SVG del patio y botones.
- `js/entrelazados.js`: pestaña de entrelazados (grafo de estados, construcción a mano y solución).

## Cómo está armado el código

Cada algoritmo es un objeto de `ALGORITMOS` con una lista de líneas. Dentro de `lineas`:

- `linea(sangría, 'texto', acción, esSecciónCrítica)`: línea ejecutable. La acción recibe el estado `e` y el proceso `p` (0 = Alice, 1 = Bob). Devuelve `undefined` para pasar a la siguiente línea, `ESPERAR` para quedarse en la misma, o el número de línea (desde 0) al que saltar.
- `decorativa(sangría, 'texto')`: línea que solo se muestra, como una llave de cierre.

En los textos, `{y}` y `{o}` son las banderas propia y del otro; `{Y}` y `{O}` son los nombres en mayúscula.

## Créditos

Basado en el teórico de Sistemas Operativos del Ing. Angel Caffa:
https://teoriasistemasoperativos.blogspot.com/p/3-sistemas-operativos-concurrencia-y.html

Herramienta didáctica para estudiantes de Sistemas Operativos, Tecnólogo en Informática, UTEC Maldonado.
