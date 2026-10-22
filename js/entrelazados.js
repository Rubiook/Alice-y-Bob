// ============================================================
// entrelazados.js · Pestaña "Entrelazados"
// ============================================================
// Un ENTRELAZADO es el mapa de todas las formas de intercalar las líneas
// de Alice y de Bob. Cada NODO es un estado: (línea de Alice, línea de Bob,
// valor del cartel y de las banderas). Cada ARISTA es "avanzó Alice" (→)
// o "avanzó Bob" (↓). Usa lo de algoritmos.js y app.js.
//
// Columnas de la grilla = huecos entre las líneas de Alice, filas = huecos entre las líneas de Bob.
// A la izquierda de una línea todavía no se ejecutó; a la derecha (o abajo, en Bob) ya se ejecutó.
// El algoritmo 4 no está: tiene un random y no admite entrelazado exhaustivo.
// ============================================================

const ALGORITMOS_ENT = [0, 1, 2, 4, 5];   // índices de ALGORITMOS que sí se pueden entrelazar

// ============================================================
// CONFIGURACIÓN: todos los números que mueven el dibujo están acá (en px, antes de la escala automática).
// Cambiá un valor, guardá y recargá la página.
// ============================================================
const CONFIG_ENT = {
  // Tamaño de los nodos (los cuadraditos con A·VF, B·FF...)
  nodo: { fuente: 16, anchoMin: 80, altoMin: 42, relleno: '8px 12px' },

  // Casilla = nodo CENTRADO + espacio libre a cada lado (por ahí pasan las flechas de retorno).
  // Conviene que arriba = abajo e izquierda = derecha para que el nodo quede en el medio.
  // Toda casilla tiene como MÍNIMO el tamaño de un nodo más este espacio; si hay más nodos, crece.
  celda: { arriba: 56, izquierda: 52, derecha: 52, abajo: 56, separacion: 16 },   // separacion = hueco entre dos nodos apilados en la misma casilla

  flechas: {
    grosor: 3,          // grosor normal
    grosorRuta: 5,      // grosor del camino del nodo elegido
    atenuada: 0.45,     // opacidad de las flechas que NO son del camino (1 = sin atenuar)
    carriles: 2,        // cuántos carriles distintos hay por fila (Alice) y por columna (Bob) antes de repetir
    suavidad: 1,        // curvatura de los ganchos: 0 = con esquinas, 1 = curvas suaves, hasta 1.5 = más redondeadas
    radio: 10,          // redondeo de la llegada al nodo (la flecha se endereza los últimos px para que la punta quede derecha)
    llegada: 12,        // si llegan varias flechas a la misma esquina (o a nodos apilados), cuánto se separan
    punto: 3.5,         // radio del puntito que marca de qué nodo sale cada gancho
    trazos: ['none', '9 5'],   // estilo de línea de cada carril: 'none' = continua, '9 5' = rayas (largo y hueco)
  },

  // Gancho de retorno de Alice: sale en diagonal por la ESQUINA SUPERIOR DERECHA del nodo, cruza la línea
  // de la derecha, sube a su carril y vuelve hacia la izquierda por arriba hasta el nodo de destino.
  alice: {
    esquina: 8,         // a cuántos px del borde derecho del nodo nace
    salida0: 8,         // cuánto pasa de la línea vertical (primer carril)
    salidaSep: 6,       // cuánto más pasa cada carril siguiente
    subida: 10,         // cuánto sube en diagonal antes de curvar hacia el carril
    carril0: 24,        // altura del carril de vuelta, medida desde la línea horizontal de arriba (primer carril)
    separacion: 8,      // separación entre carriles de vuelta
  },

  // Gancho de retorno de Bob: sale en diagonal por la ESQUINA INFERIOR IZQUIERDA, cruza la línea de abajo,
  // sube por un carril a la izquierda de la columna y entra al nodo de destino por su izquierda.
  bob: {
    esquina: 8,         // a cuántos px del borde izquierdo del nodo nace
    bajada0: 5,         // cuánto pasa de la línea horizontal (primer carril)
    bajadaSep: 5,       // cuánto más pasa cada carril siguiente
    carril0: 22,        // distancia desde la línea vertical izquierda hasta el carril de subida (primer carril)
    carrilSep: 7,       // separación entre carriles de subida
    subida: 10,         // cuánto se desvía en diagonal antes de curvar hacia el carril
  },

  // Bucles de espera: Alice, un lazo HORIZONTAL que sale por la derecha del nodo; Bob, un lazo VERTICAL que sale por abajo.
  // Los dos cruzan la línea que ejecutan y vuelven al mismo nodo.
  bucle: {
    salida: 12,         // cuánto pasa de la línea que cruza (el lazo siempre llega hasta la línea y la pasa este tanto)
    ancho: 12,          // cuánto se abren las dos hebras del lazo
  },

  // Líneas de la cuadrícula
  cuadricula: { grosor: 1.5, grosorCritica: 4, opacidad: 0.35, fundido: 60 },   // fundido = largo del degradé final

  // Escala automática: se achica para entrar en pantalla, pero nunca por debajo de estos mínimos
  escala: { minimoPC: 0.5, minimoMovil: 0.7 },
};

