// live.js
// Lógica para el entrenamiento en vivo nueva

// Importar funciones del timer
import { iniciarTimer } from './timer.js';

// ==================== FUNCIONES DE ESTADÍSTICAS ====================

// Función para calcular estadísticas de un ejercicio
function calcularEstadisticasEjercicio(ejercicio) {
  const series = ejercicio.series || [];
  
  // Peso máximo
  const pesoMax = Math.max(...series.map(s => parseFloat(s.peso) || 0), 0);
  
  // Volumen total (peso × reps sumado)
  const volumenTotal = series.reduce((total, s) => {
    const peso = parseFloat(s.peso) || 0;
    const reps = parseInt(s.reps) || 0;
    return total + (peso * reps);
  }, 0);
  
  // 1RM estimado usando la fórmula de Epley: 1RM = peso × (1 + reps/30)
  // Tomamos la serie con mayor 1RM estimado
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

// Función para buscar la sesión anterior del mismo ejercicio
function buscarSesionAnteriorEjercicio(nombreEjercicio) {
  const datos = window.datos || [];
  const todasLasSesiones = [];

  // Recolectar todas las sesiones con sus fechas
  if (datos && datos[0]) {
    datos[0].hijos?.forEach((meso, mesoIdx) => {
      meso.hijos?.forEach((micro, microIdx) => {
        micro.hijos?.forEach((sesion, sesionIdx) => {
          let fechaSesion = sesion.fecha;
          if (!fechaSesion && sesion.hijos && sesion.hijos.length > 0) {
            for (const subNivel of sesion.hijos) {
              if (subNivel.fecha) {
                fechaSesion = subNivel.fecha;
                break;
              }
            }
          }

          if (fechaSesion) {
            // Buscar el ejercicio en la sesión
            const buscarEjercicioEnNivel = (nivel) => {
              if (nivel.nombre === nombreEjercicio && nivel.series) {
                return nivel;
              }
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

  // Ordenar por fecha descendente
  todasLasSesiones.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  // Obtener la fecha (día) de la sesión actual
  const fechaActual = entrenamientoActual.fecha;

  // Normalizar a día (YYYY-MM-DD) para comparar por día y no por timestamp
  const toDia = (raw) => {
    if (!raw) return null;
    const d = new Date(raw);
    if (isNaN(d)) return null;
    return d.toISOString().slice(0, 10);
  };

  const fechaActualDia = toDia(fechaActual);

  // Buscar la sesión anterior (solo sesiones estrictamente anteriores al día de la sesión actual)
  for (const sesion of todasLasSesiones) {
    const sesionDia = toDia(sesion.fecha);
    if (fechaActualDia) {
      // Si la sesión es de un día anterior al día actual, devolverla
      if (sesionDia && sesionDia < fechaActualDia) return sesion;
      // Si sesionDia >= fechaActualDia, continuar buscando
      continue;
    } else {
      // Si no tenemos fechaActual, devolver la primer sesión encontrada (más reciente)
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
    padding: 8px 12px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: space-between;
  `;
  
  // Contenedor izquierdo (vacío para centrar título)
  const headerLeft = document.createElement("div");
  headerLeft.style.cssText = `
    width: 36px;
  `;
  header.appendChild(headerLeft);
  
  // Botón cerrar (arriba derecha)
  const btnCerrar = document.createElement("button");
  btnCerrar.textContent = "✖";
  btnCerrar.style.cssText = `
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
  headerLeft.appendChild(btnCerrar);
  
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
    flex: 1;
  `;
  header.appendChild(titulo);
  
  // Fecha (input compacto a la derecha)
  const fechaInput = document.createElement("input");
  fechaInput.type = "date";
  fechaInput.id = "fechaEntrenamiento";
  fechaInput.value = entrenamientoActual.fecha;
  fechaInput.style.cssText = `
    padding: 4px 6px;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--primary-mint);
    width: 100px;
  `;
  fechaInput.addEventListener("change", (e) => {
    entrenamientoActual.fecha = e.target.value;
  });
  header.appendChild(fechaInput);
  
  overlay.appendChild(header);
  
  // Header secundario con temporizador
  const headerTimer = document.createElement("div");
  headerTimer.style.cssText = `
    background: var(--bg-card);
    padding: 8px 12px;
    border-bottom: 1px solid var(--border-color);
  `;
  
  const timerDisplay = document.createElement("div");
  timerDisplay.id = "timerDisplay";
  timerDisplay.textContent = "00:00";
  timerDisplay.style.cssText = `
    font-size: 1.6rem;
    font-weight: 700;
    color: var(--primary-mint);
    font-family: monospace;
  `;
  
  // Temporizador
  const timerDiv = document.createElement("div");
  timerDiv.id = "liveTimer";
  timerDiv.style.cssText = `
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
  `;
  
  const btnStart = document.createElement("button");
  btnStart.id = "btnStartTimer";
  btnStart.textContent = "▶";
  btnStart.style.cssText = `
    width: 36px;
    height: 36px;
    border: none;
    border-radius: 50%;
    background: var(--primary-mint);
    color: white;
    font-size: 1rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  `;
  btnStart.onclick = () => startTimer(timerDisplay, btnStart);
  timerDiv.appendChild(timerDisplay);
  timerDiv.appendChild(btnStart);
  
  const btnReset = document.createElement("button");
  btnReset.textContent = "↻";
  btnReset.style.cssText = `
    width: 32px;
    height: 32px;
    border: none;
    border-radius: 50%;
    background: var(--bg-main);
    color: var(--text-secondary);
    font-size: 0.95rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  `;
  btnReset.onclick = () => resetTimer(timerDisplay, btnStart);
  timerDiv.appendChild(btnReset);
  
  headerTimer.appendChild(timerDiv);
  overlay.appendChild(headerTimer);
  
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

// Renderiza los ejercicios (estilo nivel 4 con acordeón)
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
      margin-bottom: 8px;
      box-shadow: var(--shadow-sm);
      transition: all 0.2s ease;
      border: 1px solid transparent;
    `;
    
    // Header del ejercicio (siempre visible y clicable)
    const headerEj = document.createElement("div");
    headerEj.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px;
      cursor: pointer;
      border-radius: 12px;
      transition: all 0.2s ease;
    `;
    
    // Icono de expandir/contraer
    const iconoExpand = document.createElement("span");
    iconoExpand.textContent = ejercicioExpandidoLive === ejIdx ? '▼' : '▶';
    iconoExpand.style.cssText = `
      font-size: 0.8rem;
      color: var(--text-secondary);
      margin-right: 8px;
      flex-shrink: 0;
      transition: transform 0.2s ease;
    `;
    headerEj.appendChild(iconoExpand);
    
    const nombreEj = document.createElement("h3");
    nombreEj.textContent = ejercicio.nombre;
    nombreEj.style.cssText = `
      margin: 0;
      font-size: 1rem;
      font-weight: 700;
      color: var(--text-primary);
      flex: 1;
      text-align: left;
      user-select: none;
    `;
    headerEj.appendChild(nombreEj);
    
    // Contador de series
    const seriesCount = document.createElement("div");
    const numSeries = (ejercicio.series || []).length;
    seriesCount.textContent = `${numSeries} ${numSeries === 1 ? 'serie' : 'series'}`;
    seriesCount.style.cssText = `
      font-size: 0.8rem;
      color: var(--text-secondary);
      margin-right: 8px;
      flex-shrink: 0;
    `;
    headerEj.appendChild(seriesCount);
    
    // Botón eliminar
    const btnEliminar = document.createElement("button");
    btnEliminar.textContent = "🗑️";
    btnEliminar.style.cssText = `
      background: transparent;
      border: none;
      font-size: 0.85rem;
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
      transition: all 0.2s;
      opacity: 0.6;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    `;
    btnEliminar.onmouseover = () => {
      btnEliminar.style.background = "rgba(255, 107, 107, 0.1)";
      btnEliminar.style.opacity = "1";
    };
    btnEliminar.onmouseout = () => {
      btnEliminar.style.background = "transparent";
      btnEliminar.style.opacity = "0.6";
    };
    btnEliminar.onclick = (e) => {
      e.stopPropagation(); // Evitar que se expanda/contraiga al eliminar
      if (confirm(`¿Eliminar ${ejercicio.nombre}?`)) {
        entrenamientoActual.ejercicios.splice(ejIdx, 1);
        ejercicioExpandidoLive = null;
        renderizarEjerciciosLive();
      }
    };
    headerEj.appendChild(btnEliminar);
    
    // Click en header para expandir/contraer
    headerEj.addEventListener('click', (e) => {
      // Si el click es en el botón eliminar, no hacer nada
      if (e.target === btnEliminar || btnEliminar.contains(e.target)) return;
      
      if (ejercicioExpandidoLive === ejIdx) {
        ejercicioExpandidoLive = null;
      } else {
        ejercicioExpandidoLive = ejIdx;
      }
      renderizarEjerciciosLive();
    });
    
    // Efectos hover
    headerEj.addEventListener('mouseenter', () => {
      if (ejercicioExpandidoLive !== ejIdx) {
        headerEj.style.background = 'var(--bg-main)';
      }
    });
    
    headerEj.addEventListener('mouseleave', () => {
      headerEj.style.background = 'transparent';
    });
    
    ejercicioDiv.appendChild(headerEj);
    
    // Contenido expandible (solo si está expandido)
    if (ejercicioExpandidoLive === ejIdx) {
      const contenidoExpandible = document.createElement("div");
      contenidoExpandible.style.cssText = `
        padding: 0 12px 12px 12px;
        background: var(--bg-main);
        border-radius: 0 0 12px 12px;
        margin-top: -4px;
        animation: slideDown 0.2s ease;
      `;
      
      // Botón añadir serie
      const btnAñadirSerie = document.createElement("button");
      btnAñadirSerie.textContent = "+ Serie";
      btnAñadirSerie.style.cssText = `
        width: 100%;
        padding: 8px;
        margin-bottom: 12px;
        background: var(--primary-mint);
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 0.85rem;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.2s;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      `;
      btnAñadirSerie.onmouseover = () => {
        btnAñadirSerie.style.background = "var(--mint-light)";
        btnAñadirSerie.style.transform = "translateY(-1px)";
        btnAñadirSerie.style.boxShadow = "var(--shadow-sm)";
      };
      btnAñadirSerie.onmouseout = () => {
        btnAñadirSerie.style.background = "var(--primary-mint)";
        btnAñadirSerie.style.transform = "translateY(0)";
        btnAñadirSerie.style.boxShadow = "none";
      };
      btnAñadirSerie.onclick = (e) => {
        e.stopPropagation();
        ejercicio.series.push({ reps: '', peso: '', rir: '', descanso: '', completada: false });
        renderizarEjerciciosLive();
      };
      contenidoExpandible.appendChild(btnAñadirSerie);
      
      // Encabezados de series
      const encabezado = document.createElement("div");
      encabezado.style.cssText = `
        display: grid;
        grid-template-columns: 40px repeat(4, 1fr) 50px;
        gap: 4px;
        margin-bottom: 8px;
        font-size: 0.7rem;
        font-weight: 700;
        color: var(--text-secondary);
        text-transform: uppercase;
        text-align: center;
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
          display: grid;
          grid-template-columns: 40px repeat(4, 1fr) 50px;
          gap: 4px;
          margin-bottom: 4px;
          padding: 2px 4px;
          align-items: center;
          border-radius: 8px;
          transition: all 0.2s;
          min-height: auto;
          height: auto;
        `;
        
        // Cambiar fondo si está completada
        if (serie.completada) {
          serieDiv.style.background = 'rgba(61, 213, 152, 0.1)';
        } else {
          serieDiv.style.background = 'transparent';
        }
        
        serieDiv.addEventListener('mouseenter', () => {
          if (!serie.completada) {
            serieDiv.style.background = 'rgba(255, 255, 255, 0.3)';
          }
        });
        
        serieDiv.addEventListener('mouseleave', () => {
          if (serie.completada) {
            serieDiv.style.background = 'rgba(61, 213, 152, 0.1)';
          } else {
            serieDiv.style.background = 'transparent';
          }
        });
        
        // Número de serie
        const num = document.createElement("div");
        num.textContent = serieIdx + 1;
        num.style.cssText = `
          text-align: center;
          font-weight: 700;
          color: var(--text-primary);
          font-size: 0.85rem;
        `;
        serieDiv.appendChild(num);
        
        // Inputs
        const crearInput = (valor, placeholder, campo) => {
          const input = document.createElement("input");
          input.type = "text";
          input.value = valor || '';
          input.placeholder = placeholder;
          input.style.cssText = `
            padding: 6px 4px;
            border: 1px solid rgba(0, 0, 0, 0.08);
            border-radius: 6px;
            text-align: center;
            font-size: 0.85rem;
            background: transparent;
            color: var(--text-primary);
            height: 32px;
          `;
          input.addEventListener('focus', () => {
            input.style.border = '1px solid var(--primary-mint)';
            input.style.background = 'rgba(255, 255, 255, 0.5)';
            input.style.outline = 'none';
            input.style.boxShadow = '0 0 0 2px rgba(61, 213, 152, 0.1)';
          });
          input.addEventListener('blur', () => {
            input.style.border = '1px solid rgba(0, 0, 0, 0.08)';
            input.style.background = 'transparent';
            input.style.boxShadow = 'none';
          });
          input.addEventListener("input", () => {
            serie[campo] = input.value;
          });
          return input;
        };
        
        serieDiv.appendChild(crearInput(serie.reps, 'R', 'reps'));
        serieDiv.appendChild(crearInput(serie.peso, 'P', 'peso'));
        serieDiv.appendChild(crearInput(serie.rir, 'R', 'rir'));
        serieDiv.appendChild(crearInput(serie.descanso, 'D', 'descanso'));
        
        // Contenedor de botones (check + eliminar)
        const botonesContainer = document.createElement("div");
        botonesContainer.style.cssText = `
          display: flex;
          gap: 2px;
          justify-content: center;
          align-items: center;
        `;
        
        // Botón check/timer
        const btnCheck = document.createElement("button");
        if (serie.completada) {
          btnCheck.textContent = '✔️';
        } else {
          btnCheck.textContent = '🕔';
        }
        btnCheck.style.cssText = `
          border: none;
          font-size: 1rem;
          cursor: pointer;
          padding: 0;
          border-radius: 6px;
          transition: all 0.2s;
          background: transparent;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
        `;
        btnCheck.onmouseover = () => {
          btnCheck.style.background = serie.completada ? 'rgba(61, 213, 152, 0.3)' : 'var(--bg-main)';
        };
        btnCheck.onmouseout = () => {
          btnCheck.style.background = 'transparent';
        };
        btnCheck.onclick = (e) => {
          e.stopPropagation();
          serie.completada = !serie.completada;
          
          // Si se marca como completada y tiene tiempo de descanso, iniciar timer
          if (serie.completada && serie.descanso) {
            // Usar iniciarTimer importado de timer.js
            iniciarTimer(serie.descanso);
          }
          
          renderizarEjerciciosLive();
        };
        botonesContainer.appendChild(btnCheck);
        
        // Botón eliminar serie
        const btnEliminarSerie = document.createElement("button");
        btnEliminarSerie.textContent = "❌";
        btnEliminarSerie.style.cssText = `
          background: transparent;
          border: none;
          font-size: 1rem;
          cursor: pointer;
          padding: 0;
          border-radius: 6px;
          transition: all 0.2s;
          opacity: 0.4;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
        `;
        btnEliminarSerie.onmouseover = () => {
          btnEliminarSerie.style.background = "rgba(255, 107, 107, 0.1)";
          btnEliminarSerie.style.opacity = "1";
        };
        btnEliminarSerie.onmouseout = () => {
          btnEliminarSerie.style.background = "transparent";
          btnEliminarSerie.style.opacity = "0.4";
        };
        btnEliminarSerie.onclick = (e) => {
          e.stopPropagation();
          ejercicio.series.splice(serieIdx, 1);
          renderizarEjerciciosLive();
        };
        botonesContainer.appendChild(btnEliminarSerie);
        
        serieDiv.appendChild(botonesContainer);
        contenidoExpandible.appendChild(serieDiv);
      });
      
      // ==================== ESTADÍSTICAS DEL EJERCICIO ACTUAL ====================
      const statsActual = calcularEstadisticasEjercicio(ejercicio);
      if (statsActual.pesoMax > 0 || statsActual.volumenTotal > 0) {
        const statsContainer = document.createElement('div');
        statsContainer.style.marginTop = '16px';
        statsContainer.style.padding = '12px';
        statsContainer.style.background = 'linear-gradient(135deg, rgba(61, 213, 152, 0.1) 0%, rgba(0, 212, 212, 0.1) 100%)';
        statsContainer.style.borderRadius = '10px';
        statsContainer.style.border = '1px solid var(--border-color)';

        const statsTitulo = document.createElement('div');
        statsTitulo.textContent = '📊 Estadísticas de esta sesión';
        statsTitulo.style.fontSize = '0.8rem';
        statsTitulo.style.fontWeight = '700';
        statsTitulo.style.color = 'var(--text-secondary)';
        statsTitulo.style.marginBottom = '10px';
        statsTitulo.style.textTransform = 'uppercase';
        statsTitulo.style.letterSpacing = '0.5px';
        statsContainer.appendChild(statsTitulo);

        const statsGrid = document.createElement('div');
        statsGrid.style.display = 'grid';
        statsGrid.style.gridTemplateColumns = 'repeat(3, 1fr)';
        statsGrid.style.gap = '8px';

        // Peso máximo
        const statPesoMax = document.createElement('div');
        statPesoMax.style.textAlign = 'center';
        statPesoMax.style.padding = '8px';
        statPesoMax.style.background = 'var(--bg-card)';
        statPesoMax.style.borderRadius = '8px';
        statPesoMax.innerHTML = `
          <div style="font-size: 1.3rem; font-weight: 700; color: var(--primary-mint);">${statsActual.pesoMax}<span style="font-size: 0.8rem; font-weight: 500;">kg</span></div>
          <div style="font-size: 0.65rem; color: var(--text-secondary); font-weight: 600; margin-top: 2px;">PESO MÁX</div>
        `;
        statsGrid.appendChild(statPesoMax);

        // Volumen total
        const statVolumen = document.createElement('div');
        statVolumen.style.textAlign = 'center';
        statVolumen.style.padding = '8px';
        statVolumen.style.background = 'var(--bg-card)';
        statVolumen.style.borderRadius = '8px';
        statVolumen.innerHTML = `
          <div style="font-size: 1.3rem; font-weight: 700; color: var(--secondary-cyan);">${statsActual.volumenTotal}<span style="font-size: 0.8rem; font-weight: 500;">kg</span></div>
          <div style="font-size: 0.65rem; color: var(--text-secondary); font-weight: 600; margin-top: 2px;">VOLUMEN</div>
        `;
        statsGrid.appendChild(statVolumen);

        // 1RM estimado
        const stat1RM = document.createElement('div');
        stat1RM.style.textAlign = 'center';
        stat1RM.style.padding = '8px';
        stat1RM.style.background = 'var(--bg-card)';
        stat1RM.style.borderRadius = '8px';
        stat1RM.innerHTML = `
          <div style="font-size: 1.3rem; font-weight: 700; color: var(--primary-coral);">${statsActual.oneRM}<span style="font-size: 0.8rem; font-weight: 500;">kg</span></div>
          <div style="font-size: 0.65rem; color: var(--text-secondary); font-weight: 600; margin-top: 2px;">1RM EST.</div>
        `;
        statsGrid.appendChild(stat1RM);

        statsContainer.appendChild(statsGrid);
        contenidoExpandible.appendChild(statsContainer);
      }

      // ==================== COMPARACIÓN CON SESIÓN ANTERIOR ====================
      const sesionAnterior = buscarSesionAnteriorEjercicio(ejercicio.nombre);
      if (sesionAnterior) {
        const statsAnterior = calcularEstadisticasEjercicio(sesionAnterior.ejercicio);
        
        const comparacionContainer = document.createElement('div');
        comparacionContainer.style.marginTop = '12px';
        comparacionContainer.style.padding = '12px';
        comparacionContainer.style.background = 'linear-gradient(135deg, rgba(255, 107, 107, 0.1) 0%, rgba(255, 152, 0, 0.1) 100%)';
        comparacionContainer.style.borderRadius = '10px';
        comparacionContainer.style.border = '1px solid var(--border-color)';

        const comparacionTitulo = document.createElement('div');
        comparacionTitulo.style.fontSize = '0.8rem';
        comparacionTitulo.style.fontWeight = '700';
        comparacionTitulo.style.color = 'var(--text-secondary)';
        comparacionTitulo.style.marginBottom = '8px';
        comparacionTitulo.style.textTransform = 'uppercase';
        comparacionTitulo.style.letterSpacing = '0.5px';
        comparacionTitulo.style.display = 'flex';
        comparacionTitulo.style.justifyContent = 'space-between';
        comparacionTitulo.style.alignItems = 'center';
        
        const tituloTexto = document.createElement('span');
        tituloTexto.textContent = '📈 Última vez';
        
        const fechaTexto = document.createElement('span');
        fechaTexto.textContent = new Date(sesionAnterior.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
        fechaTexto.style.fontSize = '0.75rem';
        fechaTexto.style.fontWeight = '600';
        fechaTexto.style.color = 'var(--text-light)';
        
        comparacionTitulo.appendChild(tituloTexto);
        comparacionTitulo.appendChild(fechaTexto);
        comparacionContainer.appendChild(comparacionTitulo);

        const comparacionGrid = document.createElement('div');
        comparacionGrid.style.display = 'grid';
        comparacionGrid.style.gridTemplateColumns = 'repeat(3, 1fr)';
        comparacionGrid.style.gap = '8px';

        // Calcular progresos
        const progresoPesoMax = statsActual.pesoMax > 0 && statsAnterior.pesoMax > 0
          ? ((statsActual.pesoMax - statsAnterior.pesoMax) / statsAnterior.pesoMax * 100)
          : 0;
        
        const progresoVolumen = statsActual.volumenTotal > 0 && statsAnterior.volumenTotal > 0
          ? ((statsActual.volumenTotal - statsAnterior.volumenTotal) / statsAnterior.volumenTotal * 100)
          : 0;

        const progreso1RM = statsActual.oneRM > 0 && statsAnterior.oneRM > 0
          ? ((statsActual.oneRM - statsAnterior.oneRM) / statsAnterior.oneRM * 100)
          : 0;

        // Función helper para crear stat con progreso
        const crearStatProgreso = (valor, progresoPercent, label) => {
          const div = document.createElement('div');
          div.style.textAlign = 'center';
          div.style.padding = '8px';
          div.style.background = 'var(--bg-card)';
          div.style.borderRadius = '8px';
          
          let colorProgreso = 'var(--text-secondary)';
          let iconoProgreso = '━';
          if (progresoPercent > 0) {
            colorProgreso = 'var(--success)';
            iconoProgreso = '↗';
          } else if (progresoPercent < 0) {
            colorProgreso = 'var(--danger)';
            iconoProgreso = '↘';
          }
          
          div.innerHTML = `
            <div style="font-size: 1.1rem; font-weight: 700; color: var(--text-primary);">${valor}<span style="font-size: 0.7rem; font-weight: 500;">kg</span></div>
            <div style="font-size: 0.7rem; color: ${colorProgreso}; font-weight: 700; margin-top: 2px;">
              ${iconoProgreso} ${Math.abs(progresoPercent).toFixed(1)}%
            </div>
            <div style="font-size: 0.6rem; color: var(--text-secondary); font-weight: 600; margin-top: 2px;">${label}</div>
          `;
          return div;
        };

        comparacionGrid.appendChild(crearStatProgreso(statsAnterior.pesoMax, progresoPesoMax, 'PESO MÁX'));
        comparacionGrid.appendChild(crearStatProgreso(statsAnterior.volumenTotal, progresoVolumen, 'VOLUMEN'));
        comparacionGrid.appendChild(crearStatProgreso(statsAnterior.oneRM, progreso1RM, '1RM EST.'));

        comparacionContainer.appendChild(comparacionGrid);
        contenidoExpandible.appendChild(comparacionContainer);
      }
      
      ejercicioDiv.appendChild(contenidoExpandible);
    }
    
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
  
  // Variables para rastrear selecciones personalizadas
  let nuevoMesoNombre = null;
  let nuevoMicroNombre = null;
  
  if (datos && datos[0] && datos[0].hijos) {
    datos[0].hijos.forEach((meso, idx) => {
      const option = document.createElement("option");
      option.value = idx;
      option.textContent = meso.nombre || `Mesociclo ${idx + 1}`;
      selectMeso.appendChild(option);
    });
  }
  
  // Opción para crear nuevo mesociclo
  const optionNuevoMeso = document.createElement("option");
  optionNuevoMeso.value = "nuevo";
  optionNuevoMeso.textContent = "➕ Crear nuevo mesociclo";
  selectMeso.appendChild(optionNuevoMeso);
  
  addLabel("Microciclo:");
  const selectMicro = addSelect();
  
  function actualizarMicrociclos() {
    selectMicro.innerHTML = '';
    const mesoValue = selectMeso.value;
    
    if (mesoValue === "nuevo") {
      // Si se seleccionó crear nuevo mesociclo, mostrar opción para crear nuevo microciclo
      const optionNuevoMicro = document.createElement("option");
      optionNuevoMicro.value = "nuevo";
      optionNuevoMicro.textContent = "➕ Crear nuevo microciclo";
      selectMicro.appendChild(optionNuevoMicro);
      selectMicro.value = "nuevo";
    } else {
      const mesoIdx = parseInt(mesoValue);
      if (datos && datos[0] && datos[0].hijos && datos[0].hijos[mesoIdx]) {
        const micros = datos[0].hijos[mesoIdx].hijos || [];
        micros.forEach((micro, idx) => {
          const option = document.createElement("option");
          option.value = idx;
          option.textContent = micro.nombre || `Microciclo ${idx + 1}`;
          selectMicro.appendChild(option);
        });
      }
      
      // Agregar opción para crear nuevo microciclo
      const optionNuevoMicro = document.createElement("option");
      optionNuevoMicro.value = "nuevo";
      optionNuevoMicro.textContent = "➕ Crear nuevo microciclo";
      selectMicro.appendChild(optionNuevoMicro);
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
    const mesoValue = selectMeso.value;
    const microValue = selectMicro.value;
    
    // Manejar creación de nuevo mesociclo
    if (mesoValue === "nuevo") {
      const nuevoNombreMeso = prompt("Nombre del nuevo mesociclo:");
      if (!nuevoNombreMeso || !nuevoNombreMeso.trim()) {
        alert("❌ Debes ingresar un nombre para el mesociclo");
        return;
      }
      nuevoMesoNombre = nuevoNombreMeso.trim();
      
      // Si además crea nuevo microciclo
      if (microValue === "nuevo") {
        const nuevoNombreMicro = prompt("Nombre del nuevo microciclo:");
        if (!nuevoNombreMicro || !nuevoNombreMicro.trim()) {
          alert("❌ Debes ingresar un nombre para el microciclo");
          return;
        }
        nuevoMicroNombre = nuevoNombreMicro.trim();
        crearYGuardarNuevaSesion("nuevo", "nuevo", nombreSesion, overlayEntrenamiento, nuevoMesoNombre, nuevoMicroNombre);
      } else {
        crearYGuardarNuevaSesion("nuevo", parseInt(microValue), nombreSesion, overlayEntrenamiento, nuevoMesoNombre);
      }
    } else {
      const mesoIdx = parseInt(mesoValue);
      
      // Manejar creación de nuevo microciclo
      if (microValue === "nuevo") {
        const nuevoNombreMicro = prompt("Nombre del nuevo microciclo:");
        if (!nuevoNombreMicro || !nuevoNombreMicro.trim()) {
          alert("❌ Debes ingresar un nombre para el microciclo");
          return;
        }
        nuevoMicroNombre = nuevoNombreMicro.trim();
        crearYGuardarNuevaSesion(mesoIdx, "nuevo", nombreSesion, overlayEntrenamiento, null, nuevoMicroNombre);
      } else {
        // Caso normal
        crearYGuardarNuevaSesion(mesoIdx, parseInt(microValue), nombreSesion, overlayEntrenamiento);
      }
    }
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
function crearYGuardarNuevaSesion(mesoIdx, microIdx, nombreSesion, overlayEntrenamiento, nuevoMesoNombre = null, nuevoMicroNombre = null) {
  const datos = window.datos || [];
  
  try {
    let mesoIndex = mesoIdx;
    let microIndex = microIdx;
    
    // Crear nuevo mesociclo si es necesario
    if (mesoIdx === "nuevo") {
      const nuevoMeso = {
        nombre: nuevoMesoNombre || "Nuevo Mesociclo",
        hijos: []
      };
      datos[0].hijos.push(nuevoMeso);
      mesoIndex = datos[0].hijos.length - 1;
    }
    
    // Crear nuevo microciclo si es necesario
    if (microIdx === "nuevo") {
      const nuevoMicro = {
        nombre: nuevoMicroNombre || "Nuevo Microciclo",
        hijos: []
      };
      datos[0].hijos[mesoIndex].hijos.push(nuevoMicro);
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
      window.rutaActual.push(0, mesoIndex, microIndex, sesionIdx);
      window.renderizar();
    }
    
  } catch (error) {
    console.error('Error:', error);
    alert('❌ Error al crear la sesión');
  }
}