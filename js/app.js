// ============================================================
// app.js · Motor de ejecución, dibujo y botones
// ============================================================
// Usa lo definido en algoritmos.js (ALGORITMOS, NOMBRES, otro, ESPERAR...).

const porId = id => document.getElementById(id);

let algoritmoActual = 0;   // índice dentro de ALGORITMOS
let estado;                // estado de la ejecución (ver algoritmos.js)
let deshacer = [];         // copias de estados anteriores, para el botón "Deshacer"

// Icono y etiqueta corta de cada algoritmo, para las tarjetas de opciones.
const ICONOS_ALG = ['🎫', '👀', '🚩', '🎲', '🧠', '🧩'];
const etiquetaAlg = a => a.usaCartel && a.usaBanderas ? 'cartel + banderas'
  : a.usaCartel ? 'cartel' : 'banderas';

// ---------- AJUSTE AUTOMÁTICO DEL SIMULADOR ----------
// Mide el contenido real y lo escala para que entre completo en la ventana (sin scroll).
let turnoAjuste = 0;
function ajustarFitSim() {
  const vista = porId('vista-sim'), fit = porId('fit-sim');
  if (!vista || !fit || vista.hidden) return;
  fit.style.transform = 'none';
  fit.style.marginBottom = '0px';
  const altoDisponible = vista.clientHeight;
  const altoNatural = fit.offsetHeight;          // alto real, medido sin escala
  if (!altoNatural || !altoDisponible) return;
  const escala = Math.min(1, altoDisponible / altoNatural);
  if (escala < 0.999) {
    fit.style.transform = `scale(${escala})`;
    fit.style.marginBottom = `${-(altoNatural - altoNatural * escala)}px`;
  }
}
function programarAjuste() {
  cancelAnimationFrame(turnoAjuste);
  turnoAjuste = requestAnimationFrame(ajustarFitSim);
}

// ---------- TEMA CLARO / OSCURO ----------
const temaEsOscuro = () => {
  const elegido = document.documentElement.dataset.theme;
  return elegido ? elegido === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
};
function pintarBotonTema() { porId('tema').textContent = temaEsOscuro() ? '☀️' : '🌙'; }
try {
  const guardado = localStorage.getItem('tema');
  if (guardado) document.documentElement.dataset.theme = guardado;
} catch (e) { /* sin almacenamiento: se usa el tema del sistema */ }
porId('tema').onclick = () => {
  const nuevo = temaEsOscuro() ? 'light' : 'dark';
  document.documentElement.dataset.theme = nuevo;
  try { localStorage.setItem('tema', nuevo); } catch (e) { /* nada */ }
  pintarBotonTema();
};
pintarBotonTema();

const estadoInicial = () => ({
  linea: [0, 0], bandera: [false, false], cartel: 0, espera: [0, 0],
  historial: [],        // pasos ejecutados, por ejemplo "A1", "B1"
  huboChoque: false,    // true si alguna vez estuvieron los dos en el patio
});
const copiar = obj => JSON.parse(JSON.stringify(obj));
const lineasEjecutables = () => ALGORITMOS[algoritmoActual].lineas.filter(l => l.ejecutable);

// ---------- MOTOR: ejecutar una línea ----------
// Ejecuta la línea actual del proceso p sobre el estado "est".
// Devuelve el número de línea que acaba de ejecutar.
function ejecutarLinea(est, p) {
  const lineas = lineasEjecutables();
  const actual = est.linea[p];
  const resultado = lineas[actual].accion(est, p);

  let siguiente;
  if (resultado === ESPERAR) siguiente = actual;               // se queda esperando
  else if (resultado === undefined) siguiente = actual + 1;    // línea siguiente
  else siguiente = resultado;                                  // salto
  if (siguiente >= lineas.length) siguiente = 0;               // fin del while (true): vuelve al inicio

  est.linea[p] = siguiente;
  return actual;
}

// ¿Están los dos en la sección crítica (los dos perros en el patio)?
function hayChoque(est) {
  const lineas = lineasEjecutables();
  return lineas[est.linea[0]].esSeccionCritica && lineas[est.linea[1]].esSeccionCritica;
}

