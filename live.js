// live.js
// Lógica para el entrenamiento en vivo

// Variable global para almacenar el estado del entrenamiento
let entrenamientoActual = {
  ejercicios: [],
  fecha: ''
};

// Variables del temporizador
let timerInterval = null;
let timerSeconds = 0;
let timerPaused = false;

// Inicia el flujo de entrenamiento en vivo
export function iniciarEntrenamiento() {
  entrenamientoActual = {
    ejercicios: [],
    fecha: new Date().toISOString().slice(0, 10)
  };
  timerSeconds = 0;
  timerPaused = false;
  abrirEntrenamientoEnVivo();
}

// Crea la pantalla completa de entrenamiento
function abrirEntrenamientoEnVivo() {
  const overlay = document.createElement("div");
  overlay.className = "entrenamiento-overlay";
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: var(--bg-main);
    z-index: 9999;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
  `;
  
  // Header compacto
  const header = document.createElement("div");
  header.style.cssText = `
    position: sticky;
    top: 0;
    background: var(--bg-card);
    padding: 12px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    z-index: 100;
  `;
  
  // Botón cerrar (arriba derecha)
  const btnCerrar = document.createElement("button");
  btnCerrar.textContent = "✖";
  btnCerrar.style.cssText = `
    position: absolute;
    top: 8px;
    right: 12px;
    background: transparent;
    border: none;
    font-size: 1.3rem;
    color: var(--text-secondary);
    cursor: pointer;
    width: 32px;
    height: 32px;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    transition: all 0.2s;
  `;
  btnCerrar.onmouseover = () => btnCerrar.style.background = "var(--bg-main)";
  btnCerrar.onmouseout = () => btnCerrar.style.background = "transparent";
  btnCerrar.onclick = () => {
    if (confirm("¿Cerrar sin guardar?")) {
      clearInterval(timerInterval);
      overlay.remove();
    }
  };
  header.appendChild(btnCerrar);
  
  // Título centrado
  const titulo = document.createElement("h2");
  titulo.textContent = "Entrenamiento en vivo";
  titulo.style.cssText = `
    margin: 0;
    text-align: center;
    font-size: 1rem;
    font-weight: 700;
    color: var(--primary-mint);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  `;
  header.appendChild(titulo);
  
  // Temporizador
  const timerDiv = document.createElement("div");
  timerDiv.id = "liveTimer";
  timerDiv.style.cssText = `
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    margin-top: 12px;
  `;
  
  const timerDisplay = document.createElement("div");
  timerDisplay.id = "timerDisplay";
  timerDisplay.textContent = "00:00";
  timerDisplay.style.cssText = `
    font-size: 1.8rem;
    font-weight: 700;
    color: var(--primary-mint);
    font-family: monospace;
  `;
  timerDiv.appendChild(timerDisplay);
  
  const btnStart = document.createElement("button");
  btnStart.id = "btnStartTimer";
  btnStart.textContent = "▶";
  btnStart.style.cssText = `
    width: 44px;
    height: 44px;
    border: none;
    border-radius: 50%;
    background: var(--primary-mint);
    color: white;
    font-size: 1.2rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  `;
  btnStart.onclick = () => startTimer(timerDisplay, btnStart);
  timerDiv.appendChild(btnStart);
  
  const btnReset = document.createElement("button");
  btnReset.textContent = "↻";
  btnReset.style.cssText = `
    width: 36px;
    height: 36px;
    border: none;
    border-radius: 50%;
    background: var(--bg-main);
    color: var(--text-secondary);
    font-size: 1.1rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  `;
  btnReset.onclick = () => resetTimer(timerDisplay, btnStart);
  timerDiv.appendChild(btnReset);
  
  header.appendChild(timerDiv);
  
  // Fecha
  const fechaContainer = document.createElement("div");
  fechaContainer.style.cssText = `
    margin-top: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  `;
  
  const fechaLabel = document.createElement("span");
  fechaLabel.textContent = "Fecha:";
  fechaLabel.style.cssText = `
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--text-secondary);
  `;
  fechaContainer.appendChild(fechaLabel);
  
  const fechaInput = document.createElement("input");
  fechaInput.type = "date";
  fechaInput.id = "fechaEntrenamiento";
  fechaInput.value = entrenamientoActual.fecha;
  fechaInput.style.cssText = `
    padding: 6px 10px;
    border: 1px solid var(--border-color);
    border-radius: 6px;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--primary-mint);
  `;
  fechaInput.addEventListener("change", (e) => {
    entrenamientoActual.fecha = e.target.value;
  });
  fechaContainer.appendChild(fechaInput);
  
  header.appendChild(fechaContainer);
  overlay.appendChild(header);
  
  // Zona de ejercicios
  const zonaEjercicios = document.createElement("div");
  zonaEjercicios.id = "zonaEjercicios";
  zonaEjercicios.style.cssText = `
    flex: 1;
    padding: 12px;
    padding-bottom: 80px;
  `;
  overlay.appendChild(zonaEjercicios);
  
  // Footer con botones
  const footer = document.createElement("div");
  footer.style.cssText = `
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: var(--bg-card);
    padding: 12px;
    box-shadow: 0 -2px 10px rgba(0,0,0,0.1);
    display: flex;
    gap: 8px;
    z-index: 100;
  `;
  
  const btnAgregar = document.createElement("button");
  btnAgregar.textContent = "+ Ejercicio";
  btnAgregar.style.cssText = `
    flex: 1;
    background: var(--primary-mint);
    color: white;
    border: none;
    padding: 12px;
    border-radius: 8px;
    font-weight: 700;
    font-size: 0.9rem;
    cursor: pointer;
    transition: all 0.2s;
  `;
  btnAgregar.onclick = () => {
    if (window.abrirBuscadorEjercicios) {
      window.abrirBuscadorEjercicios((nombre) => {
        entrenamientoActual.ejercicios.push({
          nombre: nombre,
          series: []
        });
        renderizarEjerciciosLive();
      });
    }
  };
  footer.appendChild(btnAgregar);
  
  const btnGuardar = document.createElement("button");
  btnGuardar.textContent = "💾 Guardar";
  btnGuardar.style.cssText = `
    flex: 1;
    background: var(--success);
    color: white;
    border: none;
    padding: 12px;
    border-radius: 8px;
    font-weight: 700;
    font-size: 0.9rem;
    cursor: pointer;
    transition: all 0.2s;
  `;
  btnGuardar.onclick = () => {
    if (entrenamientoActual.ejercicios.length === 0) {
      alert("Añade al menos un ejercicio");
      return;
    }
    if (!entrenamientoActual.fecha) {
      alert("Selecciona una fecha");
      return;
    }
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
    timerInterval = setInterval(() => {
      timerSeconds++;
      updateTimerDisplay(display);
    }, 1000);
  } else if (timerInterval) {
    timerPaused = true;
    btn.textContent = "▶";
    clearInterval(timerInterval);
    timerInterval = null;
  } else {
    btn.textContent = "⏸";
    timerInterval = setInterval(() => {
      timerSeconds++;
      updateTimerDisplay(display);
    }, 1000);
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

// Renderiza los ejercicios (estilo nivel 4)
function renderizarEjerciciosLive() {
  const zona = document.getElementById("zonaEjercicios");
  if (!zona) return;
  
  zona.innerHTML = '';
  
  if (entrenamientoActual.ejercicios.length === 0) {
    const mensaje = document.createElement("div");
    mensaje.style.cssText = `
      text-align: center;
      padding: 40px 20px;
      color: var(--text-secondary);
    `;
    mensaje.innerHTML = `
      <p style="font-size: 2rem; margin-bottom: 8px;">🏋️</p>
      <p>Añade ejercicios para comenzar</p>
    `;
    zona.appendChild(mensaje);
    return;
  }
  
  entrenamientoActual.ejercicios.forEach((ejercicio, ejIdx) => {
    // Contenedor del ejercicio
    const ejercicioDiv = document.createElement("div");
    ejercicioDiv.style.cssText = `
      background: var(--bg-card);
      border-radius: 12px;
      padding: 12px;
      margin-bottom: 12px;
      box-shadow: var(--shadow-sm);
    `;
    
    // Header del ejercicio
    const headerEj = document.createElement("div");
    headerEj.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    `;
    
    const nombreEj = document.createElement("h3");
    nombreEj.textContent = ejercicio.nombre;
    nombreEj.style.cssText = `
      margin: 0;
      font-size: 1rem;
      font-weight: 700;
      color: var(--text-primary);
    `;
    headerEj.appendChild(nombreEj);
    
    const btnEliminar = document.createElement("button");
    btnEliminar.textContent = "🗑️";
    btnEliminar.style.cssText = `
      background: transparent;
      border: none;
      font-size: 1.1rem;
      cursor: pointer;
      padding: 4px;
    `;
    btnEliminar.onclick = () => {
      if (confirm(`¿Eliminar ${ejercicio.nombre}?`)) {
        entrenamientoActual.ejercicios.splice(ejIdx, 1);
        renderizarEjerciciosLive();
      }
    };
    headerEj.appendChild(btnEliminar);
    ejercicioDiv.appendChild(headerEj);
    
    // Encabezados de series
    const encabezado = document.createElement("div");
    encabezado.style.cssText = `
      display: grid;
      grid-template-columns: 40px 1fr 1fr 1fr 1fr 40px;
      gap: 4px;
      margin-bottom: 8px;
      font-size: 0.7rem;
      font-weight: 700;
      color: var(--text-secondary);
      text-transform: uppercase;
      text-align: center;
    `;
    ['#', 'REPS', 'PESO', 'RIR', 'DESC', ''].forEach(txt => {
      const col = document.createElement("div");
      col.textContent = txt;
      encabezado.appendChild(col);
    });
    ejercicioDiv.appendChild(encabezado);
    
    // Series
    ejercicio.series.forEach((serie, serieIdx) => {
      const serieDiv = document.createElement("div");
      serieDiv.style.cssText = `
        display: grid;
        grid-template-columns: 40px 1fr 1fr 1fr 1fr 40px;
        gap: 4px;
        margin-bottom: 6px;
        align-items: center;
      `;
      
      // Número
      const num = document.createElement("div");
      num.textContent = serieIdx + 1;
      num.style.cssText = `
        text-align: center;
        font-weight: 700;
        color: var(--primary-mint);
        font-size: 0.9rem;
      `;
      serieDiv.appendChild(num);
      
      // Inputs
      const crearInput = (valor, placeholder, campo) => {
        const input = document.createElement("input");
        input.type = "text";
        input.value = valor || '';
        input.placeholder = placeholder;
        input.style.cssText = `
          padding: 8px 4px;
          border: 1px solid var(--border-color);
          border-radius: 6px;
          text-align: center;
          font-size: 0.85rem;
          background: var(--bg-main);
        `;
        input.addEventListener("input", () => {
          serie[campo] = input.value;
        });
        return input;
      };
      
      serieDiv.appendChild(crearInput(serie.reps, 'Reps', 'reps'));
      serieDiv.appendChild(crearInput(serie.peso, 'Peso', 'peso'));
      serieDiv.appendChild(crearInput(serie.rir, 'RIR', 'rir'));
      serieDiv.appendChild(crearInput(serie.descanso, 'Desc', 'descanso'));
      
      // Botón eliminar serie
      const btnEliminarSerie = document.createElement("button");
      btnEliminarSerie.textContent = "❌";
      btnEliminarSerie.style.cssText = `
        background: transparent;
        border: none;
        font-size: 0.85rem;
        cursor: pointer;
        padding: 4px;
      `;
      btnEliminarSerie.onclick = () => {
        ejercicio.series.splice(serieIdx, 1);
        renderizarEjerciciosLive();
      };
      serieDiv.appendChild(btnEliminarSerie);
      
      ejercicioDiv.appendChild(serieDiv);
    });
    
    // Botón añadir serie
    const btnAñadirSerie = document.createElement("button");
    btnAñadirSerie.textContent = "+ Añadir serie";
    btnAñadirSerie.style.cssText = `
      width: 100%;
      padding: 8px;
      margin-top: 8px;
      background: var(--bg-main);
      border: 1px solid var(--border-color);
      border-radius: 6px;
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-primary);
      cursor: pointer;
      transition: all 0.2s;
    `;
    btnAñadirSerie.onmouseover = () => {
      btnAñadirSerie.style.background = "var(--primary-mint)";
      btnAñadirSerie.style.color = "white";
    };
    btnAñadirSerie.onmouseout = () => {
      btnAñadirSerie.style.background = "var(--bg-main)";
      btnAñadirSerie.style.color = "var(--text-primary)";
    };
    btnAñadirSerie.onclick = () => {
      ejercicio.series.push({ reps: '', peso: '', rir: '', descanso: '' });
      renderizarEjerciciosLive();
    };
    ejercicioDiv.appendChild(btnAñadirSerie);
    
    zona.appendChild(ejercicioDiv);
  });
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
  titulo.style.cssText = `
    color: var(--primary-mint);
    margin-bottom: 20px;
    font-size: 1.2rem;
  `;
  contenido.appendChild(titulo);
  
  const btnExistente = document.createElement("button");
  btnExistente.textContent = "📋 Guardar en sesión existente";
  btnExistente.style.cssText = `
    width: 100%;
    padding: 14px;
    margin-bottom: 10px;
    background: var(--primary-mint);
    color: white;
    border: none;
    border-radius: 8px;
    font-weight: 700;
    font-size: 0.95rem;
    cursor: pointer;
  `;
  btnExistente.onclick = () => {
    modal.remove();
    mostrarSelectorSesion(overlayEntrenamiento);
  };
  contenido.appendChild(btnExistente);
  
  const btnNueva = document.createElement("button");
  btnNueva.textContent = "➕ Crear nueva sesión";
  btnNueva.style.cssText = `
    width: 100%;
    padding: 14px;
    margin-bottom: 10px;
    background: var(--secondary-cyan);
    color: white;
    border: none;
    border-radius: 8px;
    font-weight: 700;
    font-size: 0.95rem;
    cursor: pointer;
  `;
  btnNueva.onclick = () => {
    modal.remove();
    mostrarFormularioNuevaSesion(overlayEntrenamiento);
  };
  contenido.appendChild(btnNueva);
  
  const btnCancelar = document.createElement("button");
  btnCancelar.textContent = "Cancelar";
  btnCancelar.style.cssText = `
    width: 100%;
    padding: 12px;
    background: transparent;
    color: var(--text-secondary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
  `;
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
  contenido.style.cssText = `
    max-height: 80vh;
    overflow-y: auto;
    max-width: 500px;
  `;
  
  const titulo = document.createElement("h2");
  titulo.textContent = "Seleccionar sesión";
  titulo.style.cssText = `
    color: var(--primary-mint);
    margin-bottom: 16px;
    font-size: 1.1rem;
  `;
  contenido.appendChild(titulo);
  
  const listaSesiones = document.createElement("div");
  
  const sesiones = [];
  if (datos && datos[0]) {
    datos[0].hijos?.forEach((meso, mesoIdx) => {
      meso.hijos?.forEach((micro, microIdx) => {
        micro.hijos?.forEach((sesion, sesionIdx) => {
          sesiones.push({
            mesoIdx,
            microIdx,
            sesionIdx,
            mesoNombre: meso.nombre || `Mesociclo ${mesoIdx + 1}`,
            microNombre: micro.nombre || `Microciclo ${microIdx + 1}`,
            sesionNombre: sesion.nombre || `Sesión ${sesionIdx + 1}`,
            sesion: sesion
          });
        });
      });
    });
  }
  
  if (sesiones.length === 0) {
    const mensaje = document.createElement("p");
    mensaje.textContent = "No hay sesiones creadas.";
    mensaje.style.cssText = `
      text-align: center;
      color: var(--text-secondary);
      padding: 20px;
    `;
    listaSesiones.appendChild(mensaje);
  } else {
    sesiones.forEach(s => {
      const item = document.createElement("div");
      item.style.cssText = `
        background: var(--bg-main);
        padding: 12px;
        margin: 8px 0;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s;
      `;
      
      item.innerHTML = `
        <div style="font-weight: 700; color: var(--text-primary); margin-bottom: 4px;">
          ${s.sesionNombre}
        </div>
        <div style="font-size: 0.85rem; color: var(--text-secondary);">
          ${s.mesoNombre} → ${s.microNombre}
        </div>
      `;
      
      item.onmouseover = () => {
        item.style.background = "var(--primary-mint)";
        item.querySelectorAll("div").forEach(d => d.style.color = "#ffffff");
      };
      item.onmouseout = () => {
        item.style.background = "var(--bg-main)";
        item.querySelector("div").style.color = "var(--text-primary)";
        item.querySelector("div:last-child").style.color = "var(--text-secondary)";
      };
      
      item.onclick = () => {
        guardarEnSesionExistente(s, overlayEntrenamiento);
        modal.remove();
      };
      
      listaSesiones.appendChild(item);
    });
  }
  
  contenido.appendChild(listaSesiones);
  
  const btnVolver = document.createElement("button");
  btnVolver.textContent = "Volver";
  btnVolver.style.cssText = `
    width: 100%;
    margin-top: 16px;
    padding: 12px;
    background: transparent;
    color: var(--text-secondary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
  `;
  btnVolver.onclick = () => {
    modal.remove();
    mostrarOpcionesGuardado(overlayEntrenamiento);
  };
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
      bloqueNuevo.hijos.push({
        nombre: ej.nombre,
        series: ej.series.map(s => ({...s})),
        hijos: []
      });
    });
    
    sesion.hijos.push(bloqueNuevo);
    
    if (typeof window.guardarDatos === 'function') {
      window.guardarDatos();
    }
    
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
  titulo.style.cssText = `
    color: var(--primary-mint);
    margin-bottom: 20px;
    font-size: 1.1rem;
  `;
  contenido.appendChild(titulo);
  
  // Labels y selects
  const addLabel = (text) => {
    const label = document.createElement("label");
    label.textContent = text;
    label.style.cssText = `
      display: block;
      margin-bottom: 8px;
      font-weight: 600;
      color: var(--text-secondary);
      font-size: 0.9rem;
    `;
    contenido.appendChild(label);
    return label;
  };
  
  const addSelect = () => {
    const select = document.createElement("select");
    select.style.cssText = `
      width: 100%;
      padding: 10px;
      margin-bottom: 16px;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      font-size: 0.95rem;
    `;
    contenido.appendChild(select);
    return select;
  };
  
  addLabel("Mesociclo:");
  const selectMeso = addSelect();
  
  if (datos && datos[0] && datos[0].hijos) {
    datos[0].hijos.forEach((meso, idx) => {
      const option = document.createElement("option");
      option.value = idx;
      option.textContent = meso.nombre || `Mesociclo ${idx + 1}`;
      selectMeso.appendChild(option);
    });
  }
  
  addLabel("Microciclo:");
  const selectMicro = addSelect();
  
  function actualizarMicrociclos() {
    selectMicro.innerHTML = '';
    const mesoIdx = parseInt(selectMeso.value);
    if (datos && datos[0] && datos[0].hijos && datos[0].hijos[mesoIdx]) {
      const micros = datos[0].hijos[mesoIdx].hijos || [];
      micros.forEach((micro, idx) => {
        const option = document.createElement("option");
        option.value = idx;
        option.textContent = micro.nombre || `Microciclo ${idx + 1}`;
        selectMicro.appendChild(option);
      });
    }
  }
  
  selectMeso.addEventListener("change", actualizarMicrociclos);
  actualizarMicrociclos();
  
  addLabel("Nombre de la sesión:");
  const inputNombre = document.createElement("input");
  inputNombre.type = "text";
  inputNombre.placeholder = "Ej: Día de Pierna";
  inputNombre.value = `Entrenamiento ${new Date().toLocaleDateString()}`;
  inputNombre.style.cssText = `
    width: 100%;
    padding: 10px;
    margin-bottom: 20px;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    font-size: 0.95rem;
  `;
  contenido.appendChild(inputNombre);
  
  const btnCrear = document.createElement("button");
  btnCrear.textContent = "Crear y guardar";
  btnCrear.style.cssText = `
    width: 100%;
    padding: 14px;
    margin-bottom: 10px;
    background: var(--success);
    color: white;
    border: none;
    border-radius: 8px;
    font-weight: 700;
    font-size: 0.95rem;
    cursor: pointer;
  `;
  btnCrear.onclick = () => {
    const nombreSesion = inputNombre.value.trim() || "Sesión sin nombre";
    const mesoIdx = parseInt(selectMeso.value);
    const microIdx = parseInt(selectMicro.value);
    crearYGuardarNuevaSesion(mesoIdx, microIdx, nombreSesion, overlayEntrenamiento);
    modal.remove();
  };
  contenido.appendChild(btnCrear);
  
  const btnCancelar = document.createElement("button");
  btnCancelar.textContent = "Cancelar";
  btnCancelar.style.cssText = `
    width: 100%;
    padding: 12px;
    background: transparent;
    color: var(--text-secondary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
  `;
  btnCancelar.onclick = () => {
    modal.remove();
    mostrarOpcionesGuardado(overlayEntrenamiento);
  };
  contenido.appendChild(btnCancelar);
  
  modal.appendChild(contenido);
  document.body.appendChild(modal);
}

// Crear y guardar nueva sesión
function crearYGuardarNuevaSesion(mesoIdx, microIdx, nombreSesion, overlayEntrenamiento) {
  const datos = window.datos || [];
  
  try {
    const micro = datos[0].hijos[mesoIdx].hijos[microIdx];
    
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
      nuevaSesion.hijos[0].hijos.push({
        nombre: ej.nombre,
        series: ej.series.map(s => ({...s})),
        hijos: []
      });
    });
    
    micro.hijos.push(nuevaSesion);
    const sesionIdx = micro.hijos.length - 1;
    
    if (typeof window.guardarDatos === 'function') {
      window.guardarDatos();
    }
    
    clearInterval(timerInterval);
    overlayEntrenamiento.remove();
    alert(`✅ Nueva sesión "${nombreSesion}" creada`);
    
    if (window.rutaActual && typeof window.renderizar === 'function') {
      window.rutaActual.length = 0;
      window.rutaActual.push(0, mesoIdx, microIdx, sesionIdx);
      window.renderizar();
    }
    
  } catch (error) {
    console.error('Error:', error);
    alert('❌ Error al crear la sesión');
  }
}