// Pasa los tamaños de CONFIG_ENT al CSS (variables que usan .nodo y .celda).
function aplicarConfig() {
  const s = porId('vista-ent').style, n = CONFIG_ENT.nodo, c = CONFIG_ENT.celda;
  s.setProperty('--n-fuente', n.fuente + 'px'); s.setProperty('--n-ancho', n.anchoMin + 'px');
  s.setProperty('--n-alto', n.altoMin + 'px'); s.setProperty('--n-relleno', n.relleno);
  s.setProperty('--c-arriba', c.arriba + 'px'); s.setProperty('--c-izquierda', c.izquierda + 'px');
  s.setProperty('--c-derecha', c.derecha + 'px'); s.setProperty('--c-abajo', c.abajo + 'px');
  s.setProperty('--c-gap', c.separacion + 'px');
}

const ent = {
  alg: 0,          // algoritmo elegido
  bucle: false,    // true = con while (true): al terminar vuelve a la línea 1
  nodos: [],       // todos los estados descubiertos (el id es la posición en la lista)
  mapa: new Map(), // clave del estado -> nodo (para no repetir estados)
  aristas: [],     // {de, a, p}: del nodo "de" al nodo "a" avanzando el proceso p
  sel: 0,          // id del nodo seleccionado
};

const lineasEnt = () => ALGORITMOS[ent.alg].lineas.filter(l => l.ejecutable);
const terminoEnt = (est, p) => est.linea[p] >= lineasEnt().length;      // ¿p ya terminó (sin bucle)?
const claveEnt = e => `${e.linea}|${e.bandera}|${e.cartel}`;             // identifica un estado

// Ejecuta UNA línea del proceso p y devuelve el estado nuevo (no modifica el original).
function pasoEnt(est, p) {
  const L = lineasEnt(), e = copiar(est);
  const r = L[e.linea[p]].accion(e, p);
  let sig = r === ESPERAR ? e.linea[p] : r === undefined ? e.linea[p] + 1 : r;
  if (sig >= L.length) sig = ent.bucle ? 0 : L.length;   // fin: vuelve al inicio o termina
  e.linea[p] = sig;
  return e;
}

// ¿Están los dos en la sección crítica? (la "zona prohibida")
function choqueEnt(e) {
  const L = lineasEnt();
  return !!(L[e.linea[0]] && L[e.linea[0]].esSeccionCritica && L[e.linea[1]] && L[e.linea[1]].esSeccionCritica);
}

// ---------- Construcción del grafo ----------
function crearNodo(est, padre, p) {
  const clave = claveEnt(est);
  if (ent.mapa.has(clave)) return ent.mapa.get(clave);   // ese estado ya existía
  const nd = { id: ent.nodos.length, est, clave, mov: [null, null], terminal: choqueEnt(est),
    padre: padre ? padre.id : null, paso: padre ? 'AB'[p] + (padre.est.linea[p] + 1) : '',
    nivel: padre ? padre.nivel + 1 : 0 };
  ent.nodos.push(nd); ent.mapa.set(clave, nd);
  return nd;
}