// ¿El proceso p está esperando? Ejecuta su línea en una copia y mira si algo cambió.
function estaEsperando(p) {
  const prueba = copiar(estado);
  ejecutarLinea(prueba, p);
  const foto = e => JSON.stringify([e.linea, e.bandera, e.cartel, e.espera]);
  return foto(prueba) === foto(estado);
}

// Botón "Avanza Alice / Bob".
function avanzar(p) {
  if (hayChoque(estado)) return;   // después de un choque no se puede seguir: hay que deshacer o reiniciar
  deshacer.push(copiar(estado));
  const ejecutada = ejecutarLinea(estado, p);
  estado.historial.push('AB'[p] + (ejecutada + 1));
  if (hayChoque(estado)) estado.huboChoque = true;
  dibujar();
}

// ---------- DIBUJO DE LA ESCENA (SVG) ----------
// La escena se dibuja UNA sola vez (crearEscena). Después, actualizarEscena solo cambia posiciones
// y clases CSS; las transiciones y animaciones están en estilos.css (por eso se ven fluidas).

// Persona con dos brazos (.brazoI / .brazoD) que se mueven cuando baila.
function dibujarPersona(id, x, colorRopa, pelo) {
  return `<g id="persona${id}" class="persona ${id ? 'b' : 'a'}" transform="translate(${x},0)"><g class="cuerpoP">
    ${pelo.atras || ''}
    <rect x="-9" y="130" width="7" height="22" fill="#444"/><rect x="2" y="130" width="7" height="22" fill="#444"/>
    <rect class="brazoI" x="-19" y="102" width="6" height="24" rx="3" fill="${colorRopa}"/>
    <rect class="brazoD" x="13" y="102" width="6" height="24" rx="3" fill="${colorRopa}"/>
    <rect x="-13" y="100" width="26" height="34" rx="9" fill="${colorRopa}"/>
    <circle cy="88" r="14" fill="#f2c9a0"/>
    <path d="${pelo.arriba}" fill="#5a3a22"/>
    <circle cx="-5" cy="90" r="1.6" fill="#222"/><circle cx="5" cy="90" r="1.6" fill="#222"/>
    <path d="M-5 95q5 4 10 0" stroke="#222" fill="none"/></g></g>`;
}
// El pelo largo de Alice va DETRÁS de la cabeza, así no tapa la cara.
const PELO_ALICE = {
  atras: '<rect x="-17" y="74" width="34" height="42" rx="15" fill="#5a3a22"/>',
  arriba: 'M-14 86a14 14 0 0 1 28 0c-6-5-22-5-28 0z',
};
const PELO_BOB = { arriba: 'M-14 86a14 14 0 0 1 28 0c-8-6-20-6-28 0z' };

// x = posición en la casa; espejo = 1 mira a la derecha, -1 a la izquierda.
// Capas: .perro (camina al patio, se pone gris si muere) > .rebote (saltitos, se da vuelta si muere)
// > partes: .cola (se mueve siempre), .patat (pata trasera, se levanta para hacer pis), .ojos / .xojo.
// .pis (chorro y charco) va aparte para que no se mueva con el cuerpo.
function dibujarPerro(id, x, color, espejo) {
  return `<g id="perro${id}" class="perro"><g transform="translate(${x},152) scale(${espejo},1)"><g class="rebote">
    <path class="cola" d="M-16 -16q-10-6-8-15" stroke="${color}" stroke-width="4" fill="none" stroke-linecap="round"/>
    <ellipse cy="-14" rx="17" ry="9" fill="${color}"/>
    <rect class="patat" x="-12" y="-8" width="4" height="8" fill="${color}"/><rect x="8" y="-8" width="4" height="8" fill="${color}"/>
    <circle cx="17" cy="-23" r="8" fill="${color}"/><ellipse cx="13" cy="-27" rx="3" ry="6" fill="#0004"/>
    <circle class="ojos" cx="19" cy="-24" r="1.6" fill="#222"/><circle cx="24" cy="-21" r="2" fill="#222"/>
    <path class="xojo" d="M16.5 -26.5l5 5M21.5 -26.5l-5 5" stroke="#222" stroke-width="1.6" fill="none"/></g>
    <g class="pis"><path class="chorro" d="M-5 -6q12-6 22 7" stroke="#f1c40f" stroke-width="2" fill="none" stroke-dasharray="3 2"/>
    <ellipse class="charco" cx="22" cy="0.5" rx="8" ry="2" fill="#f1c40f" opacity=".85"/></g></g></g>`;
}

