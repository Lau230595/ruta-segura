/* =========================================================
   Ruta Segura · Examen de reglas de tránsito (tipo MTC)
   Formato del examen oficial: 40 preguntas, 40 minutos, mínimo 35 correctas.
   Preguntas redactadas por el equipo a partir del TUO del Reglamento Nacional
   de Tránsito (D.S. 016-2009-MTC y modificatorias). No es el balotario oficial:
   para estudiar, complementar con el balotario del MTC.
   ========================================================= */
(() => {
'use strict';
const RS = window.RS;
if (!RS) return;
const $ = id => document.getElementById(id);

// q: enunciado · o: alternativas (la primera es la correcta; se barajan al mostrar) · e: explicación · ref: fuente · t: tema
const BANCO = [
  // ---- Semáforos y luces ----
  { t: 'Semáforos', q: 'La luz roja del semáforo vehicular indica:', o: ['Detención: debe detenerse antes de la línea de parada', 'Precaución: puede pasar si no vienen autos', 'Que puede girar a la derecha sin detenerse', 'Que debe acelerar para despejar el cruce'], e: 'La luz roja indica detención; se debe parar antes de la línea de parada o del cruce peatonal.', ref: 'RNT, Art. 49' },
  { t: 'Semáforos', q: 'Si la luz ámbar le sorprende tan cerca del cruce que ya no puede detenerse con seguridad, debe:', o: ['Continuar con precaución y despejar la intersección', 'Frenar bruscamente aunque quede sobre la cebra', 'Acelerar al máximo para pasar antes del rojo', 'Retroceder hasta la línea de parada'], e: 'El ámbar advierte el cambio a rojo. Si ya no puede detenerse con seguridad, continúa con precaución y despeja la intersección.', ref: 'RNT, Art. 49' },
  { t: 'Semáforos', q: 'La luz roja intermitente equivale a:', o: ['Una señal de PARE', 'Una señal de CEDA EL PASO', 'Vía libre con precaución', 'Semáforo malogrado: no obliga a nada'], e: 'Rojo intermitente indica PARE: detenerse antes de la línea y ceder el paso como ante la señal PARE.', ref: 'RNT, Art. 49' },
  { t: 'Semáforos', q: 'Ante la luz ámbar intermitente, el conductor debe:', o: ['Reducir la velocidad y continuar con precaución', 'Detenerse por completo siempre', 'Acelerar porque tiene preferencia absoluta', 'Esperar a que se encienda la luz verde'], e: 'El ámbar intermitente pide precaución: reducir la velocidad y cruzar atento.', ref: 'RNT, Art. 49' },
  { t: 'Semáforos', q: 'El semáforo peatonal muestra la figura roja ("ALTO"). El peatón debe:', o: ['No bajar a la calzada ni cruzar', 'Cruzar rápido si no vienen autos', 'Cruzar solo por la mitad de la pista', 'Cruzar si el semáforo vehicular está en ámbar'], e: 'Con la figura roja el peatón se abstiene de cruzar; cruza solo con la figura verde ("PASE").', ref: 'RNT, Art. 70' },
  // ---- Policía de tránsito ----
  { t: 'Policía', q: 'El semáforo está en rojo y el policía de tránsito le indica continuar. Usted debe:', o: ['Continuar la marcha', 'Detenerse hasta que cambie a verde', 'Tocar el claxon y esperar', 'Ignorar al policía y obedecer el semáforo'], e: 'Las indicaciones del policía asignado al control del tránsito prevalecen sobre los semáforos.', ref: 'RNT, Art. 57' },
  { t: 'Policía', q: 'La posición de frente o de espaldas del policía de tránsito significa:', o: ['Obligación de detenerse de quien así lo enfrente', 'Siga su marcha sin detenerse', 'Gire a la derecha', 'Reduzca la velocidad y continúe'], e: 'Quien enfrenta al policía de frente o de espaldas debe detenerse.', ref: 'RNT, Art. 58' },
  { t: 'Policía', q: 'El orden de prevalencia de las indicaciones del tránsito es:', o: ['Policía de tránsito, luego semáforos, luego las demás señales', 'Semáforos, luego policía, luego señales', 'Señales verticales, luego semáforos, luego policía', 'Todas tienen el mismo valor'], e: 'Las indicaciones del policía prevalecen sobre los semáforos, y estos sobre los demás dispositivos.', ref: 'RNT, Art. 57' },
  { t: 'Policía', q: 'Cuando un policía dirige el tránsito en una intersección con semáforos:', o: ['Se deben apagar los semáforos de esa intersección', 'Los semáforos siguen mandando sobre el policía', 'Solo los peatones deben obedecerle', 'Los autos deben tocar el claxon para avisarle'], e: 'Cuando el policía dirige una intersección semaforizada, deben apagarse las luces de todos sus semáforos.', ref: 'RNT, Art. 60' },
  // ---- Velocidades ----
  { t: 'Velocidad', q: 'En zona urbana, la velocidad máxima en calles y jirones es:', o: ['30 km/h', '40 km/h', '50 km/h', '60 km/h'], e: 'Desde la modificación de 2021, el máximo en calles y jirones es 30 km/h.', ref: 'RNT, Art. 162 (D.S. 025-2021-MTC)' },
  { t: 'Velocidad', q: 'En zona urbana, la velocidad máxima en avenidas es:', o: ['50 km/h', '60 km/h', '40 km/h', '80 km/h'], e: 'El máximo en avenidas urbanas es 50 km/h.', ref: 'RNT, Art. 162 (D.S. 025-2021-MTC)' },
  { t: 'Velocidad', q: 'En vías expresas urbanas, la velocidad máxima es:', o: ['80 km/h', '60 km/h', '100 km/h', '50 km/h'], e: 'El máximo en vías expresas es 80 km/h.', ref: 'RNT, Art. 162' },
  { t: 'Velocidad', q: 'Frente a un colegio (zona escolar), la velocidad máxima es:', o: ['30 km/h', '40 km/h', '50 km/h', '20 km/h solo en hora de salida'], e: 'En zonas escolares el máximo es 30 km/h.', ref: 'RNT, Art. 162 (D.S. 025-2021-MTC)' },
  { t: 'Velocidad', q: 'Frente a un hospital (zona de hospital), la velocidad máxima es:', o: ['30 km/h', '50 km/h', '60 km/h', 'No tiene límite especial'], e: 'En zonas de hospital el máximo también es 30 km/h.', ref: 'RNT, Art. 162 (D.S. 025-2021-MTC)' },
  { t: 'Velocidad', q: 'Si una señal indica un límite distinto al general de la vía, se debe respetar:', o: ['La velocidad indicada por la señal', 'Siempre el límite general', 'El límite más alto de los dos', 'La velocidad del auto de adelante'], e: 'Prima la velocidad asignada por la autoridad y debidamente señalizada.', ref: 'RNT (límites señalizados)' },
  // ---- Peatones ----
  { t: 'Peatones', q: 'En una intersección sin semáforo, un peatón cruza en línea recta y sin peligro. ¿Quién tiene derecho de paso?', o: ['El peatón', 'El vehículo, porque es más rápido', 'El que toque primero el claxon', 'El vehículo, si va por avenida'], e: 'En intersecciones no semaforizadas, el peatón que cruza en línea recta tiene derecho de paso.', ref: 'RNT, Art. 63' },
  { t: 'Peatones', q: 'Usted gira a la derecha con luz verde y hay peatones cruzando la vía a la que entra. Debe:', o: ['Detenerse y cederles el paso', 'Pasar primero porque tiene luz verde', 'Tocar el claxon para que se apuren', 'Girar por detrás de ellos sin detenerse'], e: 'El peatón tiene derecho de paso frente a los vehículos que giran con luz verde.', ref: 'RNT, Art. 64' },
  { t: 'Peatones', q: 'Al salir de un estacionamiento cruzando la vereda, ¿quién tiene preferencia?', o: ['El peatón que circula por la vereda', 'El vehículo que sale', 'El que vaya más rápido', 'Nadie: deben ponerse de acuerdo'], e: 'El peatón tiene derecho de paso frente a los vehículos que cruzan la acera para entrar o salir de un estacionamiento.', ref: 'RNT, Art. 65' },
  { t: 'Peatones', q: 'Hay peatones cruzando por la cebra (crucero peatonal) delante de usted. Debe:', o: ['Detenerse antes de la cebra hasta que terminen de cruzar', 'Pasar despacio entre ellos', 'Tocar el claxon y continuar', 'Detenerse sobre la cebra'], e: 'En el crucero peatonal el peatón tiene preferencia: deténgase antes de la cebra, nunca sobre ella.', ref: 'RNT, Arts. 63 y 64' },
  { t: 'Peatones', q: '¿Por dónde debe cruzar la calzada un peatón en una intersección señalizada?', o: ['Por la zona señalizada o demarcada para su paso', 'Por donde haya menos autos', 'En diagonal para llegar más rápido', 'Entre los autos detenidos'], e: 'En intersecciones señalizadas, el peatón cruza por la zona demarcada para su paso.', ref: 'RNT, Art. 68' },
  // ---- Emergencias ----
  { t: 'Emergencias', q: 'Se acerca una ambulancia con sirena y luces encendidas. Usted debe:', o: ['Cederle el paso ubicándose a la derecha y reduciendo o deteniéndose', 'Acelerar para no estorbarle', 'Seguirla de cerca para avanzar más rápido', 'Mantener su carril y velocidad'], e: 'Ante un vehículo de emergencia con señales audibles y visibles se le debe ceder el paso. No hacerlo es la infracción M25.', ref: 'RNT, infracción M25' },
  { t: 'Emergencias', q: '¿Está permitido seguir de cerca a un vehículo de emergencia para avanzar más rápido?', o: ['No, está prohibido', 'Sí, si mantiene las luces encendidas', 'Sí, en avenidas', 'Solo de noche'], e: 'El Reglamento prohíbe seguir a los vehículos de emergencia.', ref: 'RNT (prohibición de seguir vehículos de emergencia)' },
  { t: 'Emergencias', q: 'Una ambulancia circula sin sirena ni luces encendidas. ¿Tiene preferencia de paso?', o: ['No: la preferencia se da cuando usa sus señales audibles y visibles', 'Sí, siempre', 'Sí, solo en avenidas', 'Solo si lleva un paciente'], e: 'La infracción M25 se refiere a no dar preferencia cuando el vehículo usa sus señales audibles y visibles.', ref: 'RNT, infracción M25' },
  { t: 'Emergencias', q: 'Un peatón cruza con derecho de paso y se aproxima una ambulancia con sirena. El peatón:', o: ['Debe cederle el paso', 'Mantiene la preferencia y sigue cruzando', 'Debe correr para terminar de cruzar', 'Debe quedarse quieto en medio de la pista'], e: 'La preferencia del peatón tiene una excepción: los vehículos de emergencia.', ref: 'RNT, Art. 77' },
  // ---- Señales ----
  { t: 'Señales', q: 'Al llegar a una señal PARE, el conductor debe:', o: ['Detenerse por completo, ceder el paso y continuar cuando sea seguro', 'Reducir la velocidad sin detenerse', 'Tocar el claxon y continuar', 'Detenerse solo si vienen autos'], e: 'PARE exige la detención total antes de la línea, aunque no vengan vehículos.', ref: 'Señal reglamentaria PARE' },
  { t: 'Señales', q: '¿Qué forma tiene la señal PARE?', o: ['Octágono rojo', 'Triángulo con el vértice hacia abajo', 'Círculo rojo', 'Rombo amarillo'], e: 'La señal PARE es un octágono rojo con letras blancas.', ref: 'Manual de Dispositivos de Control del Tránsito' },
  { t: 'Señales', q: 'La señal CEDA EL PASO obliga a:', o: ['Reducir la velocidad y detenerse si es necesario para dejar pasar a la vía preferencial', 'Detenerse siempre durante 3 segundos', 'Acelerar para incorporarse rápido', 'Tocar el claxon antes de cruzar'], e: 'CEDA EL PASO no exige parar siempre, pero sí dejar pasar a quien tiene preferencia, deteniéndose si hace falta.', ref: 'Señal reglamentaria CEDA EL PASO' },
  { t: 'Señales', q: 'Las señales preventivas sirven para:', o: ['Advertir peligros en la vía; son amarillas en forma de rombo', 'Indicar obligaciones y prohibiciones', 'Indicar destinos y servicios', 'Decorar la vía'], e: 'Las preventivas advierten de un peligro; en el Perú son amarillas con forma de rombo.', ref: 'Manual de Dispositivos de Control del Tránsito' },
  { t: 'Señales', q: 'Las señales reglamentarias indican:', o: ['Obligaciones, prohibiciones o restricciones', 'Solo la ubicación de servicios', 'Recomendaciones opcionales', 'El nombre de las calles'], e: 'Las reglamentarias regulan el uso de la vía: obligan, prohíben o restringen.', ref: 'Manual de Dispositivos de Control del Tránsito' },
  { t: 'Señales', q: 'Una línea central amarilla continua en la calzada significa:', o: ['Prohibido cruzarla para adelantar', 'Puede adelantar con precaución', 'Zona de estacionamiento', 'Carril exclusivo para buses'], e: 'La línea continua no debe cruzarse; la discontinua permite adelantar con precaución.', ref: 'Marcas en el pavimento' },
  // ---- Conducción segura ----
  { t: 'Conducción', q: 'El uso del cinturón de seguridad es obligatorio para:', o: ['El conductor y todos los ocupantes del vehículo', 'Solo el conductor', 'Solo en carretera', 'Solo los pasajeros de adelante'], e: 'No usar el cinturón (conductor u ocupantes) es la infracción grave G28.', ref: 'RNT, infracción G28' },
  { t: 'Conducción', q: '¿Puede usar el celular mientras conduce si sujeta el volante con una mano?', o: ['No, está prohibido usarlo al conducir', 'Sí, si va despacio', 'Sí, en los semáforos en rojo', 'Sí, si es una llamada corta'], e: 'Manipular el celular distrae y está prohibido mientras se conduce.', ref: 'RNT (uso del celular)' },
  { t: 'Conducción', q: 'El adelantamiento (sobrepaso) debe hacerse por:', o: ['El lado izquierdo', 'El lado derecho', 'Cualquier lado', 'La berma'], e: 'Se adelanta por la izquierda, con visibilidad y espacio suficiente.', ref: 'RNT (adelantamiento)' },
  { t: 'Conducción', q: 'Otro vehículo le indica que quiere adelantarlo. Usted debe:', o: ['No aumentar la velocidad y facilitarle la maniobra', 'Acelerar para impedirlo', 'Frenar bruscamente', 'Cambiarse al carril izquierdo'], e: 'Quien es adelantado no debe aumentar la velocidad.', ref: 'RNT (adelantamiento)' },
  { t: 'Conducción', q: 'La distancia con el vehículo de adelante debe ser:', o: ['La suficiente para detenerse con seguridad si frena de golpe', 'Lo más corta posible para no perder el turno', 'Exactamente 1 metro', 'No importa en zona urbana'], e: 'Guardar distancia de seguridad evita choques por alcance.', ref: 'RNT (distancia de seguimiento)' },
  { t: 'Conducción', q: 'Antes de girar o cambiar de carril, el conductor debe:', o: ['Señalizar con las luces direccionales con anticipación', 'Tocar el claxon', 'Girar y luego señalizar', 'Encender las luces altas'], e: 'Se debe anunciar la maniobra con las direccionales con anticipación.', ref: 'RNT (señalización de maniobras)' },
  { t: 'Conducción', q: 'La luz verde está encendida, pero la intersección está congestionada. Usted debe:', o: ['No ingresar hasta que haya espacio para cruzarla completa', 'Entrar y quedarse en medio del cruce', 'Tocar el claxon para que avancen', 'Cruzar por el carril contrario'], e: 'No se debe bloquear la intersección aunque se tenga luz verde.', ref: 'RNT (intersecciones)' },
  { t: 'Conducción', q: 'En una intersección no regulada llegan dos vehículos al mismo tiempo. Tiene preferencia:', o: ['El que se aproxima por la derecha', 'El que se aproxima por la izquierda', 'El vehículo más grande', 'El que toque primero el claxon'], e: 'En intersecciones sin señales, cede el paso a quien viene por tu derecha.', ref: 'RNT (preferencia de paso)' },
  { t: 'Conducción', q: 'En una rotonda, tiene preferencia de paso:', o: ['El vehículo que ya circula dentro de la rotonda', 'El que quiere ingresar', 'El que viene por la avenida más ancha', 'El transporte público siempre'], e: 'Quien circula dentro de la rotonda tiene preferencia sobre quien ingresa.', ref: 'RNT (rotondas)' },
  { t: 'Examen', q: 'El examen de reglas de tránsito para obtener la licencia A-I tiene:', o: ['40 preguntas, 40 minutos y se aprueba con 35 correctas', '20 preguntas y se aprueba con 14', '50 preguntas y se aprueba con 30', '40 preguntas y se aprueba con 20'], e: 'El examen tiene 40 preguntas en máximo 40 minutos; necesitas al menos 35 respuestas correctas.', ref: 'gob.pe · Licencia de conducir por primera vez' }
];

const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const fmt = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
let ex = null, timerId = null, closeArmed = false;

function start(tipo) {
  const sim = tipo === 'simulacro';
  const preguntas = shuffle(BANCO).slice(0, sim ? 40 : 10).map(p => {
    const opts = shuffle(p.o.map((txt, k) => ({ txt, ok: k === 0 })));
    return Object.assign({}, p, { opts });
  });
  ex = { tipo, sim, preguntas, i: 0, resp: [], correctas: 0, t0: Date.now(), limite: sim ? 40 * 60 : null, answered: false, sel: null };
  RS.setState('exam'); RS.show(null);
  $('sExam').classList.add('show');
  $('exQ').style.display = 'flex'; $('exRes').style.display = 'none';
  $('exMode').textContent = sim ? 'SIMULACRO MTC · 40 PREGUNTAS · 35 PARA APROBAR' : 'PRÁCTICA · 10 PREGUNTAS CON EXPLICACIÓN';
  $('exTimer').style.display = sim ? 'inline-block' : 'none';
  clearInterval(timerId);
  if (sim) timerId = setInterval(tick, 250);
  render();
}
function tick() {
  if (!ex || !ex.sim) return;
  const left = ex.limite - (Date.now() - ex.t0) / 1000;
  $('exTimer').textContent = fmt(Math.max(0, left));
  $('exTimer').classList.toggle('low', left < 300);
  if (left <= 0) finish(true);
}
function render() {
  const p = ex.preguntas[ex.i];
  ex.answered = false; ex.sel = null; closeArmed = false;
  $('exTitle').textContent = `Pregunta ${ex.i + 1} de ${ex.preguntas.length}`;
  $('exProg').style.width = (ex.i / ex.preguntas.length * 100) + '%';
  $('exTema').textContent = p.t;
  $('exText').textContent = p.q;
  const box = $('exOpts'); box.textContent = '';
  p.opts.forEach((o, k) => {
    const b = document.createElement('button'); b.className = 'exopt'; b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', 'false');
    const n = document.createElement('span'); n.className = 'n'; n.textContent = k + 1;
    const t = document.createElement('span'); t.textContent = o.txt;
    b.append(n, t); b.onclick = () => choose(k);
    box.appendChild(b);
  });
  $('exFb').hidden = true;
  const nx = $('exNext'); nx.disabled = true; nx.textContent = ex.i === ex.preguntas.length - 1 ? 'Terminar' : 'Siguiente';
  setTimeout(() => box.firstChild && box.firstChild.focus({ preventScroll: true }), 30);
}
function choose(k) {
  if (!ex || ex.answered) return;
  const p = ex.preguntas[ex.i], btns = [...$('exOpts').children];
  ex.sel = k;
  if (ex.sim) {                                   // simulacro: se puede cambiar la respuesta hasta pulsar Siguiente
    btns.forEach((b, j) => { b.classList.toggle('sel', j === k); b.setAttribute('aria-checked', String(j === k)); });
    $('exNext').disabled = false; RS.SFX.click();
    return;
  }
  ex.answered = true;                             // práctica: retroalimentación inmediata
  const ok = p.opts[k].ok;
  btns.forEach((b, j) => { b.disabled = true; if (p.opts[j].ok) b.classList.add('ok'); else if (j === k) b.classList.add('bad'); });
  const fb = $('exFb'); fb.hidden = false; fb.className = 'exfb ' + (ok ? 'ok' : 'bad'); fb.textContent = '';
  const b = document.createElement('b'); b.textContent = ok ? '¡Correcto! ' : 'Incorrecto. ';
  const sp = document.createElement('span'); sp.textContent = p.e;
  const sm = document.createElement('small'); sm.textContent = 'Fuente: ' + p.ref;
  fb.append(b, sp, sm);
  ok ? RS.SFX.ok(1) : RS.SFX.bad();
  $('exNext').disabled = false; $('exNext').focus({ preventScroll: true });
}
function next() {
  if (!ex || ex.sel == null) return;
  const p = ex.preguntas[ex.i], ok = p.opts[ex.sel].ok;
  ex.resp.push({ q: p.q, tema: p.t, elegida: p.opts[ex.sel].txt, correcta: p.opts.find(o => o.ok).txt, ok, e: p.e, ref: p.ref });
  if (ok) ex.correctas++;
  if (ex.i < ex.preguntas.length - 1) { ex.i++; render(); } else finish(false);
}
function finish(porTiempo) {
  clearInterval(timerId);
  const total = ex.preguntas.length, c = ex.correctas;
  const minimo = ex.sim ? 35 : Math.ceil(total * 0.875);
  const aprobado = c >= minimo;
  const tiempo = Math.round((Date.now() - ex.t0) / 1000);
  $('exQ').style.display = 'none'; $('exRes').style.display = 'flex';
  $('exProg').style.width = '100%';
  $('exTitle').textContent = ex.sim ? 'Resultado del simulacro' : 'Resultado de la práctica';
  $('exResTitle').textContent = `${c} / ${total} · ${aprobado ? 'APROBADO' : 'DESAPROBADO'}`;
  $('exResSub').textContent = (porTiempo ? 'Se acabó el tiempo. ' : '') + `Necesitas ${minimo} correctas para aprobar · tiempo ${fmt(tiempo)}` + (ex.sim ? ' (máximo 40:00).' : '.');
  $('exBadge').style.background = aprobado ? '#FFC400' : '#D32F2F';
  $('exBadge').innerHTML = aprobado
    ? '<svg viewBox="0 0 24 24" fill="none" stroke="#14171A" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>'
    : '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>';
  const ul = $('exReview'); ul.textContent = '';
  const malas = ex.resp.filter(r => !r.ok);
  if (!malas.length) { const li = document.createElement('li'); li.textContent = ex.resp.length ? '¡Sin errores! Excelente.' : 'No respondiste preguntas.'; ul.appendChild(li); }
  malas.forEach(r => {
    const li = document.createElement('li'), i = document.createElement('i'), d = document.createElement('div');
    i.textContent = '✕'; i.style.background = '#D32F2F';
    d.textContent = r.q;
    const s1 = document.createElement('small'); s1.textContent = `Tu respuesta: ${r.elegida}`;
    const s2 = document.createElement('small'); s2.textContent = `Correcta: ${r.correcta}. ${r.e} (${r.ref})`; s2.style.color = '#15803D';
    d.append(s1, s2); li.append(i, d); ul.appendChild(li);
  });
  aprobado ? RS.SFX.win() : RS.SFX.bad();
  if (ex.sim && aprobado) RS.award('teorico');
  // guardar para las métricas IHC (CSV)
  const st = RS.loadStore();
  st.sessions.push({ id: 'EX-' + Date.now().toString(36).toUpperCase(), fecha: new Date().toISOString(), alias: '', modo: 'examen', tipo: ex.tipo,
    dispositivo: document.body.classList.contains('touch') ? 'tactil' : 'teclado', nivel: 0, resultado: aprobado ? 'aprobado' : 'desaprobado',
    correctas: c, total, aprobado, puntaje: c, estrellas: 0, tiempo_s: tiempo, infracciones: total - c,
    eventos: ex.resp.map((r, k) => ({ t: k + 1, tipo: r.ok ? 'correcta' : 'incorrecta', calle: r.tema, detalle: r.q })) });
  RS.saveStore(st);
  $('exAgain').focus({ preventScroll: true });
}
function close() {
  clearInterval(timerId); ex = null;
  $('sExam').classList.remove('show');
  RS.toMenu();
}

$('exNext').onclick = next;
$('exAgain').onclick = () => start(ex ? ex.tipo : 'practica');
$('exMenu').onclick = close;
$('exClose').onclick = () => {
  if (ex && $('exRes').style.display === 'none' && ex.i > 0 && !closeArmed) {
    closeArmed = true; $('exTitle').textContent = '¿Salir? Pulsa ✕ otra vez (perderás tus respuestas)'; return;
  }
  close();
};
addEventListener('keydown', e => {
  if (RS.getState() !== 'exam' || !ex) return;
  if (e.target instanceof HTMLInputElement) return;
  if ($('exRes').style.display !== 'none') { if (e.code === 'Escape') close(); return; }
  const n = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3, Numpad1: 0, Numpad2: 1, Numpad3: 2, Numpad4: 3 }[e.code];
  if (n != null) { e.preventDefault(); choose(n); return; }
  if (e.code === 'Enter' || e.code === 'NumpadEnter') {
    // Con una respuesta elegida, ENTER avanza; si aún no hay respuesta, ENTER elige la opción enfocada.
    if (!$('exNext').disabled) { e.preventDefault(); next(); }
  }
  if (e.code === 'Escape') { e.preventDefault(); $('exClose').click(); }
});

window.RSExam = { start, banco: BANCO.length };
})();
