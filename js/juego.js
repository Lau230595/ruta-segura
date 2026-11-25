/* Ruta Segura · Lógica del juego (niveles, tráfico, reglas, retroalimentación, métricas IHC) */
(() => {
'use strict';

/* =========================================================
   1. NIVELES (rutas reales por Arequipa)
   ========================================================= */
const LEVELS = [
  { name: 'Primeros pasos', dest: 'Mercado San Camilo', env: 'dia', speed: 1.0, dens: 0.9,
    news: ['Semáforo peatonal', 'Cebra', 'Cruce sin semáforo'],
    streets: [ { name: 'Calle Piérola', type: 'normal' }, { name: 'Calle San Camilo', type: 'normal' },
               { name: 'Calle Álvarez Thomas', type: 'sinSemaforo', bump: true }, { name: 'Calle Perú', type: 'normal' } ] },
  { name: 'Hora punta', dest: 'UNSA · Av. Independencia', env: 'dia', speed: 1.12, dens: 1.2,
    news: ['Combis que se pasan la luz', 'Notificaciones del celular'],
    streets: [ { name: 'Av. Ejército', type: 'normal' }, { name: 'Calle Paucarpata', type: 'imprudente', veh: 'combi' },
               { name: 'Av. La Marina', type: 'normal', phone: true }, { name: 'Calle Ayacucho', type: 'sinSemaforo' },
               { name: 'Av. Independencia', type: 'imprudente', veh: 'combi' } ] },
  { name: 'Emergencias', dest: 'Hospital Goyeneche', env: 'dia', speed: 1.18, dens: 1.25,
    news: ['Ambulancias con sirena', 'Policía de tránsito', 'Mototaxis'],
    streets: [ { name: 'Av. Venezuela', type: 'ambulancia' }, { name: 'Calle Peral', type: 'policia' },
               { name: 'Av. Progreso', type: 'imprudente', veh: 'mototaxi', bump: true }, { name: 'Calle Jerusalén', type: 'normal', phone: true },
               { name: 'Av. Goyeneche', type: 'ambulancia' } ] },
  { name: 'Noche en el Centro', dest: 'Monasterio de Santa Catalina', env: 'noche', speed: 1.2, dens: 1.2,
    news: ['Visibilidad reducida', 'Guíate por postes y faros'],
    streets: [ { name: 'Calle Ugarte', type: 'normal' }, { name: 'Calle Bolívar', type: 'imprudente', veh: 'mototaxi' },
               { name: 'Calle San Francisco', type: 'policia' }, { name: 'Calle Moral', type: 'sinSemaforo' },
               { name: 'Calle Zela', type: 'normal', phone: true }, { name: 'Calle Santa Catalina', type: 'ambulancia' } ] },
  { name: 'Lluvia en la Ciudad Blanca', dest: 'Plaza de Armas', env: 'lluvia', speed: 1.25, dens: 1.3,
    news: ['Pista mojada: los autos tardan en frenar', 'Todo lo aprendido'],
    streets: [ { name: 'Av. La Marina', type: 'imprudente', veh: 'combi' }, { name: 'Calle Santo Domingo', type: 'normal', phone: true },
               { name: 'Calle Puente Grau', type: 'sinSemaforo', bump: true }, { name: 'Calle San Juan de Dios', type: 'ambulancia' },
               { name: 'Calle Mercaderes', type: 'policia' }, { name: 'Calle Villalba', type: 'imprudente', veh: 'mototaxi' },
               { name: 'Calle San Agustín', type: 'normal', phone: true } ] }
];

/* =========================================================
   2. CONSTANTES DEL MUNDO
   ========================================================= */
const WORLD_H = 600, BAND_TOP = 230, BAND_BOT = 370, CW_TOP = 266, CW_BOT = 334;
const ROAD_W = 240, FIRST_X = 620, GAP_X = 700;
const CYCLE = 10, T_GREEN = 4.5, T_AMBER = 6.0;
const CAR_GAP = 26, PLAYER_SPEED = 230;
const MULT = [1, 1, 1.5, 2, 2.5, 3];
let LV, LVI = 0, N_ROADS, META_X, WORLD_W;
let MODE = 'peaton';   // peaton | conductor | examen

const VEH = {
  auto:      { w: 54, h: 96,  colors: ['#1E88E5', '#C62828', '#ECEFF1', '#455A64'] },
  taxi:      { w: 54, h: 96,  colors: ['#F5F5F5'] },
  combi:     { w: 60, h: 132, colors: ['#F5F5F5'] },
  mototaxi:  { w: 40, h: 64,  colors: ['#E64A19'] },
  ambulancia:{ w: 52, h: 124, colors: ['#FFFFFF'] }
};
function randomVeh() { const r = Math.random(); return r < .55 ? 'auto' : r < .75 ? 'taxi' : r < .9 ? 'combi' : 'mototaxi'; }

// Micro-explicaciones — TUO del Reglamento Nacional de Tránsito (D.S. N.° 016-2009-MTC)
const LESSONS = {
  rojo: { t: 'Cruzaste con el semáforo peatonal en rojo',
    n: 'Con la luz roja ("ALTO") el peatón no debe bajar a la calzada ni cruzarla; cruza solo con la luz verde ("PASE").',
    ref: 'Reglamento Nacional de Tránsito, Art. 70 (cruce según semáforos)',
    why: 'En rojo, los vehículos tienen el paso y no esperan que aparezcas.' },
  fuera: { t: 'Cruzaste fuera del paso peatonal',
    n: 'En intersecciones señalizadas, el peatón debe cruzar por la zona demarcada para su paso (la cebra).',
    ref: 'Reglamento Nacional de Tránsito, Art. 68 (cruce de la calzada)',
    why: 'Fuera de la cebra los conductores no esperan peatones y tienen menos tiempo para frenar.' },
  choque: { t: 'Te atropelló un vehículo',
    n: 'El peatón debe evitar cruzar la calzada de forma intempestiva o temeraria. Aunque tengas el paso, verifica que los vehículos se detengan.',
    ref: 'Reglamento Nacional de Tránsito, Art. 68 (cruce de la calzada)',
    why: 'No todos los conductores respetan la luz roja: mirar a ambos lados te da segundos para reaccionar.' },
  emergencia: { t: 'No cediste el paso a la ambulancia',
    n: 'El peatón tiene preferencia en el cruce, excepto frente a vehículos de emergencia que usan sirena y luces.',
    ref: 'Reglamento Nacional de Tránsito, Art. 77 (vehículos de emergencia)',
    why: 'Una ambulancia no siempre puede frenar a tiempo y lleva a alguien que necesita llegar rápido.' },
  policia: { t: 'No obedeciste al policía de tránsito',
    n: 'Las indicaciones del policía asignado al control del tránsito prevalecen sobre los semáforos y las demás señales.',
    ref: 'Reglamento Nacional de Tránsito, Art. 57 (obediencia al efectivo policial)',
    why: 'Cuando el policía dirige el cruce, el semáforo se apaga: su señal es la que cuenta.' },
  // ----- Modo conductor -----
  rojo_c: { t: 'Pasaste con la luz roja',
    n: 'La luz roja indica detención: debes detenerte antes de la línea de parada. Con ámbar, detente si puedes hacerlo con seguridad; si ya no puedes, cruza con precaución y despeja la intersección.',
    ref: 'Reglamento Nacional de Tránsito, Art. 49 (significado de las luces semafóricas)',
    why: 'Pasarse la luz roja es una falta eliminatoria en el examen práctico y una de las causas más graves de choques.' },
  peaton_c: { t: 'No cediste el paso al peatón',
    n: 'El peatón tiene derecho de paso en el crucero peatonal y frente a los vehículos que giran con luz verde. Detente antes de la cebra y espera que termine de cruzar.',
    ref: 'Reglamento Nacional de Tránsito, Arts. 63 y 64 (derecho de paso del peatón)',
    why: 'El peatón es el usuario más vulnerable de la vía: un error tuyo puede costarle la vida.' },
  velocidad: { t: 'Exceso de velocidad',
    n: 'Límites máximos en zona urbana: 30 km/h en calles y jirones, 50 km/h en avenidas, 80 km/h en vías expresas, y 30 km/h en zonas escolares y de hospitales.',
    ref: 'Reglamento Nacional de Tránsito, Art. 162 (modificado por D.S. 025-2021-MTC)',
    why: 'A mayor velocidad, mayor distancia para frenar y lesiones más graves en un atropello.' },
  pare: { t: 'No te detuviste en la señal PARE',
    n: 'Ante PARE (o luz roja intermitente) debes detenerte por completo antes de la línea y ceder el paso; avanza solo cuando sea seguro.',
    ref: 'Reglamento Nacional de Tránsito, Art. 49 y señal reglamentaria PARE',
    why: 'Reducir la velocidad no basta: el examinador exige la parada total del vehículo.' },
  ceda: { t: 'No cediste el paso',
    n: 'La señal CEDA EL PASO obliga a reducir la velocidad y, si es necesario, detenerte para dejar pasar a los vehículos de la vía con preferencia.',
    ref: 'Señal reglamentaria CEDA EL PASO (Reglamento Nacional de Tránsito)',
    why: 'Entrar a la intersección sin ceder el paso provoca choques laterales, los más peligrosos.' },
  emergencia_c: { t: 'No cediste el paso a la ambulancia',
    n: 'Ante un vehículo de emergencia que usa sirena y luces, ubícate en el carril derecho y disminuye la velocidad o detente para dejarlo pasar.',
    ref: 'Reglamento Nacional de Tránsito, infracción M25 (no dar preferencia a vehículos de emergencia)',
    why: 'Cada segundo cuenta para la persona que va en la ambulancia.' },
  policia_c: { t: 'No obedeciste al policía de tránsito',
    n: 'Las indicaciones del policía de tránsito prevalecen sobre los semáforos; cuando dirige una intersección, los semáforos se apagan.',
    ref: 'Reglamento Nacional de Tránsito, Arts. 57 y 60',
    why: 'El policía ve el tránsito completo: su señal coordina a todos los que cruzan.' },
  celular_c: { t: 'Usaste el celular mientras conducías',
    n: 'El conductor no debe usar el celular mientras conduce, ni siquiera sujetando el volante con una mano.',
    ref: 'Reglamento Nacional de Tránsito (prohibición del uso del celular al conducir)',
    why: 'Mirar el celular unos segundos equivale a manejar a ciegas varias decenas de metros.' },
  cinturon: { t: 'Arrancaste sin el cinturón de seguridad',
    n: 'El cinturón de seguridad es obligatorio para el conductor y todos los ocupantes; no usarlo es infracción grave.',
    ref: 'Reglamento Nacional de Tránsito, infracción G28',
    why: 'El cinturón reduce de forma importante el riesgo de muerte en un choque. En el examen, es lo primero que revisan.' },
  choque_c: { t: 'Chocaste',
    n: 'Mantén una distancia que te permita detenerte con seguridad y no entres a la intersección si otro vehículo tiene preferencia.',
    ref: 'Reglamento Nacional de Tránsito (distancia de seguimiento y preferencia de paso)',
    why: 'Un choque es falta eliminatoria en el examen práctico.' }
};
const WHY_RAIN = 'Con la pista mojada los vehículos necesitan más distancia para frenar: espera a que estén detenidos.';
const WHY_NIGHT = 'De noche los conductores te ven tarde: cruza solo por zonas iluminadas y cuando los autos estén detenidos.';
const KIND_LABEL = { rojo: 'Cruzar en rojo', fuera: 'Cruzar fuera de la cebra', choque: 'Atropello', emergencia: 'No ceder a la ambulancia', policia: 'Desobedecer al policía',
  rojo_c: 'Pasar con luz roja', peaton_c: 'No ceder el paso al peatón', velocidad: 'Exceso de velocidad', pare: 'No parar en PARE', ceda: 'No ceder el paso',
  emergencia_c: 'No ceder a la ambulancia', policia_c: 'Desobedecer al policía', celular_c: 'Usar el celular al conducir', cinturon: 'Sin cinturón', choque_c: 'Choque' };
const TIPS = {
  choque: 'Antes de cruzar, mira a ambos lados aunque el semáforo esté en verde.',
  rojo: 'Si el semáforo peatonal está en rojo, espera en la vereda aunque no veas autos.',
  fuera: 'Cruza siempre por la cebra: ahí los conductores esperan verte.',
  emergencia: 'Si escuchas una sirena, quédate en la vereda hasta que el vehículo de emergencia pase.',
  policia: 'Si un policía dirige el tránsito, obedece su señal aunque el semáforo diga otra cosa.',
  celular: 'Guarda el celular al cruzar: una notificación puede esperar, tu vida no.',
  noche: 'De noche, usa ropa clara o reflectiva y cruza por zonas iluminadas.',
  lluvia: 'Con lluvia, deja un segundo extra: los autos tardan más en frenar.',
  general: ['Haz contacto visual con el conductor antes de cruzar.',
            'En calles sin semáforo, cruza solo cuando los vehículos se hayan detenido.',
            'Las buenas decisiones dan estrellas; la prisa no.']
};
const LOGROS = {
  primer:      'Primer cruce seguro',
  ejemplar:    'Ciudadano ejemplar (nivel sin infracciones)',
  aguila:      'Ojo de águila (esquivaste a un imprudente)',
  desconectado:'Desconectado (guardaste el celular)',
  rutalibre:   'Ruta libre (cediste el paso a la ambulancia)',
  autoridad:   'Respeto a la autoridad (obedeciste al policía)',
  paciencia:   'Paciencia de sillar (esperaste el verde 3 veces)',
  antojo:      'Antojo arequipeño (todos los quesos helados)',
  racha5:      'Racha imparable (x3)',
  perfecto:    'Perfección (3 estrellas)',
  noctambulo:  'Visible de noche (nivel nocturno)',
  impermeable: 'Bajo la lluvia (nivel con lluvia)',
  campeon:     '¡Llegaste a la Plaza de Armas!',
  brevete:     '¡Aprobaste el examen práctico de manejo!',
  teorico:     'Teoría aprobada (35 de 40 en el simulacro MTC)'
};

/* =========================================================
   3. DOM, ICONOS Y AUDIO
   ========================================================= */
const $ = id => document.getElementById(id);
const canvas = $('game'), ctx = canvas.getContext('2d');
const dark = document.createElement('canvas'), dctx = dark.getContext('2d');
const hud = $('hud');
const screens = { start: $('sStart'), controls: $('sControls'), pause: $('sPause'), results: $('sResults'), lesson: $('sLesson'), data: $('sData'), intro: $('sIntro') };
const ICON = {
  heart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
  sndOn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>',
  sndOff:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>',
  ok:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="16.5 9 10.5 15 7.5 12"/></svg>',
  warn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  bad:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
  flag: '<svg viewBox="0 0 24 24" fill="none" stroke="#14171A" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 22V4"/><path d="M4 4h13l-2.5 4L17 12H4"/></svg>',
  sad:  '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M16 16s-1.5-2-4-2-4 2-4 2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>',
  lock: '<svg viewBox="0 0 24 24" fill="none" stroke="#9AA0A6" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" width="18" height="18"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
  medal:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#14171A" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="9" r="6"/><path d="M8.2 13.9 7 22l5-3 5 3-1.2-8.1"/></svg>'
};
const starSvg = (on, size) => `<svg viewBox="0 0 24 24" ${size ? `width="${size}" height="${size}"` : ''} aria-hidden="true"><path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z" fill="${on ? '#FFC400' : 'none'}" stroke="${on ? '#B38900' : '#9AA0A6'}" stroke-width="1.6" stroke-linejoin="round"/></svg>`;
const COLORS = { ok: '#2ECC71', warn: '#FF9800', bad: '#E53935' };
$('hearts').innerHTML = ICON.heart + ICON.heart + ICON.heart;

let muted = false, actx = null;
function ensureAudio() {
  if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { actx = null; } }
  if (actx && actx.state === 'suspended') actx.resume();
}
function tone(freq, dur, type = 'sine', when = 0, vol = 0.14) {
  if (muted || !actx) return;
  const o = actx.createOscillator(), gn = actx.createGain(), t = actx.currentTime + when;
  o.type = type; o.frequency.value = freq;
  gn.gain.setValueAtTime(vol, t); gn.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(gn).connect(actx.destination); o.start(t); o.stop(t + dur + 0.02);
}
const SFX = {
  ok:    m => { const b = 660 * (1 + (m - 1) * 0.12); tone(b, .12, 'triangle'); tone(b * 1.5, .2, 'triangle', .1); },
  warn:  () => { tone(520, .14, 'square', 0, .07); tone(520, .14, 'square', .2, .07); },
  bad:   () => { tone(190, .4, 'sawtooth', 0, .12); },
  win:   () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, .22, 'triangle', i * .12)); },
  star:  i => tone(880 + i * 220, .18, 'triangle', 0, .12),
  coin:  () => { tone(1175, .06, 'square', 0, .05); tone(1568, .1, 'square', .06, .05); },
  achv:  () => { [784, 988, 1175, 1568].forEach((f, i) => tone(f, .14, 'triangle', i * .08, .1)); },
  honk:  () => { tone(392, .18, 'square', 0, .09); tone(392, .3, 'square', .24, .09); },
  siren: () => { for (let i = 0; i < 8; i++) tone(i % 2 ? 960 : 720, .3, 'sawtooth', i * .3, .05); },
  notif: () => { tone(1320, .08, 'sine', 0, .1); tone(1760, .12, 'sine', .1, .1); },
  tick:  () => tone(660, .08, 'square', 0, .06),
  go:    () => tone(1320, .25, 'square', 0, .07),
  click: () => tone(880, .05, 'sine', 0, .06)
};
function updateMuteUI() {
  ['muteStart', 'muteHud'].forEach(id => {
    const b = $(id);
    b.innerHTML = muted ? ICON.sndOff : ICON.sndOn;
    if (id === 'muteStart') b.insertAdjacentHTML('beforeend', `<span>${muted ? 'Silencio' : 'Sonido'}</span>`);
    b.setAttribute('aria-label', muted ? 'Activar sonido' : 'Silenciar sonido');
    b.setAttribute('aria-pressed', String(muted));
  });
}
function toggleMute() { muted = !muted; updateMuteUI(); }
updateMuteUI();

/* =========================================================
   4. ALMACENAMIENTO (progreso, ranking y métricas IHC)
   ========================================================= */
