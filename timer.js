// timer.js
// Sistema de temporizador de descanso entre series

let timerInterval = null;

export function iniciarTimer(segundos) {
  clearInterval(timerInterval);
  let tiempo = parseInt(segundos, 10) || 0;
  if (tiempo <= 0) return;
  const fin = Date.now() + tiempo * 1000;
  localStorage.setItem("timerFin", fin);
  mostrarTimer();
}

export function mostrarTimer() {
  clearInterval(timerInterval);
  const timerContainer = document.getElementById("timerContainer");
  const fin = parseInt(localStorage.getItem("timerFin"));
  if (!fin || !timerContainer) return;

  timerContainer.innerHTML = "";
  timerContainer.className = "timer-active";

  // Contenedor principal del timer
  const timerWrapper = document.createElement("div");
  timerWrapper.style.cssText = `
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 16px 24px;
    background: none;
    border-radius: 16px;

  `;

  // Label del tiempo
  const tiempoLabel = document.createElement("div");
  tiempoLabel.className = "timer-label";
  tiempoLabel.style.cssText = `
    font-size: 5rem;
    font-weight: 900;
    color: #50c8f8;
    font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
    letter-spacing: 2px;
    text-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    min-width: 120px;
    text-align: center;
  `;

  let pausado = false;
  let tiempoRestante = Math.floor((fin - Date.now()) / 1000);

  // Botón de Pausa
  const btnPause = document.createElement("button");
  btnPause.textContent = "⏸";
  btnPause.className = "btn-pause";
  btnPause.style.cssText = `
    background: #adadad;
    color: #ffffff;
    font-size: 1.5rem;
    border: none;
    padding: 12px;
    border-radius: 50%;
    cursor: pointer;
    transition: all 0.2s ease;
    width: 56px;
    height: 56px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
    backdrop-filter: blur(10px);
  `;

  btnPause.onmouseover = () => {
    btnPause.style.background = "#808080";
    btnPause.style.transform = "scale(1.05)";
    btnPause.style.boxShadow = "0 6px 16px rgba(0, 0, 0, 0.2)";
  };

  btnPause.onmouseout = () => {
    btnPause.style.background = "#666666";
    btnPause.style.transform = "scale(1)";
    btnPause.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.15)";
  };

  btnPause.onclick = () => {
    if (!pausado) {
      pausado = true;
      tiempoRestante = Math.floor((fin - Date.now()) / 1000);
      localStorage.setItem("timerPause", tiempoRestante);
      localStorage.removeItem("timerFin");
      btnPause.textContent = "▶";
    } else {
      pausado = false;
      const nuevoFin = Date.now() + tiempoRestante * 1000;
      localStorage.setItem("timerFin", nuevoFin);
      localStorage.removeItem("timerPause");
      btnPause.textContent = "⏸";
      mostrarTimer();
    }
  };

  // Botón de Parar
  const btnSkip = document.createElement("button");
  btnSkip.textContent = "✖";
  btnSkip.className = "btn-skip";
  btnSkip.style.cssText = `
    background: #FF6B6B;
    color: #ffffff;
    font-size: 1.3rem;
    border: none;
    padding: 12px;
    border-radius: 50%;
    cursor: pointer;
    transition: all 0.2s ease;
    width: 56px;
    height: 56px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    backdrop-filter: blur(10px);
  `;

  btnSkip.onmouseover = () => {
    btnSkip.style.background = "#FF8787";
    btnSkip.style.transform = "scale(1.05)";
    btnSkip.style.boxShadow = "0 6px 16px rgba(0, 0, 0, 0.2)";
  };

  btnSkip.onmouseout = () => {
    btnSkip.style.background = "#FF6B6B";
    btnSkip.style.transform = "scale(1)";
    btnSkip.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.15)";
  };

  btnSkip.onclick = () => {
    clearInterval(timerInterval);
    timerContainer.innerHTML = "";
    timerContainer.className = ""; // Remover la clase timer-active
    localStorage.removeItem("timerFin");
    localStorage.removeItem("timerPause");
  };

  timerWrapper.appendChild(tiempoLabel);
  timerWrapper.appendChild(btnPause);
  timerWrapper.appendChild(btnSkip);
  timerContainer.appendChild(timerWrapper);

  function actualizar() {
    let fin = parseInt(localStorage.getItem("timerFin"));
    if (!fin) return;
    let t = Math.floor((fin - Date.now()) / 1000);
    if (t <= 0) {
      clearInterval(timerInterval);
      
      // Mostrar mensaje de finalización
      timerContainer.innerHTML = "";
      const finalizadoMsg = document.createElement("div");
      finalizadoMsg.style.cssText = `
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 16px 24px;
        background: linear-gradient(135deg, var(--success) 0%, var(--mint-light) 100%);
        border-radius: 16px;
        box-shadow: var(--shadow-lg);
        animation: pulse 0.5s ease;
      `;
      finalizadoMsg.innerHTML = `
        <div style="font-size: 2rem; color: #ffffff;">✅</div>
        <div style="color: #ffffff; font-weight: 700; font-size: 1.2rem;">¡Descanso completado!</div>
      `;
      timerContainer.appendChild(finalizadoMsg);
      
      // Vibración si está disponible
      if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200]);
      }
      
      // Remover después de 3 segundos
      setTimeout(() => {
        timerContainer.innerHTML = "";
        timerContainer.className = "";
      }, 3000);
      
      localStorage.removeItem("timerFin");
      return;
    }
    
    const mm = Math.floor(t / 60);
    const ss = t % 60;
    tiempoLabel.textContent = mm + ":" + (ss < 10 ? "0" + ss : ss);
    
    // Cambiar color cuando quedan menos de 10 segundos
    if (t <= 10) {
      timerWrapper.style.background = "none";
      tiempoLabel.style.animation = "pulse 0.5s ease infinite";
    } else {
      timerWrapper.style.background = "none";
      tiempoLabel.style.animation = "none";
    }
  }

  actualizar();
  timerInterval = setInterval(actualizar, 1000);
}

export function restaurarTimer() {
  const fin = parseInt(localStorage.getItem("timerFin"));
  if (fin) mostrarTimer();
}