// ============================================================
// shared/timer.js
// Timer de descanso entre series.
// Reutilizado por live.js y script.js (nivel 4).
// ============================================================

import { formatearSegundos } from './utils.js';

let timerInterval = null;

// ── Inicia un nuevo timer de N segundos ───────────────────────
export function iniciarTimer(segundos) {
  clearInterval(timerInterval);
  const tiempo = parseInt(segundos, 10) || 0;
  if (tiempo <= 0) return;
  const fin = Date.now() + tiempo * 1000;
  localStorage.setItem('timerFin', fin);
  localStorage.removeItem('timerPause');
  mostrarTimer();
}

// ── Muestra el timer (recupera estado de localStorage) ───────
export function mostrarTimer() {
  clearInterval(timerInterval);
  const timerContainer = document.getElementById('timerContainer');
  const fin = parseInt(localStorage.getItem('timerFin'));
  if (!fin || !timerContainer) return;

  timerContainer.innerHTML = '';
  timerContainer.className = 'timer-active';

  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'display:flex;align-items:center;gap:16px;padding:16px 24px;background:none;border-radius:16px;';

  // Tiempo
  const tiempoLabel = document.createElement('div');
  tiempoLabel.className = 'timer-label';
  tiempoLabel.style.cssText = `
    font-size:5rem;font-weight:900;color:#50c8f8;
    font-family:'SF Mono','Monaco','Consolas',monospace;
    letter-spacing:2px;min-width:120px;text-align:center;
  `;

  let pausado = false;
  let tiempoRestante = Math.floor((fin - Date.now()) / 1000);

  // Botón pausa
  const btnPause = document.createElement('button');
  btnPause.textContent = '⏸';
  btnPause.className = 'btn-pause';
  btnPause.style.cssText = 'background:#666;color:#fff;font-size:1.5rem;border:none;padding:12px;border-radius:50%;cursor:pointer;transition:all 0.2s;width:56px;height:56px;display:flex;align-items:center;justify-content:center;';
  btnPause.onmouseover = () => { btnPause.style.background='#808080'; btnPause.style.transform='scale(1.05)'; };
  btnPause.onmouseout  = () => { btnPause.style.background='#666';    btnPause.style.transform='scale(1)'; };
  btnPause.onclick = () => {
    if (!pausado) {
      pausado = true;
      tiempoRestante = Math.floor((parseInt(localStorage.getItem('timerFin')) - Date.now()) / 1000);
      localStorage.setItem('timerPause', tiempoRestante);
      localStorage.removeItem('timerFin');
      clearInterval(timerInterval);
      btnPause.textContent = '▶';
    } else {
      pausado = false;
      const nuevoFin = Date.now() + tiempoRestante * 1000;
      localStorage.setItem('timerFin', nuevoFin);
      localStorage.removeItem('timerPause');
      btnPause.textContent = '⏸';
      mostrarTimer();
    }
  };

  // Botón parar
  const btnSkip = document.createElement('button');
  btnSkip.textContent = '✖';
  btnSkip.className = 'btn-skip';
  btnSkip.style.cssText = 'background:#FF6B6B;color:#fff;font-size:1.3rem;border:none;padding:12px;border-radius:50%;cursor:pointer;transition:all 0.2s;width:56px;height:56px;display:flex;align-items:center;justify-content:center;';
  btnSkip.onmouseover = () => { btnSkip.style.background='#FF8787'; btnSkip.style.transform='scale(1.05)'; };
  btnSkip.onmouseout  = () => { btnSkip.style.background='#FF6B6B'; btnSkip.style.transform='scale(1)'; };
  btnSkip.onclick = () => {
    clearInterval(timerInterval);
    timerContainer.innerHTML = '';
    timerContainer.className = '';
    localStorage.removeItem('timerFin');
    localStorage.removeItem('timerPause');
  };

  wrapper.append(tiempoLabel, btnPause, btnSkip);
  timerContainer.appendChild(wrapper);

  // Tick
  function actualizar() {
    const finActual = parseInt(localStorage.getItem('timerFin'));
    if (!finActual) return;
    const t = Math.floor((finActual - Date.now()) / 1000);

    if (t <= 0) {
      clearInterval(timerInterval);
      timerContainer.innerHTML = '';
      const msg = document.createElement('div');
      msg.style.cssText = 'display:flex;align-items:center;gap:16px;padding:16px 24px;border-radius:16px;background:linear-gradient(135deg,var(--success) 0%,var(--mint-light) 100%);';
      msg.innerHTML = '<div style="font-size:2rem;color:#fff;">✅</div><div style="color:#fff;font-weight:700;font-size:1.2rem;">¡Descanso completado!</div>';
      timerContainer.appendChild(msg);
      navigator.vibrate?.([200, 100, 200]);
      setTimeout(() => { timerContainer.innerHTML = ''; timerContainer.className = ''; }, 3000);
      localStorage.removeItem('timerFin');
      return;
    }

    // Usar formatearSegundos de utils
    const mm = Math.floor(t / 60), ss = t % 60;
    tiempoLabel.textContent = `${mm}:${ss < 10 ? '0' + ss : ss}`;
    tiempoLabel.style.animation = t <= 10 ? 'pulse 0.5s ease infinite' : 'none';
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
