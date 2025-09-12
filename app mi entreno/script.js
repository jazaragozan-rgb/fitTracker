//llamada a modulo dashboard.js
import { renderizarDashboard } from "./dashboard.js";
// ==================== Firebase Auth + Firestore ====================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { 
  getAuth, onAuthStateChanged, 
  createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut,
  sendEmailVerification, setPersistence, browserSessionPersistence
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import { mostrarConfirmacion, mostrarSelectorMarca } from "./modals.js";
import { iniciarTimer, restaurarTimer } from "./timer.js";

// ⚡ Configuración Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBYQPw0eoEtCZQ5NHYKHgXfcHpaW_ySzKU",
  authDomain: "sesionmientreno.firebaseapp.com",
  projectId: "sesionmientreno",
  storageBucket: "sesionmientreno.firebasestorage.app",
  messagingSenderId: "730288236333",
  appId: "1:730288236333:web:e4418ca39ffcd48f47d5a4",
  measurementId: "G-T8QZ7WZT5Y"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
setPersistence(auth, browserSessionPersistence);
const db = getFirestore(app);

// ==================== Helpers ====================
const $ = (id) => document.getElementById(id);
const show = (el) => el && el.classList.remove('hidden');
const hide = (el) => el && el.classList.add('hidden');
function getErrorMessage(error) {
  const map = {
    'auth/email-already-in-use': 'Ese email ya está registrado.',
    'auth/invalid-email': 'El email no es válido.',
    'auth/weak-password': 'Contraseña demasiado débil.',
    'auth/wrong-password': 'Contraseña incorrecta.',
    'auth/user-not-found': 'No existe un usuario con ese email.',
    'auth/too-many-requests': 'Demasiados intentos, espera un momento.'
  };
  return map[error.code] || error.message;
}

// ==================== Registro / Login / Logout ====================
window.register = async function () {
  const email = $('reg-email').value.trim();
  const pass  = $('reg-pass').value;
  const pass2 = $('reg-pass2').value;
  const msg   = $('reg-msg');
  msg.textContent = ''; msg.className = 'hint';

  if (pass !== pass2) {
    msg.textContent = 'Las contraseñas no coinciden.'; 
    msg.classList.add('err');
    return;
  }
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    await sendEmailVerification(cred.user);
    msg.textContent = 'Cuenta creada. Revisa tu correo.';
    msg.classList.add('ok');
    $('reg-email').value = $('reg-pass').value = $('reg-pass2').value = '';
  } catch (err) {
    msg.textContent = getErrorMessage(err);
    msg.classList.add('err');
  }
};

window.login = async function () {
  const email = $('log-email').value.trim();
  const pass  = $('log-pass').value;
  const msg   = $('log-msg');
  msg.textContent = ''; msg.className = 'hint';
  try {
    await signInWithEmailAndPassword(auth, email, pass);
    $('log-email').value = $('log-pass').value = '';
  } catch (err) {
    msg.textContent = getErrorMessage(err);
    msg.classList.add('err');
  }
};

window.salir = async function () {
  try { await signOut(auth); }
  catch (err) { console.error("Error al cerrar sesión:", err); }
};

// ==================== Datos por defecto ====================
const DATOS_POR_DEFECTO = [
  { nombre: 'Entrenamiento', hijos: [] },
  { nombre: 'Seguimiento', hijos: [] },
  { nombre: 'Calendario', hijos: [] }
];
let datos = JSON.parse(localStorage.getItem("misDatos")) || structuredClone(DATOS_POR_DEFECTO);

// Referencias UI
let rutaActual = [];
const contenido = $('contenido');
const tituloNivel = $('tituloNivel');
const headerButtons = $('headerButtons');
const addButton = $('addButton');
const backButton = $('backButton');
const timerContainer = $('timerContainer');
const homeButton = $('navHome');
const logoutButton = $('logoutButton');
const menuButton = $('menuButton');
const sideMenu = $('sideMenu');
const menuOverlay = $('menuOverlay');

if (backButton) {
  backButton.addEventListener("click", () => {
    if (rutaActual.length > 0) {
      rutaActual.pop();   // ← sube un nivel en la jerarquía
      renderizar();
    }
  });
}

