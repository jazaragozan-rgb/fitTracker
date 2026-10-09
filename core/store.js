// ============================================================
// core/store.js
// Estado global de la app + lectura/escritura en Firestore.
//
// REGLA: ningún otro archivo debe leer/escribir Firestore
// directamente para los datos de entrenamiento.
// Todos importan { datos, guardarDatos, nivelActual } desde aquí.
//
// NOVEDAD (Tanda 1):
//  - Si la carga de datos falla, el guardado queda BLOQUEADO para
//    no sobrescribir tus datos reales con una plantilla vacía.
//  - Copia local automática + exportar/importar copia de seguridad.
// ============================================================

import './guard.js'; // control de acceso + cerrar sesión
import { auth, db }        from './firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ── Estructura por defecto (primera vez o sin datos) ─────────
export const DATOS_POR_DEFECTO = [
  { nombre: 'Entrenamiento', hijos: [] },
  { nombre: 'Seguimiento',   hijos: [] },
  { nombre: 'Calendario',    hijos: [] },
  { nombre: 'Nutrición',     hijos: [] }
];

// ── Estado global ─────────────────────────────────────────────
export let datos = structuredClone(DATOS_POR_DEFECTO);

// Referencia global para módulos que no usan import (legacy)
window.datos = datos;

// ── Seguro anti-pérdida de datos ──────────────────────────────
// Solo se permite guardar cuando la carga terminó bien
// (o cuando confirmamos que el usuario aún no tiene documento).
let _datosListos = false;
let _avisoMostrado = false;
const BACKUP_KEY = 'fitTracker_backupDatos';

function _guardarCopiaLocal(uid) {
  try {
    localStorage.setItem(BACKUP_KEY, JSON.stringify({
      uid,
      fecha: new Date().toISOString(),
      datos
    }));
  } catch (e) {
    console.warn('[store] No se pudo guardar la copia local:', e);
  }
}

// ── Callback que script.js/router registra para re-renderizar ─
let _onDatosLoaded = null;
export function onDatosLoaded(cb) { _onDatosLoaded = cb; }

// ── Cargar datos desde Firestore ──────────────────────────────
// Devuelve: { estado: 'ok', datos } | { estado: 'vacio' } | { estado: 'error' }
async function cargarDatosUsuario(uid) {
  if (!uid) return { estado: 'error' };
  try {
    const snap = await getDoc(doc(db, 'usuarios', uid));
    if (!snap.exists()) return { estado: 'vacio' };
    const d = snap.data();
    if (d && Array.isArray(d.datos)) return { estado: 'ok', datos: structuredClone(d.datos) };
    if (d && d.datos === undefined) return { estado: 'vacio' }; // documento sin entrenamientos aún
    console.error('[store] El campo datos no tiene el formato esperado');
    return { estado: 'error' };
  } catch (e) {
    console.error('[store] Error al cargar:', e);
    return { estado: 'error' };
  }
}

// Reintenta la carga hasta 3 veces antes de rendirse
async function cargarConReintentos(uid) {
  const esperas = [0, 1500, 3000];
  let resultado = { estado: 'error' };
  for (const espera of esperas) {
    if (espera) await new Promise(r => setTimeout(r, espera));
    resultado = await cargarDatosUsuario(uid);
    if (resultado.estado !== 'error') return resultado;
  }
  return resultado;
}

// La comida ya se guarda aparte (campo "nutricion"), así que no hace
// falta duplicarla dentro de los datos de entrenamiento.
function _datosParaGuardar() {
  const copia = structuredClone(datos);
  if (copia[3]) copia[3].hijos = [];
  return copia;
}

// ── Guardar datos en Firestore (con debounce 300 ms) ──────────
let _saveTimer = null;
export function guardarDatos(options = {}) {
  if (typeof options === 'boolean') options = { immediate: options };
  const user = auth.currentUser;
  if (!user) return options.immediate ? Promise.resolve(false) : undefined;

  // SEGURO: si no se cargaron bien los datos, NO guardamos nada
  if (!_datosListos) {
    if (!_avisoMostrado) {
      _avisoMostrado = true;
      alert('Tus datos no se han cargado correctamente, así que el guardado está desactivado para protegerlos. Recarga la página con buena conexión.');
    }
    return options.immediate ? Promise.resolve(false) : undefined;
  }

  if (_saveTimer) {
    clearTimeout(_saveTimer);
    _saveTimer = null;
  }

  const save = async () => {
    try {
      await setDoc(
        doc(db, 'usuarios', user.uid),
        { datos: _datosParaGuardar(), ultimaActualizacion: new Date().toISOString() },
        { merge: true }
      );
      _guardarCopiaLocal(user.uid);
      console.log('[store] ✓ Datos guardados');
      return true;
    } catch (e) {
      console.error('[store] Error al guardar:', e);
      return false;
    }
  };

  if (options.immediate) {
    return save();
  }

  _saveTimer = setTimeout(save, 300);
}

