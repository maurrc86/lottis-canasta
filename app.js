/* ============================================================
   Escuela de Canasta Ale y Mau — app.js
   Aplicación educativa 100% estática. Sin dependencias externas.
   "Lo importante es convivir."
   ============================================================ */

(function () {
  'use strict';

  /* ============================================================
     1. CONSTANTES Y UTILIDADES GENERALES
     ============================================================ */

  var STORAGE_KEY = 'aleymau_canasta_progreso_v1';
  var TOTAL_MODULES = 17;

  var NAMES = ['TJ', 'Euge', 'Eli', 'Paloma'];

  var SUITS = {
    picas: { symbol: '♠', color: 'black' },
    corazones: { symbol: '♥', color: 'red' },
    diamantes: { symbol: '♦', color: 'red' },
    treboles: { symbol: '♣', color: 'black' }
  };

  function $(id) { return document.getElementById(id); }
  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    attrs = attrs || {};
    Object.keys(attrs).forEach(function (key) {
      if (key === 'class') node.className = attrs[key];
      else if (key === 'html') node.innerHTML = attrs[key];
      else if (key === 'text') node.textContent = attrs[key];
      else if (key.indexOf('on') === 0 && typeof attrs[key] === 'function') {
        node.addEventListener(key.slice(2).toLowerCase(), attrs[key]);
      } else {
        node.setAttribute(key, attrs[key]);
      }
    });
    (children || []).forEach(function (child) {
      if (child == null) return;
      if (typeof child === 'string') node.appendChild(document.createTextNode(child));
      else node.appendChild(child);
    });
    return node;
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
  }

  function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

  function formatPoints(n) {
    var sign = n < 0 ? '−' : '';
    return sign + Math.abs(n).toLocaleString('es-MX');
  }

  var toastTimer = null;
  function showToast(msg) {
    var t = $('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2600);
  }

  /* ============================================================
     2. ESTADO Y PERSISTENCIA (localStorage)
     ============================================================ */

  var defaultState = {
    username: '',
    completedModules: {},
    lastModuleVisited: null,
    examBestScore: null,
    examApproved: false,
    certificateDate: null,
    soundOn: true
  };

  var state = loadState();

  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return JSON.parse(JSON.stringify(defaultState));
      var parsed = JSON.parse(raw);
      return Object.assign(JSON.parse(JSON.stringify(defaultState)), parsed);
    } catch (e) {
      console.warn('No se pudo leer el progreso guardado, se inicia limpio.', e);
      return JSON.parse(JSON.stringify(defaultState));
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('No se pudo guardar el progreso.', e);
    }
  }

  function markModuleComplete(id) {
    state.completedModules[id] = true;
    saveState();
  }

  function completedCount() {
    return Object.keys(state.completedModules).filter(function (k) { return state.completedModules[k]; }).length;
  }

  function overallPercent() {
    return Math.round((completedCount() / TOTAL_MODULES) * 100);
  }

  /* ============================================================
     3. SONIDO (Web Audio API, sin archivos externos)
     ============================================================ */

  var audioCtx = null;
  function getAudioCtx() {
    if (!state.soundOn) return null;
    if (!audioCtx) {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      audioCtx = new Ctx();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }

  function playTone(freq, duration, type, delay, gainStart) {
    var ctx = getAudioCtx();
    if (!ctx) return;
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    var startTime = ctx.currentTime + (delay || 0);
    gain.gain.setValueAtTime(gainStart || 0.08, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.02);
  }

  var Sound = {
    correct: function () { playTone(880, 0.14, 'sine', 0); playTone(1174, 0.18, 'sine', 0.09); },
    incorrect: function () { playTone(220, 0.22, 'sawtooth', 0, 0.06); },
    basket: function () {
      [660, 784, 988, 1318].forEach(function (f, i) { playTone(f, 0.16, 'triangle', i * 0.07); });
    },
    celebrate: function () {
      [523, 659, 784, 1047, 1319].forEach(function (f, i) { playTone(f, 0.22, 'sine', i * 0.09, 0.07); });
    },
    click: function () { playTone(440, 0.05, 'square', 0, 0.03); }
  };

  function toggleSound() {
    state.soundOn = !state.soundOn;
    saveState();
    var btn = $('btn-sound-toggle');
    btn.textContent = state.soundOn ? '🔊' : '🔇';
    btn.setAttribute('aria-pressed', String(!state.soundOn));
    showToast(state.soundOn ? 'Sonido activado' : 'Sonido silenciado');
  }

  /* ============================================================
     4. CONFETI (CSS + JS, sin librerías)
     ============================================================ */

  function launchConfetti() {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var layer = $('confetti-layer');
    var colors = ['#c6a355', '#e0c07d', '#f4efe1', '#9a3b3b', '#3f7a4d'];
    for (var i = 0; i < 46; i++) {
      var piece = document.createElement('div');
      piece.className = 'confetti-piece';
      piece.style.left = Math.random() * 100 + 'vw';
      piece.style.background = colors[i % colors.length];
      piece.style.animationDuration = (2.4 + Math.random() * 1.6) + 's';
      piece.style.transform = 'rotate(' + Math.floor(Math.random() * 360) + 'deg)';
      layer.appendChild(piece);
      (function (p) { setTimeout(function () { p.remove(); }, 4200); })(piece);
    }
  }

  /* ============================================================
     5. NAIPES: MODELO Y RENDERIZADO (Unicode + HTML/CSS)
     ============================================================ */

  // rank: 'A','2'..'10','J','Q','K','JOKER'  suit: picas|corazones|diamantes|treboles|null

  function isWildRank(rank) { return rank === '2' || rank === 'JOKER'; }

  function cardValue(rank, suitColor) {
    if (rank === 'JOKER') return 50;
    if (rank === '2') return 20;
    if (rank === 'A') return 20;
    if (['8', '9', '10', 'J', 'Q', 'K'].indexOf(rank) !== -1) return 10;
    if (['4', '5', '6', '7'].indexOf(rank) !== -1) return 5;
    if (rank === '3') return suitColor === 'red' ? 200 : 5;
    return 0;
  }

  function makeCard(rank, suitKey) {
    var suit = suitKey ? SUITS[suitKey] : null;
    return {
      rank: rank,
      suitKey: suitKey || null,
      suitSymbol: suit ? suit.symbol : (rank === 'JOKER' ? '★' : ''),
      color: rank === 'JOKER' ? 'gold' : (suit ? suit.color : 'gold'),
      wild: isWildRank(rank),
      value: cardValue(rank, suit ? suit.color : null)
    };
  }

  // Renderiza una carta como elemento HTML (botón opcional si onClick se define)
  function renderCard(card, opts) {
    opts = opts || {};
    var classes = ['playing-card'];
    if (card.wild) classes.push('wild'); else classes.push(card.color === 'red' ? 'red' : 'black');
    if (opts.small) classes.push('small');
    if (opts.lg) classes.push('lg');
    if (opts.selected) classes.push('selected');
    if (opts.animate) classes.push('deal-anim');

    var rankDisplay = card.rank === 'JOKER' ? 'JK' : card.rank;
    var inner =
      '<span class="rank">' + escapeHtml(rankDisplay) + '</span>' +
      '<span class="suit-corner" aria-hidden="true">' + (card.suitSymbol || '★') + '</span>' +
      '<span class="suit-center" aria-hidden="true">' + (card.suitSymbol || '★') + '</span>' +
      '<span class="suit-corner" aria-hidden="true" style="align-self:flex-end; transform:rotate(180deg);">' + (card.suitSymbol || '★') + '</span>';

    var label = (card.rank === 'JOKER' ? 'Joker' : card.rank) + (card.suitKey ? ' de ' + card.suitKey : (card.rank === 'JOKER' ? '' : ''));

    if (opts.onClick) {
      var btn = el('button', { class: classes.join(' ') + ' playing-card-btn', type: 'button', 'aria-pressed': String(!!opts.selected), 'aria-label': label, onClick: opts.onClick });
      // wrap: playing-card-btn should itself carry playing-card visuals
      btn.classList.remove('playing-card');
      var inline = el('span', { class: classes.join(' '), html: inner, style: 'pointer-events:none;' });
      btn.appendChild(inline);
      return btn;
    }
    return el('div', { class: classes.join(' '), html: inner, 'aria-label': label, role: 'img' });
  }

  function renderCardBack(opts) {
    opts = opts || {};
    var classes = ['playing-card', 'card-back'];
    if (opts.small) classes.push('small');
    if (opts.animate) classes.push('deal-anim');
    return el('div', { class: classes.join(' '), 'aria-hidden': 'true' });
  }

  /* ============================================================
     6. NAVEGACIÓN ENTRE PANTALLAS
     ============================================================ */

  var screenHistoryStack = [];

  function showScreen(id, opts) {
    opts = opts || {};
    qsa('.screen').forEach(function (s) { s.classList.remove('active'); });
    var target = $(id);
    if (target) target.classList.add('active');
    if (!opts.skipHistory) screenHistoryStack.push(id);
    window.scrollTo({ top: 0, behavior: 'auto' });
    var h1 = target ? target.querySelector('h1, .brand') : null;
    if (h1) h1.setAttribute('tabindex', '-1');
  }

  /* ============================================================
     7. PANTALLA DE BIENVENIDA
     ============================================================ */

  var selectedName = '';

  function initWelcomeScreen() {
    var grid = $('name-grid-welcome');
    grid.innerHTML = '';
    NAMES.concat(['Otro nombre']).forEach(function (name) {
      var btn = el('button', {
        class: 'name-choice', type: 'button', 'data-name': name,
        onClick: function () { selectName(name); }
      }, [name]);
      grid.appendChild(btn);
    });

    $('btn-start-course').addEventListener('click', function () {
      var finalName = selectedName === 'Otro nombre' ? $('other-name-input').value.trim() : selectedName;
      if (!finalName) {
        showToast('Elige o escribe tu nombre para continuar');
        return;
      }
      state.username = finalName.slice(0, 24);
      saveState();
      goToMenu();
    });
  }

  function selectName(name) {
    selectedName = name;
    qsa('.name-choice').forEach(function (b) {
      b.classList.toggle('selected', b.getAttribute('data-name') === name);
    });
    $('other-name-wrap').style.display = name === 'Otro nombre' ? 'block' : 'none';
    if (name === 'Otro nombre') $('other-name-input').focus();
    Sound.click();
  }

  /* ============================================================
     8. PANTALLA DE MENÚ PRINCIPAL
     ============================================================ */

  function goToMenu() {
    renderMenu();
    showScreen('screen-menu');
  }

  function renderMenu() {
    $('menu-username').textContent = state.username || 'jugador';
    var msgEl = $('menu-welcome-msg');
    if (completedCount() > 0) {
      msgEl.textContent = 'Bienvenido de nuevo. Vas en ' + overallPercent() + '% del curso.';
    } else {
      msgEl.textContent = 'Elige un módulo para comenzar. Vamos paso a paso.';
    }
    $('progress-percent-label').textContent = overallPercent() + '%';
    $('progress-fill-main').style.width = overallPercent() + '%';

    var grid = $('module-grid');
    grid.innerHTML = '';
    MODULES.forEach(function (mod, idx) {
      var done = !!state.completedModules[mod.id];
      var tile = el('button', {
        class: 'module-tile' + (done ? ' done' : ''), type: 'button',
        onClick: function () { openModule(mod.id); }
      }, [
        el('span', { class: 'num', text: done ? '✓' : String(idx + 1) }),
        el('span', { class: 'meta' }, [
          el('strong', { text: mod.title }),
          el('span', { text: mod.subtitle })
        ])
      ]);
      grid.appendChild(tile);
    });

    var certStatus = $('cert-tile-status');
    certStatus.textContent = state.examApproved ? 'Disponible — ¡ya lo lograste!' : 'Disponible al aprobar el examen';

    var soundBtn = $('btn-sound-toggle');
    soundBtn.textContent = state.soundOn ? '🔊' : '🔇';
    soundBtn.setAttribute('aria-pressed', String(!state.soundOn));

    qsa('[data-tool]').forEach(function (btn) {
      btn.onclick = function () {
        var tool = btn.getAttribute('data-tool');
        if (tool === 'quickref') openQuickRef();
        else if (tool === 'calc-score') { renderScoreCalcResult(); showScreen('screen-calc-score'); }
        else if (tool === 'calc-opening') { initOpeningCalc(); showScreen('screen-calc-opening'); }
        else if (tool === 'exam') { showScreen('screen-exam'); resetExamIntro(); }
        else if (tool === 'certificate') openCertificate();
      };
    });
  }

  function initMenuWiring() {
    $('btn-sound-toggle').addEventListener('click', toggleSound);
    $('btn-quickref-open').addEventListener('click', openQuickRef);
    $('btn-quickref-open-2').addEventListener('click', openQuickRef);
    $('btn-quickref-close').addEventListener('click', function () { showScreen('screen-menu'); });
    $('btn-module-to-menu').addEventListener('click', function () { goToMenu(); });
    $('btn-slide-menu').addEventListener('click', function () { goToMenu(); });
    $('btn-calcscore-to-menu').addEventListener('click', goToMenu);
    $('btn-calcopening-to-menu').addEventListener('click', goToMenu);
    $('btn-exam-to-menu').addEventListener('click', goToMenu);
    $('btn-cert-to-menu').addEventListener('click', goToMenu);
    $('btn-cert-go-exam').addEventListener('click', function () { showScreen('screen-exam'); resetExamIntro(); });
    $('btn-cert-print').addEventListener('click', function () { window.print(); });

    $('btn-reset-progress').addEventListener('click', function () {
      var ok = window.confirm('¿Seguro que quieres borrar todo tu progreso, tu nombre y tus resultados guardados en este dispositivo? Esta acción no se puede deshacer.');
      if (!ok) return;
      state = JSON.parse(JSON.stringify(defaultState));
      saveState();
      showToast('Progreso reiniciado');
      selectedName = '';
      qsa('.name-choice').forEach(function (b) { b.classList.remove('selected'); });
      $('other-name-wrap').style.display = 'none';
      showScreen('screen-welcome', { skipHistory: true });
    });
  }

  /* ============================================================
     9. COMPONENTES REUTILIZABLES PARA LAS LECCIONES
     ============================================================ */

  function slideShell(titleText, bodyNodes) {
    return { title: titleText, render: function (container) {
      container.appendChild(el('div', { class: 'card' }, [
        el('h2', { text: titleText, style: 'font-size:1.2rem;' })
      ].concat(bodyNodes)));
    } };
  }

  function pNodes(paragraphs) {
    return paragraphs.map(function (t) { return el('p', { html: t }); });
  }

  function ulNode(items) {
    return el('ul', { style: 'padding-left:20px; margin:0 0 1em;' }, items.map(function (t) {
      return el('li', { html: t, style: 'margin-bottom:6px;' });
    }));
  }

  function textSlide(title, paragraphs, extraItems) {
    var nodes = pNodes(paragraphs);
    if (extraItems && extraItems.length) nodes.push(ulNode(extraItems));
    return slideShell(title, nodes);
  }

  function customSlide(title, renderFn) {
    return { title: title, render: renderFn };
  }

  // ---- Ejercicio de opción múltiple genérico ----
  function buildChoiceExercise(container, opts) {
    // opts: { prompt, options:[{label, correct, explain}], onAnswered }
    var box = el('div', { class: 'card' });
    box.appendChild(el('p', { class: 'eyebrow', text: 'Ejercicio' }));
    box.appendChild(el('p', { html: '<strong>' + opts.prompt + '</strong>' }));
    var optionsWrap = el('div', { class: 'quiz-options' });
    var feedback = el('div');
    var answered = false;

    opts.options.forEach(function (option, idx) {
      var btn = el('button', {
        class: 'quiz-option', type: 'button',
        onClick: function () {
          if (answered) return;
          answered = true;
          qsa('.quiz-option', optionsWrap).forEach(function (b, i2) {
            b.setAttribute('disabled', 'true');
            if (opts.options[i2].correct) b.classList.add('correct');
          });
          if (!option.correct) btn.classList.add('incorrect');
          feedback.innerHTML = '';
          var fb = el('div', {
            class: 'feedback-box ' + (option.correct ? 'good' : 'bad'),
            html: (option.correct ? '✅ ' : '❌ ') + option.explain
          });
          feedback.appendChild(fb);
          if (option.correct) { Sound.correct(); } else { Sound.incorrect(); }
          if (opts.onAnswered) opts.onAnswered(option.correct);
        }
      }, [option.label]);
      optionsWrap.appendChild(btn);
    });

    box.appendChild(optionsWrap);
    box.appendChild(feedback);
    container.appendChild(box);
  }

  // ---- Tarjeta de valores (tabla) ----
  function valueTable() {
    var rows = [
      ['Joker', '50 puntos'],
      ['Dos (2)', '20 puntos'],
      ['As', '20 puntos'],
      ['8, 9, 10, J, Q, K', '10 puntos cada una'],
      ['4, 5, 6, 7', '5 puntos cada una'],
      ['Tres negro', '5 puntos'],
      ['Tres rojo', '200 puntos (cuando corresponde positivamente)']
    ];
    var table = el('table', { class: 'value-table' });
    var thead = el('thead', {}, [el('tr', {}, [el('th', { text: 'Carta' }), el('th', { text: 'Valor' })])]);
    var tbody = el('tbody', {}, rows.map(function (r) {
      return el('tr', {}, [el('td', { text: r[0] }), el('td', { text: r[1] })]);
    }));
    table.appendChild(thead);
    table.appendChild(tbody);
    return table;
  }

  // ---- Fila de cartas de ejemplo (solo visual) ----
  function cardRow(cards, opts) {
    return el('div', { class: 'card-fan', style: 'margin:12px 0;' }, cards.map(function (c) {
      return renderCard(c, opts || {});
    }));
  }

  // ---- Diagrama de mesa (módulo 1) ----
  function tableDiagram() {
    var wrap = el('div', { class: 'table-diagram', role: 'img',
      'aria-label': 'Mesa de canasta con cuatro jugadores. Ale y Mau son pareja y se sientan uno frente al otro. TJ y Euge, o Eli y Paloma, forman la otra pareja. El turno avanza en el sentido de las manecillas del reloj.' }, [
      el('div', { class: 'turn-arrow', 'aria-hidden': 'true' }),
      el('div', { class: 'seat seat-n' }, ['Ale', el('small', { text: 'Equipo 1' })]),
      el('div', { class: 'seat seat-e' }, ['TJ / Eli', el('small', { text: 'Equipo 2' })]),
      el('div', { class: 'seat seat-s' }, ['Mau', el('small', { text: 'Equipo 1' })]),
      el('div', { class: 'seat seat-w' }, ['Euge / Paloma', el('small', { text: 'Equipo 2' })]),
      el('div', { class: 'center-label' }, ['El turno avanza alrededor de la mesa ↻'])
    ]);
    return wrap;
  }

  /* ============================================================
     10. LÓGICA COMPARTIDA: APERTURA Y PUNTUACIÓN
     ============================================================ */

  function openingRequirement(teamScore) {
    if (teamScore >= 5000) return 150;
    if (teamScore >= 2500) return 120;
    return 80;
  }

  // grupo: { rank, suitColorForThree, naturales: n, comodines: n }
  function groupTotalValue(group) {
    var naturalValue = cardValue(group.rank, group.suitColorForThree);
    var wildValue = group.wildRank === 'JOKER' ? 50 : 20; // comodines usados: doses o jokers
    return (naturalValue * group.naturales) + (wildValue * group.comodines);
  }

  function groupIsLegal(group) {
    if (group.naturales + group.comodines < 3) return { legal: false, reason: 'Un grupo necesita al menos 3 cartas para poder bajarse.' };
    if (group.comodines > 0 && group.comodines >= group.naturales) {
      return { legal: false, reason: 'Debe haber más cartas naturales que comodines.' };
    }
    return { legal: true, reason: 'Grupo legal: hay más naturales que comodines.' };
  }

  function computeOpening(teamScore, groups) {
    var requirement = openingRequirement(teamScore);
    var total = 0;
    var allLegal = true;
    var details = groups.map(function (g) {
      var legal = groupIsLegal(g);
      var val = groupTotalValue(g);
      total += val;
      if (!legal.legal) allLegal = false;
      return { group: g, value: val, legal: legal.legal, reason: legal.reason };
    });
    return {
      requirement: requirement,
      total: total,
      allLegal: allLegal,
      meetsPoints: total >= requirement,
      qualifies: allLegal && total >= requirement,
      missing: Math.max(0, requirement - total),
      details: details
    };
  }

  // Calculadora de puntuación de mano completa
  function computeScore(input) {
    var lines = [];
    var total = 0;

    function add(label, value) {
      lines.push({ label: label, value: value });
      total += value;
    }

    if (input.cerroCanasta) {
      if (input.limpias) add('Canastas limpias (' + input.limpias + ' × 500)', input.limpias * 500);
      if (input.sucias) add('Canastas sucias (' + input.sucias + ' × 300)', input.sucias * 300);
      if (input.sietes) add('Canastas de sietes (' + input.sietes + ' × 1,000)', input.sietes * 1000);
      if (input.comodinCompleta) add('Canastas de comodines completas (' + input.comodinCompleta + ' × 2,000)', input.comodinCompleta * 2000);
      if (input.comodinIncompleta) add('Canastas de comodines incompletas (' + input.comodinIncompleta + ' × −2,000)', input.comodinIncompleta * -2000);
      if (input.sieteCanastas) add('Bono: siete canastas en la mano', 1000);

      if (input.cuatroTresRojos) {
        add('Los cuatro treses rojos (bono especial)', 1600);
      } else if (input.tresRojos) {
        add('Treses rojos (' + input.tresRojos + ' × 200)', input.tresRojos * 200);
      }

      if (input.idaDescartando) add('Se fue descartando', 100);
      if (input.idaSinDescartar) add('Se fue sin descartar', 200);

      if (input.bajadas) add('Puntos de cartas bajadas', input.bajadas);
      if (input.mano) add('Puntos de cartas restantes en la mano (se restan)', -input.mano);
    } else {
      // No cerró ninguna canasta: todo lo obtenido en la mano se vuelve negativo.
      var puntosEnMano = (input.limpias || 0) * 500 + (input.sucias || 0) * 300 + (input.sietes || 0) * 1000 +
        (input.comodinCompleta || 0) * 2000 + (input.sieteCanastas ? 1000 : 0) +
        (input.idaDescartando ? 100 : 0) + (input.idaSinDescartar ? 200 : 0) + (input.bajadas || 0);
      // comodines incompletas siguen penalizando igual (ya son negativas)
      if (input.comodinIncompleta) add('Canastas de comodines incompletas (' + input.comodinIncompleta + ' × −2,000)', input.comodinIncompleta * -2000);
      if (puntosEnMano > 0) add('Puntos obtenidos en la mano (se vuelven negativos por no cerrar ninguna canasta)', -puntosEnMano);

      var manoRestante = input.mano || 0;
      var tieneTresRojo = input.cuatroTresRojos ? 4 : (input.tresRojos || 0);
      if (tieneTresRojo > 0 && manoRestante > 0) {
        add('Cartas restantes en la mano, duplicadas por tener tres(es) rojo(s) (' + manoRestante + ' × 2)', -manoRestante * 2);
      } else if (manoRestante > 0) {
        add('Cartas restantes en la mano', -manoRestante);
      }
      if (tieneTresRojo > 0) {
        add('Penalización por cada tres rojo (' + tieneTresRojo + ' × −200)', -tieneTresRojo * 200);
      }
    }

    return { lines: lines, total: total };
  }

  /* ============================================================
     11. CONTENIDO DE LOS MÓDULOS (1 a 17)
     ============================================================ */

  var MODULES = [];

  // ---------- MÓDULO 1: BIENVENIDOS A LA MESA ----------
  MODULES.push({
    id: 'm1', title: 'Bienvenidos a la mesa', subtitle: 'Cómo se sientan los equipos',
    slides: [
      textSlide('La canasta se juega en pareja', [
        'La canasta se juega entre <strong>cuatro personas</strong>, organizadas en <strong>dos equipos de dos jugadores</strong>.',
        'Los compañeros de equipo se sientan <strong>uno frente al otro</strong>, nunca uno al lado del otro.'
      ]),
      customSlide('Así se sienta la mesa', function (container) {
        var box = el('div', { class: 'card' }, [
          el('h2', { text: 'Así se sienta la mesa', style: 'font-size:1.2rem;' }),
          el('p', { html: 'En este ejemplo, <strong>Ale y Mau</strong> son pareja y se sientan uno frente al otro. La otra pareja puede ser <strong>TJ y Euge</strong>, o <strong>Eli y Paloma</strong>.' }),
          tableDiagram(),
          el('p', { class: 'muted', text: 'Los turnos avanzan alrededor de la mesa, siempre en el mismo sentido.' })
        ]);
        container.appendChild(box);
      }),
      textSlide('Lo que no se vale', [
        'Los compañeros <strong>comparten</strong> las cartas que bajan a la mesa: son del equipo, no de una sola persona.',
        'Los compañeros <strong>nunca deben decirse qué cartas tienen en la mano</strong>, ni con palabras ni con señas.',
        'El objetivo general del juego es formar grupos de cartas y completar canastas para sumar puntos.',
        'La partida termina cuando una pareja llega a <strong>7,500 puntos</strong>.'
      ]),
      customSlide('Repaso rápido', function (container) {
        buildChoiceExercise(container, {
          prompt: '¿Pueden los compañeros decirse qué cartas tienen en la mano?',
          options: [
            { label: 'Sí, si lo hacen en voz baja', correct: false, explain: 'No, nunca deben revelar sus cartas a su pareja, sin importar el volumen.' },
            { label: 'No, nunca', correct: true, explain: 'Correcto. Los compañeros nunca deben decirse qué cartas tienen.' },
            { label: 'Solo al final de la mano', correct: false, explain: 'No, la regla aplica durante toda la mano.' }
          ]
        });
      })
    ]
  });

  // ---------- MÓDULO 2: QUÉ HAY SOBRE LA MESA ----------
  MODULES.push({
    id: 'm2', title: 'Qué hay sobre la mesa', subtitle: 'El talón, el pozo y las bajadas',
    slides: [
      textSlide('Los elementos de la mesa', [
        '<strong>El talón:</strong> el mazo de cartas boca abajo del que se roba en cada turno.',
        '<strong>El pozo:</strong> la pila de cartas descartadas.',
        '<strong>La mano:</strong> las cartas que tiene cada jugador, que solo esa persona puede ver.',
        '<strong>Las bajadas:</strong> las cartas que cada equipo ha colocado sobre la mesa.',
        '<strong>Las canastas completas:</strong> bajadas que ya llegaron a siete cartas.',
        '<strong>El marcador acumulado:</strong> los puntos totales de cada pareja en la partida.'
      ]),
      textSlide('Cómo se prepara la mesa', [
        'Se reparten <strong>11 cartas</strong> a cada jugador.',
        'Para iniciar el pozo se colocan <strong>6 cartas boca abajo</strong>.',
        'La <strong>séptima carta</strong> se voltea boca arriba: esa es la carta inicial visible del pozo.'
      ]),
      customSlide('Animación: repartiendo la mesa', function (container) {
        var box = el('div', { class: 'card' }, [
          el('h2', { text: 'Así se ve el reparto', style: 'font-size:1.2rem;' }),
          el('p', { text: 'Cada jugador recibe 11 cartas boca abajo. Después, se arma el pozo: 6 cartas escondidas y 1 carta volteada encima.' })
        ]);
        var fan = el('div', { class: 'card-fan' });
        for (var i = 0; i < 6; i++) {
          var back = renderCardBack({ small: true });
          back.style.animationDelay = (i * 0.08) + 's';
          back.classList.add('deal-anim');
          fan.appendChild(back);
        }
        var top = renderCard(makeCard('7', 'corazones'), { small: true });
        top.classList.add('flip-anim');
        top.style.animationDelay = '0.6s';
        fan.appendChild(top);
        box.appendChild(fan);
        box.appendChild(el('p', { class: 'muted', text: 'Pozo: 6 cartas ocultas + 1 carta visible (en este ejemplo, un 7 de corazones).' }));
        container.appendChild(box);
      })
    ]
  });

  // ---------- MÓDULO 3: CONOCE LAS CARTAS ----------
  MODULES.push({
    id: 'm3', title: 'Conoce las cartas', subtitle: 'Naturales, comodines y valores',
    slides: [
      textSlide('Tipos de carta', [
        '<strong>Carta natural:</strong> cualquier carta que se usa por su propio valor (por ejemplo, un rey en una bajada de reyes).',
        '<strong>Comodín:</strong> una carta que puede sustituir a otra dentro de una bajada. En esta mesa, los <strong>doses</strong> y los <strong>Jokers</strong> funcionan como comodines.',
        '<strong>Joker:</strong> carta especial, siempre comodín.',
        '<strong>Dos (2):</strong> funciona como comodín.',
        '<strong>Tres rojo:</strong> carta especial de bonificación (corazones o diamantes).',
        '<strong>Tres negro:</strong> carta de valor bajo (picas o tréboles).'
      ]),
      customSlide('La regla de oro de los comodines', function (container) {
        var box = el('div', { class: 'card' }, [
          el('h2', { text: 'Más naturales que comodines', style: 'font-size:1.2rem;' }),
          el('p', { text: 'Siempre debe haber más cartas naturales que comodines dentro de una bajada o canasta.' })
        ]);
        box.appendChild(el('p', { html: '<strong>✅ Ejemplo válido:</strong> 4 naturales y 3 comodines.' }));
        box.appendChild(cardRow([makeCard('K','picas'),makeCard('K','corazones'),makeCard('K','diamantes'),makeCard('K','treboles'),makeCard('2','picas'),makeCard('2','corazones'),makeCard('JOKER')], { small: true }));
        box.appendChild(el('p', { html: '<strong>❌ Ejemplo inválido:</strong> 3 naturales y 3 comodines (cantidades iguales, no se permite).' }));
        box.appendChild(cardRow([makeCard('Q','picas'),makeCard('Q','corazones'),makeCard('Q','diamantes'),makeCard('2','picas'),makeCard('2','treboles'),makeCard('JOKER')], { small: true }));
        box.appendChild(el('p', { html: '<strong>❌ Ejemplo inválido:</strong> 2 naturales y 3 comodines (más comodines que naturales).' }));
        box.appendChild(cardRow([makeCard('9','picas'),makeCard('9','corazones'),makeCard('2','picas'),makeCard('2','treboles'),makeCard('JOKER')], { small: true }));
        container.appendChild(box);
      }),
      customSlide('Cuánto vale cada carta', function (container) {
        var box = el('div', { class: 'card' }, [
          el('h2', { text: 'Tabla de valores', style: 'font-size:1.2rem;' })
        ]);
        box.appendChild(valueTable());
        container.appendChild(box);
      }),
      customSlide('Ejercicio: empareja la carta con su valor', function (container) {
        buildMatchingExercise(container, {
          title: 'Empareja cada carta con su valor',
          left: [
            { id: 'a', label: 'Joker' },
            { id: 'b', label: 'Dos (2)' },
            { id: 'c', label: 'Rey (K)' },
            { id: 'd', label: 'Cinco (5)' },
            { id: 'e', label: 'Tres rojo' }
          ],
          right: [
            { id: 'a', label: '50 puntos' },
            { id: 'b', label: '20 puntos' },
            { id: 'c', label: '10 puntos' },
            { id: 'd', label: '5 puntos' },
            { id: 'e', label: '200 puntos' }
          ]
        });
      })
    ]
  });

  // ---------- MÓDULO 4: QUÉ SIGNIFICA BAJAR ----------
  MODULES.push({
    id: 'm4', title: 'Qué significa bajar', subtitle: 'Bajadas legales e ilegales',
    slides: [
      textSlide('Bajar cartas', [
        '<strong>Bajar</strong> significa colocar cartas sobre la mesa como parte de los juegos de tu equipo.',
        'Las bajadas se forman con <strong>cartas del mismo valor</strong> (por ejemplo, solo reyes, o solo ochos). No se mezclan valores diferentes en una misma bajada.',
        'Las cartas bajadas pertenecen <strong>al equipo</strong>, no solamente al jugador que las colocó.',
        'Cualquiera de los dos compañeros puede <strong>agregar cartas</strong> a las bajadas del equipo en turnos posteriores.',
        'Una bajada todavía <strong>no es necesariamente una canasta</strong>: se convierte en canasta cuando llega a siete cartas.'
      ]),
      customSlide('Ejemplos visuales', function (container) {
        var box = el('div', { class: 'card' }, [ el('h2', { text: 'Bajadas de ejemplo', style: 'font-size:1.2rem;' }) ]);
        box.appendChild(el('p', { html: '<strong>Bajada de 3 reyes</strong> — legal, pero aún no es canasta.' }));
        box.appendChild(cardRow([makeCard('K','picas'),makeCard('K','corazones'),makeCard('K','diamantes')], { small: true }));
        box.appendChild(el('p', { html: '<strong>5 ochos</strong> — legal, todavía no forma canasta (faltan 2 para siete).' }));
        box.appendChild(cardRow([makeCard('8','picas'),makeCard('8','corazones'),makeCard('8','diamantes'),makeCard('8','treboles'),makeCard('2','picas')], { small: true }));
        box.appendChild(el('p', { html: '<strong>7 damas</strong> — ¡esto ya es una canasta completa!' }));
        box.appendChild(cardRow([makeCard('Q','picas'),makeCard('Q','corazones'),makeCard('Q','diamantes'),makeCard('Q','treboles'),makeCard('2','corazones'),makeCard('2','diamantes'),makeCard('JOKER')], { small: true }));
        container.appendChild(box);
      }),
      customSlide('Bajadas ilegales', function (container) {
        var box = el('div', { class: 'card' }, [ el('h2', { text: 'Esto no se vale', style: 'font-size:1.2rem;' }) ]);
        box.appendChild(el('p', { html: '<strong>❌ Ilegal:</strong> mezclar valores distintos (rey, dama y diez no forman una bajada válida).' }));
        box.appendChild(cardRow([makeCard('K','picas'),makeCard('Q','corazones'),makeCard('10','diamantes')], { small: true }));
        box.appendChild(el('p', { html: '<strong>❌ Ilegal:</strong> igual número de naturales que de comodines.' }));
        box.appendChild(cardRow([makeCard('9','picas'),makeCard('9','corazones'),makeCard('9','diamantes'),makeCard('2','picas'),makeCard('2','treboles'),makeCard('JOKER')], { small: true }));
        container.appendChild(box);
      }),
      customSlide('Ejercicio: ¿válida o inválida?', function (container) {
        buildChoiceExercise(container, {
          prompt: 'Un equipo quiere bajar: 4 naturales de nueve y 2 comodines. ¿Es válida esta bajada?',
          options: [
            { label: 'Sí, es válida', correct: true, explain: 'Correcto: hay más naturales (4) que comodines (2).' },
            { label: 'No, es inválida', correct: false, explain: 'En realidad sí es válida: hay más naturales (4) que comodines (2).' }
          ]
        });
      }),
      customSlide('Otro caso', function (container) {
        buildChoiceExercise(container, {
          prompt: 'Un equipo quiere bajar: 2 naturales de siete y 2 comodines. ¿Es válida esta bajada?',
          options: [
            { label: 'Sí, es válida', correct: false, explain: 'No es válida: hay la misma cantidad de naturales que de comodines (2 y 2). Deben ser más naturales.' },
            { label: 'No, es inválida', correct: true, explain: 'Correcto: no puede haber igual o más comodines que naturales.' }
          ]
        });
      })
    ]
  });

  // ---------- MÓDULO 5: QUÉ ES UNA CANASTA ----------
  MODULES.push({
    id: 'm5', title: 'Qué es una canasta', subtitle: 'Limpias y sucias',
    slides: [
      textSlide('La canasta', [
        'Una <strong>canasta</strong> es un grupo de <strong>siete cartas</strong> del mismo valor.',
        'Una canasta puede tener <strong>más de siete cartas</strong> después de haberse cerrado (el equipo puede seguir agregando).',
        '<strong>Canasta limpia:</strong> no tiene comodines, solo cartas naturales.',
        '<strong>Canasta sucia:</strong> tiene uno o más comodines, siempre manteniendo más naturales que comodines.'
      ]),
      customSlide('Valores de las canastas', function (container) {
        var box = el('div', { class: 'card' }, [
          el('h2', { text: 'Cuánto valen', style: 'font-size:1.2rem;' }),
          el('p', { html: '<strong>Canasta limpia:</strong> 500 puntos.' }),
          el('p', { html: '<strong>Canasta sucia:</strong> 300 puntos.' })
        ]);
        box.appendChild(el('p', { html: '<strong>Canasta limpia de siete reyes:</strong>' }));
        box.appendChild(cardRow([makeCard('K','picas'),makeCard('K','corazones'),makeCard('K','diamantes'),makeCard('K','treboles'),makeCard('K','picas'),makeCard('K','corazones'),makeCard('K','diamantes')], { small: true }));
        box.appendChild(el('p', { html: '<strong>Canasta sucia</strong> (naturales + comodines, respetando la proporción):' }));
        box.appendChild(cardRow([makeCard('5','picas'),makeCard('5','corazones'),makeCard('5','diamantes'),makeCard('5','treboles'),makeCard('2','picas'),makeCard('JOKER'),makeCard('5','corazones')], { small: true }));
        box.appendChild(el('p', { html: '<strong>❌ Combinación inválida</strong> por exceso de comodines (no puede formar canasta así):' }));
        box.appendChild(cardRow([makeCard('4','picas'),makeCard('4','corazones'),makeCard('2','picas'),makeCard('2','treboles'),makeCard('JOKER'),makeCard('JOKER'),makeCard('JOKER')], { small: true }));
        container.appendChild(box);
      }),
      customSlide('Al cerrar una canasta', function (container) {
        var box = el('div', { class: 'card' }, [
          el('h2', { text: 'El momento de cerrar', style: 'font-size:1.2rem;' }),
          el('p', { text: 'Cuando se agrega la séptima carta a una bajada, esta se convierte oficialmente en canasta. ¡Es uno de los momentos más satisfactorios del juego!' })
        ]);
        var demo = cardRow([makeCard('A','picas'),makeCard('A','corazones'),makeCard('A','diamantes'),makeCard('A','treboles'),makeCard('2','picas'),makeCard('2','corazones')], { small: true });
        box.appendChild(demo);
        var btn = el('button', { class: 'btn btn-primary btn-sm', type: 'button' }, ['Agregar la séptima carta']);
        box.appendChild(btn);
        btn.addEventListener('click', function () {
          if (btn.disabled) return;
          btn.disabled = true;
          var newCard = renderCard(makeCard('A','diamantes'), { small: true, animate: true });
          demo.appendChild(newCard);
          demo.classList.add('close-basket-anim');
          Sound.basket();
          showToast('¡Canasta cerrada! 🧺');
          btn.textContent = '¡Canasta cerrada! 🧺';
        });
        container.appendChild(box);
      })
    ]
  });

  // ---------- MÓDULO 6: CÓMO TRANSCURRE UN TURNO ----------
  MODULES.push({
    id: 'm6', title: 'Cómo transcurre un turno', subtitle: 'El flujo paso a paso',
    slides: [
      customSlide('El flujo de un turno', function (container) {
        var steps = ['Tomar cartas (robar del talón o llevarse el pozo)', 'Decidir si se quiere o se puede bajar', 'Agregar cartas a las bajadas del equipo', 'Completar canastas si es posible', 'Descartar una carta (salvo que el jugador se vaya sin descartar)', 'Pasar el turno al siguiente jugador'];
        var box = el('div', { class: 'card' }, [ el('h2', { text: 'El flujo de un turno', style: 'font-size:1.2rem;' }) ]);
        var ol = el('ol', { style: 'padding-left:20px;' }, steps.map(function (s, i) { return el('li', { html: '<strong>' + (i+1) + '.</strong> ' + s, style: 'margin-bottom:8px;' }); }));
        box.appendChild(ol);
        box.appendChild(el('p', { class: 'muted', text: 'Al comenzar el turno, el jugador normalmente puede robar del mazo o llevarse el pozo, si cumple las reglas para hacerlo.' }));
        container.appendChild(box);
      }),
      customSlide('Simulación: un turno completo', function (container) {
        buildTurnSimulation(container);
      })
    ]
  });

  // ---------- MÓDULO 7: CÓMO ABRIR ----------
  MODULES.push({
    id: 'm7', title: 'Cómo abrir', subtitle: 'La apertura del equipo',
    slides: [
      textSlide('Qué significa abrir', [
        '<strong>Abrir</strong> o <strong>bajarse</strong> significa realizar la primera bajada del equipo en una mano.',
        'La cantidad mínima de puntos requerida depende del marcador acumulado por la pareja en la partida:'
      ], [
        'De 0 a menos de 2,500 puntos: se abre con un mínimo de <strong>80 puntos</strong>.',
        'De 2,500 a menos de 5,000 puntos: se abre con un mínimo de <strong>120 puntos</strong>.',
        'De 5,000 a 7,500 puntos: se abre con un mínimo de <strong>150 puntos</strong>.'
      ]),
      textSlide('Ejemplos de apertura', [
        'Tres ases valen 60 puntos: <strong>no alcanzan</strong> para abrir con 80.',
        'Dos ases y dos Jokers valen 140 puntos, pero primero hay que verificar que la combinación sea legal y tenga más naturales que comodines.',
        'Tres reyes y tres ochos valen 60 puntos: <strong>no alcanzan</strong> para 80.',
        'Se puede usar una combinación de varios grupos para alcanzar la apertura, siempre que <strong>todas</strong> las bajadas sean legales.'
      ]),
      customSlide('Calculadora de apertura (mini)', function (container) {
        buildMiniOpeningCalc(container);
      })
    ]
  });

  // ---------- MÓDULO 8: EL POZO ----------
  MODULES.push({
    id: 'm8', title: 'El pozo', subtitle: 'Cuándo se puede tomar',
    slides: [
      textSlide('Qué es el pozo', [
        'El <strong>pozo</strong> es la pila de cartas descartadas.',
        'La <strong>carta superior</strong> es la última que descartó el jugador anterior; es la única visible para tomar directamente.',
        'Llevarse el pozo puede ser muy valioso, porque permite incorporar muchas cartas a la mano de una sola vez.'
      ]),
      textSlide('Cómo se toma el pozo', [
        'Para llevarse el pozo se necesitan <strong>dos cartas naturales iguales</strong> a la carta superior del descarte.',
        'Esas dos cartas naturales deben estar en la <strong>mano</strong> del jugador.',
        '<strong>Los comodines no sustituyen</strong> las dos cartas naturales necesarias.',
        'Los <strong>treses rojos no sirven</strong> para vulnerar el pozo.',
        'El pozo solamente puede vulnerarse con dos naturales, conforme a las reglas de esta mesa.'
      ]),
      customSlide('Ejemplos interactivos', function (container) {
        var examples = [
          { top: makeCard('K','picas'), hand: [makeCard('K','corazones'), makeCard('K','diamantes')], can: true, reason: 'Sí puede tomar el pozo: tiene dos reyes naturales en la mano.' },
          { top: makeCard('8','picas'), hand: [makeCard('8','corazones'), makeCard('JOKER')], can: false, reason: 'No puede tomarlo: necesita dos ochos naturales, y solo tiene uno (el Joker no sustituye).' },
          { top: makeCard('A','diamantes'), hand: [makeCard('A','picas'), makeCard('A','treboles')], can: true, reason: 'Sí puede tomar el pozo: tiene dos ases naturales.' },
          { top: makeCard('7','corazones'), hand: [makeCard('7','picas'), makeCard('2','diamantes'), makeCard('JOKER')], can: false, reason: 'No puede tomarlo: solo tiene un siete natural; el dos y el Joker son comodines y no cuentan.' }
        ];
        examples.forEach(function (ex, idx) {
          var box = el('div', { class: 'card' }, [
            el('h2', { text: 'Ejemplo ' + (idx + 1), style: 'font-size:1.1rem;' }),
            el('p', { text: 'Carta superior del pozo:' })
          ]);
          box.appendChild(cardRow([ex.top], { small: true }));
          box.appendChild(el('p', { text: 'Cartas del jugador en la mano:' }));
          box.appendChild(cardRow(ex.hand, { small: true }));
          var feedback = el('div');
          var q = el('div', { class: 'quiz-options' });
          ['Sí, puede tomar el pozo', 'No, no puede tomar el pozo'].forEach(function (label, i) {
            var isYes = i === 0;
            var b = el('button', { class: 'quiz-option', type: 'button' }, [label]);
            b.addEventListener('click', function () {
              qsa('.quiz-option', q).forEach(function (o) { o.setAttribute('disabled', 'true'); });
              var correct = isYes === ex.can;
              b.classList.add(correct ? 'correct' : 'incorrect');
              feedback.innerHTML = '';
              feedback.appendChild(el('div', { class: 'feedback-box ' + (correct ? 'good' : 'bad'), html: (correct ? '✅ ' : '❌ ') + ex.reason }));
              correct ? Sound.correct() : Sound.incorrect();
            });
            q.appendChild(b);
          });
          box.appendChild(q);
          box.appendChild(feedback);
          container.appendChild(box);
        });
      }),
      customSlide('Minijuego: ¿Te llevarías el pozo?', function (container) {
        buildPotMinigame(container);
      })
    ]
  });

  // ---------- MÓDULO 9: CÓMO TERMINA UNA MANO ----------
  MODULES.push({
    id: 'm9', title: 'Cómo termina una mano', subtitle: 'Irse descartando o sin descartar',
    slides: [
      textSlide('Irse', [
        '<strong>Irse</strong> significa quedarse sin cartas en la mano.',
        'Para poder irse, el jugador debe terminar <strong>sin ninguna carta</strong> en la mano.',
        'Puede irse <strong>descartando</strong> su última carta.',
        'Puede irse <strong>sin descartar</strong>, si logra colocar todas sus cartas legalmente sobre la mesa.'
      ]),
      textSlide('Cuánto vale irse', [
        'Irse <strong>descartando</strong> vale <strong>100 puntos</strong>.',
        'Irse <strong>sin descartar</strong> vale <strong>200 puntos</strong>.',
        'Irse sin descartar suele ser la forma más segura de evitar que el rival aproveche el último descarte para tomar el pozo.'
      ]),
      customSlide('Comparación visual', function (container) {
        var box = el('div', { class: 'card' }, [ el('h2', { text: 'Dos formas de irse', style: 'font-size:1.2rem;' }) ]);
        var row = el('div', { style: 'display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-top:10px;' });
        row.appendChild(el('div', { class: 'card-tight', style: 'background:var(--cream-soft); border-radius:12px;' }, [
          el('p', { html: '<strong>Se va descartando</strong>' }),
          el('p', { html: 'Vale <strong>+100</strong> puntos. Deja una carta visible en el pozo, que el rival podría aprovechar si tiene el par natural.' })
        ]));
        row.appendChild(el('div', { class: 'card-tight', style: 'background:var(--cream-soft); border-radius:12px;' }, [
          el('p', { html: '<strong>Se va sin descartar</strong>' }),
          el('p', { html: 'Vale <strong>+200</strong> puntos. No deja ninguna carta expuesta: es más seguro para el equipo.' })
        ]));
        box.appendChild(row);
        container.appendChild(box);
      })
    ]
  });

  // ---------- MÓDULO 10: CANASTAS ESPECIALES ----------
  MODULES.push({
    id: 'm10', title: 'Canastas especiales', subtitle: 'Sietes, comodines y canasta de canastas',
    slides: [
      textSlide('Canasta de sietes', [
        'Vale <strong>1,000 puntos</strong>.',
        'Debe <strong>bajarse de mano</strong>: esto significa que el equipo coloca las siete cartas juntas en un solo movimiento, no poco a poco.',
        'No debe construirse gradualmente sobre la mesa como una canasta ordinaria.'
      ]),
      customSlide('Canasta de comodines', function (container) {
        var box = el('div', { class: 'card' }, [
          el('h2', { text: 'Canasta de comodines', style: 'font-size:1.2rem;' }),
          el('p', { html: 'Vale <strong>2,000 puntos</strong>. Se forma con comodines (doses y Jokers).' }),
          el('p', { html: 'Debe bajarse <strong>antes</strong> de que el equipo se lleve el pozo.' }),
          el('div', { class: 'feedback-box bad', html: '⚠️ <strong>Atención:</strong> si se inicia una canasta de comodines y no se completa, vale <strong>2,000 puntos negativos</strong>.' })
        ]);
        container.appendChild(box);
      }),
      textSlide('Canasta de canastas', [
        'Si una pareja logra <strong>siete canastas</strong> en una misma mano, obtiene <strong>1,000 puntos adicionales</strong> de bono.'
      ]),
      customSlide('Ejercicio', function (container) {
        buildChoiceExercise(container, {
          prompt: 'Un equipo empieza una canasta de comodines pero la mano termina sin completarla. ¿Qué pasa?',
          options: [
            { label: 'No pasa nada, simplemente no suma puntos', correct: false, explain: 'No es correcto: hay una penalización específica por dejarla incompleta.' },
            { label: 'Se penaliza con 2,000 puntos negativos', correct: true, explain: 'Correcto. Una canasta de comodines incompleta resta 2,000 puntos.' }
          ]
        });
      })
    ]
  });

  // ---------- MÓDULO 11: TRESES ROJOS Y NEGROS ----------
  MODULES.push({
    id: 'm11', title: 'Treses rojos y negros', subtitle: 'Bonos y penalizaciones',
    slides: [
      textSlide('El tres rojo', [
        'Vale <strong>200 puntos</strong>.',
        'Si una misma pareja obtiene <strong>los cuatro treses rojos</strong>, valen <strong>1,600 puntos en total</strong> (un bono especial, no la suma simple de 4×200).',
        'Los treses rojos <strong>no sirven</strong> para vulnerar el pozo.'
      ]),
      textSlide('Cuando el equipo no cierra ninguna canasta', [
        'Si un equipo no logra cerrar al menos una canasta durante la mano, <strong>todos sus puntos obtenidos en esa mano cuentan en negativo</strong>.',
        'Si además tiene uno o más treses rojos, los <strong>puntos de las cartas que quedaron en su mano se duplican</strong> como penalización.',
        'Cada tres rojo también <strong>resta 200 puntos</strong>.'
      ], [
        'Un tres rojo resta 200.',
        'Dos treses rojos restan 400.',
        'Tres treses rojos restan 600.',
        'Cuatro treses rojos restan 800, salvo que otra regla especial aplicable determine algo distinto.'
      ]),
      customSlide('Ejemplo obligatorio', function (container) {
        var box = el('div', { class: 'card' }, [
          el('h2', { text: 'Ejemplo paso a paso', style: 'font-size:1.2rem;' }),
          el('p', { text: 'El equipo no cerró ninguna canasta. Quedaron 90 puntos de cartas en la mano. Tiene un tres rojo.' })
        ]);
        var ul = el('ul', { style: 'padding-left:20px;' }, [
          el('li', { text: 'Los 90 puntos de la mano se duplican: −180.' }),
          el('li', { text: 'El tres rojo resta 200 adicionales.' }),
          el('li', { html: '<strong>Penalización total: −380 puntos.</strong>' })
        ]);
        box.appendChild(ul);
        container.appendChild(box);
      }),
      customSlide('El tres negro', function (container) {
        var box = el('div', { class: 'card' }, [
          el('h2', { text: 'El tres negro', style: 'font-size:1.2rem;' }),
          el('p', { html: 'Vale <strong>5 puntos</strong>. Es distinto al tres rojo: no tiene bonos ni penalizaciones especiales, se cuenta como una carta más de valor bajo.' })
        ]);
        box.appendChild(valueTable());
        container.appendChild(box);
      })
    ]
  });

  // ---------- MÓDULO 12: QUÉ PASA SI NO CIERRAS UNA CANASTA ----------
  MODULES.push({
    id: 'm12', title: 'Si no cierras canasta', subtitle: 'La regla que más se olvida',
    slides: [
      textSlide('La regla clave', [
        'Si una pareja no logra cerrar <strong>ninguna canasta</strong> durante una mano, <strong>todos los puntos que haya obtenido en esa mano cuentan en negativo</strong>.',
        'Las cartas que quedaron en la mano también se restan.',
        'Si la pareja tiene al menos un tres rojo, la penalización de las cartas restantes en la mano se <strong>duplica</strong>.',
        'Cada tres rojo resta además <strong>200 puntos</strong>.'
      ]),
      customSlide('Ejemplo sin tres rojo', function (container) {
        var box = el('div', { class: 'card' }, [ el('h2', { text: 'Ejemplo sin tres rojo', style: 'font-size:1.2rem;' }) ]);
        box.appendChild(ulNode(['Puntos bajados: 350.', 'Puntos en la mano: 70.', 'Ninguna canasta cerrada.', 'Sin tres rojo.']));
        box.appendChild(el('p', { html: '<strong>Resultado: −420.</strong>' }));
        container.appendChild(box);
      }),
      customSlide('Ejemplo con tres rojo', function (container) {
        var box = el('div', { class: 'card' }, [ el('h2', { text: 'Ejemplo con tres rojo', style: 'font-size:1.2rem;' }) ]);
        box.appendChild(ulNode(['Puntos bajados: 350 → −350.', 'Cartas en mano duplicadas: 70 × 2 → −140.', 'Tres rojo: −200.']));
        box.appendChild(el('p', { html: '<strong>Resultado: −690.</strong>' }));
        container.appendChild(box);
      }),
      customSlide('Calculadora (mini)', function (container) {
        var box = el('div', { class: 'card' }, [
          el('h2', { text: 'Prueba tú mismo', style: 'font-size:1.2rem;' }),
          el('p', { class: 'muted', text: 'Para casos completos con canastas cerradas, usa la Calculadora de puntuación desde el menú. Aquí puedes probar rápido el caso de "no cerró ninguna canasta".' })
        ]);
        var bajadasInput = el('input', { type: 'number', min: '0', value: '350', class: 'field', style: 'width:100%; padding:10px; border-radius:8px; border:1px solid #d3c8ab; margin-bottom:8px;' });
        var manoInput = el('input', { type: 'number', min: '0', value: '70', class: 'field', style: 'width:100%; padding:10px; border-radius:8px; border:1px solid #d3c8ab; margin-bottom:8px;' });
        var tresRojoCheck = el('input', { type: 'checkbox', id: 'm12-tr' });
        box.appendChild(el('label', { text: 'Puntos bajados' }));
        box.appendChild(bajadasInput);
        box.appendChild(el('label', { text: 'Puntos en la mano' }));
        box.appendChild(manoInput);
        var checkRow = el('div', { class: 'checkbox-row' }, [tresRojoCheck, el('label', { for: 'm12-tr', text: 'Tiene un tres rojo' })]);
        box.appendChild(checkRow);
        var resultBox = el('div', { style: 'margin-top:10px;' });
        var btn = el('button', { class: 'btn btn-primary btn-sm', type: 'button' }, ['Calcular']);
        btn.addEventListener('click', function () {
          var bajadas = parseFloat(bajadasInput.value) || 0;
          var mano = parseFloat(manoInput.value) || 0;
          var tr = tresRojoCheck.checked;
          var manoLine = tr ? mano * 2 : mano;
          var tresLine = tr ? 200 : 0;
          var total = -bajadas - manoLine - tresLine;
          resultBox.innerHTML = '';
          resultBox.appendChild(el('div', { class: 'feedback-box bad', html:
            'Puntos bajados: −' + bajadas + '<br>' +
            'Cartas en mano' + (tr ? ' (duplicadas)' : '') + ': −' + manoLine + '<br>' +
            (tr ? 'Tres rojo: −200<br>' : '') +
            '<strong>Total: ' + formatPoints(total) + '</strong>'
          }));
          Sound.click();
        });
        box.appendChild(btn);
        box.appendChild(resultBox);
        container.appendChild(box);
      })
    ]
  });

  // ---------- MÓDULO 13: UNA MANO COMPLETA PASO A PASO ----------
  MODULES.push({
    id: 'm13', title: 'Una mano completa', subtitle: 'Simulación guiada paso a paso',
    slides: [
      customSlide('Simulación de una mano', function (container) {
        buildFullHandSimulation(container);
      })
    ]
  });

  // ---------- MÓDULO 14: ESTRATEGIA BÁSICA ----------
  MODULES.push({
    id: 'm14', title: 'Estrategia básica', subtitle: 'Consejos para principiantes',
    slides: [
      customSlide('Consejos de Ale', function (container) {
        var box = el('div', { class: 'card' }, [ el('h2', { text: '💛 Consejo de Ale', style: 'font-size:1.2rem;' }) ]);
        box.appendChild(ulNode([
          'Observa qué cartas descartan los rivales: te dan pistas sobre lo que necesitan.',
          'No regales fácilmente una carta que le permita al rival tomar el pozo.',
          'Guarda pares naturales que puedan servirte para tomar el pozo más adelante.',
          'Recuerda siempre: debe haber más naturales que comodines.'
        ]));
        container.appendChild(box);
      }),
      customSlide('Consejos de Mau', function (container) {
        var box = el('div', { class: 'card' }, [ el('h2', { text: '🖤 Consejo de Mau', style: 'font-size:1.2rem;' }) ]);
        box.appendChild(ulNode([
          'No uses comodines sin pensar; guárdalos para cuando realmente los necesites.',
          'Coordínate con tu pareja a través de las bajadas visibles sobre la mesa, sin revelar tus cartas.',
          'Vigila cuántas cartas tiene cada rival: si tiene pocas, piensa bien antes de descartar.',
          'No inicies una canasta de comodines si no tienes buenas probabilidades de completarla.',
          'Irse sin descartar puede ser muy valioso para tu equipo.'
        ]));
        container.appendChild(box);
      }),
      textSlide('Lo más importante', [
        'No te obsesiones con la estrategia: el objetivo principal siempre será <strong>convivir</strong>.'
      ])
    ]
  });

  // ---------- MÓDULO 15: ERRORES FRECUENTES ----------
  MODULES.push({
    id: 'm15', title: 'Errores frecuentes', subtitle: 'Los más comunes de los principiantes',
    slides: (function () {
      var errores = [
        'Confundir una bajada con una canasta.',
        'Creer que una canasta tiene menos de siete cartas.',
        'Mezclar valores diferentes en una misma bajada.',
        'Usar demasiados comodines en una bajada.',
        'Intentar tomar el pozo con una natural y un comodín.',
        'Olvidar el mínimo de puntos requerido para abrir.',
        'Confundir el tres rojo con el tres negro.',
        'Pensar que basta con descartar para irse.',
        'Olvidar que hay que quedarse sin ninguna carta para irse.',
        'Iniciar una canasta de comodines sin considerar la penalización de dejarla incompleta.',
        'Olvidar que no cerrar ninguna canasta vuelve negativos todos los puntos de la mano.',
        'Regalar una carta que le permite al rival tomar el pozo.'
      ];
      var listSlide = customSlide('Doce errores comunes', function (container) {
        var box = el('div', { class: 'card' }, [ el('h2', { text: 'Cuidado con estos errores', style: 'font-size:1.2rem;' }) ]);
        var ol = el('ol', { style: 'padding-left:20px;' }, errores.map(function (e) { return el('li', { text: e, style: 'margin-bottom:6px;' }); }));
        box.appendChild(ol);
        container.appendChild(box);
      });
      var tfSlide1 = customSlide('Verdadero o falso', function (container) {
        buildChoiceExercise(container, {
          prompt: '"Para irse, basta con descartar la última carta aunque todavía tengas otras en la mano." ¿Verdadero o falso?',
          options: [
            { label: 'Verdadero', correct: false, explain: 'Falso: para irse debes quedarte sin ninguna carta en la mano, no solo descartar una.' },
            { label: 'Falso', correct: true, explain: 'Correcto: irse significa quedarse sin ninguna carta en la mano.' }
          ]
        });
      });
      var tfSlide2 = customSlide('Verdadero o falso', function (container) {
        buildChoiceExercise(container, {
          prompt: '"Si mi equipo no cierra ninguna canasta en la mano, igual sumamos los puntos que bajamos." ¿Verdadero o falso?',
          options: [
            { label: 'Verdadero', correct: false, explain: 'Falso: si no cierran ninguna canasta, todos los puntos obtenidos en la mano cuentan en negativo.' },
            { label: 'Falso', correct: true, explain: 'Correcto: sin ninguna canasta cerrada, los puntos se vuelven negativos.' }
          ]
        });
      });
      return [listSlide, tfSlide1, tfSlide2];
    })()
  });

  // ---------- MÓDULO 16: EXAMEN FINAL ----------
  MODULES.push({
    id: 'm16', title: 'Examen final', subtitle: 'Demuestra lo que aprendiste',
    slides: [
      customSlide('Es hora del examen', function (container) {
        var box = el('div', { class: 'card' }, [
          el('h2', { text: '🎓 Examen final', style: 'font-size:1.2rem;' }),
          el('p', { text: 'El examen combina opción múltiple, verdadero o falso, selección de cartas, decisiones sobre el pozo, cálculos de apertura y de puntuación.' }),
          el('p', { text: 'Necesitas al menos 80% para aprobar. Puedes repetirlo las veces que quieras y tu mejor resultado se guarda automáticamente.' })
        ]);
        var btn = el('button', { class: 'btn btn-primary', type: 'button' }, ['Ir al examen']);
        btn.addEventListener('click', function () { showScreen('screen-exam'); resetExamIntro(); });
        box.appendChild(btn);
        container.appendChild(box);
      })
    ]
  });

  // ---------- MÓDULO 17: CERTIFICADO ----------
  MODULES.push({
    id: 'm17', title: 'Certificado', subtitle: 'Tu diploma de la escuela',
    slides: [
      customSlide('Tu certificado', function (container) {
        var box = el('div', { class: 'card' }, [
          el('h2', { text: '🏅 Certificado oficial', style: 'font-size:1.2rem;' }),
          el('p', { text: 'Cuando apruebes el examen final, se desbloqueará un certificado personalizado con tu nombre, listo para imprimir o guardar como PDF.' })
        ]);
        var btn = el('button', { class: 'btn btn-primary', type: 'button' }, ['Ver mi certificado']);
        btn.addEventListener('click', openCertificate);
        box.appendChild(btn);
        container.appendChild(box);
      })
    ]
  });

  /* ============================================================
     12. EJERCICIOS INTERACTIVOS AVANZADOS
     ============================================================ */

  // ---- Emparejar (módulo 3) ----
  function buildMatchingExercise(container, opts) {
    var box = el('div', { class: 'card' }, [
      el('h2', { text: opts.title, style: 'font-size:1.2rem;' })
    ]);
    var grid = el('div', { class: 'match-grid' });
    var leftCol = el('div', { class: 'stack' });
    var rightCol = el('div', { class: 'stack' });
    var selectedLeft = null, selectedRight = null;
    var matched = {};
    var rightShuffled = opts.right.slice().sort(function () { return Math.random() - 0.5; });
    var feedback = el('p', { class: 'muted' }, ['Toca una carta y después su valor.']);

    function checkMatch() {
      if (selectedLeft == null || selectedRight == null) return;
      var leftBtn = selectedLeft, rightBtn = selectedRight;
      var isMatch = leftBtn.getAttribute('data-id') === rightBtn.getAttribute('data-id');
      if (isMatch) {
        leftBtn.classList.add('matched'); rightBtn.classList.add('matched');
        leftBtn.classList.remove('selected'); rightBtn.classList.remove('selected');
        leftBtn.setAttribute('disabled', 'true'); rightBtn.setAttribute('disabled', 'true');
        matched[leftBtn.getAttribute('data-id')] = true;
        Sound.correct();
        feedback.textContent = '¡Correcto!';
        if (Object.keys(matched).length === opts.left.length) {
          feedback.textContent = '¡Completaste todas las parejas! 🎉';
        }
      } else {
        Sound.incorrect();
        leftBtn.classList.add('pulse-bad'); rightBtn.classList.add('pulse-bad');
        feedback.textContent = 'Esa combinación no es correcta, intenta de nuevo.';
        setTimeout(function () {
          leftBtn.classList.remove('selected', 'pulse-bad');
          rightBtn.classList.remove('selected', 'pulse-bad');
        }, 500);
      }
      selectedLeft = null; selectedRight = null;
    }

    opts.left.forEach(function (item) {
      var b = el('button', { class: 'match-item', type: 'button', 'data-id': item.id }, [item.label]);
      b.addEventListener('click', function () {
        if (b.hasAttribute('disabled')) return;
        qsa('.match-item', leftCol).forEach(function (o) { o.classList.remove('selected'); });
        b.classList.add('selected');
        selectedLeft = b;
        checkMatch();
      });
      leftCol.appendChild(b);
    });
    rightShuffled.forEach(function (item) {
      var b = el('button', { class: 'match-item', type: 'button', 'data-id': item.id }, [item.label]);
      b.addEventListener('click', function () {
        if (b.hasAttribute('disabled')) return;
        qsa('.match-item', rightCol).forEach(function (o) { o.classList.remove('selected'); });
        b.classList.add('selected');
        selectedRight = b;
        checkMatch();
      });
      rightCol.appendChild(b);
    });

    grid.appendChild(leftCol);
    grid.appendChild(rightCol);
    box.appendChild(grid);
    box.appendChild(feedback);
    container.appendChild(box);
  }

  // ---- Simulación de un turno (módulo 6) ----
  function buildTurnSimulation(container) {
    var steps = [
      { title: 'Roba del talón', body: 'El jugador toma una carta del mazo para tener 12 cartas en la mano.', legal: 'Robar del talón siempre es una opción válida al iniciar el turno.' },
      { title: 'Examina su mano', body: 'Revisa qué grupos puede formar o completar con su equipo.', legal: 'Pensar antes de actuar nunca es ilegal, ¡y siempre es buena idea!' },
      { title: 'Baja tres reyes', body: 'Coloca tres reyes naturales sobre la mesa como parte de las bajadas de su equipo.', legal: 'Es legal porque son tres cartas del mismo valor, todas naturales.' },
      { title: 'Agrega un siete a una bajada de su equipo', body: 'Su pareja ya había bajado sietes antes; el jugador agrega uno más a esa misma bajada.', legal: 'Es legal: cualquier compañero puede agregar cartas a las bajadas de su equipo.' },
      { title: 'Descarta un nueve', body: 'Termina su turno descartando una carta que no necesita.', legal: 'Es obligatorio descartar al final del turno, salvo que el jugador se haya ido sin descartar.' },
      { title: 'Termina su turno', body: 'El turno pasa al siguiente jugador, siguiendo el sentido de la mesa.', legal: 'Así continúa el juego, jugador por jugador, alrededor de la mesa.' }
    ];
    var idx = 0;
    var box = el('div', { class: 'card' });
    var content = el('div');
    var dots = el('div', { class: 'exam-progress-dots' });
    steps.forEach(function () { dots.appendChild(el('span')); });
    var nextBtn = el('button', { class: 'btn btn-primary btn-sm', type: 'button' }, ['Siguiente paso ▶']);

    function render() {
      content.innerHTML = '';
      content.appendChild(el('p', { class: 'eyebrow', text: 'Paso ' + (idx + 1) + ' de ' + steps.length }));
      content.appendChild(el('h3', { text: steps[idx].title, style: 'font-size:1.05rem; color:var(--ink);' }));
      content.appendChild(el('p', { text: steps[idx].body }));
      content.appendChild(el('div', { class: 'feedback-box good', html: '✅ ' + steps[idx].legal }));
      qsa('span', dots).forEach(function (d, i) { d.classList.toggle('answered', i < idx); d.classList.toggle('current', i === idx); });
      nextBtn.textContent = idx === steps.length - 1 ? 'Reiniciar simulación ↺' : 'Siguiente paso ▶';
    }

    nextBtn.addEventListener('click', function () {
      Sound.click();
      if (idx === steps.length - 1) { idx = 0; } else { idx++; }
      render();
    });

    box.appendChild(el('h2', { text: 'Simulación: un turno completo', style: 'font-size:1.2rem;' }));
    box.appendChild(dots);
    box.appendChild(content);
    box.appendChild(nextBtn);
    container.appendChild(box);
    render();
  }

  // ---- Mini calculadora de apertura (módulo 7) ----
  function buildMiniOpeningCalc(container) {
    var box = el('div', { class: 'card' }, [ el('h2', { text: 'Calculadora de apertura', style: 'font-size:1.2rem;' }) ]);
    box.appendChild(el('p', { class: 'muted', text: 'Elige el marcador de tu pareja y prueba con grupos de ejemplo.' }));
    var select = el('select', { style: 'width:100%; padding:10px; border-radius:8px; border:1px solid #d3c8ab; margin-bottom:10px;' }, [
      el('option', { value: '0', text: '0 a menos de 2,500 (necesita 80)' }),
      el('option', { value: '2500', text: '2,500 a menos de 5,000 (necesita 120)' }),
      el('option', { value: '5000', text: '5,000 a 7,500 (necesita 150)' })
    ]);
    box.appendChild(select);

    var presets = [
      { label: '3 ases (naturales)', groups: [{ rank: 'A', naturales: 3, comodines: 0, wildRank: '2' }] },
      { label: '2 ases + 2 Jokers', groups: [{ rank: 'A', naturales: 2, comodines: 2, wildRank: 'JOKER' }] },
      { label: '3 reyes + 3 ochos', groups: [{ rank: 'K', naturales: 3, comodines: 0, wildRank: '2' }, { rank: '8', naturales: 3, comodines: 0, wildRank: '2' }] }
    ];
    var presetWrap = el('div', { class: 'btn-row', style: 'margin-bottom:10px;' });
    var resultBox = el('div');

    function calcAndShow(groups) {
      var teamScore = parseInt(select.value, 10);
      var res = computeOpening(teamScore, groups);
      resultBox.innerHTML = '';
      resultBox.appendChild(el('p', { html: 'Necesitas: <strong>' + res.requirement + '</strong> · Sumas: <strong>' + res.total + '</strong> · Te falta: <strong>' + res.missing + '</strong>' }));
      resultBox.appendChild(el('div', { class: 'feedback-box ' + (res.qualifies ? 'good' : 'bad'), html: res.qualifies ? '✅ ¡Sí alcanza para abrir!' : '❌ No alcanza para abrir todavía.' }));
      Sound.click();
    }

    presets.forEach(function (p) {
      var b = el('button', { class: 'btn btn-secondary btn-sm', type: 'button' }, [p.label]);
      b.addEventListener('click', function () { calcAndShow(p.groups); });
      presetWrap.appendChild(b);
    });
    select.addEventListener('change', function () {
      calcAndShow(presets[0].groups);
    });

    box.appendChild(presetWrap);
    box.appendChild(resultBox);
    container.appendChild(box);
    calcAndShow(presets[0].groups);
  }

  // ---- Minijuego "¿Te llevarías el pozo?" (módulo 8) ----
  function buildPotMinigame(container) {
    var rounds = [
      { top: makeCard('10','picas'), hand: [makeCard('10','corazones'), makeCard('10','diamantes')], can: true },
      { top: makeCard('Q','treboles'), hand: [makeCard('Q','picas'), makeCard('2','corazones')], can: false },
      { top: makeCard('6','corazones'), hand: [makeCard('6','picas'), makeCard('6','diamantes'), makeCard('JOKER')], can: true },
      { top: makeCard('3','treboles'), hand: [makeCard('3','picas'), makeCard('2','diamantes')], can: false },
      { top: makeCard('J','diamantes'), hand: [makeCard('J','picas'), makeCard('J','corazones')], can: true }
    ];
    var idx = 0, score = 0;
    var box = el('div', { class: 'card' }, [ el('h2', { text: '¿Te llevarías el pozo?', style: 'font-size:1.2rem;' }) ]);
    var content = el('div');
    container.appendChild(box);
    box.appendChild(content);

    function render() {
      content.innerHTML = '';
      if (idx >= rounds.length) {
        content.appendChild(el('div', { class: 'feedback-box good', html: '🎉 Terminaste el minijuego con <strong>' + score + '/' + rounds.length + '</strong> aciertos.' }));
        var again = el('button', { class: 'btn btn-secondary btn-sm', type: 'button' }, ['Jugar de nuevo']);
        again.addEventListener('click', function () { idx = 0; score = 0; render(); });
        content.appendChild(again);
        return;
      }
      var round = rounds[idx];
      content.appendChild(el('p', { class: 'muted', text: 'Ronda ' + (idx + 1) + ' de ' + rounds.length + ' · Aciertos: ' + score }));
      content.appendChild(el('p', { text: 'Carta superior del pozo:' }));
      content.appendChild(cardRow([round.top], { small: true }));
      content.appendChild(el('p', { text: 'Tu mano:' }));
      content.appendChild(cardRow(round.hand, { small: true }));
      var q = el('div', { class: 'quiz-options' });
      var feedback = el('div');
      ['Me lo llevo', 'No lo tomo'].forEach(function (label, i) {
        var isYes = i === 0;
        var b = el('button', { class: 'quiz-option', type: 'button' }, [label]);
        b.addEventListener('click', function () {
          qsa('.quiz-option', q).forEach(function (o) { o.setAttribute('disabled', 'true'); });
          var correct = isYes === round.can;
          b.classList.add(correct ? 'correct' : 'incorrect');
          if (correct) { score++; Sound.correct(); } else { Sound.incorrect(); }
          feedback.appendChild(el('div', { class: 'feedback-box ' + (correct ? 'good' : 'bad'), html: correct ? '✅ ¡Exacto!' : ('❌ Lo correcto era: ' + (round.can ? '"Me lo llevo"' : '"No lo tomo"') + '.') }));
          var nextBtn = el('button', { class: 'btn btn-primary btn-sm', type: 'button', style: 'margin-top:10px;' }, ['Siguiente ▶']);
          nextBtn.addEventListener('click', function () { idx++; render(); });
          content.appendChild(nextBtn);
        });
        q.appendChild(b);
      });
      content.appendChild(q);
      content.appendChild(feedback);
    }
    render();
  }

  // ---- Simulación completa de una mano (módulo 13) ----
  function buildFullHandSimulation(container) {
    var steps = [
      { t: 'Preparación de la mesa', b: 'Se sientan las dos parejas, una frente a otra. La mesa está lista para repartir.', why: 'Así se define desde el inicio quién juega con quién.', illegal: '' },
      { t: 'Reparto de 11 cartas', b: 'Cada jugador recibe 11 cartas boca abajo, una por una, en el sentido de la mesa.', why: 'Todos empiezan con la misma cantidad de cartas: es justo para los cuatro.', illegal: 'Sería ilegal repartir cantidades distintas a cada jugador.' },
      { t: 'Formación del pozo', b: 'Se colocan 6 cartas boca abajo y se voltea una séptima: esa es la carta inicial visible del pozo.', why: 'El pozo necesita una carta visible desde el principio para que el juego pueda avanzar.', illegal: '' },
      { t: 'Primer turno', b: 'El primer jugador comienza. Le toca decidir si roba del talón o si puede tomar el pozo.', why: 'Todo turno empieza con esta misma decisión.', illegal: '' },
      { t: 'Robo del talón', b: 'El jugador decide robar una carta del mazo, ya que no tiene pareja natural para tomar el pozo.', why: 'Robar del talón siempre está disponible como opción segura.', illegal: '' },
      { t: 'Una bajada inicial', b: 'El jugador tiene tres reyes naturales en la mano, pero su equipo todavía no ha abierto en esta mano, así que no puede bajarlos todavía por separado.', why: 'Antes de bajar cualquier cosa, el equipo debe cumplir su apertura.', illegal: 'Bajar cartas sueltas antes de completar la apertura sería ilegal.' },
      { t: 'Una apertura que alcanza los puntos requeridos', b: 'El equipo suma sus tres reyes (30) más dos ases y dos Jokers (140): total 170 puntos, superando el mínimo de 80 requerido.', why: 'La combinación es legal (más naturales que comodines en cada grupo) y supera el mínimo necesario.', illegal: 'Si hubiera usado igual número de comodines que naturales en un grupo, la apertura sería inválida.' },
      { t: 'Un jugador agrega a la bajada de su compañero', b: 'En un turno posterior, el compañero agrega un tercer as natural a la bajada de ases ya abierta.', why: 'Cualquier integrante del equipo puede sumar cartas a una bajada ya existente de su equipo.', illegal: '' },
      { t: 'Intento de tomar el pozo', b: 'Un jugador tiene dos ochos naturales en la mano y la carta superior del pozo es un ocho: sí puede tomarlo.', why: 'Cumple la regla de las dos cartas naturales iguales a la carta superior.', illegal: 'Si solo tuviera un ocho natural y un comodín, no podría tomarlo.' },
      { t: 'Una canasta se completa', b: 'Con las cartas del pozo recién tomado, el equipo llega a siete reyes: ¡canasta cerrada!', why: 'Al llegar a siete cartas del mismo valor, la bajada se convierte oficialmente en canasta.', illegal: '' },
      { t: 'Un descarte', b: 'El jugador termina su turno descartando una carta que no le sirve.', why: 'El descarte es obligatorio al final del turno, salvo que el jugador se vaya sin descartar.', illegal: '' },
      { t: 'Un jugador se queda sin cartas', b: 'En un turno posterior, un jugador coloca su última carta en una bajada de su equipo y se queda sin cartas: se fue sin descartar.', why: 'Irse sin descartar vale 200 puntos y es más seguro para el equipo.', illegal: '' },
      { t: 'Fin de la mano', b: 'En cuanto un jugador se queda sin cartas, la mano termina para todos, incluso si el resto todavía tenía cartas en la mano.', why: 'Así se cierra la mano y se procede a contar los puntos.', illegal: '' },
      { t: 'Conteo de puntos', b: 'Se suman las canastas cerradas, los treses rojos, la ida sin descartar, y se restan las cartas que quedaron en la mano de los otros jugadores.', why: 'Este conteo determina cuántos puntos suma cada pareja al marcador de la partida.', illegal: '' }
    ];
    var idx = 0;
    var box = el('div', { class: 'card' }, [ el('h2', { text: 'Una mano completa, paso a paso', style: 'font-size:1.2rem;' }) ]);
    var track = el('div', { class: 'progress-track', style: 'margin-bottom:6px;' });
    var fill = el('div', { class: 'progress-fill' });
    track.appendChild(fill);
    var label = el('p', { class: 'muted' });
    var content = el('div');
    var btnRow = el('div', { class: 'btn-row' });
    var nextBtn = el('button', { class: 'btn btn-primary btn-sm', type: 'button' }, ['Siguiente jugada ▶']);
    var prevBtn = el('button', { class: 'btn btn-ghost btn-sm', type: 'button' }, ['◀ Anterior']);

    function render() {
      fill.style.width = Math.round(((idx + 1) / steps.length) * 100) + '%';
      label.textContent = 'Jugada ' + (idx + 1) + ' de ' + steps.length;
      var s = steps[idx];
      content.innerHTML = '';
      content.appendChild(el('h3', { text: s.t, style: 'font-size:1.05rem; color:var(--ink);' }));
      content.appendChild(el('p', { text: s.b }));
      content.appendChild(el('div', { class: 'feedback-box good', html: '<strong>¿Por qué fue legal?</strong> ' + s.why }));
      if (s.illegal) content.appendChild(el('div', { class: 'feedback-box bad', html: '<strong>Esto hubiera sido ilegal:</strong> ' + s.illegal }));
      prevBtn.disabled = idx === 0;
      nextBtn.textContent = idx === steps.length - 1 ? 'Reiniciar simulación ↺' : 'Siguiente jugada ▶';
    }
    nextBtn.addEventListener('click', function () {
      Sound.click();
      if (idx === steps.length - 1) idx = 0; else idx++;
      render();
    });
    prevBtn.addEventListener('click', function () { if (idx > 0) { idx--; render(); } });

    btnRow.appendChild(prevBtn);
    btnRow.appendChild(nextBtn);
    box.appendChild(track);
    box.appendChild(label);
    box.appendChild(content);
    box.appendChild(btnRow);
    container.appendChild(box);
    render();
  }

  /* ============================================================
     13. MOTOR DE RENDERIZADO DE MÓDULOS
     ============================================================ */

  var currentModuleIndex = 0;
  var currentSlideIndex = 0;

  function openModule(moduleId) {
    var idx = MODULES.findIndex(function (m) { return m.id === moduleId; });
    if (idx === -1) idx = 0;
    currentModuleIndex = idx;
    currentSlideIndex = 0;
    state.lastModuleVisited = moduleId;
    saveState();
    renderModuleSlide();
    showScreen('screen-module');
  }

  function renderModuleSlide() {
    var mod = MODULES[currentModuleIndex];
    var slide = mod.slides[currentSlideIndex];
    $('module-title-h').textContent = mod.title;
    $('module-name-label').textContent = 'Módulo ' + (currentModuleIndex + 1) + ' de ' + MODULES.length;
    $('module-slide-label').textContent = 'Pantalla ' + (currentSlideIndex + 1) + ' de ' + mod.slides.length;
    var pct = Math.round(((currentSlideIndex + 1) / mod.slides.length) * 100);
    $('progress-fill-module').style.width = pct + '%';

    var content = $('module-slide-content');
    content.innerHTML = '';
    slide.render(content);

    var isFirst = currentModuleIndex === 0 && currentSlideIndex === 0;
    var isVeryLast = currentModuleIndex === MODULES.length - 1 && currentSlideIndex === mod.slides.length - 1;
    $('btn-slide-prev').disabled = isFirst;
    $('btn-slide-next').textContent = isVeryLast ? 'Finalizar módulo ✓' : 'Siguiente ▶';
  }

  function goToNextSlide() {
    var mod = MODULES[currentModuleIndex];
    if (currentSlideIndex < mod.slides.length - 1) {
      currentSlideIndex++;
      renderModuleSlide();
    } else {
      markModuleComplete(mod.id);
      showToast('¡Módulo completado! 🎉');
      if (currentModuleIndex < MODULES.length - 1) {
        currentModuleIndex++;
        currentSlideIndex = 0;
        renderModuleSlide();
      } else {
        renderMenu();
        showScreen('screen-menu');
      }
    }
  }

  function goToPrevSlide() {
    if (currentSlideIndex > 0) {
      currentSlideIndex--;
      renderModuleSlide();
    } else if (currentModuleIndex > 0) {
      currentModuleIndex--;
      currentSlideIndex = MODULES[currentModuleIndex].slides.length - 1;
      renderModuleSlide();
    }
  }

  function initModuleNav() {
    $('btn-slide-next').addEventListener('click', goToNextSlide);
    $('btn-slide-prev').addEventListener('click', goToPrevSlide);
  }

  /* ============================================================
     14. CONSULTA RÁPIDA: "ESTAMOS JUGANDO"
     ============================================================ */

  var QUICKREF = [
    { q: '¿Cuánto necesitamos para abrir?', a: 'Depende del marcador acumulado de tu pareja: 80 puntos si tienen de 0 a menos de 2,500; 120 puntos de 2,500 a menos de 5,000; y 150 puntos de 5,000 a 7,500.' },
    { q: '¿Cuántas cartas se reparten?', a: 'Se reparten 11 cartas a cada jugador. Para el pozo se colocan 6 cartas boca abajo y una séptima se voltea boca arriba.' },
    { q: '¿Cómo se toma el pozo?', a: 'Necesitas dos cartas naturales iguales a la carta superior del pozo, ambas en tu mano. Los comodines y los treses rojos no sirven para esto.' },
    { q: '¿Cuántas naturales necesito para tomar el pozo?', a: 'Dos cartas naturales iguales a la carta superior visible del pozo.' },
    { q: '¿Cuántos comodines puedo usar en una bajada?', a: 'Los que quieras, siempre y cuando haya más cartas naturales que comodines en esa bajada.' },
    { q: '¿Cuánto vale una canasta limpia?', a: 'Una canasta limpia (sin comodines) vale 500 puntos.' },
    { q: '¿Cuánto vale una canasta sucia?', a: 'Una canasta sucia (con uno o más comodines) vale 300 puntos.' },
    { q: '¿Cuánto vale irse?', a: 'Irse descartando vale 100 puntos. Irse sin descartar vale 200 puntos.' },
    { q: '¿Qué pasa si no cerramos ninguna canasta?', a: 'Todos los puntos obtenidos en la mano cuentan en negativo, y las cartas que quedaron en la mano también se restan. Si tienen tres rojo, esas cartas restantes se duplican y cada tres rojo resta 200 puntos adicionales.' },
    { q: '¿Cuánto valen los treses rojos?', a: 'Cada tres rojo vale 200 puntos. Si una pareja obtiene los cuatro, valen 1,600 puntos en total.' },
    { q: '¿Cuánto vale la canasta de sietes?', a: '1,000 puntos. Debe bajarse de mano, no construirse poco a poco.' },
    { q: '¿Cuánto vale la canasta de comodines?', a: '2,000 puntos si se completa. Si se inicia y no se completa, resta 2,000 puntos.' },
    { q: '¿Cuánto vale la canasta de canastas?', a: 'Si una pareja logra siete canastas en una misma mano, obtiene 1,000 puntos adicionales.' },
    { q: '¿Cuánto vale cada carta?', a: 'Joker: 50. Dos: 20. As: 20. 8, 9, 10, J, Q, K: 10 cada una. 4, 5, 6, 7: 5 cada una. Tres negro: 5. Tres rojo: 200 (cuando corresponde positivamente).' }
  ];

  function renderQuickRef(filterText) {
    var wrap = $('quickref-accordion');
    wrap.innerHTML = '';
    var term = (filterText || '').toLowerCase().trim();
    var results = QUICKREF.filter(function (item) {
      return !term || item.q.toLowerCase().indexOf(term) !== -1 || item.a.toLowerCase().indexOf(term) !== -1;
    });
    $('quickref-empty').style.display = results.length ? 'none' : 'block';
    results.forEach(function (item, idx) {
      var itemEl = el('div', { class: 'accordion-item' });
      var btn = el('button', { class: 'accordion-btn', type: 'button', 'aria-expanded': 'false', id: 'qr-btn-' + idx }, [
        el('span', { text: item.q }),
        el('span', { class: 'chevron', 'aria-hidden': 'true', text: '▾' })
      ]);
      var panel = el('div', { class: 'accordion-panel', role: 'region', 'aria-labelledby': 'qr-btn-' + idx }, [
        el('div', { class: 'accordion-panel-inner' }, [el('p', { text: item.a, style: 'margin:0;' })])
      ]);
      btn.addEventListener('click', function () {
        var isOpen = itemEl.classList.toggle('open');
        btn.setAttribute('aria-expanded', String(isOpen));
        Sound.click();
      });
      itemEl.appendChild(btn);
      itemEl.appendChild(panel);
      wrap.appendChild(itemEl);
    });
  }

  function openQuickRef() {
    renderQuickRef('');
    $('quickref-search').value = '';
    showScreen('screen-quickref');
    setTimeout(function () { $('quickref-search').focus(); }, 50);
  }

  function initQuickRefWiring() {
    $('quickref-search').addEventListener('input', function (e) { renderQuickRef(e.target.value); });
  }

  /* ============================================================
     15. PANTALLA: CALCULADORA DE PUNTUACIÓN
     ============================================================ */

  function initScoreCalcWiring() {
    $('btn-calc-score').addEventListener('click', function () {
      var descartando = $('cs-ida-descartando').checked;
      var sinDescartar = $('cs-ida-sindescartar').checked;
      var warn = $('cs-warning');
      if (descartando && sinDescartar) {
        warn.style.display = 'block';
        warn.textContent = 'No puedes seleccionar "se fue descartando" y "se fue sin descartar" al mismo tiempo. Elige solo una opción.';
        return;
      }
      warn.style.display = 'none';

      var input = {
        limpias: parseInt($('cs-limpias').value, 10) || 0,
        sucias: parseInt($('cs-sucias').value, 10) || 0,
        sietes: parseInt($('cs-sietes').value, 10) || 0,
        comodinCompleta: parseInt($('cs-comod-completa').value, 10) || 0,
        comodinIncompleta: parseInt($('cs-comod-incompleta').value, 10) || 0,
        tresRojos: clamp(parseInt($('cs-tresrojos').value, 10) || 0, 0, 4),
        cuatroTresRojos: $('cs-cuatro-tresrojos').checked,
        sieteCanastas: $('cs-siete-canastas').checked,
        cerroCanasta: $('cs-cerro-canasta').checked,
        idaDescartando: descartando,
        idaSinDescartar: sinDescartar,
        bajadas: parseFloat($('cs-bajadas').value) || 0,
        mano: parseFloat($('cs-mano').value) || 0
      };
      renderScoreCalcResult(input);
    });
  }

  function renderScoreCalcResult(input) {
    var resultBox = $('cs-result');
    resultBox.innerHTML = '';
    if (!input) return;
    var res = computeScore(input);
    var box = el('div', { class: 'card-tight', style: 'background:var(--cream-soft); border-radius:12px;' });
    box.appendChild(el('p', { class: 'eyebrow', text: 'Desglose' }));
    var table = el('table', { class: 'value-table' });
    var tbody = el('tbody', {}, res.lines.map(function (l) {
      return el('tr', {}, [el('td', { text: l.label }), el('td', { text: formatPoints(l.value), style: 'text-align:right; font-weight:700;' })]);
    }));
    table.appendChild(tbody);
    box.appendChild(table);
    box.appendChild(el('div', { class: 'divider' }));
    box.appendChild(el('p', { html: '<strong style="font-size:1.3rem;">Total: ' + formatPoints(res.total) + ' puntos</strong>' }));
    resultBox.appendChild(box);
    Sound.click();
  }

  /* ============================================================
     16. PANTALLA: CALCULADORA DE APERTURA
     ============================================================ */

  var openingGroups = [];
  var groupCounter = 0;

  function initOpeningCalc() {
    openingGroups = [{ id: groupCounter++, rank: 'A', suitColorForThree: 'black', naturales: 2, comodines: 0, wildRank: '2' }];
    renderOpeningGroups();
    computeAndRenderOpening();
  }

  var RANK_OPTIONS = ['A','K','Q','J','10','9','8','7','6','5','4','3'];

  function renderOpeningGroups() {
    var wrap = $('co-groups');
    wrap.innerHTML = '';
    openingGroups.forEach(function (g, i) {
      var row = el('div', { class: 'card-tight', style: 'background:var(--cream-soft); border-radius:12px; margin-bottom:10px;' });
      row.appendChild(el('p', { html: '<strong>Grupo ' + (i + 1) + '</strong>' }));

      var rankSelect = el('select', { style: 'width:100%; padding:8px; border-radius:8px; border:1px solid #d3c8ab; margin-bottom:6px;' },
        RANK_OPTIONS.map(function (r) { return el('option', { value: r, text: r === 'A' ? 'As' : (r === '3' ? 'Tres (natural)' : r), selected: g.rank === r ? 'selected' : null }); }));
      rankSelect.value = g.rank;
      rankSelect.addEventListener('change', function () { g.rank = rankSelect.value; computeAndRenderOpening(); });
      row.appendChild(rankSelect);

      if (g.rank === '3') {
        var colorSelect = el('select', { style: 'width:100%; padding:8px; border-radius:8px; border:1px solid #d3c8ab; margin-bottom:6px;' }, [
          el('option', { value: 'black', text: 'Tres negro' }),
          el('option', { value: 'red', text: 'Tres rojo (no cuenta para apertura por reglas de esta mesa)' })
        ]);
        colorSelect.value = g.suitColorForThree;
        colorSelect.addEventListener('change', function () { g.suitColorForThree = colorSelect.value; computeAndRenderOpening(); });
        row.appendChild(colorSelect);
      }

      var natField = el('div', { class: 'field', style: 'margin-bottom:6px;' }, [
        el('label', { text: 'Naturales', style: 'font-size:0.82rem;' }),
        el('input', { type: 'number', min: '0', value: String(g.naturales), style: 'width:100%; padding:8px; border-radius:8px; border:1px solid #d3c8ab;' })
      ]);
      qs('input', natField).addEventListener('input', function (e) { g.naturales = parseInt(e.target.value, 10) || 0; computeAndRenderOpening(); });

      var comField = el('div', { class: 'field', style: 'margin-bottom:6px;' }, [
        el('label', { text: 'Comodines (doses o Jokers)', style: 'font-size:0.82rem;' }),
        el('input', { type: 'number', min: '0', value: String(g.comodines), style: 'width:100%; padding:8px; border-radius:8px; border:1px solid #d3c8ab;' })
      ]);
      qs('input', comField).addEventListener('input', function (e) { g.comodines = parseInt(e.target.value, 10) || 0; computeAndRenderOpening(); });

      row.appendChild(natField);
      row.appendChild(comField);

      if (openingGroups.length > 1) {
        var delBtn = el('button', { class: 'btn btn-ghost btn-sm', type: 'button' }, ['Quitar grupo']);
        delBtn.addEventListener('click', function () { openingGroups = openingGroups.filter(function (x) { return x.id !== g.id; }); renderOpeningGroups(); computeAndRenderOpening(); });
        row.appendChild(delBtn);
      }
      wrap.appendChild(row);
    });
  }

  function computeAndRenderOpening() {
    var teamScore = parseInt($('co-marcador').value, 10) || 0;
    var res = computeOpening(teamScore, openingGroups);
    var box = $('co-result');
    box.innerHTML = '';
    box.appendChild(el('p', { html: 'Requisito para abrir: <strong>' + res.requirement + ' puntos</strong>' }));
    box.appendChild(el('p', { html: 'Total de puntos sumados: <strong>' + res.total + '</strong>' }));
    if (!res.qualifies) {
      box.appendChild(el('p', { html: 'Te faltan: <strong>' + res.missing + ' puntos</strong>' }));
    }
    res.details.forEach(function (d, i) {
      box.appendChild(el('div', { class: 'feedback-box ' + (d.legal ? 'good' : 'bad'), html: 'Grupo ' + (i + 1) + ' (' + d.value + ' pts): ' + (d.legal ? '✅ ' : '❌ ') + d.reason }));
    });
    box.appendChild(el('div', { class: 'feedback-box ' + (res.qualifies ? 'good' : 'bad'), style: 'margin-top:8px; font-weight:700;', html: res.qualifies ? '✅ La apertura es legal y alcanza los puntos.' : '❌ La apertura todavía no es válida.' }));
  }

  function initOpeningCalcWiring() {
    $('co-marcador').addEventListener('change', computeAndRenderOpening);
    $('btn-co-add-group').addEventListener('click', function () {
      openingGroups.push({ id: groupCounter++, rank: 'K', suitColorForThree: 'black', naturales: 3, comodines: 0, wildRank: '2' });
      renderOpeningGroups();
      computeAndRenderOpening();
    });
  }

  /* ============================================================
     17. EXAMEN FINAL
     ============================================================ */

  var EXAM_POOL = [
    { prompt: '¿Cuántas personas se necesitan para jugar canasta en esta mesa?', options: [ { label: 'Dos', correct: false }, { label: 'Cuatro, en dos parejas', correct: true }, { label: 'Seis', correct: false } ], explain: 'La canasta se juega entre cuatro personas, formando dos equipos de dos jugadores.' },
    { prompt: '¿Cómo se sientan los compañeros de equipo?', options: [ { label: 'Uno junto al otro', correct: false }, { label: 'Uno frente al otro', correct: true }, { label: 'No importa el lugar', correct: false } ], explain: 'Los compañeros se sientan uno frente al otro.' },
    { prompt: 'Verdadero o falso: los compañeros pueden decirse qué cartas tienen si lo hacen en voz baja.', options: [ { label: 'Verdadero', correct: false }, { label: 'Falso', correct: true } ], explain: 'Los compañeros nunca deben revelar qué cartas tienen.' },
    { prompt: '¿Con cuántos puntos termina la partida?', options: [ { label: '5,000', correct: false }, { label: '7,500', correct: true }, { label: '10,000', correct: false } ], explain: 'La partida termina cuando una pareja llega a 7,500 puntos.' },
    { prompt: '¿Cuántas cartas se reparten a cada jugador al inicio?', options: [ { label: '7', correct: false }, { label: '11', correct: true }, { label: '13', correct: false } ], explain: 'Se reparten 11 cartas a cada jugador.' },
    { prompt: 'Para armar el pozo al inicio, ¿cuántas cartas se colocan boca abajo antes de voltear la primera visible?', options: [ { label: '4', correct: false }, { label: '6', correct: true }, { label: '8', correct: false } ], explain: 'Se colocan 6 cartas boca abajo y la séptima se voltea boca arriba.' },
    { prompt: 'Selecciona la carta que SIEMPRE funciona como comodín además del dos.', options: [ { label: 'El Joker', correct: true }, { label: 'El As', correct: false }, { label: 'El tres negro', correct: false } ], explain: 'Los Jokers, junto con los doses, funcionan como comodines.' },
    { prompt: 'Un grupo tiene 3 naturales y 3 comodines. ¿Es una bajada legal?', options: [ { label: 'Sí, es legal', correct: false }, { label: 'No, porque no hay más naturales que comodines', correct: true } ], explain: 'Siempre debe haber más naturales que comodines.' },
    { prompt: '¿Cuánto vale el Joker?', options: [ { label: '20 puntos', correct: false }, { label: '50 puntos', correct: true }, { label: '10 puntos', correct: false } ], explain: 'El Joker vale 50 puntos.' },
    { prompt: '¿Cuánto vale un tres rojo cuando corresponde positivamente?', options: [ { label: '5 puntos', correct: false }, { label: '100 puntos', correct: false }, { label: '200 puntos', correct: true } ], explain: 'El tres rojo vale 200 puntos.' },
    { prompt: '¿Cuántas cartas necesita una bajada para convertirse en canasta?', options: [ { label: 'Cinco', correct: false }, { label: 'Siete', correct: true }, { label: 'Nueve', correct: false } ], explain: 'Una canasta se forma con siete cartas del mismo valor.' },
    { prompt: '¿Cuánto vale una canasta limpia (sin comodines)?', options: [ { label: '300 puntos', correct: false }, { label: '500 puntos', correct: true }, { label: '1,000 puntos', correct: false } ], explain: 'La canasta limpia vale 500 puntos.' },
    { prompt: '¿Cuánto vale una canasta sucia (con comodines)?', options: [ { label: '300 puntos', correct: true }, { label: '500 puntos', correct: false }, { label: '2,000 puntos', correct: false } ], explain: 'La canasta sucia vale 300 puntos.' },
    { prompt: 'Tu pareja tiene 3,000 puntos acumulados en la partida. ¿Cuánto necesitas para abrir?', options: [ { label: '80 puntos', correct: false }, { label: '120 puntos', correct: true }, { label: '150 puntos', correct: false } ], explain: 'De 2,500 a menos de 5,000 puntos se requieren 120 para abrir.' },
    { prompt: 'Tienes tres ases naturales (60 puntos) y tu equipo tiene 0 puntos acumulados. ¿Alcanza para abrir?', options: [ { label: 'Sí, alcanza', correct: false }, { label: 'No, faltan 20 puntos', correct: true } ], explain: 'Se necesitan 80 puntos y 3 ases solo suman 60; faltan 20.' },
    { prompt: 'La carta superior del pozo es un rey. Tienes dos reyes naturales en la mano. ¿Puedes tomar el pozo?', options: [ { label: 'Sí', correct: true }, { label: 'No', correct: false } ], explain: 'Tienes las dos naturales iguales necesarias, así que sí puedes tomarlo.' },
    { prompt: 'La carta superior del pozo es un ocho. Tienes un ocho natural y un Joker. ¿Puedes tomar el pozo?', options: [ { label: 'Sí', correct: false }, { label: 'No', correct: true } ], explain: 'Los comodines no sustituyen a la segunda carta natural necesaria.' },
    { prompt: '¿Los treses rojos sirven para tomar el pozo?', options: [ { label: 'Sí', correct: false }, { label: 'No', correct: true } ], explain: 'Los treses rojos no sirven para vulnerar el pozo.' },
    { prompt: '¿Cuánto vale irse descartando la última carta?', options: [ { label: '100 puntos', correct: true }, { label: '200 puntos', correct: false }, { label: '0 puntos', correct: false } ], explain: 'Irse descartando vale 100 puntos.' },
    { prompt: '¿Cuánto vale irse sin descartar?', options: [ { label: '100 puntos', correct: false }, { label: '200 puntos', correct: true }, { label: '300 puntos', correct: false } ], explain: 'Irse sin descartar vale 200 puntos.' },
    { prompt: '¿Cuánto vale la canasta de sietes?', options: [ { label: '500 puntos', correct: false }, { label: '1,000 puntos', correct: true }, { label: '2,000 puntos', correct: false } ], explain: 'La canasta de sietes vale 1,000 puntos y debe bajarse de mano.' },
    { prompt: '¿Qué pasa si tu equipo inicia una canasta de comodines y no la completa?', options: [ { label: 'No pasa nada', correct: false }, { label: 'Resta 2,000 puntos', correct: true }, { label: 'Resta 500 puntos', correct: false } ], explain: 'Una canasta de comodines incompleta resta 2,000 puntos.' },
    { prompt: 'Si una pareja logra siete canastas en una misma mano, ¿cuánto gana de bono?', options: [ { label: '500 puntos', correct: false }, { label: '1,000 puntos', correct: true }, { label: '2,000 puntos', correct: false } ], explain: 'Siete canastas en una mano dan un bono de 1,000 puntos.' },
    { prompt: 'Un equipo no cierra ninguna canasta en la mano. Sus puntos obtenidos en esa mano...', options: [ { label: 'Se cuentan igual, en positivo', correct: false }, { label: 'Se cuentan en negativo', correct: true }, { label: 'No se cuentan', correct: false } ], explain: 'Si no cierran ninguna canasta, todos los puntos obtenidos en la mano cuentan en negativo.' },
    { prompt: 'Un equipo sin canasta cerrada tiene un tres rojo y 90 puntos en la mano. ¿Cuánto se resta solo por esas cartas en mano (duplicadas)?', options: [ { label: '90', correct: false }, { label: '180', correct: true }, { label: '380', correct: false } ], explain: 'Con un tres rojo, los puntos en mano se duplican: 90 × 2 = 180 (y aparte se resta el tres rojo).' },
    { prompt: 'Si una pareja obtiene los cuatro treses rojos, ¿cuánto valen en total?', options: [ { label: '800 puntos', correct: false }, { label: '1,600 puntos', correct: true }, { label: '2,000 puntos', correct: false } ], explain: 'Los cuatro treses rojos juntos valen 1,600 puntos.' },
    { prompt: '¿Cuánto vale un tres negro?', options: [ { label: '5 puntos', correct: true }, { label: '20 puntos', correct: false }, { label: '200 puntos', correct: false } ], explain: 'El tres negro vale 5 puntos, como una carta más de valor bajo.' },
    { prompt: 'Cinco ochos sobre la mesa (sin llegar a siete). ¿Ya es una canasta?', options: [ { label: 'Sí', correct: false }, { label: 'No, todavía es solo una bajada', correct: true } ], explain: 'Se necesitan siete cartas del mismo valor para que sea canasta.' },
    { prompt: 'Rey, dama y diez juntos en una misma bajada: ¿es legal?', options: [ { label: 'Sí', correct: false }, { label: 'No, se mezclan valores distintos', correct: true } ], explain: 'Una bajada debe ser de un solo valor; no se mezclan valores diferentes.' }
  ];

  var examState = { questions: [], currentIndex: 0, answers: [], score: 0 };

  function shuffleArray(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  function resetExamIntro() {
    $('exam-intro').style.display = 'block';
    $('exam-play').style.display = 'none';
    $('exam-results').style.display = 'none';
    var bestEl = $('exam-best-score');
    if (state.examBestScore) {
      bestEl.textContent = 'Tu mejor resultado: ' + state.examBestScore.correct + '/' + state.examBestScore.total + ' (' + state.examBestScore.percent + '%), el ' + state.examBestScore.date + '.';
    } else {
      bestEl.textContent = 'Todavía no has presentado el examen.';
    }
  }

  function startExam() {
    var pool = shuffleArray(EXAM_POOL);
    examState.questions = pool.slice(0, Math.min(22, pool.length));
    examState.currentIndex = 0;
    examState.answers = [];
    examState.score = 0;
    $('exam-intro').style.display = 'none';
    $('exam-results').style.display = 'none';
    $('exam-play').style.display = 'flex';
    renderExamDots();
    renderExamQuestion();
  }

  function renderExamDots() {
    var dots = $('exam-dots');
    dots.innerHTML = '';
    examState.questions.forEach(function (q, i) {
      var span = el('span');
      if (i < examState.answers.length) span.classList.add('answered');
      if (i === examState.currentIndex) span.classList.add('current');
      dots.appendChild(span);
    });
  }

  function renderExamQuestion() {
    var container = $('exam-question-content');
    container.innerHTML = '';
    var qIndex = examState.currentIndex;
    var q = examState.questions[qIndex];
    container.appendChild(el('p', { class: 'eyebrow', text: 'Pregunta ' + (qIndex + 1) + ' de ' + examState.questions.length }));
    container.appendChild(el('p', { html: '<strong>' + q.prompt + '</strong>' }));
    var optionsWrap = el('div', { class: 'quiz-options' });
    var feedback = el('div');
    var answered = false;
    $('btn-exam-next').disabled = true;
    $('btn-exam-next').textContent = qIndex === examState.questions.length - 1 ? 'Ver resultados 🏁' : 'Siguiente pregunta ▶';

    var shuffledOptions = shuffleArray(q.options);
    shuffledOptions.forEach(function (option) {
      var btn = el('button', { class: 'quiz-option', type: 'button' }, [option.label]);
      btn.addEventListener('click', function () {
        if (answered) return;
        answered = true;
        qsa('.quiz-option', optionsWrap).forEach(function (b, i2) {
          b.setAttribute('disabled', 'true');
          if (shuffledOptions[i2].correct) b.classList.add('correct');
        });
        if (!option.correct) btn.classList.add('incorrect');
        feedback.appendChild(el('div', { class: 'feedback-box ' + (option.correct ? 'good' : 'bad'), html: (option.correct ? '✅ ' : '❌ ') + q.explain }));
        if (option.correct) { examState.score++; Sound.correct(); } else { Sound.incorrect(); }
        examState.answers.push({ q: q, correct: option.correct });
        renderExamDots();
        $('btn-exam-next').disabled = false;
      });
      optionsWrap.appendChild(btn);
    });
    container.appendChild(optionsWrap);
    container.appendChild(feedback);
  }

  function examNext() {
    if (examState.currentIndex < examState.questions.length - 1) {
      examState.currentIndex++;
      renderExamDots();
      renderExamQuestion();
    } else {
      finishExam();
    }
  }

  function finishExam() {
    var total = examState.questions.length;
    var correct = examState.score;
    var percent = Math.round((correct / total) * 100);
    var approved = percent >= 80;
    var dateStr = new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });

    if (!state.examBestScore || percent > state.examBestScore.percent) {
      state.examBestScore = { correct: correct, total: total, percent: percent, date: dateStr };
    }
    if (approved) {
      state.examApproved = true;
      if (!state.certificateDate) state.certificateDate = dateStr;
    }
    saveState();

    $('exam-play').style.display = 'none';
    var resultsBox = $('exam-results');
    resultsBox.style.display = 'block';
    resultsBox.innerHTML = '';
    resultsBox.appendChild(el('h2', { text: approved ? '¡Aprobaste! 🎉' : 'Casi lo logras', style: 'font-size:1.3rem;' }));
    resultsBox.appendChild(el('p', { html: 'Obtuviste <strong>' + correct + '/' + total + '</strong> (' + percent + '%).' }));

    var msg;
    if (percent === 100) msg = 'Logro desbloqueado: ya casi no necesitas que Ale explique las reglas.';
    else if (approved) msg = 'Ya estás listo para sentarte a la mesa.';
    else msg = 'Vas muy bien. Repasa el pozo, las canastas y el cierre de mano antes de intentarlo otra vez.';
    resultsBox.appendChild(el('div', { class: 'feedback-box ' + (approved ? 'good' : 'bad'), html: msg }));

    if (approved) { Sound.celebrate(); launchConfetti(); }

    var reviewTitle = el('h3', { text: 'Revisa tus respuestas', style: 'font-size:1rem; margin-top:16px;' });
    resultsBox.appendChild(reviewTitle);
    examState.answers.forEach(function (a, i) {
      resultsBox.appendChild(el('div', { class: 'feedback-box ' + (a.correct ? 'good' : 'bad'), style: 'margin-bottom:8px;', html: (i + 1) + '. ' + a.q.prompt + ' — ' + (a.correct ? '✅ Correcta' : '❌ Incorrecta') }));
    });

    var btnRow = el('div', { class: 'btn-row', style: 'margin-top:14px;' });
    var retryBtn = el('button', { class: 'btn btn-secondary', type: 'button' }, ['Repetir examen']);
    retryBtn.addEventListener('click', startExam);
    btnRow.appendChild(retryBtn);
    if (approved) {
      var certBtn = el('button', { class: 'btn btn-primary', type: 'button' }, ['Ver mi certificado']);
      certBtn.addEventListener('click', openCertificate);
      btnRow.appendChild(certBtn);
    }
    var menuBtn = el('button', { class: 'btn btn-ghost', type: 'button' }, ['Volver al menú']);
    menuBtn.addEventListener('click', goToMenu);
    btnRow.appendChild(menuBtn);
    resultsBox.appendChild(btnRow);
  }

  function initExamWiring() {
    $('btn-exam-start').addEventListener('click', startExam);
    $('btn-exam-next').addEventListener('click', examNext);
  }

  /* ============================================================
     18. CERTIFICADO
     ============================================================ */

  function openCertificate() {
    if (!state.examApproved) {
      $('cert-locked').style.display = 'block';
      $('cert-content').style.display = 'none';
    } else {
      $('cert-locked').style.display = 'none';
      $('cert-content').style.display = 'block';
      $('cert-name').textContent = state.username || 'Jugador de Ale y Mau';
      var dateStr = state.certificateDate || new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
      $('cert-date').textContent = 'Fecha: ' + dateStr;
      var scoreText = state.examBestScore ? ('Resultado: ' + state.examBestScore.correct + '/' + state.examBestScore.total + ' (' + state.examBestScore.percent + '%)') : '';
      $('cert-score').textContent = scoreText;
      setTimeout(function () { launchConfetti(); Sound.celebrate(); }, 150);
    }
    showScreen('screen-certificate');
  }

  /* ============================================================
     19. INICIALIZACIÓN GENERAL
     ============================================================ */

  function init() {
    initWelcomeScreen();
    initMenuWiring();
    initModuleNav();
    initQuickRefWiring();
    initScoreCalcWiring();
    initOpeningCalcWiring();
    initExamWiring();

    // Estado inicial de sonido en botón
    var soundBtn = $('btn-sound-toggle');
    soundBtn.textContent = state.soundOn ? '🔊' : '🔇';

    if (state.username) {
      // Usuario que regresa: llevarlo directo al menú.
      renderMenu();
      showScreen('screen-welcome', { skipHistory: true });
      // Pre-selecciona su nombre por si quiere reiniciar desde la bienvenida.
      var isKnownName = NAMES.indexOf(state.username) !== -1;
      selectedName = isKnownName ? state.username : 'Otro nombre';
      qsa('.name-choice').forEach(function (b) {
        b.classList.toggle('selected', b.getAttribute('data-name') === selectedName);
      });
      if (!isKnownName) {
        $('other-name-wrap').style.display = 'block';
        $('other-name-input').value = state.username;
      }
      showToast('¡Hola de nuevo, ' + state.username + '! Toca "Comenzar el curso" para continuar.');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