// La tela se dibuja arriba del palo; para "bajarla" se la desplaza 73 px (ver actualizarEscena).
function dibujarBandera(id, x, color, direccion) {
  return `<line x1="${x}" y1="52" x2="${x}" y2="152" stroke="#777" stroke-width="3"/>
    <g transform="translate(${x},55) scale(${direccion},1)"><g id="tela${id}" class="tela">
    <path class="onda" d="M3 0h26l-6 9 6 9H3z" fill="${color}"/></g></g>`;
}

// Casa alta: la pared llega hasta y=62 y el techo hasta y=30, así los personajes entran enteros.
const dibujarCasa = transformacion => `<g transform="${transformacion}">
  <polygon points="3,62 55,30 107,62" fill="#b5533c"/><rect x="10" y="62" width="90" height="91" fill="#f1dfc2"/>
  <rect x="62" y="96" width="20" height="57" fill="#8a5a33"/></g>`;

// Estrella de n puntas (para la explosión).
const estrella = (r1, r2, n) => Array.from({ length: 2 * n }, (_, i) => {
  const r = i % 2 ? r2 : r1, a = Math.PI * i / n;
  return `${(r * Math.cos(a)).toFixed(1)},${(r * Math.sin(a)).toFixed(1)}`;
}).join(' ');

function crearEscena() {
  const chispas = Array.from({ length: 8 }, (_, i) => {
    const a = Math.PI * i / 4 + .3;
    return `<circle class="chispa" r="3.5" fill="#f9a825" style="--dx:${(Math.cos(a) * 62).toFixed(0)}px;--dy:${(Math.sin(a) * 48).toFixed(0)}px"/>`;
  }).join('');
  return `<svg viewBox="0 0 400 185" role="img" aria-label="Patio compartido de Alice y Bob">
    <rect id="patio" x="120" y="62" width="160" height="92" rx="8" fill="var(--patio)" stroke="#8a8a80" stroke-width="2" stroke-dasharray="6 4"/>
    <text x="200" y="146" text-anchor="middle" font-size="11" fill="var(--mut)">PATIO (RSR)</text>
    ${dibujarCasa('translate(0,0)')}${dibujarCasa('translate(400,0) scale(-1,1)')}
    ${dibujarPersona(0, 30, '#d9485f', PELO_ALICE)}${dibujarPersona(1, 370, '#2f6fdb', PELO_BOB)}
    ${dibujarPerro(0, 78, '#c68b4e', 1)}${dibujarPerro(1, 322, '#555', -1)}
    <g id="banderas">${dibujarBandera(0, 112, '#d9485f', 1)}${dibujarBandera(1, 288, '#2f6fdb', -1)}</g>
    <g id="cartelG"><rect x="197" y="40" width="6" height="112" fill="#8a5a33"/>
      <rect x="156" y="8" width="88" height="38" rx="5" fill="#e7c07f" stroke="#8a5a33" stroke-width="2"/>
      <text x="200" y="22" text-anchor="middle" font-size="10" fill="#3b2a1a">cartel</text>
      <text id="cartelNombre" x="200" y="39" text-anchor="middle" font-size="15" font-weight="800" fill="#3b2a1a"></text></g>
    <g id="deadlock"><g transform="translate(200,106)"><g class="candado">
      <path d="M-8 -4v-9a8 8 0 0 1 16 0v9" fill="none" stroke="#e8890c" stroke-width="5"/>
      <rect x="-15" y="-4" width="30" height="26" rx="4" fill="#e8890c"/>
      <circle cy="6" r="3.5" fill="#3b2a1a"/><rect x="-1.5" y="6" width="3" height="9" fill="#3b2a1a"/></g></g>
      <text x="200" y="56" text-anchor="middle" font-size="19" font-weight="800" fill="#e8890c" stroke="#fff" stroke-width=".6">¡DEADLOCK!</text></g>
    <text id="choque" x="200" y="56" text-anchor="middle" font-size="20" font-weight="800" fill="#e03131">¡CHOQUE!</text>
    <g id="explosion" transform="translate(200,108)">
      <polygon class="estallido" points="${estrella(46, 24, 12)}" fill="#e03131"/>
      <polygon class="estallido" points="${estrella(34, 17, 10)}" fill="#f57c00"/>
      <circle class="estallido" r="15" fill="#ffee58"/>${chispas}</g>
    <text x="55" y="172" text-anchor="middle" font-size="12" fill="var(--fg)">Casa de Alice</text>
    <text x="345" y="172" text-anchor="middle" font-size="12" fill="var(--fg)">Casa de Bob</text></svg>`;
}