// Avanza al proceso p desde el nodo nd. nd.mov[p] guarda el resultado:
// null = todavía no hecho, 'espera' = se queda esperando, número = id del nodo nuevo.
function mover(nd, p) {
  if (nd.terminal || nd.mov[p] !== null || terminoEnt(nd.est, p)) return;
  const nuevo = pasoEnt(nd.est, p);
  if (claveEnt(nuevo) === nd.clave) { nd.mov[p] = 'espera'; return; }   // nada cambió: busy waiting
  const hijo = crearNodo(nuevo, nd, p);
  nd.mov[p] = hijo.id;
  ent.aristas.push({ de: nd.id, a: hijo.id, p });
}

const pendiente = nd => !nd.terminal && [0, 1].some(p => !terminoEnt(nd.est, p) && nd.mov[p] === null);
const expandir = nd => { mover(nd, 0); mover(nd, 1); };
// Deadlock: todos los que pueden avanzar están esperando.
const enDeadlock = nd => !nd.terminal && [0, 1].every(p => terminoEnt(nd.est, p) || nd.mov[p] === 'espera')
                      && [0, 1].some(p => !terminoEnt(nd.est, p));

function mostrarTodo() { let nd; while ((nd = ent.nodos.find(pendiente)) && ent.nodos.length < 2500) expandir(nd); }

function rutaEnt(nd) {   // camino desde el inicio hasta nd
  const ids = [], pasos = [];
  while (nd) { ids.push(nd.id); if (nd.padre !== null) pasos.unshift(nd.paso); nd = ent.nodos[nd.padre]; }
  return { ids, pasos };
}

// ---------- Dibujo ----------
function etiquetaNodo(e) {
  const a = ALGORITMOS[ent.alg], partes = [];
  if (a.usaCartel) partes.push(NOMBRES[e.cartel][0]);                       // A o B
  if (a.usaBanderas) partes.push(e.bandera.map(b => b ? 'V' : 'F').join(''));  // V = true, F = false
  return partes.join('·');
}

function dibujarGrilla() {
  const L = lineasEnt(), n = L.length, cols = n + 1;   // siempre n+1 huecos: el último es "ya terminó" (sin bucle) o queda vacío (con bucle), así la grilla no cambia
  const ruta = new Set(rutaEnt(ent.nodos[ent.sel]).ids);
  const celdas = Array.from({ length: cols * cols }, () => []);
  ent.nodos.forEach(nd => celdas[nd.est.linea[1] * cols + nd.est.linea[0]].push(nd));
  celdas.forEach(lista => lista.forEach((nd, i) => { nd.idxCelda = i; nd.nCelda = lista.length; }));   // posición dentro de la casilla
  // Las líneas de código son las divisiones y los estados viven en los HUECOS entre ellas:
  // el hueco i es "ya ejecuté i líneas, estoy por ejecutar la siguiente".
  // Las franjas vacías de arriba (data-c) y de la izquierda (data-f) solo sirven para medir dónde van las divisiones.
  let h = '<div class="franja-v"></div>' + Array.from({ length: cols }, (_, i) => `<div class="franja-h" data-c="${i}"></div>`).join('');
  for (let j = 0; j < cols; j++) {
    h += `<div class="franja-v" data-f="${j}"></div>`;
    for (let i = 0; i < cols; i++) {
      h += '<div class="celda">' + celdas[j * cols + i].map(nd => {
        const clases = 'nodo' + (pendiente(nd) ? '' : ' hecho') + (nd.terminal ? ' mala' : enDeadlock(nd) ? ' deadlock' : '')
          + (nd.id === ent.sel ? ' sel' : '') + (ruta.has(nd.id) ? ' ruta' : '');
        return `<button class="${clases}" data-id="${nd.id}">${etiquetaNodo(nd.est)}</button>`;
      }).join('') + '</div>';
    }
  }
  const g = porId('en-grid');
  g.style.gridTemplateColumns = `auto repeat(${cols}, auto)`;
  g.innerHTML = h;
  dibujarCapas(g, ruta, n);
  ajustarEscala();
}