// ==================== Firestore ====================
async function cargarDatosUsuario(uid) {
  if (!uid) return null;
  try {
    const ref = doc(db, "usuarios", uid);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const d = snap.data();
      if (d && Array.isArray(d.datos)) return structuredClone(d.datos);
    }
    return null;
  } catch (e) {
    console.error("Error al cargar datos:", e);
    return null;
  }
}

async function guardarDatosUsuario(uid, datosActuales) {
  if (!uid || !Array.isArray(datosActuales)) return;
  try {
    const ref = doc(db, "usuarios", uid);
    await setDoc(ref, { datos: structuredClone(datosActuales) });
  } catch (e) { console.error("Error al guardar datos:", e); }
}

let saveTimer = null;
function guardarDatos() {
  localStorage.setItem("misDatos", JSON.stringify(datos));
  const user = auth.currentUser;
  if (!user) return;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { guardarDatosUsuario(user.uid, datos); }, 300);
}

function nivelActual() {
  let nivel = { hijos: datos };
  for (let i of rutaActual) nivel = nivel.hijos[i];
  return nivel;
}

// ==================== Estado de sesión ====================
onAuthStateChanged(auth, async (user) => {
  const authSec = $('auth');
  const appSec  = $('app');
  hide($('welcome')); hide($('verify-hint'));

  if (user) {
    hide(authSec); 
    show(appSec); 
    show(contenido); 
    show(timerContainer);
    show(headerButtons); 
    show(homeButton); 
    show(logoutButton);
    show(addButton); 
    show(backButton);
    show(menuButton);
    show(tituloNivel);

    const datosRemotos = await cargarDatosUsuario(user.uid);
    datos = datosRemotos && Array.isArray(datosRemotos) ? datosRemotos : structuredClone(DATOS_POR_DEFECTO);
    if (!datosRemotos) await guardarDatosUsuario(user.uid, datos);
  } else {
    show(authSec); 
    hide(appSec); 
    hide(contenido); 
    hide(timerContainer);
    hide(headerButtons); 
    hide(homeButton); 
    hide(logoutButton); 
    hide(addButton); 
    hide(backButton);
    hide(menuButton);
    hide(tituloNivel);

    datos = JSON.parse(localStorage.getItem("misDatos")) || structuredClone(DATOS_POR_DEFECTO);
  }
  rutaActual = [];
  renderizar();
});

