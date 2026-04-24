// live.js
// Lógica para el entrenamiento en vivo nueva

// Importar funciones del timer
import { iniciarTimer } from '../../shared/timer.js';

// Promesa que se resuelve cuando `window.datos` está disponible
let datosReady = (window.datos && Array.isArray(window.datos) && window.datos.length > 0)
  ? Promise.resolve()
  : new Promise(res => {
    const handler = () => { window.removeEventListener('datosLoaded', handler); res(); };
    window.addEventListener('datosLoaded', handler);
  });

// ==================== FUNCIONES DE ESTADÍSTICAS ====================

function calcularEstadisticasEjercicio(ejercicio) {
  const series = ejercicio.series || [];
  const pesoMax = Math.max(...series.map(s => parseFloat(s.peso) || 0), 0);
  const volumenTotal = series.reduce((total, s) => {
    const peso = parseFloat(s.peso) || 0;
    const reps = parseInt(s.reps) || 0;
    return total + (peso * reps);
  }, 0);
  const oneRM = Math.max(...series.map(s => {
    const peso = parseFloat(s.peso) || 0;
    const reps = parseInt(s.reps) || 0;
    if (peso === 0 || reps === 0) return 0;
    return peso * (1 + reps / 30);
  }), 0);
  return {
    pesoMax: Math.round(pesoMax * 10) / 10,
    volumenTotal: Math.round(volumenTotal),
    oneRM: Math.round(oneRM * 10) / 10
  };
}

async function buscarSesionAnteriorEjercicio(nombreEjercicio) {
  await datosReady;
  const datos = window.datos || [];
  const todasLasSesiones = [];

  if (datos && datos[0]) {
    datos[0].hijos?.forEach((meso, mesoIdx) => {
      meso.hijos?.forEach((micro, microIdx) => {
        micro.hijos?.forEach((sesion, sesionIdx) => {
          let fechaSesion = sesion.fecha;
          if (!fechaSesion && sesion.hijos && sesion.hijos.length > 0) {
            for (const subNivel of sesion.hijos) {
              if (subNivel.fecha) { fechaSesion = subNivel.fecha; break; }
            }
          }
          if (fechaSesion) {
            const buscarEjercicioEnNivel = (nivel) => {
              if (nivel.nombre === nombreEjercicio && nivel.series) return nivel;
              if (nivel.hijos) {
                for (const hijo of nivel.hijos) {
                  const encontrado = buscarEjercicioEnNivel(hijo);
                  if (encontrado) return encontrado;
                }
              }
              return null;
            };
            const ejercicioEncontrado = buscarEjercicioEnNivel(sesion);
            if (ejercicioEncontrado) {
              todasLasSesiones.push({
                fecha: fechaSesion,
                ejercicio: ejercicioEncontrado,
                ruta: [0, mesoIdx, microIdx, sesionIdx]
              });
            }
          }
        });
      });
    });
  }

  todasLasSesiones.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  const fechaActual = entrenamientoActual.fecha;
  const toDia = (raw) => {
    if (!raw) return null;
    const d = new Date(raw);
    if (isNaN(d)) return null;
    return d.toISOString().slice(0, 10);
  };
  const fechaActualDia = toDia(fechaActual);

  for (const sesion of todasLasSesiones) {
    const sesionDia = toDia(sesion.fecha);
    if (fechaActualDia) {
      if (sesionDia && sesionDia < fechaActualDia) return sesion;
      continue;
    } else {
      return sesion;
    }
  }
  return null;
}

// Variable global para almacenar el estado del entrenamiento
let entrenamientoActual = {
  ejercicios: [],
  fecha: ''
};

// Variables del temporizador interno del live
let timerInterval = null;
let timerSeconds = 0;
let timerPaused = false;

// Variable para controlar qué ejercicio está expandido
let ejercicioExpandidoLive = null;

// Inicia el flujo de entrenamiento en vivo
export function iniciarEntrenamiento() {
  entrenamientoActual = {
    ejercicios: [],
    fecha: new Date().toISOString().slice(0, 10)
  };
  timerSeconds = 0;
  timerPaused = false;
  ejercicioExpandidoLive = null;
  abrirEntrenamientoEnVivo();
}