// Capa SVG sobre la grilla: zona prohibida, líneas de código, flechas curvas y bucles de espera.
// Todas las posiciones se miden de los elementos reales.
function dibujarCapas(g, ruta, n) {
  const L = lineasEnt(), hc = [...g.querySelectorAll('[data-c]')], hf = [...g.querySelectorAll('[data-f]')];
  const izq = i => hc[i].offsetLeft, der = i => hc[i].offsetLeft + hc[i].offsetWidth;   // bordes del hueco i de Alice
  const arr = j => hf[j].offsetTop, aba = j => hf[j].offsetTop + hf[j].offsetHeight;    // bordes del hueco j de Bob
  const W = g.scrollWidth, H = g.scrollHeight;
  const rotY = hc[0].offsetTop + hc[0].offsetHeight / 2;                                 // y de los números de Alice
  const rotX = hf[0].offsetLeft + hf[0].offsetWidth / 2;                                 // x de los números de Bob
  // Degradé para que las líneas de la cuadrícula sigan más allá de la última división y se desvanezcan.
  const FUN = CONFIG_ENT.cuadricula.fundido;
  const fundido = (id, h, c, op) => `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${h ? W - FUN : 0}" y1="${h ? 0 : H - FUN}" x2="${h ? W : 0}" y2="${h ? 0 : H}"><stop offset="0" stop-color="${c}" stop-opacity="${op}"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></linearGradient>`;
  const marcador = (id, c) => `<marker id="${id}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path d="M0 0L10 5L0 10z" fill="${c}"/></marker>`;
  let s = `<svg id="en-svg" width="${W}" height="${H}" style="width:${W}px;height:${H}px;max-width:none"><defs>${marcador('fa', '#d9485f')}${marcador('fb', '#2f6fdb')}${fundido('fvn', 0, 'var(--fg)', CONFIG_ENT.cuadricula.opacidad)}${fundido('fhn', 1, 'var(--fg)', CONFIG_ENT.cuadricula.opacidad)}${fundido('fvr', 0, '#e03131', 1)}${fundido('fhr', 1, '#e03131', 1)}
    <pattern id="raya" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="5" height="10" fill="#e03131" opacity=".4"/></pattern></defs>`;

  // Zona prohibida: 4 casillas, todas con el mismo estilo. Un proceso está "adentro" desde que está por
  // ejecutar la sección crítica (hueco sc) hasta que la terminó (hueco sc+1). Si el otro también
  // estuviera adentro, se rompería la exclusión mutua.
  const sc = L.findIndex(l => l.esSeccionCritica);
  for (const a of [sc, sc + 1]) for (const b of [sc, sc + 1]) {
    s += `<rect x="${izq(a)}" y="${arr(b)}" width="${der(a) - izq(a)}" height="${aba(b) - arr(b)}"
      fill="url(#raya)" stroke="#e03131" stroke-width="2" stroke-dasharray="6 4"/>`;
  }

  // Líneas de código: la línea k está a la derecha del hueco k-1. Las de la sección crítica, rojas y gruesas.
  let rotulos = '';
  const rotulo = (x, y, texto, es, color) => `<circle cx="${x}" cy="${y}" r="16" fill="${es ? '#e03131' : 'var(--bg)'}" stroke="${es ? '#e03131' : color}" stroke-width="2"/>
    <text x="${x}" y="${y + 5}" text-anchor="middle" font-size="15" font-weight="700" fill="${es ? '#fff' : color}">${texto}</text>`;
  for (let k = 0; k < n; k++) {
    const es = L[k].esSeccionCritica, t = es ? 'r' : 'n', ancho = es ? CONFIG_ENT.cuadricula.grosorCritica : CONFIG_ENT.cuadricula.grosor;
    s += `<line x1="${der(k)}" y1="${rotY}" x2="${der(k)}" y2="${H}" stroke="url(#fv${t})" stroke-width="${ancho}"/><line x1="${rotX}" y1="${aba(k)}" x2="${W}" y2="${aba(k)}" stroke="url(#fh${t})" stroke-width="${ancho}"/>`;
    rotulos += rotulo(der(k), rotY, k + 1, es, '#d9485f') + rotulo(rotX, aba(k), (k + 1) + '′', es, '#2f6fdb');
  }

  // Posición de cada nodo: [centro x, centro y, medio ancho, medio alto]
  const pos = {};
  g.querySelectorAll('.nodo').forEach(b => {
    pos[b.dataset.id] = [b.offsetLeft + b.offsetWidth / 2, b.offsetTop + b.offsetHeight / 2, b.offsetWidth / 2, b.offsetHeight / 2];
  });
  const borde = (u, hw, hh) => Math.min(hw / (Math.abs(u[0]) || 1e-9), hh / (Math.abs(u[1]) || 1e-9));
  const color = p => p ? '#2f6fdb' : '#d9485f';
  // Atenuación: si hay un camino marcado, solo se ven con fuerza las flechas de ese camino
  // y las que salen del nodo elegido. Las demás quedan tenues.
  const hayRuta = ruta.size > 1;
  const flecha = (d, p, grosor, activa) => `<path d="${d}" fill="none" stroke="${color(p)}" stroke-width="${grosor}" stroke-linecap="round" stroke-linejoin="round" opacity="${activa ? 1 : CONFIG_ENT.flechas.atenuada}" marker-end="url(#${p ? 'fb' : 'fa'})"/>`;
  const carriles = [{}, {}];   // cuántos carriles ya se usaron por fila (Alice) o por columna (Bob)
  const F = CONFIG_ENT.flechas, CA = CONFIG_ENT.alice, CB = CONFIG_ENT.bob, CL = CONFIG_ENT.bucle;
  const carril = (p, i) => (carriles[p][i] = (carriles[p][i] ?? -1) + 1) % F.carriles;   // 0, 1, ...

  const pt = (x, y) => `${x.toFixed(1)},${y.toFixed(1)}`;
  // Flecha de retorno: con estilo de línea según el carril y un puntito donde nace, para distinguir cuál es cuál.
  const gancho = (d, p, grosor, activa, origen, k) =>
    flecha(d, p, grosor, activa).replace('<path ', `<path stroke-dasharray="${F.trazos[k % F.trazos.length]}" `)
    + `<circle cx="${origen[0].toFixed(1)}" cy="${origen[1].toFixed(1)}" r="${F.punto}" fill="${color(p)}" opacity="${activa ? 1 : F.atenuada}"/>`;

  // Retorno de Alice, en dos curvas de Bézier:
  //  1) sale en diagonal por la esquina superior derecha, cruza la línea de la derecha y sube al carril (S -> Q)
  //  2) vuelve por el carril hacia la izquierda y baja al nodo de destino (Q -> destino)
  const ganchoAlice = (A, col, fila, k, bx, destinoY) => {
    const [x, y, hw, hh] = A, top = y - hh, S = [x + hw - CA.esquina, top], sv = F.suavidad, R = 8 * sv;
    const xm = der(col) + CA.salida0 + CA.salidaSep * k, yl = arr(fila) + CA.carril0 + CA.separacion * k;
    const Q = [xm - 6 * sv, yl], rr = Math.max(0, Math.min(F.radio * Math.min(sv, 1), destinoY - yl - 12));   // rr: radio de la curva de llegada
    return [`M${pt(...S)} C${pt(xm + R, top - CA.subida)} ${pt(xm + R, yl)} ${pt(...Q)} `
      + `L${pt(bx + rr, yl)} C${pt(bx + rr * .45, yl)} ${pt(bx, yl + rr * .55)} ${pt(bx, yl + rr)} L${pt(bx, destinoY)}`, S];
  };
  // Retorno de Bob: lo mismo "girado": esquina inferior izquierda, cruza la línea de abajo,
  // sube por un carril a la izquierda y entra al nodo de destino por su izquierda.
  const ganchoBob = (A, col, fila, k, by, destinoX) => {
    const [x, y, hw, hh] = A, bottom = y + hh, S = [x - hw + CB.esquina, bottom], sv = F.suavidad, R = 8 * sv;
    const ym = aba(fila) + CB.bajada0 + CB.bajadaSep * k, lx = izq(col) + CB.carril0 + CB.carrilSep * k;
    const Q = [lx, ym - 6 * sv], rr = Math.max(0, Math.min(F.radio * Math.min(sv, 1), destinoX - lx - 12));
    return [`M${pt(...S)} C${pt(S[0] - CB.subida, ym + R)} ${pt(lx, ym + R)} ${pt(...Q)} `
      + `L${pt(lx, by + rr)} C${pt(lx, by + rr * .45)} ${pt(lx + rr * .55, by)} ${pt(lx + rr, by)} L${pt(destinoX, by)}`, S];
  };
  // Bucles de espera: un lazo que sale del nodo, cruza la línea y vuelve al mismo nodo.
  // S = donde sale, E = donde vuelve a entrar, A = la punta del lazo. Las dos "hebras" se abren CL.ancho
  // hacia los costados (perpendicular a la dirección de la punta) para que se vea un lazo y no una línea doble.
  const gota = (S, E, A) => {
    const m = [(S[0] + E[0]) / 2, (S[1] + E[1]) / 2], d = [A[0] - m[0], A[1] - m[1]], l = Math.hypot(d[0], d[1]) || 1;
    let n = [-d[1] / l, d[0] / l];
    if (n[0] * (S[0] - E[0]) + n[1] * (S[1] - E[1]) < 0) n = [-n[0], -n[1]];   // n apunta del lado de E hacia el lado de S
    const c1 = [S[0] + (A[0] - S[0]) * 1.4 + n[0] * CL.ancho, S[1] + (A[1] - S[1]) * 1.4 + n[1] * CL.ancho];
    const c2 = [E[0] + (A[0] - E[0]) * 1.4 - n[0] * CL.ancho, E[1] + (A[1] - E[1]) * 1.4 - n[1] * CL.ancho];
    return `M${pt(...S)} C${pt(...c1)} ${pt(...c2)} ${pt(...E)}`;
  };
  const bucleAlice = (P, col) => {   // horizontal, hacia la derecha
    const [x, y, hw, hh] = P, S = [x + hw, y - hh * .3];
    return [gota(S, [x + hw + 2, y + hh * .3], [der(col) + CL.salida, y]), S];
  };
  const bucleBob = (P, fila) => {     // vertical, hacia abajo
    const [x, y, hw, hh] = P, S = [x - hw * .3, y + hh];
    return [gota(S, [x + hw * .3, y + hh + 2], [x, aba(fila) + CL.salida]), S];
  };

  for (const ar of ent.aristas) {
    const A = pos[ar.de], B = pos[ar.a];
    if (!A || !B) continue;
    const de = ent.nodos[ar.de], a = ent.nodos[ar.a], p = ar.p;
    const enRuta = ruta.has(ar.de) && ruta.has(ar.a) && a.padre === ar.de;
    const activa = !hayRuta || enRuta || ar.de === ent.sel, grosor = enRuta ? F.grosorRuta : F.grosor;
    const col = de.est.linea[0], fila = de.est.linea[1];   // hueco de Alice (columna) y de Bob (fila) de origen

    if (a.est.linea[p] > de.est.linea[p]) {
      // AVANCE: curva suave entre los dos nodos (Alice se curva hacia arriba, Bob hacia la derecha).
      const dx = B[0] - A[0], dy = B[1] - A[1], len = Math.hypot(dx, dy) || 1, u = [dx / len, dy / len];
      const t1 = borde(u, A[2], A[3]), t2 = borde(u, B[2], B[3]) + 3;
      if (len <= t1 + t2) continue;
      const sx = A[0] + u[0] * t1, sy = A[1] + u[1] * t1, ex = B[0] - u[0] * t2, ey = B[1] - u[1] * t2;
      const curvatura = Math.min(70, Math.max(24, len * .25));
      s += flecha(`M${sx},${sy} Q${(sx + ex) / 2 + u[1] * curvatura},${(sy + ey) / 2 - u[0] * curvatura} ${ex},${ey}`, p, grosor, activa);
    } else if (p === 0) {
      const k = carril(0, fila), [d, o] = ganchoAlice(A, col, fila, k, B[0] + B[2] - CA.esquina - (a.idxCelda * F.carriles + k) * F.llegada, B[1] - B[3] - 3);
      s += gancho(d, p, grosor, activa, o, k);
    } else {
      const k = carril(1, col), [d, o] = ganchoBob(A, col, fila, k, B[1] + B[3] - CB.esquina - k * F.llegada, B[0] - B[2] - 3);
      s += gancho(d, p, grosor, activa, o, k);
    }
  }
  for (const nd of ent.nodos) {
    const P = pos[nd.id];
    if (!P) continue;
    const activa = !hayRuta || nd.id === ent.sel;
    if (nd.mov[0] === 'espera') { const [d, o] = bucleAlice(P, nd.est.linea[0]); s += gancho(d, 0, F.grosor, activa, o, 0); }
    if (nd.mov[1] === 'espera') { const [d, o] = bucleBob(P, nd.est.linea[1]); s += gancho(d, 1, F.grosor, activa, o, 0); }
  }
  g.insertAdjacentHTML('beforeend', s + rotulos + '</svg>');   // los números van al final para quedar encima
}

