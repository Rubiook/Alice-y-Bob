// ============================================================
// algoritmos.js · Los 6 algoritmos de exclusión mutua
// ============================================================
// Cada algoritmo es una LISTA DE LÍNEAS DE CÓDIGO. Al apretar "Avanza Alice"
// o "Avanza Bob" el simulador ejecuta la línea actual de esa persona.
//
// Procesos: 0 = Alice, 1 = Bob.
// Variable "estado" (lo que cambia mientras se ejecuta):
//   estado.linea[p]    -> en qué línea está el proceso p (empieza en 0)
//   estado.bandera[p]  -> bandera de p: true = levantada, false = bajada
//   estado.cartel      -> a quién favorece el cartel: 0 = ALICE, 1 = BOB
//   estado.espera[p]   -> ticks que le quedan de espera aleatoria (algoritmo 4)
// ============================================================

const NOMBRES = ['Alice', 'Bob'];
const otro = p => 1 - p;           // el otro proceso: otro(0) = 1, otro(1) = 0

// Una "acción" es lo que hace una línea al ejecutarse. Puede devolver:
//   undefined -> pasar a la línea siguiente
//   ESPERAR   -> quedarse en la misma línea (busy waiting)
//   un número -> saltar a esa línea (se cuenta desde 0: 0 es la primera)
const ESPERAR = -1;

// Línea que se ejecuta. sangria = nivel de indentación (para mostrarla).
function linea(sangria, texto, accion, esSeccionCritica) {
  return { ejecutable: true, sangria, texto, accion: accion || (() => {}), esSeccionCritica };
}
// Línea que solo se muestra (por ejemplo una llave "}"), no se ejecuta.
function decorativa(sangria, texto) {
  return { ejecutable: false, sangria, texto };
}

// En los textos: {y} = bandera propia, {o} = bandera del otro,
// {Y} = nombre propio en mayúsculas, {O} = nombre del otro en mayúsculas.
function escribirTexto(texto, p) {
  return texto
    .replace(/\{y\}/g, 'bandera' + NOMBRES[p])
    .replace(/\{o\}/g, 'bandera' + NOMBRES[otro(p)])
    .replace(/\{Y\}/g, NOMBRES[p].toUpperCase())
    .replace(/\{O\}/g, NOMBRES[otro(p)].toUpperCase());
}

// --- Acciones reutilizables (los "ladrillos" de los algoritmos) ---
const levantarBandera = (e, p) => { e.bandera[p] = true; };
const bajarBandera    = (e, p) => { e.bandera[p] = false; };
const cederCartel     = (e, p) => { e.cartel = otro(p); };            // cartel = OTRO
const banderaDelOtro  = (e, p) => e.bandera[otro(p)];                 // ¿el otro la tiene levantada?
const cartelFavoreceAlOtro = (e, p) => e.cartel === otro(p);
const esperarMientras = condicion => (e, p) => condicion(e, p) ? ESPERAR : undefined;  // while (cond) {}

const SECCION_CRITICA = 'pasearPerro();  // sección crítica';
const OTRAS_TAREAS    = 'otrasTareas();  // asincrónico';