const STORE_KEY = 'rutaSegura.arequipa.v2', PROG_KEY = 'rutaSegura.progreso.v2';
let memStore = { sessions: [] }, memProg = null;
function loadStore() { try { const s = JSON.parse(localStorage.getItem(STORE_KEY)); if (s && Array.isArray(s.sessions)) return s; } catch (e) {} return memStore; }
function saveStore(s) { memStore = s; try { localStorage.setItem(STORE_KEY, JSON.stringify(s)); } catch (e) {} }
function loadProg() {
  try { const p = JSON.parse(localStorage.getItem(PROG_KEY)); if (p && p.stars) return p; } catch (e) {}
  return memProg || { unlocked: 1, unlockedC: 1, stars: {}, best: {}, logros: {}, waitsTotal: 0 };
}
function saveProg(p) { memProg = p; try { localStorage.setItem(PROG_KEY, JSON.stringify(p)); } catch (e) {} }

/* =========================================================
   5. ESTADO DEL JUEGO
   ========================================================= */
let state = 'boot';   // boot | menu | controls | data | intro | playing | paused | lesson | results
let g, player, roads, quesos, notif = null, lastSessionId = null, selLevel = 0;
let yExtra = 0;
const keys = { up: false, down: false, left: false, right: false, brake: false };

function seeded(seed) { let s = seed * 9301 + 49297; return () => (s = (s * 9301 + 49297) % 233280) / 233280; }

function setupLevel(i) {
  if (MODE === 'conductor') { dSetup(i); return; }
  LVI = i; LV = LEVELS[i]; N_ROADS = LV.streets.length;
  META_X = FIRST_X + (N_ROADS - 1) * GAP_X + ROAD_W + 460;
  WORLD_W = META_X + 420;
}
function buildRoads() {
  return LV.streets.map((st, i) => {
    const x = FIRST_X + i * GAP_X;
    return {
      i, x, w: ROAD_W, name: st.name, type: st.type, veh: st.veh, bump: !!st.bump, phone: !!st.phone,
      off: (i * 3.7 + 5 + LVI * 1.3) % CYCLE, speed: (230 + i * 22) * LV.speed,
      done: false, waited: false, waitT: 0, greenAt: null, prevS: null, prevMust: false,
      triggered: false, emergency: false, ambPassed: false, yieldT: 0, phoneShown: false, specials: [],
      lanes: [ { dir: 1, x: x + ROAD_W * 0.27, cars: [], t: Math.random() }, { dir: -1, x: x + ROAD_W * 0.73, cars: [], t: Math.random() * 1.5 } ]
    };
  });
}
function buildQuesos() {
  const rnd = seeded(LVI + 7), out = [];
  const edges = [80].concat(...roads.map(r => [r.x, r.x + r.w])).concat([META_X - 40]);
  for (let k = 0; k < edges.length; k += 2) {
    const a = edges[k] + 70, b = edges[k + 1] - 70;
    if (b - a < 60) continue;
    out.push({ x: a + rnd() * (b - a), y: rnd() < .5 ? BAND_TOP + 30 : BAND_BOT - 30, got: false, bob: rnd() * 6 });
  }
  return out;
}

function reset(levelIdx) {
  setupLevel(levelIdx);
  g = { time: 0, play: 0, lives: 3, score: 0, evitadas: 0, cometidas: 0,
        kinds: { rojo: 0, fuera: 0, choque: 0, emergencia: 0, policia: 0 },
        ambar: 0, riesgos: 0, nearMiss: 0, distrVistas: 0, distrEvitadas: 0, distractT: 0,
        streak: 0, maxStreak: 0, quesos: 0, waitedGreen: 0,
        lessonSeen: {}, lessons: 0, pendingEnd: false, pauses: 0, newLogros: [],
        firstMove: null, firstSafe: null, reactions: [], waits: [], log: [],
        tutorialT: LVI === 0 ? 10 : 0, moved: false, movedT: 0, fx: null, lastHud: '',
        particles: [], floats: [], shake: 0 };
  player = { x: 150, y: 300, r: 22, angle: 0, inv: 0, roadIdx: -1, side: null, crossing: null };
  if (MODE === 'conductor') {
    roads = []; quesos = [];
    Object.assign(g, { kinds: {}, elim: 0, graves: 0, leves: 0, belt: false, beltWarned: false, zone: null, ambDone: false, phoneDone: false });
    player = { x: 160, y: LANE_R, ty: LANE_R, v: 0, r: 26, angle: 0, inv: 0, braking: false };
    hideNotif(); $('phoneBig').classList.remove('show');
    dBuild();
    for (let k = 0; k < 120; k++) dTraffic(1 / 30);
    g.time = 0;
    return;
  }
  roads = buildRoads();
  quesos = buildQuesos();
  hideNotif(); $('phoneBig').classList.remove('show');
  for (let k = 0; k < 120; k++) updateTraffic(1 / 30);
  g.time = 0;
}
function log(tipo, road, detalle = '') { g.log.push({ t: +g.play.toFixed(2), tipo, calle: road ? road.name : '', detalle }); }

function pedState(road) {
  if (road.type === 'sinSemaforo') return { s: 'free', left: 0 };
  const t = (g.time + road.off) % CYCLE;
  if (t < T_GREEN) return { s: 'green', left: T_GREEN - t };
  if (t < T_AMBER) return { s: 'amber', left: T_AMBER - t };
  return { s: 'red', left: CYCLE - t };
}
function carsMustStop(road) {
  if (road.emergency) return true;
  if (road.type === 'sinSemaforo') return road.yieldT > 0.9 || player.roadIdx === road.i;
  return pedState(road).s !== 'red';
}

/* =========================================================
   6. TRÁFICO
   ========================================================= */
function newCar(type, y) {
  const v = VEH[type];
  return { type, w: v.w, h: v.h, color: v.colors[Math.floor(Math.random() * v.colors.length)], y, v: 0, moving: true, reckless: false, sliding: false };
}
function updateTraffic(dt) {
  const rain = LV.env === 'lluvia';
  for (const road of roads) {
    const mustStop = carsMustStop(road);
    // con lluvia: los autos cerca de la línea de parada no alcanzan a frenar
    if (rain && mustStop && !road.prevMust) {
      for (const lane of road.lanes) for (const c of lane.cars) {
        const d = lane.dir === 1 ? (BAND_TOP - 18) - (c.y + c.h / 2) : (c.y - c.h / 2) - (BAND_BOT + 18);
        if (d > 0 && d < 95 && c.moving && Math.random() < 0.8) c.sliding = true;
      }
    }
    road.prevMust = mustStop;
    for (const lane of road.lanes) {
      lane.t -= dt;
      const spawnY = lane.dir === 1 ? -yExtra - 140 : WORLD_H + yExtra + 140;
      if (lane.t <= 0) {
        const last = lane.cars[lane.cars.length - 1];
        const free = !last || (lane.dir === 1 ? last.y - last.h / 2 - spawnY > 80 + CAR_GAP : spawnY - (last.y + last.h / 2) > 80 + CAR_GAP);
        if (free) { const c = newCar(randomVeh(), spawnY); c.v = road.speed * (0.9 + Math.random() * 0.25); lane.cars.push(c); }
        lane.t = ((road.type === 'sinSemaforo' ? 1.6 : 1.0) + Math.random() * 1.6) / LV.dens;
      }
      for (let k = 0; k < lane.cars.length; k++) {
        const c = lane.cars[k], ahead = lane.cars[k - 1];
        let v = c.v;
        if (road.bump && (Math.abs(c.y - (BAND_TOP - 160)) < 60 || Math.abs(c.y - (BAND_BOT + 150)) < 60)) v *= 0.45;
        let ny = c.y + lane.dir * v * dt;
        const ignore = c.reckless || c.sliding;
        if (lane.dir === 1) {
          let limit = Infinity; const stopLine = BAND_TOP - 18;
          if (mustStop && !ignore && c.y + c.h / 2 <= stopLine + 1) limit = stopLine;
          if (ahead) limit = Math.min(limit, ahead.y - ahead.h / 2 - CAR_GAP);
          if (ny + c.h / 2 > limit) ny = Math.max(c.y, limit - c.h / 2);
        } else {
          let limit = -Infinity; const stopLine = BAND_BOT + 18;
          if (mustStop && !ignore && c.y - c.h / 2 >= stopLine - 1) limit = stopLine;
          if (ahead) limit = Math.max(limit, ahead.y + ahead.h / 2 + CAR_GAP);
          if (ny - c.h / 2 < limit) ny = Math.min(c.y, limit + c.h / 2);
        }
        c.moving = Math.abs(ny - c.y) > 0.05;
        c.y = ny;
      }
      lane.cars = lane.cars.filter(c => lane.dir === 1 ? c.y < WORLD_H + yExtra + 220 : c.y > -yExtra - 220);
    }
    for (const s of road.specials) s.y += s.v * dt;
    if (road.emergency && road.specials.length && road.specials[0].y - road.specials[0].h / 2 > BAND_BOT + 60) { road.emergency = false; road.ambPassed = true; }
    road.specials = road.specials.filter(s => s.y < WORLD_H + yExtra + 220);
  }
}
function triggerReckless(road) {
  road.triggered = true;
  const lane = road.lanes[0], stopLine = BAND_TOP - 18, v = VEH[road.veh];
  let c = lane.cars.find(car => car.y + car.h / 2 <= stopLine + 2 && stopLine - (car.y + car.h / 2) < 260);
  if (c) { const front = c.y + c.h / 2; c.type = road.veh; c.w = v.w; c.h = v.h; c.color = v.colors[0]; c.y = front - v.h / 2; }
  else { c = newCar(road.veh, -yExtra - 140); lane.cars.unshift(c); }
  c.reckless = true; c.v = (road.veh === 'mototaxi' ? 430 : 400) * LV.speed;
  SFX.honk(); log('dilema_imprudente', road, road.veh);
}
function triggerAmbulance(road) {
  road.triggered = true; road.emergency = true;
  const v = VEH.ambulancia;
  road.specials.push({ type: 'ambulancia', x: road.x + road.w / 2, y: -yExtra - 140, w: v.w, h: v.h, v: 560, color: '#FFFFFF' });
  SFX.siren(); feedback('warn', '¡Ambulancia! Cede el paso'); log('dilema_ambulancia', road);
}

/* =========================================================
   7. RETROALIMENTACIÓN, LOGROS Y EFECTOS
   ========================================================= */
const toastEl = $('toast'), flashEl = $('flash');
function feedback(type, text, mult = 1) {
  flashEl.style.setProperty('--fc', COLORS[type]);
  flashEl.classList.remove('on'); void flashEl.offsetWidth; flashEl.classList.add('on');
  toastEl.className = type;
  toastEl.innerHTML = ICON[type] + '<span></span>';
  toastEl.lastChild.textContent = text;
  void toastEl.offsetWidth; toastEl.classList.add('on');
  g.fx = { type, t: 0.9 };
  if (type === 'bad') g.shake = 0.4;
  SFX[type](mult);
}
const achvQueue = [];
let achvBusy = false;
function award(id) {
  const p = loadProg();
  if (p.logros[id]) return;
  p.logros[id] = new Date().toISOString(); saveProg(p);
  g.newLogros.push(id); log('logro', null, id);
  achvQueue.push(LOGROS[id]); pumpAchv();
}
function pumpAchv() {
  if (achvBusy || !achvQueue.length) return;
  achvBusy = true;
  const el = $('achv'); $('achvTxt').textContent = achvQueue.shift();
  el.classList.remove('on'); void el.offsetWidth; el.classList.add('on'); SFX.achv();
  setTimeout(() => { achvBusy = false; pumpAchv(); }, 3100);
}
function burst(x, y, n, colors) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, sp = 120 + Math.random() * 260;
    g.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 120, t: 0.9 + Math.random() * 0.4, c: colors[i % colors.length], s: 5 + Math.random() * 5, r: Math.random() * 6 });
  }
}
function floatText(x, y, text, color) { g.floats.push({ x, y, text, color, t: 1.2 }); }
function breakStreak() { g.streak = 0; }

function infraction(kind, text, road, why) {
  g.lives--; g.cometidas++; g.kinds[kind]++; breakStreak();
  player.inv = 1.5;
  feedback('bad', text + ' · −1 vida');
  floatText(player.x, player.y - 40, '−1 vida', '#E53935');
  log('infraccion', road, kind);
  if (road) { player.x = player.side === 'R' ? road.x + road.w + player.r + 8 : road.x - player.r - 8; player.y = 300; }
  player.roadIdx = -1; player.crossing = null;
  if (!g.lessonSeen[kind]) { g.lessonSeen[kind] = true; showLesson(kind, why); }
  else if (g.lives <= 0) { g.pendingEnd = true; setTimeout(() => { if (state === 'playing') finish(false); }, 900); }
}

/* ---------- Micro-explicación ---------- */
let lessonTimer = null;
function showLesson(kind, why) {
  const L = LESSONS[kind];
  $('lTag').textContent = MODE === 'conductor' ? (ELIM[kind] ? 'FALTA ELIMINATORIA · −1 VIDA' : 'FALTA GRAVE · −10 PUNTOS DE NOTA') : 'APRENDE DE TU ERROR · −1 VIDA';
  $('lTitle').textContent = L.t; $('lNorm').textContent = L.n; $('lRef').textContent = L.ref; $('lWhy').textContent = why || L.why;
  g.lessons++; g.pendingEnd = g.lives <= 0;
  log('leccion', null, kind);
  state = 'lesson'; clearKeys();
  const bar = $('lBar'); bar.classList.remove('run'); void bar.offsetWidth; bar.classList.add('run');
  show('lesson');
  clearTimeout(lessonTimer); lessonTimer = setTimeout(closeLesson, 6000);
}
function closeLesson() {
  if (state !== 'lesson') return;
  clearTimeout(lessonTimer);
  if (g.pendingEnd) { finish(false); return; }
  state = 'playing'; show(null);
}

/* ---------- Distracción: celular ---------- */
const MSGS = [['Grupo "Promo IHC"', '¿Ya llegaste? Mira este video, está buenazo…'], ['Mamá', '¿Ya almorzaste? Te guardé rocoto relleno'],
              ['Delivery', 'Tu pedido está a 2 minutos. ¡Sal a recibirlo!'], ['Grupo "Feria EPIS"', '¿Quién trae la extensión para el stand?']];
function showNotif(road) {
  road.phoneShown = true;
  const m = MSGS[(road.i + LVI) % MSGS.length];
  $('nTitle').textContent = m[0]; $('nMsg').textContent = m[1]; $('pb1').textContent = m[1];
  notif = { road, t: 5 };
  $('notif').classList.add('show'); SFX.notif(); log('distraccion_aparece', road);
}
function hideNotif() { notif = null; $('notif').classList.remove('show'); }
function resolveNotif(choice) {
  if (!notif || state !== 'playing') return;
  const road = notif.road; hideNotif();
  log('distraccion_' + choice, road);
  if (choice === 'guardar') { g.distrEvitadas++; g.score += 20; feedback('ok', '+20 · Guardaste el celular'); award('desconectado'); }
  else if (choice === 'ver' && MODE === 'conductor') { g.distrVistas++; g.distractT = 2.5; $('phoneBig').classList.add('show'); dInfraction('celular_c', 'Usaste el celular mientras conducías', road); }
  else if (choice === 'ver') { g.distrVistas++; g.distractT = 3; breakStreak(); $('phoneBig').classList.add('show'); feedback('warn', 'Distraído: no ves el tránsito'); }
  else { g.distrEvitadas++; }
}

/* =========================================================
   8. ACTUALIZACIÓN PRINCIPAL
   ========================================================= */