// Panel: estado elegido, camino hasta él y botones para avanzar.
function dibujarInfo() {
  const nd = ent.nodos[ent.sel], a = ALGORITMOS[ent.alg];
  let h = '<b>Estado elegido:</b><br>';
  if (a.usaCartel) h += crearEtiqueta('cartel', NOMBRES[nd.est.cartel].toUpperCase(), true);
  if (a.usaBanderas) h += crearEtiqueta('banderaAlice', nd.est.bandera[0], nd.est.bandera[0]) + crearEtiqueta('banderaBob', nd.est.bandera[1], nd.est.bandera[1]);
  h += `<br>Camino hasta acá: <b>${rutaEnt(nd).pasos.join(' ') || '(inicio)'}</b>`;
  if (nd.terminal) h += '<p class="mal">¡Los dos perros en el patio! Violación de la exclusión mutua.</p>';
  else if (enDeadlock(nd)) h += '<p class="dead">Deadlock: nadie puede avanzar desde este estado.</p>';
  porId('en-info').innerHTML = h;
}

// Barra fija de abajo: botones para avanzar desde el nodo elegido, con la línea que se va a ejecutar.
function dibujarControles() {
  const nd = ent.nodos[ent.sel], L = lineasEnt();
  const boton = (id, p, flecha) => {
    const pc = nd.est.linea[p];
    let detalle, apagado = true;
    if (nd.terminal) detalle = 'Choque: no se puede seguir';
    else if (terminoEnt(nd.est, p)) detalle = `${NOMBRES[p]} ya terminó`;
    else {
      const txt = escribirTexto(L[pc].texto, p).replace(/&/g, '&amp;');
      detalle = `línea ${pc + 1}${p ? '′' : ''}: <code>${txt}</code>${nd.mov[p] !== null ? ' ✓' : ''}`;
      apagado = nd.mov[p] !== null;   // ya se avanzó por ahí desde este nodo
    }
    porId(id).innerHTML = `${flecha} Avanza ${NOMBRES[p]}<small>${detalle}</small>`;
    porId(id).disabled = apagado;
  };
  boton('en-ba', 0, '→');
  boton('en-bb', 1, '↓');
  // "Avanzar ambos" completa lo que falte desde este nodo (da igual qué línea sea). Después de usarlo,
  // los botones individuales quedan apagados porque ya no queda nada por avanzar desde ese nodo.
  porId('en-ambos').disabled = nd.terminal || ![0, 1].some(p => !terminoEnt(nd.est, p) && nd.mov[p] === null);
  porId('en-sel').textContent = etiquetaNodo(nd.est);
  reservarEspacioBarra();
}
// Deja lugar abajo para que la barra fija no tape el contenido.
function reservarEspacioBarra() { porId('vista-ent').style.paddingBottom = (porId('en-barra').offsetHeight + 16) + 'px'; }
window.addEventListener('resize', reservarEspacioBarra);