// Crea la pantalla completa de entrenamiento
function abrirEntrenamientoEnVivo() {
  const overlay = document.createElement("div");
  overlay.className = "entrenamiento-overlay";
  overlay.style.cssText = `
    position: fixed;
    top: 0; left: 0;
    width: 100%; height: 100%;
    background: var(--bg-main);
    z-index: 9999;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
  `;

  // Header
  const header = document.createElement("div");
  header.style.cssText = `
    position: sticky; top: 0;
    background: var(--bg-card);
    padding: 8px 12px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    z-index: 100;
    display: flex; align-items: center; justify-content: space-between;
  `;

  const headerLeft = document.createElement("div");
  headerLeft.style.cssText = `width: 36px;`;
  header.appendChild(headerLeft);

  const btnCerrar = document.createElement("button");
  btnCerrar.textContent = "✖";
  btnCerrar.style.cssText = `
    background: transparent; border: none;
    font-size: 1.3rem; color: var(--text-secondary);
    cursor: pointer; width: 32px; height: 32px; padding: 0;
    display: flex; align-items: center; justify-content: center;
    border-radius: 6px; transition: all 0.2s;
  `;
  btnCerrar.onmouseover = () => btnCerrar.style.background = "var(--bg-main)";
  btnCerrar.onmouseout  = () => btnCerrar.style.background = "transparent";
  btnCerrar.onclick = () => {
    if (confirm("¿Cerrar sin guardar?")) {
      clearInterval(timerInterval);
      overlay.remove();
    }
  };
  headerLeft.appendChild(btnCerrar);

  const titulo = document.createElement("h2");
  titulo.textContent = "Entrenamiento en vivo";
  titulo.style.cssText = `
    margin: 0; text-align: center; font-size: 1rem; font-weight: 700;
    color: var(--primary-mint); text-transform: uppercase;
    letter-spacing: 0.5px; flex: 1;
  `;
  header.appendChild(titulo);

  const fechaInput = document.createElement("input");
  fechaInput.type = "date";
  fechaInput.id = "fechaEntrenamiento";
  fechaInput.value = entrenamientoActual.fecha;
  fechaInput.style.cssText = `
    padding: 4px 6px; border: 1px solid var(--border-color);
    border-radius: 4px; font-size: 0.75rem; font-weight: 600;
    color: var(--primary-mint); width: 100px;
  `;
  fechaInput.addEventListener("change", (e) => { entrenamientoActual.fecha = e.target.value; });
  header.appendChild(fechaInput);
  overlay.appendChild(header);

  // Timer secundario
  const headerTimer = document.createElement("div");
  headerTimer.style.cssText = `
    background: var(--bg-card); padding: 8px 12px;
    border-bottom: 1px solid var(--border-color);
  `;
  const timerDisplay = document.createElement("div");
  timerDisplay.id = "timerDisplay";
  timerDisplay.textContent = "00:00";
  timerDisplay.style.cssText = `
    font-size: 1.6rem; font-weight: 700;
    color: var(--primary-mint); font-family: monospace;
  `;
  const timerDiv = document.createElement("div");
  timerDiv.id = "liveTimer";
  timerDiv.style.cssText = `
    display: flex; align-items: center; justify-content: center; gap: 10px;
  `;
  const btnStart = document.createElement("button");
  btnStart.id = "btnStartTimer";
  btnStart.textContent = "▶";
  btnStart.style.cssText = `
    width: 36px; height: 36px; border: none; border-radius: 50%;
    background: var(--primary-mint); color: white; font-size: 1rem;
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    transition: all 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  `;
  btnStart.onclick = () => startTimer(timerDisplay, btnStart);
  timerDiv.appendChild(timerDisplay);
  timerDiv.appendChild(btnStart);

  const btnReset = document.createElement("button");
  btnReset.textContent = "↻";
  btnReset.style.cssText = `
    width: 32px; height: 32px; border: none; border-radius: 50%;
    background: var(--bg-main); color: var(--text-secondary); font-size: 0.95rem;
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    transition: all 0.2s;
  `;
  btnReset.onclick = () => resetTimer(timerDisplay, btnStart);
  timerDiv.appendChild(btnReset);
  headerTimer.appendChild(timerDiv);
  overlay.appendChild(headerTimer);

  // Zona ejercicios
  const zonaEjercicios = document.createElement("div");
  zonaEjercicios.id = "zonaEjercicios";
  zonaEjercicios.style.cssText = `flex: 1; padding: 12px; padding-bottom: 80px;`;
  overlay.appendChild(zonaEjercicios);

  // Footer
  const footer = document.createElement("div");
  footer.style.cssText = `
    position: fixed; bottom: 0; left: 0; right: 0;
    background: var(--bg-card); padding: 12px;
    box-shadow: 0 -2px 10px rgba(0,0,0,0.1);
    display: flex; gap: 8px; z-index: 100;
  `;

  const btnAgregar = document.createElement("button");
  btnAgregar.textContent = "+ Ejercicio";
  btnAgregar.style.cssText = `
    flex: 1; background: var(--primary-mint); color: white;
    border: none; padding: 12px; border-radius: 8px;
    font-weight: 700; font-size: 0.9rem; cursor: pointer; transition: all 0.2s;
  `;
  btnAgregar.onclick = () => {
    if (window.abrirBuscadorEjercicios) {
      window.abrirBuscadorEjercicios((nombre) => {
        entrenamientoActual.ejercicios.push({ nombre, series: [] });
        renderizarEjerciciosLive();
      });
    }
  };
  footer.appendChild(btnAgregar);

  const btnGuardar = document.createElement("button");
  btnGuardar.textContent = "💾 Guardar";
  btnGuardar.style.cssText = `
    flex: 1; background: var(--success); color: white;
    border: none; padding: 12px; border-radius: 8px;
    font-weight: 700; font-size: 0.9rem; cursor: pointer; transition: all 0.2s;
  `;
  btnGuardar.onclick = () => {
    if (entrenamientoActual.ejercicios.length === 0) { alert("Añade al menos un ejercicio"); return; }
    if (!entrenamientoActual.fecha) { alert("Selecciona una fecha"); return; }
    mostrarOpcionesGuardado(overlay);
  };
  footer.appendChild(btnGuardar);

  overlay.appendChild(footer);
  document.body.appendChild(overlay);
  renderizarEjerciciosLive();
}

// Funciones del temporizador
function startTimer(display, btn) {
  if (timerPaused) {
    timerPaused = false;
    btn.textContent = "⏸";
    timerInterval = setInterval(() => { timerSeconds++; updateTimerDisplay(display); }, 1000);
  } else if (timerInterval) {
    timerPaused = true;
    btn.textContent = "▶";
    clearInterval(timerInterval);
    timerInterval = null;
  } else {
    btn.textContent = "⏸";
    timerInterval = setInterval(() => { timerSeconds++; updateTimerDisplay(display); }, 1000);
  }
}

function resetTimer(display, btn) {
  clearInterval(timerInterval);
  timerInterval = null;
  timerSeconds = 0;
  timerPaused = false;
  btn.textContent = "▶";
  updateTimerDisplay(display);
}