function update(dt) {
  g.time += dt; g.play += dt;
  updateTraffic(dt);
  updateEffects(dt);

  if (g.distractT > 0) { g.distractT -= dt; if (g.distractT <= 0) $('phoneBig').classList.remove('show'); }
  if (notif) { notif.t -= dt; $('nBar').style.width = Math.max(0, notif.t / 5 * 100) + '%'; if (notif.t <= 0) resolveNotif('ignorar'); }

  // movimiento
  let dx = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
  let dy = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);
  if (dx || dy) {
    const len = Math.hypot(dx, dy); dx /= len; dy /= len;
    player.angle = Math.atan2(dy, dx);
    if (!g.moved) { g.moved = true; g.firstMove = g.play; log('primer_movimiento', null); }
  }
  const speed = PLAYER_SPEED * (g.distractT > 0 ? 0.35 : 1);
  const prevX = player.x;
  player.x += dx * speed * dt; player.y += dy * speed * dt;
  player.x = Math.max(player.r, Math.min(WORLD_W - player.r, player.x));
  const inRoadNow = player.roadIdx !== -1;
  player.y = Math.max(inRoadNow ? CW_TOP + 4 : BAND_TOP + player.r, Math.min(inRoadNow ? CW_BOT - 4 : BAND_BOT - player.r, player.y));
  if (player.inv > 0 && player.roadIdx === -1) {
    for (const road of roads) {
      if (prevX < road.x && player.x >= road.x) player.x = road.x - 0.5;
      if (prevX > road.x + road.w && player.x <= road.x + road.w) player.x = road.x + road.w + 0.5;
    }
  }

  // quesos helados (coleccionables en la vereda)
  for (const q of quesos) if (!q.got && Math.hypot(q.x - player.x, q.y - player.y) < player.r + 16) {
    q.got = true; g.quesos++; g.score += 15; SFX.coin();
    floatText(q.x, q.y - 20, '+15', '#FFC400'); burst(q.x, q.y, 10, ['#FFF3C4', '#FFFFFF', '#A0522D']);
    if (g.quesos === quesos.length) award('antojo');
  }

  // dilemas, esperas y reglas de cruce
  for (const road of roads) {
    const ps = pedState(road);
    const dist = road.x - player.x;
    const atCurb = player.roadIdx === -1 && dist > 0 && dist < 130;

    if (ps.s === 'green' && road.prevS && road.prevS !== 'green') {
      road.greenAt = atCurb ? g.play : null;
      if (atCurb && road.waited) { g.waitedGreen++; const p = loadProg(); p.waitsTotal = (p.waitsTotal || 0) + 1; saveProg(p); if (p.waitsTotal >= 3) award('paciencia'); }
      if (road.type === 'imprudente' && !road.triggered && !road.done && dist > 0 && dist < 520) triggerReckless(road);
    }
    road.prevS = ps.s;
    if (road.type === 'imprudente' && !road.triggered && !road.done && ps.s === 'green' && atCurb) triggerReckless(road);
    if (road.type === 'ambulancia' && !road.triggered && !road.done && player.roadIdx === -1 && dist > 0 && dist < 420 && ps.s !== 'red') triggerAmbulance(road);
    if (road.phone && !road.phoneShown && !road.done && !notif && player.roadIdx === -1 && dist > 130 && dist < 360) showNotif(road);
    if (atCurb && !road.done) { road.waitT += dt; if (ps.s === 'red') road.waited = true; }
    if (road.type === 'sinSemaforo') {
      const nearCw = player.y > CW_TOP - 30 && player.y < CW_BOT + 30;
      const waiting = player.roadIdx === -1 && nearCw && ((dist > 0 && dist < 170) || (player.x - (road.x + road.w) > 0 && player.x - (road.x + road.w) < 170));
      if (waiting || player.roadIdx === road.i) road.yieldT += dt; else road.yieldT = Math.max(0, road.yieldT - dt * 2);
    }

    const inside = player.x >= road.x && player.x <= road.x + road.w;
    if (player.roadIdx === -1 && inside) {
      player.side = prevX >= road.x + road.w ? 'R' : 'L';
      const onCrosswalk = player.y >= CW_TOP && player.y <= CW_BOT;
      if (road.emergency) { infraction('emergencia', 'No cediste el paso a la ambulancia', road); return; }
      if (!onCrosswalk) { infraction('fuera', 'Cruzaste fuera de la cebra', road); return; }
      if (ps.s === 'red') {
        if (road.type === 'policia') infraction('policia', 'El policía indicó ALTO', road);
        else infraction('rojo', 'Cruzaste con el semáforo en rojo', road);
        return;
      }
      player.roadIdx = road.i;
      player.crossing = { risky: false, warned: false, near: false };
      if (road.greenAt != null) g.reactions.push(g.play - road.greenAt);
      if (ps.s === 'amber') {
        player.crossing.risky = true; g.ambar++;
        feedback('warn', road.type === 'policia' ? 'Precaución: el policía va a detener el cruce' : 'Precaución: el semáforo está por cambiar');
      }
      if (ps.s === 'free') {
        const danger = road.lanes.some(l => l.cars.some(c => c.moving && (l.dir === 1
          ? (c.y + c.h / 2 < CW_TOP && CW_TOP - (c.y + c.h / 2) < 230)
          : (c.y - c.h / 2 > CW_BOT && (c.y - c.h / 2) - CW_BOT < 230))));
        if (danger) { player.crossing.risky = true; feedback('warn', 'Precaución: espera que los autos se detengan'); }
      }
      log('entra_cruce', road, ps.s);
    } else if (player.roadIdx === road.i) {
      if (!inside) {
        if (player.x > road.x + road.w && player.side === 'L' && !road.done) {
          road.done = true;
          if (player.crossing && !player.crossing.risky) {
            let pts = 50, msg = 'Cruce seguro';
            if (road.type === 'imprudente' && road.triggered) { pts = 75; msg = 'Miraste antes de cruzar'; award('aguila'); }
            else if (road.type === 'ambulancia' && road.ambPassed) { pts = 75; msg = 'Cediste el paso a la ambulancia'; award('rutalibre'); }
            else if (road.type === 'policia') { pts = 60; msg = 'Obedeciste al policía'; award('autoridad'); }
            else if (road.type === 'sinSemaforo') { pts = 60; msg = 'Esperaste que los autos se detengan'; }
            else if (road.waited) { pts = 75; msg = '¡Esperaste el verde!'; }
            g.streak++; g.maxStreak = Math.max(g.maxStreak, g.streak);
            const m = MULT[Math.min(g.streak, 5)], total = Math.round(pts * m);
            g.score += total; g.evitadas++;
            if (g.firstSafe == null) { g.firstSafe = g.play; award('primer'); }
            if (g.streak >= 5) award('racha5');
            g.waits.push(road.waitT);
            feedback('ok', m > 1 ? `+${total} · ${msg} · racha x${m}` : `+${total} · ${msg}`, m);
            floatText(player.x, player.y - 46, '+' + total, '#2ECC71');
            burst(player.x, player.y, 26, ['#FFC400', '#2ECC71', '#1E88E5', '#FFFFFF']);
            log('cruce_seguro', road, msg);
          } else {
            g.score += 10; g.riesgos++; breakStreak();
            feedback('warn', '+10 · Cruzaste, pero con riesgo');
            log('cruce_riesgoso', road);
          }
        }
        player.roadIdx = -1; player.crossing = null;
      } else if (player.crossing && !player.crossing.warned && ps.s === 'red') {
        player.crossing.warned = true;
        feedback('warn', '¡Apúrate! El semáforo cambió');
      }
    }
  }

  // colisiones y casi-atropellos
  if (player.inv <= 0) {
    for (const road of roads) {
      if (player.x + player.r < road.x || player.x - player.r > road.x + road.w) continue;
      const dist2 = (x, c) => {
        const cx = Math.max(x - c.w / 2, Math.min(player.x, x + c.w / 2));
        const cy = Math.max(c.y - c.h / 2, Math.min(player.y, c.y + c.h / 2));
        return Math.hypot(player.x - cx, player.y - cy);
      };
      for (const s of road.specials) if (dist2(s.x, s) < player.r - 2) {
        if (player.side == null) player.side = 'L';
        infraction('emergencia', 'No cediste el paso a la ambulancia', road); return;
      }
      for (const lane of road.lanes) for (const c of lane.cars) {
        const d = dist2(lane.x, c);
        if (d < player.r - 2) {
          if (player.side == null) player.side = 'L';
          const why = c.sliding ? WHY_RAIN : LV.env === 'noche' ? WHY_NIGHT : null;
          const txt = c.sliding ? '¡El auto no pudo frenar en la pista mojada!' : c.reckless ? '¡Un vehículo se pasó la luz! Mira a ambos lados' : '¡Choque! Cruza solo cuando sea seguro';
          infraction('choque', txt, road, why); return;
        }
        if (d < player.r + 18 && c.moving && player.crossing && !player.crossing.near) {
          player.crossing.near = true; player.crossing.risky = true; g.nearMiss++; breakStreak();
          feedback('warn', '¡Por poco! Ese vehículo pasó muy cerca'); log('casi_atropello', road);
        }
      }
    }
  } else player.inv -= dt;

  if (player.x >= META_X) { g.score += 100; finish(true); return; }
  if (g.fx) { g.fx.t -= dt; if (g.fx.t <= 0) g.fx = null; }
  updateTutorial(dt);
  updateHud();
}
function updateEffects(dt) {
  for (const p of g.particles) { p.t -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 520 * dt; p.r += dt * 8; }
  g.particles = g.particles.filter(p => p.t > 0);
  for (const f of g.floats) { f.t -= dt; f.y -= 50 * dt; }
  g.floats = g.floats.filter(f => f.t > 0);
  if (g.shake > 0) g.shake -= dt;
}

/* ---------- Tutorial (C-03, solo nivel 1) ---------- */
const tutEl = $('tutorial');
function updateTutorial(dt) {
  if (g.tutorialT <= 0) return;
  g.tutorialT -= dt;
  if (g.moved) g.movedT += dt;
  $('tcount').textContent = Math.max(0, Math.ceil(g.tutorialT));
  if (g.tutorialT <= 0 || g.movedT > 4) { g.tutorialT = 0; tutEl.classList.add('fade'); setTimeout(() => tutEl.classList.remove('show'), 600); }
}

/* ---------- HUD ---------- */
function signalInfo() {
  if (MODE === 'conductor') return dSignalInfo();
  const next = roads.find(r => !r.done && r.x + r.w > player.x - player.r);
  if (!next) return { street: LV.dest, text: 'Sigue hasta la META', color: '#FFC400', red: false, green: null };
  const ps = pedState(next), s = Math.ceil(ps.left);
  const blink = Math.floor(g.time * 4) % 2 === 0;
  if (next.emergency) return { street: next.name, text: '¡Ambulancia! Cede el paso', color: '#E53935', red: blink, green: null };
  if (next.type === 'sinSemaforo') {
    if (next.yieldT > 0.9) return { street: next.name + ' · sin semáforo', text: 'Los autos se detienen · Mira y cruza', color: '#2ECC71', red: false, green: '#2ECC71' };
    if (next.x - player.x > 150 || Math.abs(player.y - 300) > 60) return { street: next.name + ' · sin semáforo', text: 'Acércate a la cebra y detente', color: '#FFC400', red: false, green: null };
    return { street: next.name + ' · sin semáforo', text: 'Espera a que los autos se detengan', color: '#FF9800', red: false, green: null };
  }
  if (next.type === 'policia') {
    const street = next.name + ' · semáforo apagado';
    if (ps.s === 'red')   return { street, text: `Policía: ALTO (${s} s)`, color: '#E53935', red: true, green: null };
    if (ps.s === 'green') return { street, text: `Policía: PASE (${s} s)`, color: '#2ECC71', red: false, green: '#2ECC71' };
    return { street, text: 'Policía: ¡atención, va a parar!', color: '#FF9800', red: false, green: blink ? '#FF9800' : null };
  }
  if (ps.s === 'red')   return { street: next.name, text: `Semáforo en ROJO · Espera (${s} s)`, color: '#E53935', red: true, green: null };
  if (ps.s === 'green') return { street: next.name, text: `VERDE · Cruza por la cebra (${s} s)`, color: '#2ECC71', red: false, green: '#2ECC71' };
  return { street: next.name, text: 'Por cambiar · No inicies el cruce', color: '#FF9800', red: false, green: blink ? '#FF9800' : null };
}
function updateHud() {
  const pct = Math.min(100, Math.round((player.x / META_X) * 100));
  const si = signalInfo(), m = MULT[Math.min(g.streak, 5)];
  const key = [g.lives, g.score, pct, si.street, si.text, si.red, si.green, m, g.quesos].join('|');
  if (key === g.lastHud) return;
  const prevM = g.lastM; g.lastHud = key; g.lastM = m;
  [...$('hearts').children].forEach((h, i) => h.classList.toggle('lost', i >= g.lives));
  $('hearts').setAttribute('aria-label', `${Math.max(0, g.lives)} de 3 vidas`);
  $('score').textContent = String(g.score).padStart(4, '0');
  const st = $('streak');
  if (m > 1) { $('streakTxt').textContent = 'x' + m; if (prevM !== m) { st.classList.remove('on'); void st.offsetWidth; } st.classList.add('on'); } else st.classList.remove('on');
  $('quesoTxt').textContent = `${g.quesos}/${quesos.length}`;
  $('pct').textContent = pct + '%';
  $('pfill').style.width = pct + '%';
  $('pbar').setAttribute('aria-valuenow', pct);
  $('signalStreet').textContent = si.street;
  $('signalText').textContent = si.text;
  $('signal').style.borderColor = si.color;
  $('mlRed').style.color = si.red ? '#FF3B30' : '#30353B';
  $('mlGreen').style.color = si.green || '#30353B';
}

/* =========================================================
   9. DIBUJO (Canvas 2D)
   ========================================================= */
let dpr = 1;
function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = dark.width = Math.round(innerWidth * dpr);
  canvas.height = dark.height = Math.round(innerHeight * dpr);
}
addEventListener('resize', resize); resize();