function dibujarConclusiones() {
  const pend = ent.nodos.filter(pendiente).length, L = lineasEnt();
  let h;
  if (pend) h = `Faltan expandir <b>${pend}</b> estados. Las conclusiones aparecen cuando el entrelazado esté completo.`;
  else {
    const choques = ent.nodos.filter(n => n.terminal).length, deadlocks = ent.nodos.filter(enDeadlock).length;
    const vistas = [0, 1].map(p => new Set(ent.nodos.map(n => n.est.linea[p])));
    const faltan = [0, 1].map(p => L.map((_, i) => i).filter(i => !vistas[p].has(i)).map(i => i + 1 + (p ? '′' : '')));
    h = `<b>Entrelazado completo</b> (${ent.nodos.length} estados).<br>
      Exclusión mutua: ${choques ? `<span class="mal">se viola (${choques} estado${choques > 1 ? 's' : ''} en rojo)</span>` : '<span class="bien">no emergió ninguna violación</span>'}<br>
      Deadlocks: ${deadlocks ? `<span class="dead">sí (${deadlocks} estado${deadlocks > 1 ? 's' : ''} en naranja)</span>` : '<span class="bien">no emergieron</span>'}<br>
      Líneas que nunca se alcanzaron: ${faltan.flat().length ? faltan.flat().join(', ') : 'ninguna'}`;
  }
  porId('en-concl').innerHTML = h;
}

