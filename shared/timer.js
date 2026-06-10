// ============================================================
// shared/timer.js
// Timer de descanso entre series — estilo Hevy adaptado a fitTracker.
// ============================================================

import { formatearSegundos } from './utils.js';

let timerInterval = null;

// ── Inicia un nuevo timer de N segundos ───────────────────────
export function iniciarTimer(segundos) {
  clearInterval(timerInterval);
  timerInterval = null;
  const tiempo = parseInt(segundos, 10) || 0;
  if (tiempo <= 0) return;
  const fin = Date.now() + tiempo * 1000;
  localStorage.setItem('timerFin',   String(fin));
  localStorage.setItem('timerTotal', String(tiempo));
  localStorage.removeItem('timerPause');
  mostrarTimer();
}

// ── Muestra el timer (recupera estado de localStorage) ───────
export function mostrarTimer() {
  clearInterval(timerInterval);
  timerInterval = null;

  const timerContainer = document.getElementById('timerContainer');
  if (!timerContainer) return;

  const finRaw   = localStorage.getItem('timerFin');
  const pauseRaw = localStorage.getItem('timerPause');
  const fin      = parseInt(finRaw, 10);
  const total    = parseInt(localStorage.getItem('timerTotal'), 10) || 1;
  if (!finRaw && pauseRaw === null) return;

  timerContainer.innerHTML = '';
  timerContainer.classList.add('timer-active');

  // ── Inyectar keyframes una sola vez ──────────────────────
  if (!document.getElementById('timerKeyframes')) {
    const style = document.createElement('style');
    style.id = 'timerKeyframes';
    style.textContent = `
      @keyframes slideUpTimer {
        from { opacity:0; transform:translateY(8px); }
        to   { opacity:1; transform:translateY(0); }
      }
      @keyframes pulseRed {
        0%,100% { opacity:1; }
        50%      { opacity:0.6; }
      }
    `;
    document.head.appendChild(style);
  }

  const RADIUS = 30;
  const CIRCUM = 2 * Math.PI * RADIUS;
  const SIZE   = 72;

  // ── Card ─────────────────────────────────────────────────
  const card = document.createElement('div');
  card.style.cssText = `
    display:flex;align-items:center;gap:16px;
    background:var(--bg-card);
    border:0.5px solid var(--border-color);
    border-radius:var(--radius-xl);
    padding:14px 18px;margin:0 12px;
    box-shadow:var(--shadow-sm);
    animation:slideUpTimer 0.2s ease;
  `;

  // ── Anillo ────────────────────────────────────────────────
  const ringWrap = document.createElement('div');
  ringWrap.style.cssText = `position:relative;width:${SIZE}px;height:${SIZE}px;flex-shrink:0;`;

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width',   SIZE);
  svg.setAttribute('height',  SIZE);
  svg.setAttribute('viewBox', `0 0 ${SIZE} ${SIZE}`);
  svg.style.cssText = 'transform:rotate(-90deg);display:block;';

  const track = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  track.setAttribute('cx', SIZE / 2);
  track.setAttribute('cy', SIZE / 2);
  track.setAttribute('r',  RADIUS);
  track.setAttribute('fill', 'none');
  track.setAttribute('stroke', 'var(--border-color)');
  track.setAttribute('stroke-width', '4.5');

  const arc = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  arc.setAttribute('cx', SIZE / 2);
  arc.setAttribute('cy', SIZE / 2);
  arc.setAttribute('r',  RADIUS);
  arc.setAttribute('fill', 'none');
  arc.setAttribute('stroke', 'var(--primary)');
  arc.setAttribute('stroke-width', '4.5');
  arc.setAttribute('stroke-linecap', 'round');
  arc.setAttribute('stroke-dasharray', String(CIRCUM));
  arc.setAttribute('stroke-dashoffset', '0');

  svg.append(track, arc);
  ringWrap.appendChild(svg);

  const ringCenter = document.createElement('div');
  ringCenter.style.cssText = `
    position:absolute;inset:0;
    display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;
  `;
  const timeLabel = document.createElement('div');
  timeLabel.style.cssText = `
    font-size:18px;font-weight:600;color:var(--text-primary);
    font-variant-numeric:tabular-nums;letter-spacing:-0.5px;line-height:1;
  `;
  const restLabel = document.createElement('div');
  restLabel.style.cssText = `
    font-size:9px;font-weight:600;color:var(--text-light);
    text-transform:uppercase;letter-spacing:0.5px;
  `;
  restLabel.textContent = 'rest';
  ringCenter.append(timeLabel, restLabel);
  ringWrap.appendChild(ringCenter);

  // ── Info ──────────────────────────────────────────────────
  const info = document.createElement('div');
  info.style.cssText = `flex:1;min-width:0;display:flex;flex-direction:column;gap:10px;`;

  const titleEl = document.createElement('div');
  titleEl.style.cssText = `
    font-size:11px;font-weight:600;color:var(--text-light);
    text-transform:uppercase;letter-spacing:0.8px;
  `;
  titleEl.textContent = 'Tiempo de descanso';

  const adjusters = document.createElement('div');
  adjusters.style.cssText = 'display:flex;gap:6px;';

  const mkAdjBtn = (label, delta) => {
    const btn = document.createElement('button');
    btn.textContent = label;
    btn.style.cssText = `
      height:30px;padding:0 12px;
      border:0.5px solid var(--border-color);border-radius:var(--radius-md);
      background:var(--bg-secondary);color:var(--text-primary);
      font-size:12px;font-weight:600;cursor:pointer;
      transition:background 0.15s,border-color 0.15s;
      display:flex;align-items:center;white-space:nowrap;
      width:auto;margin:0;box-shadow:none;text-transform:none;letter-spacing:0;
    `;
    btn.onmouseover = () => { btn.style.background = 'var(--bg-main)'; btn.style.borderColor = 'var(--border-hover)'; };
    btn.onmouseout  = () => { btn.style.background = 'var(--bg-secondary)'; btn.style.borderColor = 'var(--border-color)'; };
    btn.onclick = () => {
      // Leer siempre desde localStorage para tener el valor actual
      const finActual   = parseInt(localStorage.getItem('timerFin') || '0');
      const totalActual = parseInt(localStorage.getItem('timerTotal') || '1');
      if (pausado) {
        // En pausa: ajustar tiempoRestante directamente
        tiempoRestante = Math.max(1, tiempoRestante + delta);
        localStorage.setItem('timerPause', String(tiempoRestante));
      } else {
        const nuevoFin = finActual + delta * 1000;
        localStorage.setItem('timerFin', String(nuevoFin));
      }
      // Actualizar total de referencia para el arco
      const nuevoTotal = Math.max(1, totalActual + delta);
      localStorage.setItem('timerTotal', String(nuevoTotal));
      // Forzar repintado inmediato
      actualizar();
    };
    return btn;
  };
  adjusters.append(mkAdjBtn('−10s', -10), mkAdjBtn('+10s', +10));
  info.append(titleEl, adjusters);

  // ── Acciones ──────────────────────────────────────────────
  const actions = document.createElement('div');
  actions.style.cssText = 'display:flex;flex-direction:column;gap:6px;flex-shrink:0;';

  let pausado = pauseRaw !== null;
  let tiempoRestante = pausado
    ? Math.max(0, parseInt(pauseRaw, 10) || 0)
    : Math.floor((fin - Date.now()) / 1000);

  const btnPause = document.createElement('button');
  btnPause.textContent = pausado ? '▶' : '⏸';
  btnPause.style.cssText = `
    width:36px;height:36px;border-radius:50%;
    border:0.5px solid var(--border-color);
    background:var(--bg-secondary);color:var(--text-secondary);
    font-size:13px;cursor:pointer;
    display:flex;align-items:center;justify-content:center;
    transition:background 0.15s,border-color 0.15s;
    margin:0;box-shadow:none;padding:0;text-transform:none;
  `;
  btnPause.onmouseover = () => { btnPause.style.background = 'var(--bg-main)'; btnPause.style.borderColor = 'var(--border-hover)'; };
  btnPause.onmouseout  = () => { btnPause.style.background = 'var(--bg-secondary)'; btnPause.style.borderColor = 'var(--border-color)'; };

  btnPause.onclick = () => {
    if (!pausado) {
      // Pausar
      pausado = true;
      tiempoRestante = Math.floor((parseInt(localStorage.getItem('timerFin')) - Date.now()) / 1000);
      localStorage.setItem('timerPause', String(tiempoRestante));
      localStorage.removeItem('timerFin');
      clearInterval(timerInterval);
      timerInterval = null;
      btnPause.textContent = '▶';
    } else {
      // Reanudar — NO llamar mostrarTimer(), operar sobre el DOM existente
      pausado = false;
      const nuevoFin = Date.now() + tiempoRestante * 1000;
      localStorage.setItem('timerFin', String(nuevoFin));
      localStorage.removeItem('timerPause');
      btnPause.textContent = '⏸';
      // Reiniciar intervalo sin destruir el DOM
      clearInterval(timerInterval);
      timerInterval = setInterval(actualizar, 1000);
    }
  };

  const btnSkip = document.createElement('button');
  btnSkip.textContent = '✕';
  btnSkip.style.cssText = `
    width:36px;height:36px;border-radius:50%;
    border:none;background:var(--primary);color:#fff;
    font-size:12px;cursor:pointer;
    display:flex;align-items:center;justify-content:center;
    transition:background 0.15s;
    margin:0;box-shadow:none;padding:0;text-transform:none;
  `;
  btnSkip.onmouseover = () => btnSkip.style.background = 'var(--primary-hover)';
  btnSkip.onmouseout  = () => btnSkip.style.background = 'var(--primary)';
  btnSkip.onclick = () => {
    clearInterval(timerInterval);
    timerInterval = null;
    timerContainer.innerHTML = '';
    timerContainer.classList.remove('timer-active');
    localStorage.removeItem('timerFin');
    localStorage.removeItem('timerPause');
    localStorage.removeItem('timerTotal');
  };

  actions.append(btnPause, btnSkip);
  card.append(ringWrap, info, actions);
  timerContainer.appendChild(card);

  // ── Tick ─────────────────────────────────────────────────
  function actualizar() {
    const finActual   = parseInt(localStorage.getItem('timerFin') || '0');
    const totalActual = parseInt(localStorage.getItem('timerTotal') || '1');

    // Si está pausado, solo repintar con tiempoRestante sin avanzar
    const t = pausado
      ? tiempoRestante
      : Math.floor((finActual - Date.now()) / 1000);

    if (!pausado && t <= 0) {
      clearInterval(timerInterval);
      timerInterval = null;
      timerContainer.innerHTML = '';
      timerContainer.classList.add('timer-active');
      localStorage.removeItem('timerFin');
      localStorage.removeItem('timerPause');
      localStorage.removeItem('timerTotal');

      // Tarjeta completado
      const done = document.createElement('div');
      done.style.cssText = `
        display:flex;align-items:center;gap:14px;
        background:var(--bg-card);
        border:0.5px solid #c8e6d8;
        border-radius:var(--radius-xl);
        padding:12px 18px;margin:0 12px;
        box-shadow:var(--shadow-sm);
        animation:slideUpTimer 0.2s ease;
      `;
      const doneIcon = document.createElement('div');
      doneIcon.style.cssText = `
        width:34px;height:34px;border-radius:50%;
        background:#f0faf5;border:0.5px solid #c8e6d8;
        display:flex;align-items:center;justify-content:center;
        font-size:15px;flex-shrink:0;
      `;
      doneIcon.textContent = '✓';
      const doneText = document.createElement('div');
      doneText.innerHTML = `
        <div style="font-size:13px;font-weight:600;color:var(--success);">¡Descanso completado!</div>
        <div style="font-size:11px;color:var(--text-light);margin-top:2px;">A por la siguiente serie</div>
      `;
      done.append(doneIcon, doneText);
      timerContainer.appendChild(done);
      navigator.vibrate?.([200, 100, 200]);
      setTimeout(() => { timerContainer.innerHTML = '';
        timerContainer.classList.remove('timer-active');
       }, 3000);
      return;
    }

    // Número
    const tSafe = Math.max(0, t);
    const mm = Math.floor(tSafe / 60);
    const ss = tSafe % 60;
    timeLabel.textContent = `${mm}:${ss < 10 ? '0' + ss : ss}`;

    // Color urgencia
    const urgente = tSafe <= 10;
    arc.setAttribute('stroke', urgente ? 'var(--danger)' : 'var(--primary)');
    timeLabel.style.color     = urgente ? 'var(--danger)' : 'var(--text-primary)';
    timeLabel.style.animation = urgente ? 'pulseRed 0.5s ease infinite' : 'none';

    // Arco: lleno al inicio → vacío al final
    const pct = Math.min(1, Math.max(0, tSafe / totalActual));
    arc.setAttribute('stroke-dashoffset', String(CIRCUM * (1 - pct)));
  }

  actualizar();
  timerInterval = setInterval(actualizar, 1000);
}

// ── Restaura el timer si quedó activo al recargar ────────────
export function restaurarTimer() {
  const fin   = localStorage.getItem('timerFin');
  const pause = localStorage.getItem('timerPause');
  if (fin || pause) mostrarTimer();
}