// Cambia lo que hay que cambiar según el estado; el CSS se encarga de animarlo.
function actualizarEscena(esperando) {
  const a = ALGORITMOS[algoritmoActual], lineas = lineasEjecutables();
  const choque = !!hayChoque(estado);                                 // !! para que sea true/false (classList.toggle lo necesita)
  const deadlock = !choque && esperando[0] && esperando[1];
  const sc = lineas.findIndex(l => l.esSeccionCritica);               // línea de la sección crítica
  porId('patio').setAttribute('stroke', choque ? '#e03131' : deadlock ? '#e8890c' : '#8a8a80');
  [0, 1].forEach(p => {
    const linea = lineas[estado.linea[p]];
    const enPatio = !!linea.esSeccionCritica, ocupado = linea.texto === OTRAS_TAREAS;
    const perro = porId('perro' + p).classList;
    porId('perro' + p).style.transform = `translateX(${enPatio ? (p ? -90 : 90) : 0}px)`;   // el perro camina al patio
    perro.toggle('paseando', enPatio);                                  // en el patio: se levanta la pata y hace pis
    perro.toggle('ansioso', !enPatio && estado.linea[p] < sc);          // antes de salir: cola rapidísima
    perro.toggle('relajado', ocupado);                                  // ya volvió y su dueño hace otras tareas: cola lenta
    perro.toggle('muerto', choque);                                     // choque: muere
    porId('tela' + p).style.transform = `translateY(${estado.bandera[p] ? 0 : 73}px)`;         // la bandera sube o baja
    porId('tela' + p).classList.toggle('arriba', estado.bandera[p]);                           // y ondea cuando está arriba
    const persona = porId('persona' + p).classList;
    persona.toggle('ocupado', ocupado);                                 // otras tareas: Alice hace el Floss, Bob baila
    persona.toggle('esperando', esperando[p] && !enPatio);              // se balancea impaciente
  });
  porId('banderas').style.display = a.usaBanderas ? '' : 'none';
  porId('cartelG').style.display = a.usaCartel ? '' : 'none';
  porId('cartelNombre').textContent = NOMBRES[estado.cartel].toUpperCase();
  porId('choque').classList.toggle('visible', choque);
  porId('explosion').classList.toggle('visible', choque);
  porId('deadlock').classList.toggle('visible', deadlock);
}

// ---------- PANELES DE TEXTO ----------
// Devuelve [clase, mensaje] para el cartel de estado.
function calcularMensaje() {
  if (hayChoque(estado)) return ['bad', '¡Los dos perros están en el patio! Se violó la exclusión mutua. No se puede seguir: deshacé el último paso o reiniciá.'];
  if (estaEsperando(0) && estaEsperando(1)) return ['warn', 'Deadlock: ninguno puede avanzar. Los dos quedan esperando para siempre.'];
  if (estado.huboChoque) return ['bad', 'Ya hubo un choque en esta secuencia. Reiniciá para probar otra.'];
  return ['ok', 'Hasta acá, sin choques: nunca estuvieron los dos en el patio.'];
}

const crearEtiqueta = (nombre, valor, activa) =>
  `<span class="chip${activa ? ' on' : ''}">${nombre} = <b>${valor}</b></span>`;