// ==================== Renderizado ====================
function renderizar() {
  if (!contenido) return;
  contenido.innerHTML = '';
  let nivel = nivelActual();

    if (rutaActual.length === 0) {
    renderizarDashboard(datos, rutaActual, crearIndice, contenido, tituloNivel, backButton, addButton);
    return;
  }

  if (rutaActual.length === 0) {
    tituloNivel.textContent = 'Dashboard';
    backButton.style.visibility = 'hidden';
    addButton.style.visibility = 'hidden';

    const dashboard = document.createElement('div');
    dashboard.className = 'dashboard-container';
    [{ titulo: 'Entrenamientos realizados', valor: 0 },
     { titulo: 'Ejercicios completados', valor: 0 },
     { titulo: 'Objetivos alcanzados', valor: 0 }]
     .forEach(t => {
       const card = document.createElement('div');
       card.className = 'dashboard-card';
       card.innerHTML = `<h3>${t.titulo}</h3><p>${t.valor}</p>`;
       dashboard.appendChild(card);
     });
    contenido.appendChild(dashboard);

    datos.filter(item => !['Entrenamiento','Seguimiento','Calendario'].includes(item.nombre))
         .forEach((item, index) => {
           const div = crearIndice(item, index, { hijos: datos });
           div.addEventListener('click', () => { rutaActual.push(index); renderizar(); });
           contenido.appendChild(div);
         });
    return;
  }

  // Nivel de series
  if (rutaActual.length === 5) {
    backButton.style.visibility = 'visible';
    addButton.style.visibility = 'hidden';
    tituloNivel.textContent = nivel.nombre;

    const encabezados = document.createElement('div');
    encabezados.className = 'series-header';
    ['','Reps','Peso','RIR','Descanso','',''].forEach(txt=>{
      const col=document.createElement('div');
      col.textContent=txt;
      encabezados.appendChild(col);
    });
    contenido.appendChild(encabezados);

    const seriesContainer = document.createElement('div');
    seriesContainer.className = 'series-container';
    nivel.series = nivel.series || [];
    nivel.series.forEach((serie, idx) => {
      const serieDiv = document.createElement('div');
      serieDiv.className="serie-row";

      const numBtn=document.createElement('button');
      numBtn.className="serie-num";
      numBtn.textContent=serie.marca|| (idx+1);
      numBtn.addEventListener('click',e=>{
        e.stopPropagation();
        mostrarSelectorMarca(serie,idx,()=>{
          guardarDatos();     // aquí sí tienes acceso
          renderizar();       // refresca la UI
        });
      });

      const reps=document.createElement('input');
      reps.placeholder='Reps'; reps.value=serie.reps||'';
      reps.addEventListener('input',e=>{serie.reps=e.target.value;guardarDatos();});

      const peso=document.createElement('input');
      peso.placeholder='Peso'; peso.value=serie.peso||'';
      peso.addEventListener('input',e=>{serie.peso=e.target.value;guardarDatos();});

      const rir=document.createElement('input');
      rir.placeholder='RIR'; rir.value=serie.rir||'';
      rir.addEventListener('input',e=>{serie.rir=e.target.value;guardarDatos();});

      const descanso=document.createElement('input');
      descanso.placeholder='Descanso'; descanso.value=serie.descanso||'';
      descanso.addEventListener('input',e=>{serie.descanso=e.target.value;guardarDatos();});

      const temporizador=document.createElement('button');
      temporizador.className="btn-timer"; temporizador.textContent='⏱';
      temporizador.addEventListener('click',()=>iniciarTimer(serie.descanso));

      const borrar=document.createElement('button');
      borrar.className="btn-delete"; borrar.textContent='🗑';
      borrar.addEventListener('click',()=> {
        mostrarConfirmacion("¿Desea borrar esta serie?",()=> {
          nivel.series.splice(idx,1); guardarDatos(); renderizar();
        });
      });

      [numBtn,reps,peso,rir,descanso,temporizador,borrar].forEach(el=>serieDiv.appendChild(el));
      seriesContainer.appendChild(serieDiv);
    });
    contenido.appendChild(seriesContainer);

    const addSerie=document.createElement('button');
    addSerie.textContent='+ Añadir Serie';
    addSerie.className='add-serie';
    addSerie.addEventListener('click',()=>{
      nivel.series.push({ reps:'', peso:'', rir:'', descanso:'' });
      guardarDatos(); renderizar();
    });
    contenido.appendChild(addSerie);

 // 📊 Bloque Volumen y 1RM
    const statsBox = document.createElement('div');
    statsBox.style.background = "#f5f5f5";
    statsBox.style.padding = "12px";
    statsBox.style.margin = "10px";
    statsBox.style.borderRadius = "8px";
    statsBox.style.color = "#000";

    // Calcular volumen total y 1RM
    let volumenTotal = 0;
    let mejor1RM = 0;
    nivel.series.forEach(serie => {
      const peso = parseFloat(serie.peso) || 0;
      const reps = parseInt(serie.reps) || 0;
      volumenTotal += peso * reps;
      const estimado = peso * (1 + reps / 30);
      if (estimado > mejor1RM) mejor1RM = estimado;
    });

    statsBox.innerHTML = `
      <p><b>Volumen total:</b> ${volumenTotal.toFixed(2)} kg</p>
      <p><b>1RM estimado:</b> ${mejor1RM.toFixed(2)} kg</p>
    `;

    contenido.appendChild(statsBox);

    // ==================== FUNCIONES ====================

function fechaATimestamp(fechaStr) {
  if (!fechaStr || typeof fechaStr !== "string") return 0;
  return new Date(fechaStr).getTime() || 0;
}

// ==================== Buscar ejercicio anterior ====================
// Obtener nodo "Full body" o "Push pull legs" (nivel 3)
const sesion = datos?.[rutaActual[0]]?.hijos?.[rutaActual[1]]?.hijos?.[rutaActual[2]];
console.log("📌 Nodo 'Full body' o 'Push pull legs' (nivel 3):", sesion);

// Mostrar los hijos de "Full body" o "Push pull legs" (nivel 4)
console.log("📌 Hijos de 'Full body' o 'Push pull legs' (nivel 4):", sesion?.hijos);

// Obtener el hijo específico en nivel 4 (donde puede estar la fecha)
const nivel4 = sesion?.hijos?.[rutaActual[3]];
console.log("📌 Nodo nivel 4:", nivel4);

// Intentar leer la fecha en nivel 4
const fechaActualSesion = nivel4?.fecha || null;
console.log("📌 Fecha sesión actual (nivel 4):", fechaActualSesion);

const nombreEjercicioActual = nivel.nombre.trim().toLowerCase();  // Normalizar nombre ejercicio actual
let ejercicioAnterior = null;
let timestampActual = fechaATimestamp(fechaActualSesion);

console.log("📌 Fecha sesión actual:", fechaActualSesion);
console.log("📌 Timestamp actual:", timestampActual);
console.log("📌 Nombre ejercicio actual:", nombreEjercicioActual);  // Mostrar nombre ejercicio actual normalizado

// Ahora solo necesitamos recorrer las sesiones de "Full body" y "Push pull legs" que contienen la fecha
for (const meso of datos) {
  console.log(`🔸 Mesociclo: ${meso.nombre || "sin nombre"}`);

  // Buscar el nodo "Full body" o "Push pull legs"
  for (const micro of meso.hijos || []) {
    console.log(`  🔹 Microciclo: ${micro.nombre || "sin nombre"}`);

    // Comprobamos si el microciclo es "Fuerza" o algún otro objetivo
    if (micro.nombre && micro.nombre.toLowerCase() === "fuerza") {
      console.log("    ✅ Microciclo 'Fuerza' encontrado, buscando dentro...");

      // Buscamos dentro de los hijos de "Full body" o "Push pull legs" (sesiones)
      for (const sesion of micro.hijos || []) {
        console.log(`    🔹 Sesión encontrada: ${sesion.nombre}`);

        // Verificamos si la sesión tiene una fecha
        if (!sesion.fecha) {
          console.log(`      ⚠️ Sesión sin fecha, buscando en el siguiente nivel...`);

          // Si la sesión no tiene fecha, verificamos en los hijos de esta sesión
          if (sesion.hijos && sesion.hijos.length > 0) {
            for (const sesionInferior of sesion.hijos) {
              console.log(`        🔍 Buscando en nivel inferior: ${sesionInferior.nombre}`);
              if (sesionInferior.fecha) {
                console.log(`        ✅ Sesión en nivel inferior con fecha encontrada: ${sesionInferior.nombre} - Fecha: ${sesionInferior.fecha}`);
                sesion.fecha = sesionInferior.fecha;  // Asignamos la fecha encontrada en el nivel inferior
                break;  // Ya encontramos la fecha, podemos continuar
              }
            }
          }
          // Si después de buscar en los hijos no tiene fecha, la saltamos
          if (!sesion.fecha) {
            console.log("        ⚠️ No se encontró ninguna fecha en el nivel inferior. Se salta.");
            continue;
          }
        }

        // Aquí es donde debe usarse sesionInferior si se encontró una fecha en el subnivel
        console.log(`    ✅ Sesión con fecha encontrada: ${sesion.fecha ? sesion.nombre : sesionInferior.nombre} - Fecha: ${sesion.fecha || sesionInferior.fecha}`);

        // Convertimos la fecha de la sesión a timestamp
        const fechaSes = fechaATimestamp(sesion.fecha || sesionInferior.fecha);
        console.log(`    🔍 Sesión: ${sesion.nombre || sesionInferior.nombre} - Fecha: ${sesion.fecha || sesionInferior.fecha} (timestamp: ${fechaSes})`);

        if (fechaSes >= timestampActual) {
          console.log("      ❌ Sesión no es anterior a la actual, se salta.");
          continue;  // Si la sesión no es anterior a la fecha actual, se salta
        }

        // **Aquí está la modificación principal**
        // Ahora buscamos los ejercicios dentro de esta sesión, que están en los "hijos de los hijos"
        for (const sesionInferior of sesion.hijos || []) {
          console.log(`      ➤ Buscando ejercicios dentro de los hijos de la sesión: ${sesionInferior.nombre}`);

          // Verificamos si esta sesión inferior tiene ejercicios
          for (const ejercicio of sesionInferior.hijos || []) {
            console.log(`        ➤ Ejercicio encontrado: ${ejercicio.nombre}`);

            const nombreEjercicioComparar = ejercicio.nombre.trim().toLowerCase();  // Normalizamos también el nombre del ejercicio anterior
            console.log(`        ➤ Comparando ejercicio: '${ejercicio.nombre}' (normalizado: '${nombreEjercicioComparar}')`);
            console.log(`        ➤ Ejercicio actual: '${nombreEjercicioActual}'`);

            // Comprobamos si el nombre del ejercicio coincide
            if (nombreEjercicioComparar === nombreEjercicioActual) {
              console.log("          ✅ Coincidencia encontrada con ejercicio:", ejercicio.nombre);

              // La fecha aquí debe ser del nivel de la sesión, no del propio ejercicio
              const fechaSesionEjercicioAnterior = sesion.fecha || sesionInferior.fecha; // Fecha de la sesión, no del ejercicio

              if (ejercicio.series?.length > 0) {
                console.log("          ✅ Ejercicio anterior con series encontrado");

                if (!ejercicioAnterior || fechaATimestamp(fechaSesionEjercicioAnterior) > fechaATimestamp(ejercicioAnterior._fecha)) {
                  ejercicioAnterior = { ...ejercicio, _fecha: fechaSesionEjercicioAnterior };
                  console.log(`          ⭐ Nuevo ejercicio anterior más reciente guardado de fecha: ${fechaSesionEjercicioAnterior}`);
                }
              } else {
                console.log("          ⚠️ Ejercicio encontrado sin series, se ignora.");
              }
            } else {
              console.log("          ❌ Nombres no coinciden");
            }
          }
        }
      }
    }
  }
}

if (ejercicioAnterior) {
  console.log("📦 Ejercicio anterior más reciente:", ejercicioAnterior);
} else {
  console.log("❌ No se encontró ningún ejercicio anterior con el mismo nombre y series.");
}

// Si encontramos un ejercicio anterior, mostramos la caja de estadísticas
if (ejercicioAnterior) {
  const statsBoxAnt = document.createElement('div');
  statsBoxAnt.style.background = "#f5f5f5";
  statsBoxAnt.style.padding = "12px";
  statsBoxAnt.style.margin = "10px";
  statsBoxAnt.style.borderRadius = "8px";
  statsBoxAnt.style.color = "#000";

  let volumenAnt = 0;
  let mejor1RMAnt = 0;
  let pesoMax = 0;

  ejercicioAnterior.series.forEach(serie => {
    const peso = parseFloat(serie.peso) || 0;
    const reps = parseInt(serie.reps) || 0;
    volumenAnt += peso * reps;
    const estimado = peso * (1 + reps / 30);
    if (estimado > mejor1RMAnt) mejor1RMAnt = estimado;
    if (peso > pesoMax) pesoMax = peso;
  });

  statsBoxAnt.innerHTML = `
    <p><b>📅 Anterior (${ejercicioAnterior._fecha}):</b></p>
    <p><b>Volumen total:</b> ${volumenAnt.toFixed(2)} kg</p>
    <p><b>1RM estimado:</b> ${mejor1RMAnt.toFixed(2)} kg</p>
    <p><b>Peso máximo:</b> ${pesoMax.toFixed(2)} kg</p>
  `;

  contenido.appendChild(statsBoxAnt);
}


    const notas=document.createElement('textarea');
    notas.placeholder='Notas del ejercicio...';
    notas.value=nivel.notas||''; notas.className='notes';
    notas.addEventListener('input',e=>{nivel.notas=e.target.value;guardarDatos();});
    contenido.appendChild(notas);
    return;
  }

  // Otros niveles
  backButton.style.visibility = 'visible';
  addButton.style.visibility  = 'visible';
  const nombres = ['Mesociclos','Microciclos','Sesiones','Ejercicios'];
  tituloNivel.textContent = nombres[rutaActual.length-1] || nivel.nombre;

  if (nivel.hijos && nivel.hijos.length) {
    nivel.hijos.forEach((item, index) => {
      const div=crearIndice(item,index,nivel);
      div.addEventListener('click',()=>{ rutaActual.push(index); renderizar(); });
      contenido.appendChild(div);
    });
  }

  addButton.onclick = () => {
    const nombreDefault = "Nuevo " + tituloNivel.textContent;
    nivel.hijos.push({ nombre:"", hijos:[], editando:true, placeholder:nombreDefault });
    guardarDatos(); renderizar();
  };
}