function rr(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}
// Semáforo peatonal: figura de pie (ALTO, rojo) y figura caminando (PASE, verde)
function pedFigure(cx, cy, walking) {
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (walking) {
    ctx.beginPath(); ctx.arc(cx + 1.5, cy - 9.5, 3.6, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(cx + 1, cy - 4.5); ctx.lineTo(cx - 0.5, cy + 3); ctx.stroke();
    ctx.lineWidth = 2.8; ctx.beginPath();
    ctx.moveTo(cx + 0.5, cy - 3.5); ctx.lineTo(cx - 4.5, cy + 1.5);                         // brazo atrás
    ctx.moveTo(cx + 1, cy - 3.5); ctx.lineTo(cx + 5.5, cy);                                 // brazo adelante
    ctx.moveTo(cx - 0.5, cy + 3); ctx.lineTo(cx - 5, cy + 11.5);                            // pierna atrás
    ctx.moveTo(cx - 0.5, cy + 3); ctx.lineTo(cx + 3.5, cy + 7); ctx.lineTo(cx + 6, cy + 12); // pierna adelante
    ctx.stroke();
  } else {
    ctx.beginPath(); ctx.arc(cx, cy - 9.5, 3.6, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(cx, cy - 4.5); ctx.lineTo(cx, cy + 3); ctx.stroke();
    ctx.lineWidth = 2.8; ctx.beginPath();
    ctx.moveTo(cx - 3.5, cy - 3.5); ctx.lineTo(cx - 4.5, cy + 3.5);                         // brazos a los lados
    ctx.moveTo(cx + 3.5, cy - 3.5); ctx.lineTo(cx + 4.5, cy + 3.5);
    ctx.moveTo(cx - 1.6, cy + 3); ctx.lineTo(cx - 1.6, cy + 12);                            // piernas juntas
    ctx.moveTo(cx + 1.6, cy + 3); ctx.lineTo(cx + 1.6, cy + 12);
    ctx.stroke();
  }
}
function lamp(x, y, color, on, walking) {
  ctx.save();
  ctx.fillStyle = '#0B0D0F'; rr(ctx, x - 16, y - 16, 32, 32, 6); ctx.fill();               // visor del foco
  const c = on ? color : '#30353B';
  ctx.fillStyle = c; ctx.strokeStyle = c;
  if (on) { ctx.shadowColor = color; ctx.shadowBlur = 18; }
  ctx.translate(x, y + 0.5); ctx.scale(1.05, 1.05);
  pedFigure(0, 0, walking);
  ctx.restore();
}
function trafficLight(x, y, ps, poleTop, poleBot, off) {
  ctx.fillStyle = '#3A3F45'; ctx.fillRect(x + 17, poleTop, 6, poleBot - poleTop);
  ctx.fillStyle = '#14171A'; rr(ctx, x, y, 40, 78, 9); ctx.fill();
  if (off) { lamp(x + 20, y + 20, '#000', false, false); lamp(x + 20, y + 58, '#000', false, true); return; }
  const blink = Math.floor(g.time * 4) % 2 === 0;
  lamp(x + 20, y + 20, '#FF3B30', ps.s === 'red', false);
  lamp(x + 20, y + 58, ps.s === 'amber' ? '#FF9800' : '#2EE07A', ps.s === 'green' || (ps.s === 'amber' && blink), true);
}
function label(text, x, y, bg, fg, size = 20) {
  ctx.font = `800 ${size}px Lexend, system-ui, sans-serif`;
  const w = ctx.measureText(text).width + 24;
  ctx.fillStyle = bg; rr(ctx, x - w / 2, y - size * 0.9, w, size * 1.8, 10); ctx.fill();
  ctx.fillStyle = fg; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, x, y + 1);
}
function drawVehicle(cx, c, dir) {
  const x = cx - c.w / 2, y = c.y - c.h / 2, front = dir === 1;
  if (c.reckless || c.sliding) {
    ctx.save(); ctx.shadowColor = '#FF9800'; ctx.shadowBlur = Math.floor(g.time * 8) % 2 ? 30 : 10;
    ctx.fillStyle = 'rgba(255,152,0,.35)'; rr(ctx, x - 8, y - 8, c.w + 16, c.h + 16, 16); ctx.fill(); ctx.restore();
  }
  if (c.sliding) {                                     // salpicadura en pista mojada
    ctx.strokeStyle = 'rgba(200,225,255,.8)'; ctx.lineWidth = 3;
    for (let k = 0; k < 4; k++) { const sx = x + 6 + k * (c.w - 12) / 3, sy = front ? y - 6 : y + c.h + 6; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + (k - 1.5) * 4, sy + (front ? -16 : 16)); ctx.stroke(); }
  }
  if (c.type === 'mototaxi') {
    ctx.fillStyle = c.color; rr(ctx, x + 4, y, c.w - 8, c.h, 14); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = '#3E2723'; rr(ctx, x + 8, front ? y + 6 : y + 24, c.w - 16, 34, 8); ctx.fill();
    ctx.fillStyle = '#212121'; ctx.beginPath(); ctx.arc(cx, front ? y + c.h - 4 : y + 4, 7, 0, Math.PI * 2); ctx.fill();
    return;
  }
  ctx.fillStyle = c.color; rr(ctx, x, y, c.w, c.h, 12); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 4; ctx.stroke();
  if (c.type === 'combi') {
    ctx.fillStyle = '#1565C0'; ctx.fillRect(x + 2, y + 10, 8, c.h - 20); ctx.fillRect(x + c.w - 10, y + 10, 8, c.h - 20);
    ctx.fillStyle = 'rgba(0,0,0,.12)'; for (let k = 0; k < 4; k++) ctx.fillRect(x + 14, y + 40 + k * 16, c.w - 28, 4);
  }
  if (c.type === 'ambulancia') {
    ctx.fillStyle = '#D32F2F'; ctx.fillRect(x + 2, y + c.h * .45, c.w - 4, 10);
    ctx.fillRect(cx - 5, y + c.h * .55, 10, 30); ctx.fillRect(cx - 15, y + c.h * .55 + 10, 30, 10);
    const on = Math.floor(g.time * 8) % 2 === 0;
    ctx.save(); ctx.shadowBlur = 24;
    ctx.shadowColor = ctx.fillStyle = on ? '#E53935' : '#1E88E5'; ctx.fillRect(x + 6, y + c.h * .3, c.w / 2 - 8, 10);
    ctx.shadowColor = ctx.fillStyle = on ? '#1E88E5' : '#E53935'; ctx.fillRect(cx + 2, y + c.h * .3, c.w / 2 - 8, 10);
    ctx.restore();
  }
  ctx.fillStyle = 'rgba(20,23,26,.62)';
  rr(ctx, x + 8, front ? y + c.h - 36 : y + 12, c.w - 16, 22, 5); ctx.fill();
  if (c.type === 'taxi') { ctx.fillStyle = '#212121'; rr(ctx, cx - 16, c.y - 8, 32, 16, 4); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = '700 10px Lexend, system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('TAXI', cx, c.y + 1); }
  ctx.fillStyle = '#FFF59D';
  const hy = front ? y + c.h - 6 : y + 2;
  ctx.fillRect(x + 6, hy, 10, 4); ctx.fillRect(x + c.w - 16, hy, 10, 4);
}
function drawPolice(road, ps) {
  const cx = road.x + road.w / 2, cy = BAND_TOP - 62;
  ctx.fillStyle = '#9AA0A6'; ctx.beginPath(); ctx.arc(cx, cy, 30, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#E8EAEC'; ctx.lineWidth = 4; ctx.stroke();
  ctx.fillStyle = '#3E5B3A'; rr(ctx, cx - 20, cy - 10, 40, 22, 10); ctx.fill();
  ctx.strokeStyle = '#3E5B3A'; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.beginPath();
  if (ps.s === 'green') { const a = Math.sin(g.time * 8) * 0.5; ctx.moveTo(cx + 16, cy); ctx.lineTo(cx + 16 + Math.cos(a) * 26, cy + Math.sin(a) * 26); }
  else { ctx.moveTo(cx - 16, cy); ctx.lineTo(cx - 16, cy - 28); ctx.moveTo(cx + 16, cy); ctx.lineTo(cx + 16, cy - 28); }
  ctx.stroke();
  ctx.fillStyle = '#F5F5F5'; ctx.beginPath(); ctx.arc(cx, cy, 11, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#14171A'; ctx.fillRect(cx - 9, cy + 6, 18, 4);
}
function drawQueso(q) {
  const y = q.y + Math.sin(g.time * 3 + q.bob) * 3;
  ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(q.x, q.y + 16, 12, 4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = '#14171A'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(q.x - 12, y - 4); ctx.lineTo(q.x + 12, y - 4); ctx.lineTo(q.x + 8, y + 14); ctx.lineTo(q.x - 8, y + 14); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#FFF3C4'; ctx.beginPath(); ctx.ellipse(q.x, y - 6, 13, 8, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#A0522D'; [[-4, -7], [3, -4], [6, -8]].forEach(([a, b]) => { ctx.beginPath(); ctx.arc(q.x + a, y + b, 1.8, 0, Math.PI * 2); ctx.fill(); });
}

function draw() {
  if (MODE === 'conductor') return dDraw();
  const W = canvas.width, H = canvas.height;
  const inGame = state === 'playing' || state === 'paused' || state === 'lesson' || state === 'intro';
  const hudPx = inGame ? hud.getBoundingClientRect().height * dpr : 0;
  const viewH = H - hudPx;
  const s = Math.min(viewH / WORLD_H, W / 620);
  yExtra = Math.max(0, (viewH / s - WORLD_H) / 2);
  const viewWW = W / s;
  const follow = document.body.classList.contains('touch') ? 0.5 : 0.36;
  let camX = Math.max(-800, Math.min(WORLD_W - viewWW, player.x - viewWW * follow));
  let shY = 0;
  if (g.shake > 0) { camX += (Math.random() - .5) * 26 * g.shake; shY = (Math.random() - .5) * 26 * g.shake; }
  const toS = (wx, wy) => [(wx - camX) * s, hudPx + (wy + yExtra + shY) * s];

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#8E8B85'; ctx.fillRect(0, 0, W, H);
  ctx.setTransform(s, 0, 0, s, -camX * s, hudPx + (yExtra + shY) * s);
  const top = -yExtra, bot = WORLD_H + yExtra;

  // edificios de sillar (fondo desaturado)
  const edges = [-800]; roads.forEach(r => edges.push(r.x, r.x + r.w)); edges.push(META_X - 10);
  let bi = 0;
  for (let k = 0; k < edges.length; k += 2) {
    const a = edges[k], b = edges[k + 1], segW = b - a, n = Math.max(1, Math.ceil(segW / 440)), bw = segW / n;
    for (let j = 0; j < n; j++) {
      const x0 = a + j * bw + 24, w0 = bw - 48; if (w0 < 40) continue;
      [[top + 24, BAND_TOP - 24], [BAND_BOT + 24, bot - 24]].forEach(([y0, y1]) => {
        const c = bi++ % 2 ? ['#A39F98', '#B5B1AA'] : ['#9A968F', '#ACA8A1'];
        ctx.fillStyle = c[0]; rr(ctx, x0, y0, w0, y1 - y0, 8); ctx.fill();
        ctx.fillStyle = c[1]; rr(ctx, x0 + 24, y0 + 24, w0 - 48, y1 - y0 - 48, 4); ctx.fill();
      });
    }
  }
  // destino del nivel
  const px0 = META_X + 30;
  [[top + 24, BAND_TOP - 24], [BAND_BOT + 24, bot - 24]].forEach(([y0, y1]) => {
    ctx.fillStyle = '#87977F'; rr(ctx, px0, y0, WORLD_W + 400 - px0, y1 - y0, 10); ctx.fill();
    ctx.fillStyle = '#C9C5BD'; ctx.fillRect(px0 + 150, y0, 18, y1 - y0);
  });
  ctx.fillStyle = '#9FC3D6'; ctx.beginPath(); ctx.arc(META_X + 260, BAND_TOP - 110, 38, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#C9C5BD'; ctx.lineWidth = 8; ctx.stroke();

  // vereda
  ctx.fillStyle = '#C4C1BA'; ctx.fillRect(-800, BAND_TOP, WORLD_W + 1200, BAND_BOT - BAND_TOP);
  ctx.fillStyle = '#A8A49D'; ctx.fillRect(-800, BAND_TOP, WORLD_W + 1200, 6); ctx.fillRect(-800, BAND_BOT - 6, WORLD_W + 1200, 6);
  ctx.fillRect(-8, BAND_TOP, 8, BAND_BOT - BAND_TOP);
  if (LV.env === 'noche') {                       // postes de luz
    for (let x = 100; x < WORLD_W; x += 340) { ctx.fillStyle = '#3A3F45'; ctx.beginPath(); ctx.arc(x, BAND_TOP + 8, 7, 0, Math.PI * 2); ctx.fill(); }
  }

  for (const road of roads) {
    const ps = pedState(road);
    ctx.fillStyle = '#4B5057'; ctx.fillRect(road.x, top, road.w, bot - top);
    ctx.fillStyle = '#D5D8DB';
    const cx = road.x + road.w / 2 - 3;
    for (let y = Math.floor(top / 80) * 80; y < bot; y += 80) { if (y + 40 > BAND_TOP - 30 && y < BAND_BOT + 30) continue; ctx.fillRect(cx, y, 6, 40); }
    if (road.bump) [BAND_TOP - 168, BAND_BOT + 142].forEach(by => { for (let x = road.x; x < road.x + road.w; x += 24) { ctx.fillStyle = ((x - road.x) / 24) % 2 ? '#14171A' : '#FFC400'; ctx.fillRect(x, by, 24, 16); } });
    ctx.fillStyle = '#E8EAEC';
    ctx.fillRect(road.x + 8, BAND_TOP - 20, road.w / 2 - 16, 6);
    ctx.fillRect(road.x + road.w / 2 + 8, BAND_BOT + 14, road.w / 2 - 16, 6);
    ctx.fillStyle = '#FFC400';
    for (let x = road.x + 10; x < road.x + road.w - 10; x += 40) ctx.fillRect(x, CW_TOP, 22, CW_BOT - CW_TOP);
    if (road.type === 'sinSemaforo') {
      [[road.x - 56, BAND_TOP - 70], [road.x + road.w + 14, BAND_BOT + 22]].forEach(([sx, sy]) => {
        ctx.fillStyle = '#3A3F45'; ctx.fillRect(sx + 19, sy + 40, 4, 30);
        ctx.fillStyle = '#1565C0'; rr(ctx, sx, sy, 42, 42, 6); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(sx + 21, sy + 6); ctx.lineTo(sx + 37, sy + 36); ctx.lineTo(sx + 5, sy + 36); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#14171A'; ctx.fillRect(sx + 13, sy + 29, 16, 3); ctx.fillRect(sx + 15, sy + 23, 12, 3);
      });
    } else {
      const off = road.type === 'policia';
      trafficLight(road.x - 50, BAND_TOP - 112, ps, BAND_TOP - 44, BAND_TOP, off);
      trafficLight(road.x + road.w + 14, BAND_BOT + 42, ps, BAND_BOT, BAND_BOT + 42, off);
    }
    if (road.done) {
      ctx.fillStyle = '#15803D'; ctx.beginPath(); ctx.arc(road.x + road.w + 34, BAND_BOT - 30, 14, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(road.x + road.w + 27, BAND_BOT - 30); ctx.lineTo(road.x + road.w + 32, BAND_BOT - 25); ctx.lineTo(road.x + road.w + 41, BAND_BOT - 35); ctx.stroke();
    }
    ctx.font = '700 19px Lexend, system-ui, sans-serif';
    const tw = ctx.measureText(road.name).width + 28;
    ctx.fillStyle = '#1E4E8C'; rr(ctx, road.x - tw - 30, BAND_BOT + 30, tw, 42, 8); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(road.name, road.x - tw / 2 - 30, BAND_BOT + 52);
    for (const lane of road.lanes) for (const c of lane.cars) drawVehicle(lane.x, c, lane.dir);
    for (const sp of road.specials) drawVehicle(sp.x, sp, 1);
    if (road.type === 'policia') drawPolice(road, ps);
  }
  for (const q of quesos) if (!q.got) drawQueso(q);

  // meta
  const cell = 20;
  for (let yy = BAND_TOP; yy < BAND_BOT; yy += cell) for (let i = 0; i < 2; i++) {
    ctx.fillStyle = ((yy / cell) + i) % 2 ? '#14171A' : '#FFFFFF';
    ctx.fillRect(META_X - cell + i * cell, yy, cell, Math.min(cell, BAND_BOT - yy));
  }

  // jugador
  const blink = player.inv > 0 && Math.floor(player.inv * 10) % 2 === 0;
  ctx.globalAlpha = blink ? 0.35 : 1;
  ctx.fillStyle = 'rgba(255,196,0,.35)'; ctx.beginPath(); ctx.arc(player.x, player.y, player.r + 9, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#FFC400'; ctx.strokeStyle = '#14171A'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.arc(player.x, player.y, player.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.save(); ctx.translate(player.x, player.y); ctx.rotate(player.angle);
  ctx.lineWidth = 4.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(-9, 0); ctx.lineTo(9, 0); ctx.moveTo(2, -7); ctx.lineTo(9, 0); ctx.lineTo(2, 7); ctx.stroke();
  ctx.restore(); ctx.globalAlpha = 1;

  // ----- noche: oscuridad con recortes de luz (postes, faros, semáforos, jugador) -----
  if (LV.env === 'noche') {
    dctx.setTransform(1, 0, 0, 1, 0, 0); dctx.globalCompositeOperation = 'source-over';
    dctx.clearRect(0, 0, W, H); dctx.fillStyle = 'rgba(6,10,26,0.86)'; dctx.fillRect(0, hudPx, W, H - hudPx);
    dctx.globalCompositeOperation = 'destination-out';
    const hole = (wx, wy, r, a = 1) => {
      const [sx, sy] = toS(wx, wy), R = r * s;
      if (sx < -R || sx > W + R) return;
      const gr = dctx.createRadialGradient(sx, sy, 0, sx, sy, R);
      gr.addColorStop(0, `rgba(0,0,0,${a})`); gr.addColorStop(0.6, `rgba(0,0,0,${a * 0.7})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
      dctx.fillStyle = gr; dctx.beginPath(); dctx.arc(sx, sy, R, 0, Math.PI * 2); dctx.fill();
    };
    hole(player.x, player.y, 190);
    for (let x = 100; x < WORLD_W; x += 340) hole(x, BAND_TOP + 30, 150, 0.85);
    for (const road of roads) {
      if (road.type !== 'sinSemaforo' && road.type !== 'policia') { hole(road.x - 32, BAND_TOP - 77, 60, .9); hole(road.x + road.w + 32, BAND_BOT + 77, 60, .9); }
      if (road.type === 'policia') hole(road.x + road.w / 2, BAND_TOP - 70, 90, .9);
      hole(road.x + road.w / 2, (CW_TOP + CW_BOT) / 2, 120, .55);          // cebra iluminada
      for (const lane of road.lanes) for (const c of lane.cars) { hole(lane.x, c.y + lane.dir * (c.h / 2 + 70), 95, .9); hole(lane.x, c.y, 50, .6); }
      for (const sp of road.specials) hole(sp.x, sp.y, 150, 1);
    }
    for (const q of quesos) if (!q.got) hole(q.x, q.y, 36, .8);
    hole(META_X, (BAND_TOP + BAND_BOT) / 2, 160, .9);
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(dark, 0, 0);
    ctx.setTransform(s, 0, 0, s, -camX * s, hudPx + (yExtra + shY) * s);
  }

  // etiquetas siempre legibles (por encima de la oscuridad)
  for (const road of roads) if (road.type === 'policia') {
    const ps = pedState(road), cx = road.x + road.w / 2;
    const t = ps.s === 'green' ? 'PASE' : ps.s === 'red' ? 'ALTO' : '¡ATENCIÓN!';
    label(t, cx, BAND_TOP - 118, ps.s === 'green' ? '#15803D' : ps.s === 'red' ? '#D32F2F' : '#FF9800', ps.s === 'amber' ? '#14171A' : '#FFFFFF', 18);
  }
  label('META', META_X, BAND_TOP - 40, '#FFFFFF', '#14171A', 24);
  label(LV.dest.toUpperCase(), META_X + 260, BAND_BOT + 70, '#14171A', '#FFFFFF', 16);

  // lluvia (espacio de pantalla)
  if (LV.env === 'lluvia') {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = 'rgba(30,50,85,0.22)'; ctx.fillRect(0, hudPx, W, H - hudPx);
    ctx.strokeStyle = 'rgba(210,228,255,0.55)'; ctx.lineWidth = 1.6 * dpr;
    ctx.beginPath();
    const t = g.time;
    for (let i = 0; i < 170; i++) {
      const x = ((i * 137.7 + t * 260) % (W + 100)) - 50;
      const y = hudPx + ((i * 91.3 * (1 + (i % 5) * 0.13) + t * 1500) % (H - hudPx));
      ctx.moveTo(x, y); ctx.lineTo(x - 6 * dpr, y + 20 * dpr);
    }
    ctx.stroke();
    ctx.setTransform(s, 0, 0, s, -camX * s, hudPx + (yExtra + shY) * s);
  }

  // efectos: partículas, textos flotantes, icono de feedback, celular
  for (const p of g.particles) { ctx.save(); ctx.globalAlpha = Math.min(1, p.t * 1.5); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); ctx.restore(); }
  for (const f of g.floats) {
    ctx.globalAlpha = Math.min(1, f.t * 1.6); ctx.font = '800 28px Lexend, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 6; ctx.strokeStyle = '#14171A'; ctx.strokeText(f.text, f.x, f.y); ctx.fillStyle = f.color; ctx.fillText(f.text, f.x, f.y); ctx.globalAlpha = 1;
  }
  if (g.distractT > 0) { ctx.fillStyle = '#5E35B1'; rr(ctx, player.x + 14, player.y - 44, 20, 32, 4); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke(); }
  if (g.fx) {
    const yy = player.y - player.r - 34 - (0.9 - g.fx.t) * 30;
    ctx.globalAlpha = Math.min(1, g.fx.t * 2.5);
    ctx.fillStyle = COLORS[g.fx.type]; ctx.strokeStyle = '#14171A'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(player.x, yy, 20, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = g.fx.type === 'warn' ? '#14171A' : '#FFFFFF'; ctx.lineWidth = 4.5; ctx.lineCap = 'round';
    ctx.beginPath();
    if (g.fx.type === 'ok') { ctx.moveTo(player.x - 8, yy); ctx.lineTo(player.x - 2, yy + 6); ctx.lineTo(player.x + 9, yy - 6); }
    else if (g.fx.type === 'bad') { ctx.moveTo(player.x - 7, yy - 7); ctx.lineTo(player.x + 7, yy + 7); ctx.moveTo(player.x + 7, yy - 7); ctx.lineTo(player.x - 7, yy + 7); }
    else { ctx.moveTo(player.x, yy - 9); ctx.lineTo(player.x, yy + 2); ctx.moveTo(player.x, yy + 8); ctx.lineTo(player.x, yy + 8.5); }
    ctx.stroke(); ctx.globalAlpha = 1;
  }
}

/* =========================================================
   9-B. MODO CONDUCTOR · Examen práctico de manejo
   Reglas verificadas en el TUO del Reglamento Nacional de Tránsito:
   Art. 49 (luces), 57 y 60 (policía), 63-64 (derecho de paso del peatón),
   162 (velocidades, mod. D.S. 025-2021-MTC), códigos M25 (emergencia) y G28 (cinturón).
   ========================================================= */
const DLEVELS = [
  { name: 'Clase de manejo', dest: 'Av. Ejército', news: ['Cinturón de seguridad', 'Semáforo vehicular', 'Ceder el paso en la cebra'],
    zones: [ { limit: 50, label: 'Avenida' } ], npc: 2,
    items: [ { type: 'semaforo', street: 'Calle Cruz Verde' }, { type: 'cebra', street: 'Paso peatonal' },
             { type: 'semaforo', street: 'Av. Emmel' }, { type: 'semaforo', street: 'Av. Trinidad Morán' } ] },
  { name: 'Calles del Centro', dest: 'Colegio Independencia', news: ['Calles a 30 km/h', 'Señal PARE', 'Zona escolar', 'CEDA EL PASO', 'Celular al volante'],
    zones: [ { limit: 30, label: 'Calle' }, { at: 2, limit: 30, label: 'Zona escolar', school: true }, { at: 3, limit: 30, label: 'Calle' } ], npc: 2, phoneAt: 1,
    items: [ { type: 'pare', street: 'Calle Santo Domingo' }, { type: 'semaforo', street: 'Calle Bolívar' },
             { type: 'cebra', street: 'Zona escolar', school: true }, { type: 'ceda', street: 'Calle Melgar' }, { type: 'semaforo', street: 'Calle Jerusalén' } ] },
  { name: 'Examen práctico', dest: 'Fin del examen', news: ['Policía de tránsito', 'Ambulancia detrás de ti', 'Cambios de límite', 'Todo lo aprendido'],
    zones: [ { limit: 50, label: 'Avenida' }, { at: 3, limit: 30, label: 'Calle' } ], npc: 3, ambAt: 1, phoneAt: 4,
    items: [ { type: 'semaforo', street: 'Av. Venezuela' }, { type: 'policia', street: 'Av. Goyeneche' }, { type: 'cebra', street: 'Paso peatonal' },
             { type: 'pare', street: 'Calle Peral' }, { type: 'semaforo', street: 'Calle San Juan de Dios' }, { type: 'ceda', street: 'Calle San José' } ] }
];
const R_TOP = 200, R_MID = 300, R_BOT = 400, LANE_L = 250, LANE_R = 350;
const CAR_L = 100, CAR_T = 50, KMH = 6, VMAX = 70 * KMH, ACC = 115, BRK = 560, DRAG = 38;
const D_FIRST = 1100, D_GAP = 1000, ZEBRA_A = 80, ZEBRA_B = 20, STOP_D = 92, CROSS_W = 200;
const DCYC = 11, D_GREEN = 5, D_AMBER = 7;
const ELIM = { rojo_c: 1, peaton_c: 1, choque_c: 1, policia_c: 1 };
const PED_COLORS = ['#7E57C2', '#26A69A', '#EF6C00', '#5C6BC0', '#8D6E63', '#EC407A'];
let items = [], zones = [], npcs = [], amb = null;

function dSetup(i) {
  LVI = i; LV = DLEVELS[i]; N_ROADS = LV.items.length;
  META_X = D_FIRST + (N_ROADS - 1) * D_GAP + 900; WORLD_W = META_X + 500;
}
function dBuild() {
  items = LV.items.map((it, i) => {
    const x = D_FIRST + i * D_GAP;
    return Object.assign({}, it, {
      i, x, name: it.street, stopX: x - STOP_D, zA: x - ZEBRA_A, zB: x - ZEBRA_B,
      off: (i * 4.3 + 2 + LVI * 1.7) % DCYC, peds: [], pedT: 0.5 + Math.random(), prevS: null, amberAt: -9,
      minV: 999, stoppedRed: false, yielded: false, lineDone: false, zebraDone: false, phoneShown: false,
      cross: it.type === 'cebra' ? [] : [ { dir: 1, x: x + 60, cars: [], t: Math.random() }, { dir: -1, x: x + 140, cars: [], t: Math.random() * 1.5 } ]
    });
  });
  zones = LV.zones.map(z => ({ x0: z.at == null ? -9999 : items[z.at].x - 450, limit: z.limit, label: z.label, school: !!z.school, flagged: false, overT: 0 }));
  const cols = ['#1E88E5', '#C62828', '#ECEFF1', '#455A64'];
  npcs = [];
  for (let k = 0; k < (LV.npc || 0); k++) npcs.push({ x: 650 + k * 1450, y: k % 2 ? LANE_L : LANE_R, v: 0, w: 96, h: 48, color: cols[k % 4], wait: 0, cleared: {}, braking: false });
  amb = null;
}
function zoneAt(x) { let z = zones[0]; for (const zz of zones) if (x >= zz.x0) z = zz; return z; }
function dState(it) {
  if (it.type !== 'semaforo' && it.type !== 'policia') return { s: 'none', left: 0 };
  const t = (g.time + it.off) % DCYC;
  if (t < D_GREEN) return { s: 'green', left: D_GREEN - t };
  if (t < D_AMBER) return { s: 'amber', left: D_AMBER - t };
  return { s: 'red', left: DCYC - t };
}
function pedsOnRoad(it) { return it.peds.some(p => p.y > R_TOP - 14 && p.y < R_BOT + 14); }
// Fase "todo rojo": el tránsito transversal se detiene 1,3 s antes de tu verde para despejar el cruce.
// Si ya estás dentro de la intersección, los autos que aún no llegan a su línea te esperan.
function playerInBox(it) { return player.x + CAR_L / 2 > it.stopX + 4 && player.x - CAR_L / 2 < it.x + CROSS_W; }
function crossMustStop(it) {
  if (it.type === 'semaforo' || it.type === 'policia') { const ps = dState(it); return ps.s !== 'red' || ps.left < 1.3 || playerInBox(it); }
  return (it.type === 'pare' || it.type === 'ceda') && playerInBox(it) && !it.crashed;
}
// Peligro = un auto transversal ya está en tu calzada o llegaría en menos de 3 s.
function crossDanger(it) {
  return it.cross.some(l => l.cars.some(c => {
    const inRoad = c.y + c.h / 2 > R_TOP && c.y - c.h / 2 < R_BOT;
    if (inRoad) return true;
    if (!c.moving || c.v <= 0) return false;
    const d = l.dir === 1 ? R_TOP - (c.y + c.h / 2) : (c.y - c.h / 2) - R_BOT;
    return d > 0 && d / c.v < 3.0;
  }));
}

/* ---------- tráfico transversal y peatones ---------- */
function dTraffic(dt) {
  for (const it of items) {
    const ps = dState(it), stopCross = crossMustStop(it);
    const near = player.x + CAR_L / 2 > it.zA - 260 && player.x - CAR_L / 2 < it.zB + 10 && player.v > 25;
    const wantPeds = it.type === 'cebra' || ((it.type === 'semaforo' || it.type === 'policia') && ps.s === 'red' && ps.left > 1.6);
    it.pedT -= dt;
    if (wantPeds && it.pedT <= 0 && !(it.type === 'cebra' && near)) {
      const n = it.school ? 2 + Math.floor(Math.random() * 2) : 1 + (Math.random() < .3 ? 1 : 0);
      const dir = Math.random() < .5 ? 1 : -1;
      for (let k = 0; k < n; k++) it.peds.push({ x: it.zA + 14 + Math.random() * 32, y: (dir > 0 ? R_TOP - 48 : R_BOT + 48) - dir * k * 28, dir,
        v: it.school ? 44 : 54 + Math.random() * 16, kid: !!it.school, c: PED_COLORS[Math.floor(Math.random() * PED_COLORS.length)], ph: Math.random() * 6 });
      it.pedT = it.type === 'cebra' ? (it.school ? 4.2 : 5.5) + Math.random() * 3 : 1.6 + Math.random() * 1.6;
    }
    for (const p of it.peds) { p.y += p.dir * p.v * dt; p.ph += dt * 9; }
    it.peds = it.peds.filter(p => !p.gone && (p.dir > 0 ? p.y < R_BOT + 70 : p.y > R_TOP - 70));

    for (const lane of it.cross) {
      lane.t -= dt;
      const spawnY = lane.dir === 1 ? -yExtra - 140 : WORLD_H + yExtra + 140;
      if (lane.t <= 0) {
        const lastC = lane.cars[lane.cars.length - 1];
        const free = !lastC || (lane.dir === 1 ? lastC.y - lastC.h / 2 - spawnY > 110 : spawnY - (lastC.y + lastC.h / 2) > 110);
        if (free) { const c = newCar(randomVeh(), spawnY); c.v = 250 + Math.random() * 60; lane.cars.push(c); }
        lane.t = (it.type === 'pare' || it.type === 'ceda' ? 1.5 : 1.1) + Math.random() * 1.8;
      }
      for (let k = 0; k < lane.cars.length; k++) {
        const c = lane.cars[k], ahead = lane.cars[k - 1];
        let ny = c.y + lane.dir * c.v * dt;
        if (lane.dir === 1) {
          let limit = Infinity; const sl = R_TOP - 16;
          if (stopCross && c.y + c.h / 2 <= sl + 1) limit = sl;
          if (ahead) limit = Math.min(limit, ahead.y - ahead.h / 2 - CAR_GAP);
          if (ny + c.h / 2 > limit) ny = Math.max(c.y, limit - c.h / 2);
        } else {
          let limit = -Infinity; const sl = R_BOT + 16;
          if (stopCross && c.y - c.h / 2 >= sl - 1) limit = sl;
          if (ahead) limit = Math.max(limit, ahead.y + ahead.h / 2 + CAR_GAP);
          if (ny - c.h / 2 < limit) ny = Math.min(c.y, limit + c.h / 2);
        }
        c.moving = Math.abs(ny - c.y) > 0.05; c.y = ny;
      }
      lane.cars = lane.cars.filter(c => lane.dir === 1 ? c.y < WORLD_H + yExtra + 220 : c.y > -yExtra - 220);
    }
  }
}

/* ---------- otros autos en tu vía (respetan las reglas) ---------- */
function dNpc(dt) {
  for (const n of npcs) {
    const z = zoneAt(n.x), target = z.limit * KMH * 0.88;
    let vmax = target;
    const front = n.x + n.w / 2;
    for (const it of items) {
      if (it.stopX + 6 < front && it.zA + 4 < front) continue;
      const dist = it.stopX - front;
      if (dist > 420) break;
      const ps = dState(it);
      let must = false;
      if (it.type === 'semaforo' || it.type === 'policia') must = ps.s === 'red' || (ps.s === 'amber' && dist > 70);
      if (it.type === 'pare' && !n.cleared[it.i]) {
        must = true;
        if (dist < 14 && n.v < 6) { n.wait += dt; if (n.wait > 0.9 && !crossDanger(it)) { n.cleared[it.i] = true; n.wait = 0; } }
      }
      if (it.type === 'ceda' && crossDanger(it) && dist > 0) must = true;
      if (pedsOnRoad(it) && front < it.zA + 2) must = true;
      if (must && dist > -4) vmax = Math.min(vmax, Math.sqrt(Math.max(0, 2 * BRK * 0.55 * Math.max(0, dist - 6))));
      break;
    }
    // distancia con el vehículo de adelante (otro auto o tú)
    let gap = Infinity;
    for (const o of npcs.concat([{ x: player.x, y: player.y, w: CAR_L }])) {
      if (o === n || Math.abs(o.y - n.y) > 30 || o.x <= n.x) continue;
      gap = Math.min(gap, o.x - o.w / 2 - front);
    }
    if (gap < Infinity) vmax = Math.min(vmax, Math.sqrt(Math.max(0, 2 * BRK * 0.55 * Math.max(0, gap - 34))));
    n.braking = vmax < n.v - 2;
    n.v = n.v < vmax ? Math.min(vmax, n.v + ACC * 0.75 * dt) : Math.max(vmax, n.v - BRK * dt);
    n.x += n.v * dt;
  }
  npcs = npcs.filter(n => n.x < WORLD_W + 400);
}

/* ---------- puntaje del examen ---------- */
function dNota() { return Math.max(0, 100 - 20 * (g.elim || 0) - 10 * (g.graves || 0) - 5 * (g.leves || 0)); }
function dGood(it, pts, msg) {
  g.streak++; g.maxStreak = Math.max(g.maxStreak, g.streak);
  const m = MULT[Math.min(g.streak, 5)], total = Math.round(pts * m);
  g.score += total; g.evitadas++;
  if (g.firstSafe == null) { g.firstSafe = g.play; award('primer'); }
  if (g.streak >= 5) award('racha5');
  feedback('ok', m > 1 ? `+${total} · ${msg} · racha x${m}` : `+${total} · ${msg}`, m);
  floatText(player.x, player.y - 56, '+' + total, '#2ECC71');
  burst(player.x, player.y, 22, ['#FFC400', '#2ECC71', '#1E88E5', '#FFFFFF']);
  log('decision_correcta', it, msg);
}
function dRisk(it, msg) {
  g.leves++; g.riesgos++; breakStreak();
  feedback('warn', msg + ' · falta leve (−5)');
  log('falta_leve', it, msg);
}
function dInfraction(kind, text, it, why) {
  const elim = !!ELIM[kind];
  g.cometidas++; g.kinds[kind] = (g.kinds[kind] || 0) + 1; breakStreak();
  if (elim) { g.elim++; g.lives--; } else g.graves++;
  player.inv = 1.2;
  feedback('bad', text + (elim ? ' · falta eliminatoria' : ' · falta grave'));
  floatText(player.x, player.y - 56, elim ? '−1 vida' : '−10 nota', '#E53935');
  log('infraccion', it, kind);
  if (!g.lessonSeen[kind]) { g.lessonSeen[kind] = true; showLesson(kind, why); }
  else if (g.lives <= 0) { g.pendingEnd = true; setTimeout(() => { if (state === 'playing') finish(false); }, 900); }
}
function fastenBelt() {
  if (MODE !== 'conductor' || state !== 'playing' || g.belt) return;
  g.belt = true; document.body.classList.remove('nobelt'); $('spBelt').classList.add('on');
  if (!g.beltWarned) { g.score += 20; feedback('ok', '+20 · Cinturón abrochado'); log('cinturon', null, 'abrochado'); }
}

/* ---------- actualización del modo conductor ---------- */
function dUpdate(dt) {
  g.time += dt; g.play += dt;
  dTraffic(dt); dNpc(dt); updateEffects(dt);
  if (g.distractT > 0) { g.distractT -= dt; if (g.distractT <= 0) $('phoneBig').classList.remove('show'); }
  if (notif) { notif.t -= dt; $('nBar').style.width = Math.max(0, notif.t / 5 * 100) + '%'; if (notif.t <= 0) resolveNotif('ignorar'); }

  // arrancar sin cinturón
  if (keys.right && !g.belt && !g.beltWarned) {
    g.beltWarned = true; g.belt = true; document.body.classList.remove('nobelt'); $('spBelt').classList.add('on');
    dInfraction('cinturon', 'Arrancaste sin el cinturón de seguridad', null); return;
  }
  const distracted = g.distractT > 0;
  const braking = keys.left || keys.brake;
  if (braking) player.v -= BRK * (distracted ? 0.35 : 1) * dt;
  else if (keys.right) player.v += ACC * dt;
  else player.v -= DRAG * dt;
  player.v = Math.max(0, Math.min(VMAX, player.v));
  player.braking = braking && player.v > 0.5;
  if (!distracted) { if (keys.up) player.ty = LANE_L; if (keys.down) player.ty = LANE_R; }
  const dy = player.ty - player.y; player.y += Math.sign(dy) * Math.min(Math.abs(dy), 200 * dt);
  if ((keys.right || keys.up || keys.down) && !g.moved) { g.moved = true; g.firstMove = g.play; log('primer_movimiento', null); }

  const prevFront = player.x + CAR_L / 2;
  player.x += player.v * dt;
  const front = player.x + CAR_L / 2, kmh = player.v / KMH;

  // zonas de velocidad (Art. 162)
  const z = zoneAt(player.x);
  if (z !== g.zone) { g.zone = z; if (g.play > 0.5) { floatText(player.x + 160, R_TOP - 40, `${z.label}: máx. ${z.limit} km/h`, '#FFC400'); SFX.tick(); } }
  if (kmh > z.limit + 3) { z.overT += dt; if (z.overT > 1.2 && !z.flagged) { z.flagged = true; dInfraction('velocidad', `Exceso de velocidad: ${Math.round(kmh)} km/h en zona de ${z.limit}`, null); return; } }
  else z.overT = Math.max(0, z.overT - dt);

  for (const it of items) {
    const ps = dState(it);
    if (ps.s === 'amber' && it.prevS !== 'amber') it.amberAt = g.time;
    it.prevS = ps.s;
    if (!it.lineDone && front > it.stopX - 170 && front <= it.stopX + 2) {
      it.minV = Math.min(it.minV, player.v);
      if (player.v < 10 && (ps.s === 'red' || ps.s === 'amber')) it.stoppedRed = true;
    }
    if (!it.zebraDone && front > it.zA - 210 && front <= it.zA + 2 && player.v < 10 && pedsOnRoad(it)) it.yielded = true;

    if (!it.lineDone && prevFront <= it.stopX && front > it.stopX) {
      it.lineDone = true;
      if (it.type === 'semaforo') {
        if (ps.s === 'red') { dInfraction('rojo_c', 'Pasaste con la luz roja', it); return; }
        if (ps.s === 'amber' && g.time - it.amberAt > 1.0) dRisk(it, 'Con ámbar debías detenerte: podías hacerlo con seguridad');
        else if (it.stoppedRed) dGood(it, 50, 'Esperaste la luz verde');
      } else if (it.type === 'policia') {
        if (ps.s === 'red') { dInfraction('policia_c', 'El policía indicó ALTO', it); return; }
        if (ps.s === 'amber' && g.time - it.amberAt > 1.0) dRisk(it, 'El policía estaba deteniendo tu vía');
        else dGood(it, 60, 'Obedeciste al policía');
      } else if (it.type === 'pare') {
        if (it.minV > 12) { dInfraction('pare', 'No hiciste la parada completa en PARE', it); return; }
        if (crossDanger(it)) dRisk(it, 'Paraste, pero saliste con autos cruzando');
        else dGood(it, 60, 'Parada completa en PARE');
      } else if (it.type === 'ceda') {
        if (crossDanger(it)) { dInfraction('ceda', 'No cediste el paso en la intersección', it); return; }
        dGood(it, 40, 'Cediste el paso correctamente');
      }
    }
    if (!it.zebraDone && prevFront <= it.zA && front > it.zA) {
      it.zebraDone = true;
      if (pedsOnRoad(it)) { dInfraction('peaton_c', 'No cediste el paso al peatón en la cebra', it); return; }
      if (it.yielded) dGood(it, 50, it.school ? 'Cediste el paso a los escolares' : 'Cediste el paso al peatón');
    }
  }

  // ambulancia detrás (código M25)
  if (LV.ambAt != null && !g.ambDone && player.x > items[LV.ambAt].x + 350) {
    g.ambDone = true;
    amb = { type: 'ambulancia', x: player.x - 1200, y: LANE_L, v: 660, w: 124, h: 52, judged: false };
    SFX.siren(); feedback('warn', '¡Ambulancia detrás! Pásate al carril derecho y reduce'); log('dilema_ambulancia', null);
  }
  if (amb) {
    amb.x += amb.v * dt;
    if (!amb.judged && amb.x + amb.w / 2 > player.x - CAR_L / 2 - 240) {
      amb.judged = true; SFX.siren();
      if (player.y < R_MID) { dInfraction('emergencia_c', 'No cediste el paso a la ambulancia', null); return; }
      if (kmh > 35) dRisk(null, 'Te pasaste a la derecha, pero debías reducir más');
      else { dGood(null, 75, 'Cediste el paso a la ambulancia'); award('rutalibre'); }
    }
    if (amb.x > player.x + 2400) amb = null;
  }
  // celular
  if (LV.phoneAt != null && !g.phoneDone && !notif && player.x > items[LV.phoneAt].x - 760) { g.phoneDone = true; showNotif(items[LV.phoneAt]); }

  // colisiones
  if (player.inv <= 0) {
    const px0 = player.x - CAR_L / 2, py0 = player.y - CAR_T / 2;
    const hitR = (x, y, w, h) => x < px0 + CAR_L && x + w > px0 && y < py0 + CAR_T && y + h > py0;
    for (const it of items) {
      for (const p of it.peds) if (hitR(p.x - 10, p.y - 10, 20, 20)) {
        p.gone = true; player.v = 0;
        dInfraction('peaton_c', '¡Atropellaste a un peatón!', it); return;
      }
      for (const lane of it.cross) for (const c of lane.cars) if (hitR(lane.x - c.w / 2, c.y - c.h / 2, c.w, c.h)) {
        player.v = 0; player.x = it.stopX - CAR_L / 2 - 40; it.lineDone = false; it.minV = 0;
        dInfraction('choque_c', 'Chocaste con un vehículo que cruzaba', it); player.inv = 2; return;
      }
    }
    for (const n of npcs) if (hitR(n.x - n.w / 2, n.y - n.h / 2, n.w, n.h)) {
      player.v = 0; player.x = n.x - n.w / 2 - CAR_L / 2 - 24;
      dInfraction('choque_c', 'Chocaste por alcance: guarda tu distancia', null); return;
    }
  } else player.inv -= dt;

  if (player.x >= META_X) { g.score += 100; finish(true); return; }
  if (g.fx) { g.fx.t -= dt; if (g.fx.t <= 0) g.fx = null; }
  updateTutorial(dt);
  updateHud();
  dSpeedo(kmh, z);
}
let lastSpeedo = '';
function dSpeedo(kmh, z) {
  const over = kmh > z.limit + 3, k = Math.round(kmh) + '|' + z.limit + '|' + over;
  if (k === lastSpeedo) return; lastSpeedo = k;
  $('spVal').textContent = Math.round(kmh); $('spLim').textContent = z.limit;
  $('speedo').classList.toggle('over', over);
}
function dSignalInfo() {
  const front = player.x + CAR_L / 2;
  const it = items.find(t => t.zB > front - 4);
  const z = zoneAt(player.x), zl = `${z.label} · máx. ${z.limit} km/h`;
  if (amb && !amb.judged) return { street: 'Vehículo de emergencia', text: '¡Ambulancia! Pásate a la derecha y reduce', color: '#E53935', red: true, green: null };
  if (!g.belt) return { street: zl, text: 'Abróchate el cinturón antes de arrancar', color: '#E53935', red: true, green: null };
  if (!it) return { street: zl, text: `Sigue hasta: ${LV.dest}`, color: '#FFC400', red: false, green: null };
  const ps = dState(it), s = Math.ceil(ps.left), st = `${it.street} · ${zl}`;
  if (pedsOnRoad(it) && front < it.zA + 4) return { street: st, text: it.school ? 'Escolares cruzando · Detente' : 'Peatones en la cebra · Detente', color: '#E53935', red: true, green: null };
  if (it.type === 'semaforo') {
    if (ps.s === 'red') return { street: st, text: `ROJO · Detente antes de la línea (${s} s)`, color: '#E53935', red: true, green: null };
    if (ps.s === 'green') return { street: st, text: `VERDE · Avanza con precaución (${s} s)`, color: '#2ECC71', red: false, green: '#2ECC71' };
    return { street: st, text: 'ÁMBAR · Detente si puedes hacerlo seguro', color: '#FF9800', red: false, green: '#FF9800' };
  }
  if (it.type === 'policia') {
    if (ps.s === 'red') return { street: st + ' · semáforo apagado', text: `Policía: ALTO (${s} s)`, color: '#E53935', red: true, green: null };
    if (ps.s === 'green') return { street: st + ' · semáforo apagado', text: `Policía: PASE (${s} s)`, color: '#2ECC71', red: false, green: '#2ECC71' };
    return { street: st + ' · semáforo apagado', text: 'Policía: ¡atención, va a parar!', color: '#FF9800', red: false, green: '#FF9800' };
  }
  if (it.type === 'pare') {
    const stopped = it.minV < 12 && it.stopX - front < 175;
    if (!stopped) return { street: st, text: 'PARE · Detente por completo y mira', color: '#E53935', red: true, green: null };
    return crossDanger(it) ? { street: st, text: 'PARE · Autos cruzando: espera', color: '#E53935', red: true, green: null }
                           : { street: st, text: 'PARE · Vía libre: avanza', color: '#2ECC71', red: false, green: '#2ECC71' };
  }
  if (it.type === 'ceda') return crossDanger(it)
    ? { street: st, text: 'CEDA EL PASO · Autos cruzando, espera', color: '#E53935', red: true, green: null }
    : { street: st, text: 'CEDA EL PASO · Mira y continúa', color: '#FF9800', red: false, green: '#FF9800' };
  return { street: st, text: it.school ? 'Zona escolar · Atento a los escolares' : 'Paso peatonal · Atento a los peatones', color: '#FF9800', red: false, green: null };
}

/* ---------- dibujo del modo conductor ---------- */
function drawCarH(x, y, w, h, color, o = {}) {
  const x0 = x - w / 2, y0 = y - h / 2;
  ctx.fillStyle = 'rgba(0,0,0,.18)'; rr(ctx, x0 + 4, y0 + 6, w, h, 12); ctx.fill();
  ctx.fillStyle = color; rr(ctx, x0, y0, w, h, 12); ctx.fill();
  ctx.strokeStyle = o.player ? '#14171A' : 'rgba(0,0,0,.35)'; ctx.lineWidth = o.player ? 4 : 3; ctx.stroke();
  if (o.amb) {
    ctx.fillStyle = '#D32F2F'; ctx.fillRect(x0 + 6, y - 4, w - 12, 8);
    ctx.fillRect(x - 18, y - 14, 8, 28); ctx.fillRect(x - 28, y - 4, 28, 8);
    const on = Math.floor(g.time * 8) % 2 === 0;
    ctx.save(); ctx.shadowBlur = 26;
    ctx.shadowColor = ctx.fillStyle = on ? '#E53935' : '#1E88E5'; ctx.fillRect(x + 6, y0 + 4, 12, h / 2 - 6);
    ctx.shadowColor = ctx.fillStyle = on ? '#1E88E5' : '#E53935'; ctx.fillRect(x + 6, y + 2, 12, h / 2 - 6);
    ctx.restore();
  }
  ctx.fillStyle = 'rgba(20,23,26,.65)';
  rr(ctx, x + w / 2 - 34, y0 + 7, 20, h - 14, 5); ctx.fill();     // parabrisas (adelante = derecha)
  rr(ctx, x0 + 10, y0 + 9, 12, h - 18, 4); ctx.fill();            // luna trasera
  ctx.fillStyle = '#FFF59D'; ctx.fillRect(x + w / 2 - 5, y0 + 5, 4, 10); ctx.fillRect(x + w / 2 - 5, y0 + h - 15, 4, 10);
  const bl = o.braking ? '#FF1744' : '#8E1B1B';                   // luces de freno (redundancia visual)
  ctx.save(); if (o.braking) { ctx.shadowColor = '#FF1744'; ctx.shadowBlur = 18; }
  ctx.fillStyle = bl; ctx.fillRect(x0 + 1, y0 + 5, 5, 11); ctx.fillRect(x0 + 1, y0 + h - 16, 5, 11); ctx.restore();
}
function drawPed(p) {
  const s = p.kid ? 0.8 : 1, sw = Math.sin(p.ph) * 4 * s;
  ctx.save(); ctx.translate(p.x, p.y); ctx.scale(s, s);
  ctx.fillStyle = '#3E2723'; ctx.fillRect(-6, -2 + sw, 4, 10); ctx.fillRect(2, -2 - sw, 4, 10);
  ctx.fillStyle = p.c; rr(ctx, -11, -8, 22, 14, 7); ctx.fill();
  if (p.kid) { ctx.fillStyle = '#FFC400'; rr(ctx, -8, -2 * p.dir - 6, 16, 9, 3); ctx.fill(); }
  ctx.fillStyle = '#6D4C41'; ctx.beginPath(); ctx.arc(0, -1, 6.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#212121'; ctx.beginPath(); ctx.arc(0, -2, 5, Math.PI, 0); ctx.fill();
  ctx.restore();
}
function vehLight(x, y, ps, off) {
  ctx.fillStyle = '#3A3F45'; ctx.fillRect(x + 13, y + 92, 6, 24);
  ctx.fillStyle = '#14171A'; rr(ctx, x, y, 32, 94, 9); ctx.fill();
  const blink = Math.floor(g.time * 4) % 2 === 0;
  const L = (cy, col, on) => { ctx.save(); ctx.fillStyle = on && !off ? col : '#2c3136'; if (on && !off) { ctx.shadowColor = col; ctx.shadowBlur = 20; } ctx.beginPath(); ctx.arc(x + 16, cy, 11, 0, Math.PI * 2); ctx.fill(); ctx.restore(); };
  L(y + 18, '#FF3B30', ps.s === 'red'); L(y + 47, '#FFB300', ps.s === 'amber'); L(y + 76, '#2EE07A', ps.s === 'green');
}
function signPare(cx, cy) {
  ctx.fillStyle = '#3A3F45'; ctx.fillRect(cx - 3, cy + 20, 6, 30);
  ctx.beginPath();
  for (let k = 0; k < 8; k++) { const a = Math.PI / 8 + k * Math.PI / 4; ctx.lineTo(cx + Math.cos(a) * 24, cy + Math.sin(a) * 24); }
  ctx.closePath(); ctx.fillStyle = '#D32F2F'; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.font = '800 12px Lexend, system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('PARE', cx, cy + 1);
}
function signCeda(cx, cy) {
  ctx.fillStyle = '#3A3F45'; ctx.fillRect(cx - 3, cy + 16, 6, 32);
  ctx.beginPath(); ctx.moveTo(cx - 26, cy - 20); ctx.lineTo(cx + 26, cy - 20); ctx.lineTo(cx, cy + 22); ctx.closePath();
  ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#D32F2F'; ctx.lineWidth = 6; ctx.lineJoin = 'round'; ctx.stroke();
  ctx.fillStyle = '#14171A'; ctx.font = '800 8px Lexend, system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('CEDA EL', cx, cy - 8); ctx.fillText('PASO', cx, cy + 1);
}
function signLimit(cx, cy, n, school) {
  ctx.fillStyle = '#3A3F45'; ctx.fillRect(cx - 3, cy + 20, 6, 30);
  ctx.beginPath(); ctx.arc(cx, cy, 23, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#D32F2F'; ctx.lineWidth = 6; ctx.stroke();
  ctx.fillStyle = '#14171A'; ctx.font = '800 18px Lexend, system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(n, cx, cy + 1);
  if (school) {                                   // señal de zona escolar (pentágono amarillo)
    const sx = cx + 58;
    ctx.fillStyle = '#3A3F45'; ctx.fillRect(sx - 3, cy + 20, 6, 30);
    ctx.beginPath(); ctx.moveTo(sx, cy - 28); ctx.lineTo(sx + 24, cy - 8); ctx.lineTo(sx + 24, cy + 22); ctx.lineTo(sx - 24, cy + 22); ctx.lineTo(sx - 24, cy - 8); ctx.closePath();
    ctx.fillStyle = '#D4E157'; ctx.fill(); ctx.strokeStyle = '#14171A'; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = '#14171A'; ctx.font = '800 8px Lexend, system-ui'; ctx.fillText('ZONA', sx, cy + 2); ctx.fillText('ESCOLAR', sx, cy + 12);
  }
}
function dDraw() {
  const W = canvas.width, H = canvas.height;
  const inGame = state === 'playing' || state === 'paused' || state === 'lesson' || state === 'intro';
  const hudPx = inGame ? hud.getBoundingClientRect().height * dpr : 0;
  const viewH = H - hudPx;
  const s = Math.min(viewH / WORLD_H, W / (W < H ? 560 : 760));   // en vertical, más zoom
  yExtra = Math.max(0, (viewH / s - WORLD_H) / 2);
  const viewWW = W / s;
  const follow = document.body.classList.contains('touch') ? 0.38 : 0.28;
  let camX = Math.max(-500, Math.min(WORLD_W - viewWW, player.x - viewWW * follow));
  let shY = 0;
  if (g.shake > 0) { camX += (Math.random() - .5) * 26 * g.shake; shY = (Math.random() - .5) * 26 * g.shake; }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#8E8B85'; ctx.fillRect(0, 0, W, H);
  ctx.setTransform(s, 0, 0, s, -camX * s, hudPx + (yExtra + shY) * s);
  const top = -yExtra, bot = WORLD_H + yExtra;

  // edificios (fondo desaturado)
  const edges = [-900];
  items.forEach(it => { if (it.type !== 'cebra') edges.push(it.x, it.x + CROSS_W); });
  edges.push(WORLD_W + 900);
  let bi = 0;
  for (let k = 0; k < edges.length; k += 2) {
    const a = edges[k], b = edges[k + 1], segW = b - a, n = Math.max(1, Math.ceil(segW / 420)), bw = segW / n;
    for (let j = 0; j < n; j++) {
      const x0 = a + j * bw + 22, w0 = bw - 44; if (w0 < 40) continue;
      [[top + 20, R_TOP - 82], [R_BOT + 82, bot - 20]].forEach(([y0, y1]) => {
        if (y1 - y0 < 30) return;
        const c = bi++ % 2 ? ['#A39F98', '#B5B1AA'] : ['#9A968F', '#ACA8A1'];
        ctx.fillStyle = c[0]; rr(ctx, x0, y0, w0, y1 - y0, 8); ctx.fill();
        if (y1 - y0 > 60) { ctx.fillStyle = c[1]; rr(ctx, x0 + 20, y0 + 20, w0 - 40, y1 - y0 - 40, 4); ctx.fill(); }
      });
    }
  }
  // veredas y calzada principal
  ctx.fillStyle = '#C4C1BA'; ctx.fillRect(-900, R_TOP - 62, WORLD_W + 1800, 62); ctx.fillRect(-900, R_BOT, WORLD_W + 1800, 62);
  ctx.fillStyle = '#A8A49D'; ctx.fillRect(-900, R_TOP - 6, WORLD_W + 1800, 6); ctx.fillRect(-900, R_BOT, WORLD_W + 1800, 6);
  ctx.fillStyle = '#4B5057'; ctx.fillRect(-900, R_TOP, WORLD_W + 1800, R_BOT - R_TOP);
  // calles transversales
  for (const it of items) if (it.type !== 'cebra') {
    ctx.fillStyle = '#4B5057'; ctx.fillRect(it.x, top, CROSS_W, bot - top);
    ctx.fillStyle = '#D5D8DB';
    for (let y = Math.floor(top / 80) * 80; y < bot; y += 80) { if (y + 40 > R_TOP - 20 && y < R_BOT + 20) continue; ctx.fillRect(it.x + CROSS_W / 2 - 3, y, 6, 40); }
    ctx.fillStyle = '#E8EAEC'; ctx.fillRect(it.x + 8, R_TOP - 22, CROSS_W / 2 - 16, 6); ctx.fillRect(it.x + CROSS_W / 2 + 8, R_BOT + 16, CROSS_W / 2 - 16, 6);
  }
  // línea de carril discontinua
  ctx.fillStyle = '#E8EAEC';
  for (let x = Math.floor((camX - 100) / 90) * 90; x < camX + viewWW + 100; x += 90) {
    if (items.some(it => (it.type !== 'cebra' && x + 50 > it.x && x < it.x + CROSS_W) || (x + 50 > it.stopX - 8 && x < it.zB + 4))) continue;
    ctx.fillRect(x, R_MID - 3, 50, 6);
  }
  // cebras, líneas de parada, señales
  for (const it of items) {
    ctx.fillStyle = '#FFC400';
    for (let y = R_TOP + 8; y < R_BOT - 8; y += 30) ctx.fillRect(it.zA, y, ZEBRA_A - ZEBRA_B, 17);
    if (it.type !== 'cebra') { ctx.fillStyle = '#F2F3F4'; ctx.fillRect(it.stopX - 6, R_TOP + 4, 6, R_BOT - R_TOP - 8); }
    if (it.type === 'ceda') { ctx.fillStyle = '#F2F3F4'; for (let y = R_TOP + 12; y < R_BOT - 10; y += 26) { ctx.beginPath(); ctx.moveTo(it.stopX - 26, y); ctx.lineTo(it.stopX - 26, y + 18); ctx.lineTo(it.stopX - 10, y + 9); ctx.closePath(); ctx.fill(); } }
    if (it.type === 'pare') { ctx.save(); ctx.fillStyle = 'rgba(242,243,244,.9)'; ctx.font = '800 26px Lexend, system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.translate(it.stopX - 44, LANE_R); ctx.rotate(-Math.PI / 2); ctx.fillText('PARE', 0, 0); ctx.restore(); }
    const ps = dState(it);
    if (it.type === 'semaforo' || it.type === 'policia') { vehLight(it.stopX - 54, R_BOT + 8, ps, it.type === 'policia'); vehLight(it.stopX - 54, R_TOP - 120, ps, it.type === 'policia'); }
    if (it.type === 'pare') signPare(it.stopX - 40, R_BOT + 32);
    if (it.type === 'ceda') signCeda(it.stopX - 40, R_BOT + 30);
    if (it.type === 'cebra' && !it.school) {
      const sx = it.zA - 60, sy = R_BOT + 12;
      ctx.fillStyle = '#3A3F45'; ctx.fillRect(sx + 19, sy + 40, 4, 22);
      ctx.fillStyle = '#1565C0'; rr(ctx, sx, sy, 42, 42, 6); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(sx + 21, sy + 6); ctx.lineTo(sx + 37, sy + 36); ctx.lineTo(sx + 5, sy + 36); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#14171A'; ctx.fillRect(sx + 13, sy + 29, 16, 3); ctx.fillRect(sx + 15, sy + 23, 12, 3);
    }
    if (it.type !== 'cebra') {
      ctx.font = '700 17px Lexend, system-ui, sans-serif';
      const tw = ctx.measureText(it.street).width + 24;
      ctx.fillStyle = '#1E4E8C'; rr(ctx, it.x + CROSS_W + 14, R_BOT + 14, tw, 36, 8); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(it.street, it.x + CROSS_W + 14 + tw / 2, R_BOT + 33);
    }
  }
  zones.forEach(z => signLimit(Math.max(260, z.x0 + 60), R_BOT + 34, z.limit, z.school));
  // vehículos transversales, peatones, policía
  for (const it of items) {
    for (const lane of it.cross) for (const c of lane.cars) drawVehicle(lane.x, c, lane.dir);
    for (const p of it.peds) drawPed(p);
    if (it.type === 'policia') {
      const cx = it.x - 24, cy = R_TOP - 30, ps = dState(it);
      ctx.fillStyle = '#9AA0A6'; ctx.beginPath(); ctx.arc(cx, cy, 22, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#3E5B3A'; rr(ctx, cx - 16, cy - 8, 32, 18, 8); ctx.fill();
      ctx.strokeStyle = '#3E5B3A'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath();
      if (ps.s === 'green') { const a = Math.sin(g.time * 8) * 0.5; ctx.moveTo(cx + 12, cy); ctx.lineTo(cx + 12 + Math.cos(a) * 22, cy + Math.sin(a) * 22); }
      else { ctx.moveTo(cx - 12, cy); ctx.lineTo(cx - 30, cy); ctx.moveTo(cx + 12, cy); ctx.lineTo(cx + 30, cy); }
      ctx.stroke();
      ctx.fillStyle = '#F5F5F5'; ctx.beginPath(); ctx.arc(cx, cy, 9, 0, Math.PI * 2); ctx.fill();
      label(ps.s === 'green' ? 'PASE' : ps.s === 'red' ? 'ALTO' : '¡ATENCIÓN!', cx, cy - 46, ps.s === 'green' ? '#15803D' : ps.s === 'red' ? '#D32F2F' : '#FF9800', ps.s === 'amber' ? '#14171A' : '#FFFFFF', 16);
    }
  }
  for (const n of npcs) drawCarH(n.x, n.y, n.w, n.h, n.color, { braking: n.braking });
  // meta
  const cell = 20;
  for (let yy = R_TOP; yy < R_BOT; yy += cell) for (let i = 0; i < 2; i++) { ctx.fillStyle = ((yy / cell) + i) % 2 ? '#14171A' : '#FFFFFF'; ctx.fillRect(META_X - cell + i * cell, yy, cell, cell); }
  label('META · ' + LV.dest.toUpperCase(), META_X, R_TOP - 34, '#FFFFFF', '#14171A', 18);
  // jugador (amarillo, figura principal) y ambulancia
  const blink = player.inv > 0 && Math.floor(player.inv * 10) % 2 === 0;
  ctx.globalAlpha = blink ? 0.45 : 1;
  ctx.fillStyle = 'rgba(255,196,0,.30)'; rr(ctx, player.x - CAR_L / 2 - 8, player.y - CAR_T / 2 - 8, CAR_L + 16, CAR_T + 16, 16); ctx.fill();
  drawCarH(player.x, player.y, CAR_L, CAR_T, '#FFC400', { braking: player.braking, player: true });
  ctx.globalAlpha = 1;
  if (amb) drawCarH(amb.x, amb.y, amb.w, amb.h, '#FFFFFF', { amb: true });
  // efectos
  for (const p of g.particles) { ctx.save(); ctx.globalAlpha = Math.min(1, p.t * 1.5); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); ctx.restore(); }
  for (const f of g.floats) {
    ctx.globalAlpha = Math.min(1, f.t * 1.6); ctx.font = '800 26px Lexend, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 6; ctx.strokeStyle = '#14171A'; ctx.strokeText(f.text, f.x, f.y); ctx.fillStyle = f.color; ctx.fillText(f.text, f.x, f.y); ctx.globalAlpha = 1;
  }
  if (g.distractT > 0) { ctx.fillStyle = '#5E35B1'; rr(ctx, player.x - 10, player.y - 58, 20, 32, 4); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke(); }
  if (g.fx) {
    const yy = player.y - CAR_T / 2 - 34 - (0.9 - g.fx.t) * 30;
    ctx.globalAlpha = Math.min(1, g.fx.t * 2.5);
    ctx.fillStyle = COLORS[g.fx.type]; ctx.strokeStyle = '#14171A'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(player.x, yy, 20, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = g.fx.type === 'warn' ? '#14171A' : '#FFFFFF'; ctx.lineWidth = 4.5; ctx.lineCap = 'round';
    ctx.beginPath();
    if (g.fx.type === 'ok') { ctx.moveTo(player.x - 8, yy); ctx.lineTo(player.x - 2, yy + 6); ctx.lineTo(player.x + 9, yy - 6); }
    else if (g.fx.type === 'bad') { ctx.moveTo(player.x - 7, yy - 7); ctx.lineTo(player.x + 7, yy + 7); ctx.moveTo(player.x + 7, yy - 7); ctx.lineTo(player.x - 7, yy + 7); }
    else { ctx.moveTo(player.x, yy - 9); ctx.lineTo(player.x, yy + 2); ctx.moveTo(player.x, yy + 8); ctx.lineTo(player.x, yy + 8.5); }
    ctx.stroke(); ctx.globalAlpha = 1;
  }
}

/* =========================================================
   10. ESTRELLAS, MÉTRICAS, RANKING Y EXPORTACIÓN
   ========================================================= */
const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
const fmtT = t => { t = Math.round(t || 0); return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); };
const r2 = v => v == null ? '' : Math.round(v * 100) / 100;
function starsFor(won) {
  if (!won) return 0;
  if (MODE === 'conductor') return g.elim > 0 ? 1 : dNota() >= 95 ? 3 : 2;
  if (g.cometidas > 0) return 1;
  if (g.riesgos > 0 || g.nearMiss > 0 || g.distrVistas > 0 || g.ambar > 0) return 2;
  return 3;
}
function buildSession(won, stars) {
  return {
    id: 'RS-' + Date.now().toString(36).toUpperCase(), fecha: new Date().toISOString(), alias: '', modo: MODE,
    nota: MODE === 'conductor' ? dNota() : '', faltas_eliminatorias: g.elim || 0, faltas_graves: g.graves || 0, faltas_leves: g.leves || 0,
    inf_detalle: Object.entries(g.kinds).filter(([, v]) => v).map(([k, v]) => k + ':' + v).join(' '),
    dispositivo: document.body.classList.contains('touch') ? 'tactil' : 'teclado',
    nivel: LVI + 1, entorno: LV.env, resultado: won ? 'meta' : 'sin_vidas', estrellas: stars,
    puntaje: g.score, tiempo_s: r2(g.play), vidas: Math.max(0, g.lives),
    cruces_seguros: g.evitadas, cruces_riesgosos: g.riesgos, cruces_ambar: g.ambar, casi_atropellos: g.nearMiss,
    infracciones: g.cometidas, inf_rojo: g.kinds.rojo, inf_fuera_cebra: g.kinds.fuera, inf_choque: g.kinds.choque,
    inf_emergencia: g.kinds.emergencia, inf_policia: g.kinds.policia,
    distr_vistas: g.distrVistas, distr_evitadas: g.distrEvitadas, quesos: g.quesos, racha_max: g.maxStreak,
    t_primer_mov_s: r2(g.firstMove), t_primer_cruce_seguro_s: r2(g.firstSafe),
    reaccion_media_s: r2(avg(g.reactions)), espera_media_s: r2(avg(g.waits)),
    pausas: g.pauses, lecciones: g.lessons, logros_nuevos: g.newLogros.join(' '), eventos: g.log
  };
}
function ranking(level) {
  return loadStore().sessions.filter(s => (s.modo || 'peaton') !== 'examen' && (level == null || (s.nivel === level && (s.modo || 'peaton') === MODE)))
    .sort((a, b) => b.puntaje - a.puntaje || a.tiempo_s - b.tiempo_s);
}
function fillRank(tbody, rows, cellsOf, cols, meId) {
  tbody.textContent = '';
  rows.forEach((s, i) => {
    const tr = document.createElement('tr'); if (s.id === meId) tr.className = 'me';
    cellsOf(s, i).forEach((v, k) => { const td = document.createElement('td'); td.textContent = v; if (k >= 2) td.className = 'n'; tr.appendChild(td); });
    tbody.appendChild(tr);
  });
  if (!rows.length) { const tr = document.createElement('tr'), td = document.createElement('td'); td.colSpan = cols; td.textContent = 'Aún no hay partidas.'; tr.appendChild(td); tbody.appendChild(tr); }
}
function renderResultsRank() {
  const all = ranking(LVI + 1), pos = all.findIndex(s => s.id === lastSessionId);
  $('rPos').textContent = pos >= 0 ? `· tu puesto: #${pos + 1} de ${all.length}` : '';
  let rows = all.slice(0, 5); if (pos >= 5) rows = rows.slice(0, 4).concat(all[pos]);
  fillRank($('rRank'), rows, (s) => [all.indexOf(s) + 1, s.alias || 'Anónimo', s.puntaje, fmtT(s.tiempo_s)], 4, lastSessionId);
}
function renderData() {
  const all = loadStore().sessions, ss = all.filter(s => (s.modo || 'peaton') !== 'examen'), n = ss.length;
  const sims = all.filter(s => s.modo === 'examen' && s.tipo === 'simulacro');
  fillRank($('dRank'), ranking(null).slice(0, 10), (s, i) => [i + 1, s.alias || 'Anónimo', (s.modo === 'conductor' ? 'C' : 'P') + s.nivel, s.puntaje, '★'.repeat(s.estrellas || 0) || '—'], 5, null);
  const kinds = ['rojo', 'fuera_cebra', 'choque', 'emergencia', 'policia'];
  const names = { rojo: 'Cruzar en rojo', fuera_cebra: 'Fuera de la cebra', choque: 'Atropello', emergencia: 'No ceder a ambulancia', policia: 'Desobedecer al policía' };
  const tot = {}; kinds.forEach(k => tot[k] = ss.reduce((a, s) => a + (s['inf_' + k] || 0), 0));
  const topK = kinds.slice().sort((a, b) => tot[b] - tot[a])[0];
  const fm = ss.filter(s => s.t_primer_mov_s !== '');
  const dv = ss.reduce((a, s) => a + s.distr_vistas, 0), de = ss.reduce((a, s) => a + s.distr_evitadas, 0);
  const reac = ss.map(s => s.reaccion_media_s).filter(v => v !== '');
  const m = [
    [n, 'Partidas jugadas'],
    [n ? Math.round(ss.filter(s => s.resultado === 'meta').length / n * 100) + '%' : '—', 'Llegaron a la meta'],
    [n ? (avg(ss.map(s => s.estrellas || 0))).toFixed(1) + ' ★' : '—', 'Estrellas promedio'],
    [n ? (avg(ss.map(s => s.infracciones))).toFixed(1) : '—', 'Infracciones por partida'],
    [reac.length ? avg(reac).toFixed(2) + ' s' : '—', 'Reacción media al verde'],
    [fm.length ? Math.round(fm.filter(s => s.t_primer_mov_s < 15).length / fm.length * 100) + '%' : '—', 'Se movieron antes de 15 s (RNF-02)'],
    [dv + de ? Math.round(de / (dv + de) * 100) + '%' : '—', 'Distracciones evitadas'],
    [n && tot[topK] ? names[topK] : '—', 'Infracción más frecuente (peatón)'],
    [sims.length ? Math.round(sims.filter(s => s.aprobado).length / sims.length * 100) + '%' : '—', `Simulacros MTC aprobados (${sims.length})`]
  ];
  const box = $('dMetrics'); box.textContent = '';
  m.forEach(([v, l]) => { const d = document.createElement('div'); d.className = 'metric'; const b = document.createElement('b'); b.textContent = v; const sp = document.createElement('span'); sp.textContent = l; d.append(b, sp); box.appendChild(d); });
}
function csvCell(v) { v = v == null ? '' : String(v); return /[",\n;]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
function download(name, rows) {
  const text = '﻿' + rows.map(r => r.map(csvCell).join(',')).join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
  a.download = name; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800);
}
$('expSessions').onclick = () => {
  const cols = ['id', 'fecha', 'alias', 'dispositivo', 'modo', 'tipo', 'nivel', 'nota', 'faltas_eliminatorias', 'faltas_graves', 'faltas_leves', 'inf_detalle', 'correctas', 'total', 'aprobado', 'entorno', 'resultado', 'estrellas', 'puntaje', 'tiempo_s', 'vidas', 'cruces_seguros', 'cruces_riesgosos', 'cruces_ambar', 'casi_atropellos',
    'infracciones', 'inf_rojo', 'inf_fuera_cebra', 'inf_choque', 'inf_emergencia', 'inf_policia', 'distr_vistas', 'distr_evitadas', 'quesos', 'racha_max',
    't_primer_mov_s', 't_primer_cruce_seguro_s', 'reaccion_media_s', 'espera_media_s', 'pausas', 'lecciones', 'logros_nuevos'];
  download('ruta_segura_partidas.csv', [cols].concat(loadStore().sessions.map(s => cols.map(c => s[c]))));
};
$('expEvents').onclick = () => {
  const rows = [['partida', 'nivel', 't_s', 'evento', 'calle', 'detalle']];
  loadStore().sessions.forEach(s => (s.eventos || []).forEach(e => rows.push([s.id, s.nivel, e.t, e.tipo, e.calle, e.detalle])));
  download('ruta_segura_eventos.csv', rows);
};
let clearArmed = false;
$('clearData').onclick = () => {
  if (!clearArmed) { clearArmed = true; $('clearData').textContent = '¿Seguro? Toca otra vez para borrar'; setTimeout(() => { clearArmed = false; $('clearData').textContent = 'Borrar todos los datos'; }, 4000); return; }
  clearArmed = false; saveStore({ sessions: [] }); saveProg({ unlocked: 1, unlockedC: 1, stars: {}, best: {}, logros: {}, waitsTotal: 0 });
  $('clearData').textContent = 'Datos borrados'; selLevel = 0; renderData(); renderLevels();
};
$('unlockAll').onclick = () => { const p = loadProg(); p.unlocked = LEVELS.length; p.unlockedC = DLEVELS.length; saveProg(p); renderLevels(); $('unlockAll').textContent = 'Todos los niveles desbloqueados'; };
$('aliasForm').onsubmit = e => {
  e.preventDefault();
  const alias = $('alias').value.trim().slice(0, 14);
  const st = loadStore(), s = st.sessions.find(x => x.id === lastSessionId);
  if (s) { s.alias = alias; saveStore(st); }
  $('alias').blur(); renderResultsRank();
};

/* =========================================================
   11. NAVEGACIÓN (arquitectura de la Fig. 1)
   ========================================================= */
function show(name) {
  Object.entries(screens).forEach(([k, el]) => el.classList.toggle('show', k === name));
  const target = { start: 'playBtn', pause: 'resumeBtn', results: $('nextBtn').style.display === 'none' ? 'againBtn' : 'nextBtn', lesson: 'lOk', intro: 'goBtn' }[name];
  if (target) setTimeout(() => $(target).focus({ preventScroll: true }), 30);
}
function setPlaying(on) { document.body.classList.toggle('playing', on); }

const curList = () => MODE === 'conductor' ? DLEVELS : LEVELS;
const starKey = lvl => MODE === 'conductor' ? 'c' + lvl : lvl;
let selExam = 0;
const MODE_HINT = {
  peaton: 'Cruza Arequipa a pie: semáforos, cebras, ambulancias y distracciones.',
  conductor: 'Maneja como en el examen práctico: cinturón, límites, PARE, peatones y nota final.',
  examen: 'Preguntas tipo examen de reglas del MTC: 40 preguntas, 40 minutos, 35 para aprobar.'
};
function setMode(m) {
  MODE = m;
  document.body.classList.toggle('drive', MODE === 'conductor');
  document.querySelectorAll('.modes button').forEach(b => b.setAttribute('aria-selected', String(b.dataset.mode === MODE)));
  $('modeHint').textContent = MODE_HINT[MODE];
  const p = loadProg();
  if (MODE !== 'examen') selLevel = Math.min(MODE === 'conductor' ? (p.unlockedC || 1) : p.unlocked, curList().length) - 1;
  reset(MODE === 'examen' ? 0 : selLevel);
  renderLevels();
}
function renderLevels() {
  const p = loadProg(), row = $('lvRow'); row.textContent = '';
  const pt = $('playTxt'); const sm = document.createElement('small'); sm.style.fontSize = '.55em';
  if (MODE === 'examen') {
    row.className = 'lvrow two';
    [['Práctica', '10 preguntas con explicación'], ['Simulacro MTC', '40 preguntas · 40 min · 35 para aprobar']].forEach(([t, d], i) => {
      const b = document.createElement('button'); b.className = 'lv' + (i === selExam ? ' sel' : ''); b.setAttribute('aria-pressed', String(i === selExam));
      const n = document.createElement('b'); n.textContent = t; n.style.fontSize = 'clamp(16px,2.6vh,22px)';
      const nm = document.createElement('span'); nm.textContent = d;
      b.append(n, nm); b.onclick = () => { selExam = i; SFX.click(); renderLevels(); };
      row.appendChild(b);
    });
    pt.textContent = 'EMPEZAR '; sm.textContent = selExam ? '· SIMULACRO' : '· PRÁCTICA'; pt.appendChild(sm);
    const sims = loadStore().sessions.filter(x => x.modo === 'examen' && x.tipo === 'simulacro');
    const best = sims.reduce((a, x) => Math.max(a, x.correctas || 0), 0);
    $('starTotal').textContent = sims.length ? `Mejor simulacro: ${best} / 40` : 'Aún no has rendido el simulacro';
    return;
  }
  const list = curList(), unlocked = MODE === 'conductor' ? (p.unlockedC || 1) : p.unlocked;
  row.className = 'lvrow' + (list.length === 3 ? ' three' : '');
  if (selLevel >= unlocked) selLevel = unlocked - 1;
  if (selLevel >= list.length) selLevel = list.length - 1;
  let total = 0;
  list.forEach((L, i) => {
    const b = document.createElement('button'), locked = i >= unlocked, st = p.stars[starKey(i + 1)] || 0; total += st;
    b.className = 'lv' + (i === selLevel ? ' sel' : ''); b.disabled = locked;
    b.setAttribute('aria-pressed', String(i === selLevel));
    b.setAttribute('aria-label', locked ? `Nivel ${i + 1} bloqueado: completa el nivel anterior` : `Nivel ${i + 1}: ${L.name}, ${st} de 3 estrellas`);
    const n = document.createElement('b'); n.textContent = i + 1;
    const nm = document.createElement('span'); nm.textContent = L.name;
    const sr = document.createElement('div'); sr.className = 'st'; sr.innerHTML = locked ? ICON.lock : starSvg(st > 0) + starSvg(st > 1) + starSvg(st > 2);
    b.append(n, nm, sr);
    b.onclick = () => { selLevel = i; SFX.click(); reset(selLevel); renderLevels(); };
    row.appendChild(b);
  });
  pt.textContent = MODE === 'conductor' ? 'MANEJAR ' : 'JUGAR '; sm.textContent = `· NIVEL ${selLevel + 1}`; pt.appendChild(sm);
  $('starTotal').textContent = `${total} / ${list.length * 3} estrellas`;
}
document.querySelectorAll('.modes button').forEach(b => b.onclick = () => { SFX.click(); setMode(b.dataset.mode); });

// Escena: primero la tarjeta del nivel (capa), luego la cuenta regresiva y a jugar
let introTimers = [];
function startLevel(i) {
  ensureAudio(); SFX.click();
  clearKeys(); introTimers.forEach(clearTimeout); introTimers = [];
  reset(i);
  setPlaying(true); state = 'intro';
  tutEl.classList.remove('show', 'fade');
  $('lvLabel').textContent = `NIVEL ${i + 1}`; $('destLabel').textContent = ` · HACIA ${LV.dest.toUpperCase()}`;
  g.lastHud = ''; updateHud();
  const drive = MODE === 'conductor';
  document.body.classList.toggle('nobelt', drive);
  $('spBelt').classList.remove('on'); lastSpeedo = '';
  $('iLevel').textContent = (drive ? 'CONDUCTOR · ' : '') + `NIVEL ${i + 1} DE ${curList().length}` + (LV.env === 'noche' ? ' · NOCHE' : LV.env === 'lluvia' ? ' · LLUVIA' : '');
  $('iTitle').textContent = LV.name;
  $('iDest').textContent = drive ? `Destino: ${LV.dest} · ${N_ROADS} intersecciones · nota mínima 80 y sin faltas eliminatorias` : `Destino: ${LV.dest} · ${N_ROADS} cruces`;
  const chips = $('iChips'); chips.textContent = '';
  LV.news.forEach(t => { const c = document.createElement('span'); c.className = 'chip new'; c.textContent = 'Nuevo: ' + t; chips.appendChild(c); });
  if (!drive) { const qc = document.createElement('span'); qc.className = 'chip'; qc.textContent = `${quesos.length} quesos helados por recoger`; chips.appendChild(qc); }
  const crit = drive ? ['Llega a la meta', 'Sin faltas eliminatorias (luz roja, peatón, choque, policía)', 'Nota de 95 o más']
                     : ['Llega a la meta', 'Sin infracciones', 'Sin riesgos: sin ámbar, sin "por poco" y sin mirar el celular'];
  $('iCrit').innerHTML = crit.map((t, k) => `<div>${starSvg(true).repeat(k + 1)}${starSvg(false).repeat(2 - k)}<span></span></div>`).join('');
  [...$('iCrit').children].forEach((d, k) => { d.lastChild.textContent = crit[k]; });
  $('cdown').textContent = '';
  show('intro');
  introTimers.push(setTimeout(countdown, 2600));
}
function countdown() {
  if (state !== 'intro' || $('goBtn').style.visibility === 'hidden') return;
  introTimers.forEach(clearTimeout); introTimers = [];
  $('goBtn').style.visibility = 'hidden';
  [3, 2, 1].forEach((n, k) => introTimers.push(setTimeout(() => { if (state !== 'intro') return; $('cdown').textContent = n; SFX.tick(); }, k * 450)));
  introTimers.push(setTimeout(beginPlay, 3 * 450));
}
function beginPlay() {
  if (state !== 'intro') return;
  introTimers.forEach(clearTimeout); introTimers = [];
  $('goBtn').style.visibility = 'visible';
  $('cdown').textContent = '¡YA!'; SFX.go();
  state = 'playing'; show(null);
  if (g.tutorialT > 0) tutEl.classList.add('show');
  log('inicio', null, document.body.classList.contains('touch') ? 'tactil' : 'teclado');
}
function pauseGame() {
  if (state !== 'playing') return;
  state = 'paused'; clearKeys(); g.pauses++; log('pausa', null);
  $('pauseInfo').textContent = `Nivel ${LVI + 1} · ${Math.min(100, Math.round(player.x / META_X * 100))}% de la ruta · ${g.score} pts · ${g.lives} vidas`;
  $('pauseMain').style.display = 'flex'; $('pauseConfirm').style.display = 'none';
  show('pause');
}
function resumeGame() { if (state !== 'paused') return; state = 'playing'; show(null); }
function toMenu() {
  introTimers.forEach(clearTimeout); introTimers = [];
  state = 'menu'; setPlaying(false); tutEl.classList.remove('show'); document.body.classList.remove('nobelt');
  reset(MODE === 'examen' ? 0 : selLevel); renderLevels(); show('start');
}
function finish(won) {
  if (state === 'results') return;
  state = 'results'; clearKeys(); tutEl.classList.remove('show'); hideNotif(); $('phoneBig').classList.remove('show');
  document.body.classList.remove('nobelt');
  const drive = MODE === 'conductor', list = curList();
  const stars = starsFor(won), nota = drive ? dNota() : 0, aprobado = drive && won && g.elim === 0 && nota >= 80;
  const p = loadProg(), lvl = LVI + 1, sk = starKey(lvl), prevBest = p.best[sk] || 0;
  if (won) {
    p.stars[sk] = Math.max(p.stars[sk] || 0, stars);
    p.best[sk] = Math.max(prevBest, g.score);
    if (lvl < list.length) { if (drive) p.unlockedC = Math.max(p.unlockedC || 1, lvl + 1); else p.unlocked = Math.max(p.unlocked, lvl + 1); }
    saveProg(p);
    if (g.cometidas === 0) award('ejemplar');
    if (stars === 3) award('perfecto');
    if (LV.env === 'noche') award('noctambulo');
    if (LV.env === 'lluvia') award('impermeable');
    if (!drive && lvl === LEVELS.length) award('campeon');
    if (drive && aprobado && lvl === DLEVELS.length) award('brevete');
    SFX.win();
  }
  log('fin', null, won ? 'meta' : 'sin_vidas');
  const ses = buildSession(won, stars);
  const st = loadStore(); st.sessions.push(ses); saveStore(st);
  lastSessionId = ses.id; $('alias').value = '';

  $('rLevel').textContent = (drive ? 'CONDUCTOR · ' : '') + `NIVEL ${lvl} · ${LV.name.toUpperCase()}`;
  if (drive) {
    $('rTitle').textContent = !won ? 'Examen práctico: DESAPROBADO' : aprobado ? 'Examen práctico: APROBADO' : 'Examen práctico: DESAPROBADO';
    $('rSub').textContent = `Nota ${nota}/100 · ${g.elim} falta(s) eliminatoria(s) · ${g.graves} grave(s) · ${g.leves} leve(s). Se aprueba con 80 y sin faltas eliminatorias.`;
  } else {
    $('rTitle').textContent = won ? `¡Llegaste a ${LV.dest}!` : 'Fin de la partida';
    $('rSub').textContent = won ? (g.score > prevBest && prevBest > 0 ? `¡Nuevo récord personal! Antes: ${prevBest} pts` : 'Resumen de partida · ¡Buen trabajo, peatón responsable!')
                                : 'Te quedaste sin vidas. Revisa tus decisiones y reintenta.';
  }
  const good = drive ? aprobado : won;
  $('rBadge').style.background = good ? '#FFC400' : '#D32F2F';
  $('rBadge').innerHTML = good ? ICON.flag : ICON.sad;
  $('rScore').textContent = g.score; $('rOk').textContent = g.evitadas; $('rBad').textContent = g.cometidas;
  if (drive) { $('rExtra').textContent = `${nota}/100`; $('rExtraL').textContent = `Nota del examen · racha máx. ${g.maxStreak}`; }
  else { $('rExtra').textContent = `${g.quesos}/${quesos.length}`; $('rExtraL').textContent = `Quesos · racha máx. ${g.maxStreak}`; }
  $('rOk').nextElementSibling.textContent = drive ? 'Decisiones correctas' : 'Infracciones evitadas';
  const sw = $('rStars'); sw.innerHTML = starSvg(true) + starSvg(true) + starSvg(true);
  [...sw.children].forEach((el, k) => { if (k < stars) setTimeout(() => { el.classList.add('on'); SFX.star(k); }, 500 + k * 380); });
  sw.setAttribute('aria-label', `${stars} de 3 estrellas`);

  const ul = $('rReview'); ul.textContent = '';
  const item = (good, text, sub) => {
    const li = document.createElement('li'), i = document.createElement('i'), d = document.createElement('div');
    i.textContent = good ? '✓' : '✕'; i.style.background = good ? '#15803D' : '#D32F2F';
    d.textContent = text; if (sub) { const s = document.createElement('small'); s.textContent = sub; d.appendChild(s); }
    li.append(i, d); ul.appendChild(li);
  };
  if (g.evitadas) item(true, drive ? `Decisiones correctas: ${g.evitadas}` : `Cruces seguros: ${g.evitadas} de ${N_ROADS}`);
  if (drive && g.belt && !g.beltWarned) item(true, 'Te abrochaste el cinturón antes de arrancar');
  if (g.distrEvitadas) item(true, `No miraste el celular ${g.distrEvitadas} ${g.distrEvitadas === 1 ? 'vez' : 'veces'}`);
  Object.keys(g.kinds).forEach(k => { if (g.kinds[k]) item(false, `${KIND_LABEL[k]} ×${g.kinds[k]}`, LESSONS[k].ref.replace('Reglamento Nacional de Tránsito, ', 'RNT ') + ': ' + LESSONS[k].n); });
  if (g.distrVistas && !drive) item(false, `Miraste el celular ×${g.distrVistas}`, 'Al mirar el celular caminas más lento y dejas de ver el tránsito.');
  if (drive && g.leves) item(false, `Faltas leves ×${g.leves}`, 'Ámbar tardío, salir con autos cruzando o no reducir lo suficiente ante la ambulancia.');
  if (g.nearMiss) item(false, `Casi te atropellan ×${g.nearMiss}`, 'Un vehículo pasó muy cerca: espera a que estén detenidos.');
  if (g.riesgos && !drive) item(false, `Cruces con riesgo ×${g.riesgos}`, 'Iniciaste el cruce con el semáforo por cambiar o con autos en movimiento.');
  if (!ul.children.length) item(true, 'Sin decisiones registradas');

  const lw = $('rLogros'); lw.textContent = '';
  g.newLogros.forEach(id => { const d = document.createElement('span'); d.className = 'logro'; d.innerHTML = `<i>${ICON.medal}</i><span></span>`; d.lastChild.textContent = LOGROS[id]; lw.appendChild(d); });
  $('rLogrosWrap').style.display = g.newLogros.length ? 'flex' : 'none';

  const k = g.kinds;
  if (drive) {
    const dt = k.peaton_c ? 'Al acercarte a una cebra, reduce y mira a ambos lados: el peatón tiene derecho de paso.'
      : k.rojo_c ? 'Con ámbar, empieza a frenar si puedes detenerte con seguridad; no aceleres para "ganarle" al rojo.'
      : k.velocidad ? 'Revisa siempre el velocímetro: 30 km/h en calles y zonas escolares, 50 km/h en avenidas.'
      : k.pare ? 'En PARE el auto debe quedar totalmente detenido antes de la línea, aunque no venga nadie.'
      : k.celular_c ? 'Antes de arrancar, deja el celular fuera de tu alcance o en modo no molestar.'
      : k.cinturon ? 'Cinturón primero: en el examen práctico es lo primero que revisa el evaluador.'
      : k.choque_c ? 'Deja al menos dos segundos de distancia con el auto de adelante.'
      : 'Mira los espejos y señaliza antes de cambiar de carril.';
    $('rTip').textContent = dt;
  } else $('rTip').textContent = k.choque ? (LV.env === 'lluvia' ? TIPS.lluvia : LV.env === 'noche' ? TIPS.noche : TIPS.choque) : k.emergencia ? TIPS.emergencia : k.policia ? TIPS.policia : k.rojo ? TIPS.rojo :
    k.fuera ? TIPS.fuera : g.distrVistas ? TIPS.celular : LV.env === 'lluvia' ? TIPS.lluvia : LV.env === 'noche' ? TIPS.noche : TIPS.general[Math.floor(Math.random() * TIPS.general.length)];
  const hasNext = won && lvl < list.length && (!drive || aprobado || g.elim === 0);
  $('nextBtn').style.display = hasNext ? 'flex' : 'none';
  $('againBtn').classList.toggle('primary', !hasNext); $('againBtn').style.margin = '0';
  renderResultsRank();
  show('results');
}

$('playBtn').onclick = () => { if (MODE === 'examen') { ensureAudio(); SFX.click(); if (window.RSExam) window.RSExam.start(selExam === 1 ? 'simulacro' : 'practica'); } else startLevel(selLevel); };
$('beltBtn').onclick = () => { ensureAudio(); fastenBelt(); };
$('goBtn').onclick = countdown;
$('nextBtn').onclick = () => { selLevel = Math.min(LVI + 1, curList().length - 1); startLevel(selLevel); };
$('againBtn').onclick = () => startLevel(LVI);
$('controlsBtn').onclick = () => { SFX.click(); state = 'controls'; show('controls'); };
$('dataBtn').onclick = () => { SFX.click(); state = 'data'; renderData(); show('data'); };
document.querySelectorAll('[data-close]').forEach(b => b.onclick = () => { state = 'menu'; renderLevels(); show('start'); });
$('pauseBtn').onclick = () => { ensureAudio(); pauseGame(); };
$('resumeBtn').onclick = resumeGame;
$('restartBtn').onclick = () => startLevel(LVI);
$('exitBtn').onclick = () => { $('pauseMain').style.display = 'none'; $('pauseConfirm').style.display = 'flex'; $('cancelExit').focus(); };
$('cancelExit').onclick = () => { $('pauseMain').style.display = 'flex'; $('pauseConfirm').style.display = 'none'; $('resumeBtn').focus(); };
$('confirmExit').onclick = toMenu;
$('menuBtn').onclick = toMenu;
$('lOk').onclick = closeLesson;
$('nView').onclick = () => resolveNotif('ver');
$('nSave').onclick = () => resolveNotif('guardar');
$('muteStart').onclick = () => { ensureAudio(); toggleMute(); };
$('muteHud').onclick = () => { ensureAudio(); toggleMute(); };

/* =========================================================
   12. ENTRADAS: teclado + táctil
   ========================================================= */
const KEYMAP = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right' };
function clearKeys() { for (const k in keys) keys[k] = false; document.querySelectorAll('#dpad .held').forEach(b => b.classList.remove('held')); }

addEventListener('keydown', e => {
  if (e.target instanceof HTMLInputElement) return;
  const dir = KEYMAP[e.code];
  if (dir) { e.preventDefault(); if (state === 'playing') keys[dir] = true; return; }
  if (state === 'playing' && notif && (e.code === 'KeyQ' || e.code === 'KeyE')) { resolveNotif(e.code === 'KeyQ' ? 'guardar' : 'ver'); return; }
  if (state === 'playing' && MODE === 'conductor' && e.code === 'KeyC') { fastenBelt(); return; }
  if (state === 'playing' && MODE === 'conductor' && e.code === 'Space') { e.preventDefault(); keys.brake = true; return; }
  if (state === 'exam') return;
  if (e.code === 'Escape') {
    e.preventDefault();
    if (state === 'playing') pauseGame();
    else if (state === 'paused') resumeGame();
    else if (state === 'lesson') closeLesson();
    else if (state === 'intro') countdown();
    else if (state === 'controls' || state === 'data') { state = 'menu'; renderLevels(); show('start'); }
    return;
  }
  if ((e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'Space') && !(e.target instanceof HTMLButtonElement)) {
    if (state === 'lesson') { e.preventDefault(); closeLesson(); }
    else if (state === 'intro') { e.preventDefault(); countdown(); }
    else if (e.code !== 'Space' && state === 'menu') $('playBtn').click();
    else if (e.code !== 'Space' && state === 'results') ($('nextBtn').style.display !== 'none' ? $('nextBtn') : $('againBtn')).click();
  }
});
addEventListener('keyup', e => { const dir = KEYMAP[e.code]; if (dir) keys[dir] = false; if (e.code === 'Space') keys.brake = false; });
addEventListener('blur', () => { clearKeys(); pauseGame(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) pauseGame(); });

const markTouch = () => document.body.classList.add('touch');
if (matchMedia('(pointer: coarse)').matches) markTouch();
addEventListener('touchstart', markTouch, { once: true, passive: true });

document.querySelectorAll('#dpad button').forEach(btn => {
  const dir = btn.dataset.dir;
  const on = e => { e.preventDefault(); ensureAudio(); if (state === 'playing') { keys[dir] = true; btn.classList.add('held'); } };
  const off = e => { e.preventDefault(); keys[dir] = false; btn.classList.remove('held'); };
  btn.addEventListener('pointerdown', e => { if (btn.setPointerCapture) btn.setPointerCapture(e.pointerId); on(e); });
  btn.addEventListener('pointerup', off);
  btn.addEventListener('pointercancel', off);
  btn.addEventListener('lostpointercapture', off);
  btn.addEventListener('contextmenu', e => e.preventDefault());
});

/* =========================================================
   13. INICIO APP (carga) Y BUCLE PRINCIPAL
   ========================================================= */
selLevel = Math.min(loadProg().unlocked, LEVELS.length) - 1;
setMode('peaton');

// API mínima para el módulo del examen (js/examen.js)
window.RS = {
  show: n => show(n), getState: () => state, setState: v => { state = v; }, toMenu: () => toMenu(),
  SFX, ensureAudio, loadStore, saveStore, award, starSvg,
  // ayuda para pruebas automáticas (no se usa en el juego)
  dbg: () => {
    if (MODE !== 'conductor' || !player) return null;
    const front = player.x + CAR_L / 2, it = items.find(t => t.zB > front - 4), z = zoneAt(player.x);
    const lead = npcs.filter(n => Math.abs(n.y - player.y) < 30 && n.x > player.x).sort((a, b) => a.x - b.x)[0];
    return { kmh: player.v / KMH, limit: z.limit, y: player.y, belt: g.belt, amb: !!(amb && !amb.judged),
      next: it ? { type: it.type, dist: it.stopX - front, zdist: it.zA - front, s: dState(it).s, peds: pedsOnRoad(it), danger: crossDanger(it) } : null,
      lead: lead ? lead.x - lead.w / 2 - front : null, toMeta: META_X - player.x,
      px: player.x, py: player.y, cross: it ? it.cross.map(l => l.cars.map(c => ({ x: l.x, y: Math.round(c.y), w: c.w, h: c.h, t: c.type, mv: c.moving }))) : [], itx: it ? it.x : null };
  }
};
setTimeout(() => {
  $('splash').classList.add('hide');
  state = 'menu'; show('start');
  setTimeout(() => $('splash').remove(), 600);
}, 1050);

let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (state === 'playing') (MODE === 'conductor' ? dUpdate : update)(dt);
  else if (state === 'menu' || state === 'controls' || state === 'data' || state === 'intro' || state === 'boot' || state === 'exam') {
    g.time += dt; if (MODE === 'conductor') dTraffic(dt); else updateTraffic(dt); updateEffects(dt);
  }
  else if (state === 'results') updateEffects(dt);
  draw();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
})();