// ------------------------------------------------------------
// Los algoritmos. Todo proceso repite sus líneas en un while (true).
// ------------------------------------------------------------
const ALGORITMOS = [
  {
    nombreCorto: 'Cartel',
    nombre: 'Cartel (turno)',
    usaCartel: true, usaBanderas: false,
    descripcion: 'Un cartel dice a quién le toca. Quien pasea al perro deja el nombre del otro.',
    veredicto: 'Respeta la exclusión mutua, pero obliga a alternar: nadie puede pasear dos veces seguidas. Si uno se demora en sus otras tareas, el otro queda trancado aunque el patio esté libre.',
    lineas: [
      linea(1, 'while (cartel != {Y}) {}', esperarMientras((e, p) => e.cartel !== p)),
      linea(1, SECCION_CRITICA, null, true),
      linea(1, 'cartel = {O};', cederCartel),
      linea(1, OTRAS_TAREAS),
    ],
  },
  {
    nombreCorto: 'Miro y levanto',
    nombre: 'Banderas: miro y luego levanto',
    usaCartel: false, usaBanderas: true,
    descripcion: 'Miro la bandera del otro; si no está levantada, levanto la mía y salgo.',
    veredicto: 'Falla: ambos miran antes de que alguno levante su bandera y salen juntos. Secuencia: Alice 1, Bob 1, Alice 2, Bob 2.',
    lineas: [
      linea(1, 'while ({o}) {}', esperarMientras(banderaDelOtro)),
      linea(1, '{y} = true;', levantarBandera),
      linea(1, SECCION_CRITICA, null, true),
      linea(1, '{y} = false;', bajarBandera),
      linea(1, OTRAS_TAREAS),
    ],
  },
  {
    nombreCorto: 'Levanto y miro',
    nombre: 'Banderas: levanto y luego miro',
    usaCartel: false, usaBanderas: true,
    descripcion: 'Primero levanto mi bandera y después miro la del otro.',
    veredicto: 'Falla: si ambos levantan la bandera antes de mirar, los dos esperan para siempre a que el otro la baje (deadlock). Secuencia: Alice 1, Bob 1 y después avanzá a cualquiera.',
    lineas: [
      linea(1, '{y} = true;', levantarBandera),
      linea(1, 'while ({o}) {}', esperarMientras(banderaDelOtro)),
      linea(1, SECCION_CRITICA, null, true),
      linea(1, '{y} = false;', bajarBandera),
      linea(1, OTRAS_TAREAS),
    ],
  },
  {
    nombreCorto: 'Aleatorio',
    nombre: 'Banderas con espera aleatoria',
    usaCartel: false, usaBanderas: true,
    descripcion: 'Como el anterior, pero si hay discusión bajo la bandera y espero un tiempo aleatorio.',
    veredicto: 'Funciona casi siempre: solo falla si ambos sortean el mismo tiempo una y otra vez, con probabilidad bajísima. Igual usa busy waiting.',
    lineas: [
      linea(1, '{y} = true;', levantarBandera),                                     // línea 1
      // línea 2: si el otro NO tiene bandera, salta a la línea 6 (índice 5); si tiene, entra al bucle
      linea(1, 'while ({o}) {', (e, p) => banderaDelOtro(e, p) ? undefined : 5),
      linea(2, '{y} = false;', bajarBandera),                                       // línea 3
      linea(2, 'esperarTiempoAleatorio();', (e, p) => {                             // línea 4
        if (e.espera[p] === 0) e.espera[p] = 1 + Math.floor(Math.random() * 3);     // sortea 1 a 3 ticks
        e.espera[p]--;                                                              // pasa un tick
        return e.espera[p] > 0 ? ESPERAR : undefined;                               // sigue esperando o avanza
      }),
      linea(2, '{y} = true;', (e, p) => { e.bandera[p] = true; return 1; }),        // línea 5: vuelve al while (línea 2)
      decorativa(1, '}'),
      linea(1, SECCION_CRITICA, null, true),                                        // línea 6
      linea(1, '{y} = false;', bajarBandera),
      linea(1, OTRAS_TAREAS),
    ],
  },
  {
    nombreCorto: 'Dekker',
    nombre: 'Algoritmo de Dekker',
    usaCartel: true, usaBanderas: true,
    descripcion: 'Dos banderas y un cartel que resuelve la discusión: el favorecido insiste, el otro baja su bandera y espera.',
    veredicto: 'Cumple exclusión mutua, sin deadlock ni posposición indefinida. Pero usa busy waiting y es difícil de generalizar a más procesos.',
    lineas: [
      linea(1, '{y} = true;', levantarBandera),                                              // línea 1
      linea(1, 'while ({o}) {', (e, p) => banderaDelOtro(e, p) ? undefined : 6),             // línea 2: si no hay discusión, salta a la línea 7 (sección crítica)
      linea(2, 'if (cartel == {O}) {', (e, p) => cartelFavoreceAlOtro(e, p) ? undefined : 1),// línea 3: si el cartel me favorece, vuelve al while
      linea(3, '{y} = false;', bajarBandera),                                                // línea 4
      linea(3, 'while (cartel == {O}) {}', esperarMientras(cartelFavoreceAlOtro)),           // línea 5
      linea(3, '{y} = true;', (e, p) => { e.bandera[p] = true; return 1; }),                 // línea 6: vuelve al while (línea 2)
      decorativa(2, '}'),
      decorativa(1, '}'),
      linea(1, SECCION_CRITICA, null, true),                                                 // línea 7
      linea(1, 'cartel = {O};', cederCartel),
      linea(1, '{y} = false;', bajarBandera),
      linea(1, OTRAS_TAREAS),
    ],
  },
  {
    nombreCorto: 'Peterson',
    nombre: 'Algoritmo de Peterson',
    usaCartel: true, usaBanderas: true,
    descripcion: 'Reescritura astuta de Dekker: levanto mi bandera, le cedo la preferencia al otro y espero solo si él también quiere y tiene la preferencia.',
    veredicto: 'Igual de correcto que Dekker, con código más corto. Mismo problema de fondo: busy waiting, que desperdicia ciclos de reloj. Eso motiva los semáforos.',
    lineas: [
      linea(1, '{y} = true;', levantarBandera),
      linea(1, 'cartel = {O};', cederCartel),
      linea(1, 'while ({o} && cartel == {O}) {}',
        esperarMientras((e, p) => banderaDelOtro(e, p) && cartelFavoreceAlOtro(e, p))),
      linea(1, SECCION_CRITICA, null, true),
      linea(1, '{y} = false;', bajarBandera),
      linea(1, OTRAS_TAREAS),
    ],
  },
];