// Columna de código de un proceso. Resalta la línea actual y marca la espera.
function dibujarCodigo(p, esperando) {
  let contador = 0;
  let html = `<div class="hd" style="color:${p ? 'var(--bo)' : 'var(--al)'}">${NOMBRES[p]}</div>
    <div class="ln"><b></b>while (true) {</div>`;
  for (const l of ALGORITMOS[algoritmoActual].lineas) {
    let numero = '', esActual = false;
    if (l.ejecutable) {
      esActual = contador === estado.linea[p];
      numero = (contador + 1) + (p ? '′' : '');   // 1, 2, 3...  y  1′, 2′, 3′... para Bob
      contador++;
    }
    const clases = 'ln' + (esActual ? ' cur' : '') + (esActual && esperando ? ' spin' : '') + (l.esSeccionCritica ? ' sc' : '');
    const texto = ('  '.repeat(l.sangria) + escribirTexto(l.texto, p)).replace(/&/g, '&amp;');
    html += `<div class="${clases}"><b>${numero}</b>${texto}</div>`;
  }
  return html + '<div class="ln"><b></b>}</div>';
}

// Redibuja toda la pantalla según el estado actual.
function dibujar() {
  const a = ALGORITMOS[algoritmoActual];
  const esperando = [estaEsperando(0), estaEsperando(1)];
  const [clase, mensaje] = calcularMensaje();

  [...porId('nav').children].forEach((b, i) => {
    b.classList.toggle('on', i === algoritmoActual);
    b.setAttribute('aria-pressed', i === algoritmoActual);
  });
  porId('tt').textContent = (algoritmoActual + 1) + '. ' + a.nombre;
  porId('ds').textContent = a.descripcion;
  porId('vd').textContent = a.veredicto;
  actualizarEscena(esperando);

  let variables = '';
  if (a.usaCartel) variables += crearEtiqueta('cartel', NOMBRES[estado.cartel].toUpperCase(), true);
  if (a.usaBanderas) variables += crearEtiqueta('banderaAlice', estado.bandera[0], estado.bandera[0])
                                + crearEtiqueta('banderaBob', estado.bandera[1], estado.bandera[1]);
  [0, 1].forEach(p => { if (estado.espera[p] > 0) variables += crearEtiqueta(NOMBRES[p] + ' espera', estado.espera[p], false); });
  porId('vr').innerHTML = variables;

  porId('st').className = clase;
  porId('st').textContent = mensaje;
  porId('cols').innerHTML = [0, 1].map(p => `<div class="col">${dibujarCodigo(p, esperando[p])}</div>`).join('');
  porId('lg').textContent = 'Secuencia: ' + (estado.historial.slice(-30).join(' ') || '(todavía ninguna)') + '  ·  A = Alice, B = Bob';
  const choque = !!hayChoque(estado);
  ['ba', 'bb', 'bz'].forEach(id => porId(id).disabled = choque);   // Avanza Alice / Bob / Al azar
  porId('bu').disabled = deshacer.length === 0;
  programarAjuste();   // el alto del contenido cambia: se vuelve a encajar en pantalla
}

// ---------- BOTONES ----------
function elegirAlgoritmo(i) {
  algoritmoActual = i;
  estado = estadoInicial();
  deshacer = [];
  porId('dt').open = false;
  dibujar();
}

porId('sc').innerHTML = crearEscena();   // la escena se crea una sola vez
porId('nav').innerHTML = ALGORITMOS.map((a, i) => `<button class="alg" type="button" aria-pressed="false">
    <span class="alg-ico" aria-hidden="true">${ICONOS_ALG[i] || '•'}</span>
    <span class="alg-txt"><b>${a.nombreCorto}</b><small>${etiquetaAlg(a)}</small></span>
  </button>`).join('');
[...porId('nav').children].forEach((boton, i) => boton.onclick = () => elegirAlgoritmo(i));
porId('ba').onclick = () => avanzar(0);
porId('bb').onclick = () => avanzar(1);
porId('bz').onclick = () => avanzar(Math.random() < 0.5 ? 0 : 1);
porId('bu').onclick = () => { if (deshacer.length) { estado = deshacer.pop(); dibujar(); } };
porId('br').onclick = () => elegirAlgoritmo(algoritmoActual);

// Reencajar el simulador cuando cambia el tamaño de la ventana o se abre el veredicto.
addEventListener('resize', programarAjuste);
if (window.visualViewport) visualViewport.addEventListener('resize', programarAjuste);
porId('dt').addEventListener('toggle', programarAjuste);
addEventListener('load', programarAjuste);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(programarAjuste);

elegirAlgoritmo(0);