function dibujarCodigoEnt() {
  porId('en-codigo').innerHTML = [0, 1].map(p => {
    let n = 0, h = `<div class="hd" style="color:${p ? 'var(--bo)' : 'var(--al)'}">${NOMBRES[p]}</div>`;
    for (const l of ALGORITMOS[ent.alg].lineas) {
      const num = l.ejecutable ? (++n) + (p ? '′' : '') : '';
      h += `<div class="ln${l.esSeccionCritica ? ' sc' : ''}"><b>${num}</b>${('  '.repeat(l.sangria) + escribirTexto(l.texto, p)).replace(/&/g, '&amp;')}</div>`;
    }
    return `<div class="col">${h}</div>`;
  }).join('');
}

// Ajusta el tamaño del entrelazado al ancho disponible, sin achicarlo demasiado
// (en celulares nunca baja de 70%; si no entra, se desplaza con scroll).
function ajustarEscala() {
  const g = porId('en-grid'), caja = porId('en-caja'), disponible = caja.parentElement.clientWidth - 22;
  if (disponible <= 0) return;   // la pestaña está oculta
  const minimo = document.documentElement.classList.contains('movil') ? CONFIG_ENT.escala.minimoMovil : CONFIG_ENT.escala.minimoPC;
  const e = Math.max(minimo, Math.min(1, disponible / g.offsetWidth));
  g.style.transform = `scale(${e})`;
  caja.style.width = g.offsetWidth * e + 'px';
  caja.style.height = g.offsetHeight * e + 'px';
}
window.addEventListener('resize', ajustarEscala);