function updateTimerDisplay(display) {
  const mins = Math.floor(timerSeconds / 60);
  const secs = timerSeconds % 60;
  display.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// ✅ FIX: async + for...of en lugar de forEach para poder usar await
async function renderizarEjerciciosLive() {
  const zona = document.getElementById("zonaEjercicios");
  if (!zona) return;

  zona.innerHTML = '';

  if (entrenamientoActual.ejercicios.length === 0) {
    const mensaje = document.createElement("div");
    mensaje.style.cssText = `text-align: center; padding: 40px 20px; color: var(--text-secondary);`;
    mensaje.innerHTML = `<p style="font-size: 2rem; margin-bottom: 8px;">🏋️</p><p>Añade ejercicios para comenzar</p>`;
    zona.appendChild(mensaje);
    return;
  }

  // ✅ for...of con entries() para tener el índice y poder usar await
  for (const [ejIdx, ejercicio] of entrenamientoActual.ejercicios.entries()) {

    const ejercicioDiv = document.createElement("div");
    ejercicioDiv.style.cssText = `
      background: var(--bg-card); border-radius: 12px; margin-bottom: 8px;
      box-shadow: var(--shadow-sm); transition: all 0.2s ease;
      border: 1px solid transparent;
    `;

    // Header del ejercicio
    const headerEj = document.createElement("div");
    headerEj.style.cssText = `
      display: flex; justify-content: space-between; align-items: center;
      padding: 12px; cursor: pointer; border-radius: 12px; transition: all 0.2s ease;
    `;

    const iconoExpand = document.createElement("span");
    iconoExpand.textContent = ejercicioExpandidoLive === ejIdx ? '▼' : '▶';
    iconoExpand.style.cssText = `
      font-size: 0.8rem; color: var(--text-secondary);
      margin-right: 8px; flex-shrink: 0; transition: transform 0.2s ease;
    `;
    headerEj.appendChild(iconoExpand);

    const nombreEj = document.createElement("h3");
    nombreEj.textContent = ejercicio.nombre;
    nombreEj.style.cssText = `
      margin: 0; font-size: 1rem; font-weight: 700;
      color: var(--text-primary); flex: 1; text-align: left; user-select: none;
    `;
    headerEj.appendChild(nombreEj);

    const seriesCount = document.createElement("div");
    const numSeries = (ejercicio.series || []).length;
    seriesCount.textContent = `${numSeries} ${numSeries === 1 ? 'serie' : 'series'}`;
    seriesCount.style.cssText = `font-size: 0.8rem; color: var(--text-secondary); margin-right: 8px; flex-shrink: 0;`;
    headerEj.appendChild(seriesCount);

    const btnEliminar = document.createElement("button");
    btnEliminar.textContent = "🗑️";
    btnEliminar.style.cssText = `
      background: transparent; border: none; font-size: 0.85rem; cursor: pointer;
      padding: 4px; border-radius: 4px; transition: all 0.2s; opacity: 0.6;
      width: 24px; height: 24px; display: flex; align-items: center;
      justify-content: center; flex-shrink: 0;
    `;
    btnEliminar.onmouseover = () => { btnEliminar.style.background = "rgba(255,107,107,0.1)"; btnEliminar.style.opacity = "1"; };
    btnEliminar.onmouseout  = () => { btnEliminar.style.background = "transparent"; btnEliminar.style.opacity = "0.6"; };
    btnEliminar.onclick = (e) => {
      e.stopPropagation();
      if (confirm(`¿Eliminar ${ejercicio.nombre}?`)) {
        entrenamientoActual.ejercicios.splice(ejIdx, 1);
        ejercicioExpandidoLive = null;
        renderizarEjerciciosLive();
      }
    };
    headerEj.appendChild(btnEliminar);

    headerEj.addEventListener('click', (e) => {
      if (e.target === btnEliminar || btnEliminar.contains(e.target)) return;
      ejercicioExpandidoLive = ejercicioExpandidoLive === ejIdx ? null : ejIdx;
      renderizarEjerciciosLive();
    });
    headerEj.addEventListener('mouseenter', () => { if (ejercicioExpandidoLive !== ejIdx) headerEj.style.background = 'var(--bg-main)'; });
    headerEj.addEventListener('mouseleave', () => { headerEj.style.background = 'transparent'; });

    ejercicioDiv.appendChild(headerEj);

    // Contenido expandible
    if (ejercicioExpandidoLive === ejIdx) {
      const contenidoExpandible = document.createElement("div");
      contenidoExpandible.style.cssText = `
        padding: 0 12px 12px 12px; background: var(--bg-main);
        border-radius: 0 0 12px 12px; margin-top: -4px;
        animation: slideDown 0.2s ease;
      `;

      // Botón añadir serie
      const btnAñadirSerie = document.createElement("button");
      btnAñadirSerie.textContent = "+ Serie";
      btnAñadirSerie.style.cssText = `
        width: 100%; padding: 8px; margin-bottom: 12px;
        background: var(--primary-mint); color: white; border: none;
        border-radius: 8px; font-size: 0.85rem; font-weight: 700;
        cursor: pointer; transition: all 0.2s; text-transform: uppercase; letter-spacing: 0.5px;
      `;
      btnAñadirSerie.onmouseover = () => { btnAñadirSerie.style.background = "var(--mint-light)"; btnAñadirSerie.style.transform = "translateY(-1px)"; };
      btnAñadirSerie.onmouseout  = () => { btnAñadirSerie.style.background = "var(--primary-mint)"; btnAñadirSerie.style.transform = "translateY(0)"; };
      btnAñadirSerie.onclick = (e) => {
        e.stopPropagation();
        ejercicio.series.push({ reps: '', peso: '', rir: '', descanso: '', completada: false });
        renderizarEjerciciosLive();
      };
      contenidoExpandible.appendChild(btnAñadirSerie);

      // Encabezados
      const encabezado = document.createElement("div");
      encabezado.style.cssText = `
        display: grid; grid-template-columns: 40px repeat(4, 1fr) 80px;
        gap: 4px; margin-bottom: 8px; font-size: 0.7rem; font-weight: 700;
        color: var(--text-secondary); text-transform: uppercase; text-align: center;
      `;
      ['', 'REPS', 'PESO', 'RIR', 'DESC', ''].forEach(txt => {
        const col = document.createElement("div");
        col.textContent = txt;
        encabezado.appendChild(col);
      });
      contenidoExpandible.appendChild(encabezado);

      // Series
      ejercicio.series.forEach((serie, serieIdx) => {
        const serieDiv = document.createElement("div");
        serieDiv.style.cssText = `
          display: grid; grid-template-columns: 40px repeat(4, 1fr) 80px;
          gap: 4px; margin: 2px; padding: 1px 4px; align-items: center;
          border-radius: 8px; transition: all 0.2s; min-height: 45px; height: 45px;
          background: ${serie.completada ? 'rgba(61,213,152,0.1)' : 'transparent'};
        `;
        serieDiv.addEventListener('mouseenter', () => { if (!serie.completada) serieDiv.style.background = 'rgba(255,255,255,0.3)'; });
        serieDiv.addEventListener('mouseleave', () => { serieDiv.style.background = serie.completada ? 'rgba(61,213,152,0.1)' : 'transparent'; });

        const num = document.createElement("div");
        num.textContent = serieIdx + 1;
        num.style.cssText = `
          width: 26px; height: 26px; padding: 2px 4px; margin: 2px;
          font-size: 1.2rem; font-weight: 700; border: none !important;
          border-radius: 6px; background: transparent; cursor: pointer;
          transition: all 0.2s ease; color: var(--text-primary);
          display: flex; align-items: center; justify-content: center; box-shadow: none !important;
        `;
        serieDiv.appendChild(num);

        const crearInput = (valor, placeholder, campo) => {
          const input = document.createElement("input");
          input.type = "text";
          input.value = valor || '';
          input.placeholder = placeholder;
          input.style.cssText = `
            margin: 2px; padding: 2px 4px; font-size: 1.2rem; font-weight: 300;
            background: transparent; border: none; transition: all 0.2s ease;
            box-shadow: none; min-height: 26px; height: 26px;
          `;
          input.addEventListener('focus', () => {
            input.style.border = '1px solid var(--primary-mint)';
            input.style.background = 'rgba(255,255,255,0.5)';
            input.style.outline = 'none';
            input.style.boxShadow = '0 0 0 2px rgba(61,213,152,0.1)';
          });
          input.addEventListener('blur', () => {
            input.style.border = 'none';
            input.style.background = 'transparent';
            input.style.boxShadow = 'none';
          });
          input.addEventListener("input", () => { serie[campo] = input.value; });
          return input;
        };

        serieDiv.appendChild(crearInput(serie.reps,     'R', 'reps'));
        serieDiv.appendChild(crearInput(serie.peso,     'P', 'peso'));
        serieDiv.appendChild(crearInput(serie.rir,      'R', 'rir'));
        serieDiv.appendChild(crearInput(serie.descanso, 'D', 'descanso'));

        const botonesContainer = document.createElement("div");
        botonesContainer.style.cssText = `display: flex; gap: 2px; justify-content: center; align-items: center;`;

        const btnCheck = document.createElement("button");
        btnCheck.textContent = serie.completada ? '✔️' : '🕔';
        btnCheck.style.cssText = `
          border: none; font-size: 1.1rem; cursor: pointer; padding: 0;
          border-radius: 6px; transition: all 0.2s; background: transparent;
          width: 26px; height: 26px; display: flex; align-items: center; justify-content: center;
        `;
        btnCheck.onmouseover = () => { btnCheck.style.background = 'rgba(0,0,0,0.05)'; };
        btnCheck.onmouseout  = () => { btnCheck.style.background = 'transparent'; };
        btnCheck.onclick = (e) => {
          e.stopPropagation();
          serie.completada = !serie.completada;
          if (serie.completada && serie.descanso) iniciarTimer(serie.descanso);
          renderizarEjerciciosLive();
        };
        botonesContainer.appendChild(btnCheck);

        const btnEliminarSerie = document.createElement("button");
        btnEliminarSerie.textContent = "❌";
        btnEliminarSerie.style.cssText = `
          background: transparent; border: none; font-size: 1.1rem; cursor: pointer;
          padding: 0; border-radius: 6px; transition: all 0.2s; opacity: 0.4;
          width: 26px; height: 26px; display: flex; align-items: center; justify-content: center;
        `;
        btnEliminarSerie.onmouseover = () => { btnEliminarSerie.style.background = "rgba(0,0,0,0.05)"; btnEliminarSerie.style.opacity = "1"; };
        btnEliminarSerie.onmouseout  = () => { btnEliminarSerie.style.background = "transparent"; btnEliminarSerie.style.opacity = "0.4"; };
        btnEliminarSerie.onclick = (e) => {
          e.stopPropagation();
          ejercicio.series.splice(serieIdx, 1);
          renderizarEjerciciosLive();
        };
        botonesContainer.appendChild(btnEliminarSerie);

        serieDiv.appendChild(botonesContainer);
        contenidoExpandible.appendChild(serieDiv);
      });

      // Estadísticas sesión actual
      const statsActual = calcularEstadisticasEjercicio(ejercicio);
      if (statsActual.pesoMax > 0 || statsActual.volumenTotal > 0) {
        const statsContainer = document.createElement('div');
        statsContainer.style.cssText = `
          margin-top: 16px; padding: 12px;
          background: linear-gradient(135deg, rgba(61,213,152,0.1) 0%, rgba(0,212,212,0.1) 100%);
          border-radius: 10px; border: 1px solid var(--border-color);
        `;
        const statsTitulo = document.createElement('div');
        statsTitulo.textContent = '📊 Estadísticas de esta sesión';
        statsTitulo.style.cssText = `
          font-size: 0.8rem; font-weight: 700; color: var(--text-secondary);
          margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px;
        `;
        statsContainer.appendChild(statsTitulo);

        const statsGrid = document.createElement('div');
        statsGrid.style.cssText = `display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;`;

        const crearStatBox = (valor, unidad, label, color) => {
          const div = document.createElement('div');
          div.style.cssText = `text-align: center; padding: 8px; background: var(--bg-card); border-radius: 8px;`;
          div.innerHTML = `
            <div style="font-size:1.3rem;font-weight:700;color:${color};">${valor}<span style="font-size:0.8rem;font-weight:500;">${unidad}</span></div>
            <div style="font-size:0.65rem;color:var(--text-secondary);font-weight:600;margin-top:2px;">${label}</div>
          `;
          return div;
        };
        statsGrid.appendChild(crearStatBox(statsActual.pesoMax,     'kg', 'PESO MÁX',  'var(--primary-mint)'));
        statsGrid.appendChild(crearStatBox(statsActual.volumenTotal, 'kg', 'VOLUMEN',   'var(--secondary-cyan)'));
        statsGrid.appendChild(crearStatBox(statsActual.oneRM,        'kg', '1RM EST.',  'var(--primary-coral)'));
        statsContainer.appendChild(statsGrid);
        contenidoExpandible.appendChild(statsContainer);
      }

      // ✅ await funciona aquí porque estamos dentro de async function + for...of
      const sesionAnterior = await buscarSesionAnteriorEjercicio(ejercicio.nombre);
      if (sesionAnterior) {
        const statsAnterior = calcularEstadisticasEjercicio(sesionAnterior.ejercicio);

        const comparacionContainer = document.createElement('div');
        comparacionContainer.style.cssText = `
          margin-top: 12px; padding: 12px;
          background: linear-gradient(135deg, rgba(255,107,107,0.1) 0%, rgba(255,152,0,0.1) 100%);
          border-radius: 10px; border: 1px solid var(--border-color);
        `;

        const comparacionTitulo = document.createElement('div');
        comparacionTitulo.style.cssText = `
          font-size: 0.8rem; font-weight: 700; color: var(--text-secondary);
          margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;
          display: flex; justify-content: space-between; align-items: center;
        `;
        const tituloTexto = document.createElement('span');
        tituloTexto.textContent = '📈 Última vez';
        const fechaTexto = document.createElement('span');
        fechaTexto.textContent = new Date(sesionAnterior.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
        fechaTexto.style.cssText = `font-size: 0.75rem; font-weight: 600; color: var(--text-light);`;
        comparacionTitulo.appendChild(tituloTexto);
        comparacionTitulo.appendChild(fechaTexto);
        comparacionContainer.appendChild(comparacionTitulo);

        const comparacionGrid = document.createElement('div');
        comparacionGrid.style.cssText = `display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;`;

        const progresoPesoMax = statsActual.pesoMax > 0 && statsAnterior.pesoMax > 0
          ? ((statsActual.pesoMax - statsAnterior.pesoMax) / statsAnterior.pesoMax * 100) : 0;
        const progresoVolumen = statsActual.volumenTotal > 0 && statsAnterior.volumenTotal > 0
          ? ((statsActual.volumenTotal - statsAnterior.volumenTotal) / statsAnterior.volumenTotal * 100) : 0;
        const progreso1RM = statsActual.oneRM > 0 && statsAnterior.oneRM > 0
          ? ((statsActual.oneRM - statsAnterior.oneRM) / statsAnterior.oneRM * 100) : 0;

        const crearStatProgreso = (valor, progresoPercent, label) => {
          const div = document.createElement('div');
          div.style.cssText = `text-align: center; padding: 8px; background: var(--bg-card); border-radius: 8px;`;
          const colorProgreso = progresoPercent > 0 ? 'var(--success)' : progresoPercent < 0 ? 'var(--danger)' : 'var(--text-secondary)';
          const iconoProgreso = progresoPercent > 0 ? '↗' : progresoPercent < 0 ? '↘' : '━';
          div.innerHTML = `
            <div style="font-size:1.1rem;font-weight:700;color:var(--text-primary);">${valor}<span style="font-size:0.7rem;font-weight:500;">kg</span></div>
            <div style="font-size:0.7rem;color:${colorProgreso};font-weight:700;margin-top:2px;">${iconoProgreso} ${Math.abs(progresoPercent).toFixed(1)}%</div>
            <div style="font-size:0.6rem;color:var(--text-secondary);font-weight:600;margin-top:2px;">${label}</div>
          `;
          return div;
        };

        comparacionGrid.appendChild(crearStatProgreso(statsAnterior.pesoMax,     progresoPesoMax,  'PESO MÁX'));
        comparacionGrid.appendChild(crearStatProgreso(statsAnterior.volumenTotal, progresoVolumen,  'VOLUMEN'));
        comparacionGrid.appendChild(crearStatProgreso(statsAnterior.oneRM,        progreso1RM,      '1RM EST.'));
        comparacionContainer.appendChild(comparacionGrid);
        contenidoExpandible.appendChild(comparacionContainer);
      }

      // Notas
      const notasContainer = document.createElement('div');
      notasContainer.style.cssText = `
        margin-top: 12px; padding: 8px; background: var(--bg-card);
        border-radius: 8px; border: 1px solid var(--border-color);
      `;
      const notasLabel = document.createElement('div');
      notasLabel.textContent = '📝 Notas';
      notasLabel.style.cssText = `
        font-size: 0.7rem; font-weight: 700; color: var(--text-secondary);
        margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;
      `;
      notasContainer.appendChild(notasLabel);

      const notasTextarea = document.createElement('textarea');
      notasTextarea.value = ejercicio.notas || '';
      notasTextarea.placeholder = 'Añade notas sobre el ejercicio...';
      notasTextarea.style.cssText = `
        width: 100%; min-height: 36px; max-height: 54px; padding: 6px 8px;
        border: 1px solid var(--border-color); border-radius: 6px; font-size: 0.85rem;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif; resize: vertical;
        background: var(--bg-main); color: var(--text-primary); transition: all 0.2s ease;
      `;
      notasTextarea.addEventListener('focus', () => { notasTextarea.style.borderColor = 'var(--primary-mint)'; notasTextarea.style.background = 'white'; });
      notasTextarea.addEventListener('blur',  () => { notasTextarea.style.borderColor = 'var(--border-color)'; notasTextarea.style.background = 'var(--bg-main)'; ejercicio.notas = notasTextarea.value; });
      notasTextarea.addEventListener('input', () => { ejercicio.notas = notasTextarea.value; });
      notasContainer.appendChild(notasTextarea);
      contenidoExpandible.appendChild(notasContainer);

      ejercicioDiv.appendChild(contenidoExpandible);
    }

    zona.appendChild(ejercicioDiv);
  }
}

// Muestra opciones de guardado
function mostrarOpcionesGuardado(overlayEntrenamiento) {
  const modal = document.createElement("div");
  modal.className = "modal-overlay";
  const contenido = document.createElement("div");
  contenido.className = "modal";
  contenido.style.maxWidth = "400px";

  const titulo = document.createElement("h2");
  titulo.textContent = "Guardar entrenamiento";
  titulo.style.cssText = `color: var(--primary-mint); margin-bottom: 20px; font-size: 1.2rem;`;
  contenido.appendChild(titulo);

  const crearBtn = (texto, bg, onClick) => {
    const btn = document.createElement("button");
    btn.textContent = texto;
    btn.style.cssText = `width:100%;padding:14px;margin-bottom:10px;background:${bg};color:white;border:none;border-radius:8px;font-weight:700;font-size:0.95rem;cursor:pointer;`;
    btn.onclick = onClick;
    return btn;
  };

  contenido.appendChild(crearBtn("📋 Guardar en sesión existente", "var(--primary-mint)", () => { modal.remove(); mostrarSelectorSesion(overlayEntrenamiento); }));
  contenido.appendChild(crearBtn("➕ Crear nueva sesión", "var(--secondary-cyan)", () => { modal.remove(); mostrarFormularioNuevaSesion(overlayEntrenamiento); }));

  const btnCancelar = document.createElement("button");
  btnCancelar.textContent = "Cancelar";
  btnCancelar.style.cssText = `width:100%;padding:12px;background:transparent;color:var(--text-secondary);border:1px solid var(--border-color);border-radius:8px;font-weight:600;cursor:pointer;`;
  btnCancelar.onclick = () => modal.remove();
  contenido.appendChild(btnCancelar);

  modal.appendChild(contenido);
  document.body.appendChild(modal);
}

// Selector de sesiones
function mostrarSelectorSesion(overlayEntrenamiento) {
  const datos = window.datos || [];
  const modal = document.createElement("div");
  modal.className = "modal-overlay";
  const contenido = document.createElement("div");
  contenido.className = "modal modal-selector-sesion";
  contenido.style.cssText = `max-height: 80vh; overflow-y: auto; max-width: 500px;`;

  const titulo = document.createElement("h2");
  titulo.textContent = "Seleccionar sesión";
  titulo.style.cssText = `color: var(--primary-mint); margin-bottom: 16px; font-size: 1.1rem;`;
  contenido.appendChild(titulo);

  const listaSesiones = document.createElement("div");
  const sesiones = [];
  if (datos && datos[0]) {
    datos[0].hijos?.forEach((meso, mesoIdx) => {
      meso.hijos?.forEach((micro, microIdx) => {
        micro.hijos?.forEach((sesion, sesionIdx) => {
          sesiones.push({
            mesoIdx, microIdx, sesionIdx,
            mesoNombre:  meso.nombre  || `Mesociclo ${mesoIdx + 1}`,
            microNombre: micro.nombre || `Microciclo ${microIdx + 1}`,
            sesionNombre: sesion.nombre || `Sesión ${sesionIdx + 1}`,
            sesion
          });
        });
      });
    });
  }

  if (sesiones.length === 0) {
    const mensaje = document.createElement("p");
    mensaje.textContent = "No hay sesiones creadas.";
    mensaje.style.cssText = `text-align:center;color:var(--text-secondary);padding:20px;`;
    listaSesiones.appendChild(mensaje);
  } else {
    sesiones.forEach(s => {
      const item = document.createElement("div");
      item.style.cssText = `background:var(--bg-main);padding:12px;margin:8px 0;border-radius:8px;cursor:pointer;transition:all 0.2s;`;
      item.innerHTML = `
        <div style="font-weight:700;color:var(--text-primary);margin-bottom:4px;">${s.sesionNombre}</div>
        <div style="font-size:0.85rem;color:var(--text-secondary);">${s.mesoNombre} → ${s.microNombre}</div>
      `;
      item.onmouseover = () => { item.style.background = "var(--primary-mint)"; item.querySelectorAll("div").forEach(d => d.style.color = "#ffffff"); };
      item.onmouseout  = () => { item.style.background = "var(--bg-main)"; item.querySelector("div").style.color = "var(--text-primary)"; item.querySelector("div:last-child").style.color = "var(--text-secondary)"; };
      item.onclick = () => { guardarEnSesionExistente(s, overlayEntrenamiento); modal.remove(); };
      listaSesiones.appendChild(item);
    });
  }
  contenido.appendChild(listaSesiones);

  const btnVolver = document.createElement("button");
  btnVolver.textContent = "Volver";
  btnVolver.style.cssText = `width:100%;margin-top:16px;padding:12px;background:transparent;color:var(--text-secondary);border:1px solid var(--border-color);border-radius:8px;font-weight:600;cursor:pointer;`;
  btnVolver.onclick = () => { modal.remove(); mostrarOpcionesGuardado(overlayEntrenamiento); };
  contenido.appendChild(btnVolver);

  modal.appendChild(contenido);
  document.body.appendChild(modal);
}

// Guardar en sesión existente
function guardarEnSesionExistente(sesionInfo, overlayEntrenamiento) {
  const datos = window.datos || [];
  const { mesoIdx, microIdx, sesionIdx } = sesionInfo;
  try {
    const sesion = datos[0].hijos[mesoIdx].hijos[microIdx].hijos[sesionIdx];
    sesion.fecha = entrenamientoActual.fecha;
    if (!sesion.hijos) sesion.hijos = [];

    const bloqueNuevo = {
      nombre: `Entrenamiento ${new Date(entrenamientoActual.fecha).toLocaleDateString()}`,
      fecha: entrenamientoActual.fecha,
      hijos: []
    };
    entrenamientoActual.ejercicios.forEach(ej => {
      bloqueNuevo.hijos.push({ nombre: ej.nombre, series: ej.series.map(s => ({...s})), hijos: [] });
    });
    sesion.hijos.push(bloqueNuevo);

    if (typeof window.guardarDatos === 'function') window.guardarDatos();
    clearInterval(timerInterval);
    overlayEntrenamiento.remove();
    alert(`✅ Entrenamiento guardado en "${sesionInfo.sesionNombre}"`);

    if (window.rutaActual && typeof window.renderizar === 'function') {
      window.rutaActual.length = 0;
      window.rutaActual.push(0, mesoIdx, microIdx, sesionIdx);
      window.renderizar();
    }
  } catch (error) {
    console.error('Error:', error);
    alert('❌ Error al guardar');
  }
}

// Formulario nueva sesión
function mostrarFormularioNuevaSesion(overlayEntrenamiento) {
  const datos = window.datos || [];
  const modal = document.createElement("div");
  modal.className = "modal-overlay";
  const contenido = document.createElement("div");
  contenido.className = "modal";
  contenido.style.maxWidth = "500px";

  const titulo = document.createElement("h2");
  titulo.textContent = "Crear nueva sesión";
  titulo.style.cssText = `color: var(--primary-mint); margin-bottom: 20px; font-size: 1.1rem;`;
  contenido.appendChild(titulo);

  const addLabel = (text) => {
    const label = document.createElement("label");
    label.textContent = text;
    label.style.cssText = `display:block;margin-bottom:8px;font-weight:600;color:var(--text-secondary);font-size:0.9rem;`;
    contenido.appendChild(label);
    return label;
  };
  const addSelect = () => {
    const select = document.createElement("select");
    select.style.cssText = `width:100%;padding:10px;margin-bottom:16px;border:1px solid var(--border-color);border-radius:8px;font-size:0.95rem;`;
    contenido.appendChild(select);
    return select;
  };

  addLabel("Mesociclo:");
  const selectMeso = addSelect();
  let nuevoMesoNombre = null, nuevoMicroNombre = null;

  if (datos && datos[0] && datos[0].hijos) {
    datos[0].hijos.forEach((meso, idx) => {
      const option = document.createElement("option");
      option.value = idx;
      option.textContent = meso.nombre || `Mesociclo ${idx + 1}`;
      selectMeso.appendChild(option);
    });
  }
  const optNuevoMeso = document.createElement("option");
  optNuevoMeso.value = "nuevo"; optNuevoMeso.textContent = "➕ Crear nuevo mesociclo";
  selectMeso.appendChild(optNuevoMeso);

  addLabel("Microciclo:");
  const selectMicro = addSelect();

  function actualizarMicrociclos() {
    selectMicro.innerHTML = '';
    const mesoValue = selectMeso.value;
    if (mesoValue === "nuevo") {
      const opt = document.createElement("option");
      opt.value = "nuevo"; opt.textContent = "➕ Crear nuevo microciclo";
      selectMicro.appendChild(opt);
    } else {
      const mesoIdx = parseInt(mesoValue);
      if (datos && datos[0] && datos[0].hijos && datos[0].hijos[mesoIdx]) {
        (datos[0].hijos[mesoIdx].hijos || []).forEach((micro, idx) => {
          const opt = document.createElement("option");
          opt.value = idx; opt.textContent = micro.nombre || `Microciclo ${idx + 1}`;
          selectMicro.appendChild(opt);
        });
      }
      const optNuevoMicro = document.createElement("option");
      optNuevoMicro.value = "nuevo"; optNuevoMicro.textContent = "➕ Crear nuevo microciclo";
      selectMicro.appendChild(optNuevoMicro);
    }
  }
  selectMeso.addEventListener("change", actualizarMicrociclos);
  actualizarMicrociclos();

  addLabel("Nombre de la sesión:");
  const inputNombre = document.createElement("input");
  inputNombre.type = "text";
  inputNombre.placeholder = "Ej: Día de Pierna";
  inputNombre.value = `Entrenamiento ${new Date().toLocaleDateString()}`;
  inputNombre.style.cssText = `width:100%;padding:10px;margin-bottom:20px;border:1px solid var(--border-color);border-radius:8px;font-size:0.95rem;`;
  contenido.appendChild(inputNombre);

  const btnCrear = document.createElement("button");
  btnCrear.textContent = "Crear y guardar";
  btnCrear.style.cssText = `width:100%;padding:14px;margin-bottom:10px;background:var(--success);color:white;border:none;border-radius:8px;font-weight:700;font-size:0.95rem;cursor:pointer;`;
  btnCrear.onclick = () => {
    const nombreSesion = inputNombre.value.trim() || "Sesión sin nombre";
    const mesoValue = selectMeso.value;
    const microValue = selectMicro.value;

    if (mesoValue === "nuevo") {
      const nm = prompt("Nombre del nuevo mesociclo:");
      if (!nm?.trim()) { alert("❌ Debes ingresar un nombre para el mesociclo"); return; }
      nuevoMesoNombre = nm.trim();
      if (microValue === "nuevo") {
        const nmi = prompt("Nombre del nuevo microciclo:");
        if (!nmi?.trim()) { alert("❌ Debes ingresar un nombre para el microciclo"); return; }
        nuevoMicroNombre = nmi.trim();
        crearYGuardarNuevaSesion("nuevo", "nuevo", nombreSesion, overlayEntrenamiento, nuevoMesoNombre, nuevoMicroNombre);
      } else {
        crearYGuardarNuevaSesion("nuevo", parseInt(microValue), nombreSesion, overlayEntrenamiento, nuevoMesoNombre);
      }
    } else {
      const mesoIdx = parseInt(mesoValue);
      if (microValue === "nuevo") {
        const nmi = prompt("Nombre del nuevo microciclo:");
        if (!nmi?.trim()) { alert("❌ Debes ingresar un nombre para el microciclo"); return; }
        nuevoMicroNombre = nmi.trim();
        crearYGuardarNuevaSesion(mesoIdx, "nuevo", nombreSesion, overlayEntrenamiento, null, nuevoMicroNombre);
      } else {
        crearYGuardarNuevaSesion(mesoIdx, parseInt(microValue), nombreSesion, overlayEntrenamiento);
      }
    }
    modal.remove();
  };
  contenido.appendChild(btnCrear);

  const btnCancelar = document.createElement("button");
  btnCancelar.textContent = "Cancelar";
  btnCancelar.style.cssText = `width:100%;padding:12px;background:transparent;color:var(--text-secondary);border:1px solid var(--border-color);border-radius:8px;font-weight:600;cursor:pointer;`;
  btnCancelar.onclick = () => { modal.remove(); mostrarOpcionesGuardado(overlayEntrenamiento); };
  contenido.appendChild(btnCancelar);

  modal.appendChild(contenido);
  document.body.appendChild(modal);
}

// Crear y guardar nueva sesión
function crearYGuardarNuevaSesion(mesoIdx, microIdx, nombreSesion, overlayEntrenamiento, nuevoMesoNombre = null, nuevoMicroNombre = null) {
  const datos = window.datos || [];
  try {
    let mesoIndex = mesoIdx, microIndex = microIdx;

    if (mesoIdx === "nuevo") {
      datos[0].hijos.push({ nombre: nuevoMesoNombre || "Nuevo Mesociclo", hijos: [] });
      mesoIndex = datos[0].hijos.length - 1;
    }
    if (microIdx === "nuevo") {
      datos[0].hijos[mesoIndex].hijos.push({ nombre: nuevoMicroNombre || "Nuevo Microciclo", hijos: [] });
      microIndex = datos[0].hijos[mesoIndex].hijos.length - 1;
    }

    const micro = datos[0].hijos[mesoIndex].hijos[microIndex];
    if (!micro.hijos) micro.hijos = [];

    const nuevaSesion = {
      nombre: nombreSesion,
      fecha: entrenamientoActual.fecha,
      hijos: [{
        nombre: `Entrenamiento ${new Date(entrenamientoActual.fecha).toLocaleDateString()}`,
        fecha: entrenamientoActual.fecha,
        hijos: []
      }]
    };
    entrenamientoActual.ejercicios.forEach(ej => {
      nuevaSesion.hijos[0].hijos.push({ nombre: ej.nombre, series: ej.series.map(s => ({...s})), hijos: [] });
    });

    micro.hijos.push(nuevaSesion);
    const sesionIdx = micro.hijos.length - 1;

    if (typeof window.guardarDatos === 'function') window.guardarDatos();
    clearInterval(timerInterval);
    overlayEntrenamiento.remove();
    alert(`✅ Nueva sesión "${nombreSesion}" creada`);

    if (window.rutaActual && typeof window.renderizar === 'function') {
      window.rutaActual.length = 0;
      window.rutaActual.push(0, mesoIndex, microIndex, sesionIdx);
      window.renderizar();
    }
  } catch (error) {
    console.error('Error:', error);
    alert('❌ Error al crear la sesión');
  }
}