// ==================== Crear índice ====================
function crearIndice(item, index, nivel) {
  const div = document.createElement('div');
  div.className = 'list-item';
  div.style.display = 'flex';
  div.style.alignItems = 'center';
  div.style.gap = '4px';
  div.style.flexWrap = 'nowrap';
  div.style.overflow = 'hidden';

  if (!item.editando) item.editando = false;

  if (item.editando) {
    // ----------- MODO EDICIÓN -----------
    const input = document.createElement('input');
    input.value = item.nombre || '';
    input.placeholder = item.placeholder || '';
    input.style.flex = '1 1 auto';
    input.style.minWidth = '40px';
    setTimeout(() => { input.focus(); input.select(); }, 50);

    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        item.nombre = input.value || 'Sin nombre';
        item.editando = false; guardarDatos(); renderizar();
      }
    });
    input.addEventListener('blur', () => {
      item.nombre = input.value || 'Sin nombre';
      item.editando = false; guardarDatos(); renderizar();
    });
    div.appendChild(input);

    // 👉 Si estamos en nivel 3, añadimos input de fecha
    if (rutaActual.length === 3) {
      const fechaInput = document.createElement('input');
      fechaInput.type = 'date';
      fechaInput.value = item.fecha || '';
      fechaInput.addEventListener('input', e => {
        item.fecha = e.target.value;
        guardarDatos();
      });
      div.appendChild(fechaInput);
    }

  } else {
    // ----------- MODO VISUAL -----------
    const input = document.createElement('input');
    input.value = item.nombre;
    input.readOnly = true;
    input.style.flex = '1 1 auto';
    input.style.minWidth = '40px';

    input.addEventListener('mousedown', () => { rutaActual.push(index); renderizar(); });
    div.appendChild(input);

    // 👉 Si estamos en nivel 3, mostramos también la fecha
    if (rutaActual.length === 3) {
      const fechaInput = document.createElement('input');
      fechaInput.type = 'date';
      fechaInput.value = item.fecha || '';
      fechaInput.addEventListener('mousedown', e => e.stopPropagation());
      fechaInput.addEventListener('click', e => e.stopPropagation());
      fechaInput.addEventListener('change', e => {
        item.fecha = e.target.value;
        guardarDatos();
      });
      div.appendChild(fechaInput);
    }

    const editar = document.createElement('button');
    editar.className = "btn-edit"; editar.textContent = '✏️';
    editar.addEventListener('click', e => {
      e.stopPropagation(); item.editando = true; renderizar();
    });
    div.appendChild(editar);

    const borrar = document.createElement('button');
    borrar.className = "btn-delete"; borrar.textContent = '🗑';
    borrar.addEventListener('click', e => {
      e.stopPropagation();
      mostrarConfirmacion(`¿Desea borrar "${item.nombre}"?`, () => {
        nivel.hijos.splice(index, 1);
        guardarDatos(); renderizar();
      });
    });
    div.appendChild(borrar);
  }
  return div;
}

// ==================== Eventos ====================
document.addEventListener("DOMContentLoaded", () => {
  if (homeButton) {
    homeButton.addEventListener("click", () => {
      rutaActual = [];
      renderizar();
    });
  }
  if (logoutButton) {
    logoutButton.addEventListener("click", () => salir());
  }
  if (menuButton) {
    menuButton.addEventListener("click", () => {
      sideMenu.style.left = "0";
      menuOverlay.classList.remove("hidden");
    });
  }
  if (menuOverlay) {
    menuOverlay.addEventListener("click", () => {
      sideMenu.style.left = "-50%";
      menuOverlay.classList.add("hidden");
    });
  }
  document.querySelectorAll(".sideMenu-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const seccion = btn.dataset.seccion;
      if (seccion === "entrenamiento") rutaActual = [0];
      if (seccion === "seguimiento") rutaActual = [1];
      if (seccion === "calendario") rutaActual = [2];
      if (seccion === "dashboard") rutaActual = [];
      renderizar();
      sideMenu.style.left = "-50%";
      menuOverlay.classList.add("hidden");
    });
  });
});

// ==================== Init ====================
renderizar();
restaurarTimer();