function dibujarEnt() { dibujarGrilla(); dibujarInfo(); dibujarControles(); dibujarConclusiones(); }

function reiniciarEnt() {
  ent.alg = +porId('en-alg').value; ent.bucle = porId('en-bucle').checked;
  ent.nodos = []; ent.mapa = new Map(); ent.aristas = []; ent.sel = 0;   crearNodo({ linea: [0, 0], bandera: [false, false], cartel: 0, espera: [0, 0] }, null, null);
  dibujarCodigoEnt(); dibujarEnt();
}

// Aplica el avance de p desde el nodo elegido y selecciona el nodo nuevo.
function aplicarMovimiento(nd, p) {
  mover(nd, p);
  if (typeof nd.mov[p] === 'number') ent.sel = nd.mov[p];
  }

// ---------- Eventos ----------
porId('en-alg').innerHTML = ALGORITMOS_ENT.map(i => `<option value="${i}">${i + 1}. ${ALGORITMOS[i].nombre}</option>`).join('');
porId('en-alg').onchange = porId('en-bucle').onchange = reiniciarEnt;
porId('en-ba').onclick = () => { aplicarMovimiento(ent.nodos[ent.sel], 0); dibujarEnt(); };   // avanzar como Alice
porId('en-bb').onclick = () => { aplicarMovimiento(ent.nodos[ent.sel], 1); dibujarEnt(); };   // avanzar como Bob
porId('en-ambos').onclick = () => { expandir(ent.nodos[ent.sel]); dibujarEnt(); };            // avanzar los dos desde el nodo elegido
porId('en-todo').onclick = () => { mostrarTodo(); dibujarEnt(); };
porId('en-reset').onclick = reiniciarEnt;

porId('en-grid').onclick = e => {
  const b = e.target.closest('.nodo');
  if (b) { ent.sel = +b.dataset.id; dibujarEnt(); }
};

// ---------- Pestañas ----------
function mostrarVista(entrelazados) {
  porId('vista-sim').hidden = entrelazados;
  porId('vista-ent').hidden = !entrelazados;
  porId('t1').classList.toggle('on', !entrelazados);
  porId('t2').classList.toggle('on', entrelazados);
  if (entrelazados) dibujarEnt();    // se redibuja visible para medir bien las flechas
}
aplicarConfig();
porId('t1').onclick = () => mostrarVista(false);
porId('t2').onclick = () => mostrarVista(true);
reiniciarEnt();