// ── Restaurar datos desde JSON (herramienta de recuperación) ──
export async function restaurarDesdeJSON(jsonString) {
  const user = auth.currentUser;
  if (!user) { alert('Debes iniciar sesión primero'); return; }
  try {
    const recuperados = JSON.parse(jsonString);
    if (!Array.isArray(recuperados)) throw new Error('Formato inválido');
    await setDoc(
      doc(db, 'usuarios', user.uid),
      { datos: structuredClone(recuperados), ultimaActualizacion: new Date().toISOString() },
      { merge: true }
    );
    datos = structuredClone(recuperados);
    window.datos = datos;
    _datosListos = true;
    _guardarCopiaLocal(user.uid);
    alert('✅ Datos restaurados correctamente');
    if (_onDatosLoaded) _onDatosLoaded();
    try { window.dispatchEvent(new Event('datosLoaded')); } catch (e) { console.warn('[store] dispatch datosLoaded error', e); }
  } catch (e) {
    alert('Error al restaurar: ' + e.message);
  }
}
window.restaurarDesdeJSON = restaurarDesdeJSON;

// ── Copia de seguridad: exportar a un archivo ─────────────────
export function exportarCopia() {
  if (!_datosListos) {
    alert('Tus datos no están cargados todavía. Espera unos segundos o recarga la página.');
    return;
  }
  const d = new Date();
  const fecha = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `fitTracker-copia-${fecha}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
window.exportarCopia = exportarCopia;

// ── Copia de seguridad: importar desde un archivo ─────────────
export function importarCopia() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,application/json';
  input.onchange = () => {
    const archivo = input.files?.[0];
    if (!archivo) return;
    const lector = new FileReader();
    lector.onload = () => {
      const ok = confirm('Esto REEMPLAZARÁ todos tus datos actuales por los de la copia. ¿Continuar?');
      if (ok) restaurarDesdeJSON(String(lector.result));
    };
    lector.readAsText(archivo);
  };
  input.click();
}
window.importarCopia = importarCopia;

// ── Navegación: devuelve el nodo en la ruta actual ────────────
export function nivelActual(rutaActual) {
  let nivel = { hijos: datos };
  for (const i of rutaActual) {
    if (!nivel.hijos || !nivel.hijos[i]) return { hijos: [] };
    nivel = nivel.hijos[i];
  }
  return nivel;
}

// ── Sincronización automática al cambiar auth ─────────────────
onAuthStateChanged(auth, async (user) => {
  _datosListos = false;
  _avisoMostrado = false;

  if (user) {
    const resultado = await cargarConReintentos(user.uid);
    if (resultado.estado === 'ok') {
      datos = resultado.datos;
      _datosListos = true;
      _guardarCopiaLocal(user.uid);
    } else if (resultado.estado === 'vacio') {
      datos = structuredClone(DATOS_POR_DEFECTO);
      _datosListos = true; // usuario nuevo: es seguro guardar
    } else {
      // Error: mostramos la plantilla vacía pero NO se permite guardar
      datos = structuredClone(DATOS_POR_DEFECTO);
      _datosListos = false;
      alert('No se han podido cargar tus datos. Para protegerlos, el guardado está desactivado. Comprueba tu conexión y recarga la página.');
      _avisoMostrado = true;
    }
  } else {
    datos = structuredClone(DATOS_POR_DEFECTO);
  }

  window.datos = datos;
  if (_onDatosLoaded) _onDatosLoaded();
  // Notificar a otros módulos que los datos ya están cargados
  try { window.dispatchEvent(new Event('datosLoaded')); } catch (e) { console.warn('[store] dispatch datosLoaded error', e); }
});