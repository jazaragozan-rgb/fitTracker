// ============================================================
// core/store.js
// Estado global de la app + lectura/escritura en Firestore.
//
// REGLA: ningún otro archivo debe leer/escribir Firestore
// directamente para los datos de entrenamiento.
// Todos importan { datos, guardarDatos, nivelActual } desde aquí.
// ============================================================

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
// Se exporta como objeto para que los cambios sean reactivos
export let datos = structuredClone(DATOS_POR_DEFECTO);

// Referencia global para módulos que no usan import (legacy)
window.datos = datos;

// ── Callback que script.js/router registra para re-renderizar ─
let _onDatosLoaded = null;
export function onDatosLoaded(cb) { _onDatosLoaded = cb; }

// ── Cargar datos desde Firestore ──────────────────────────────
async function cargarDatosUsuario(uid) {
  if (!uid) return null;
  try {
    const snap = await getDoc(doc(db, 'usuarios', uid));
    if (!snap.exists()) return null;
    const d = snap.data();
    if (d && Array.isArray(d.datos)) return structuredClone(d.datos);
    return null;
  } catch (e) {
    console.error('[store] Error al cargar:', e);
    return null;
  }
}

// ── Guardar datos en Firestore (con debounce 300 ms) ──────────
let _saveTimer = null;
export function guardarDatos() {
  const user = auth.currentUser;
  if (!user) return;
  if (_saveTimer) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(async () => {
    try {
      await setDoc(
        doc(db, 'usuarios', user.uid),
        { datos: structuredClone(datos), ultimaActualizacion: new Date().toISOString() },
        { merge: true }
      );
      console.log('[store] ✓ Datos guardados');
    } catch (e) {
      console.error('[store] Error al guardar:', e);
    }
  }, 300);
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
    alert('✅ Datos restaurados correctamente');
    if (_onDatosLoaded) _onDatosLoaded();
  } catch (e) {
    alert('Error al restaurar: ' + e.message);
  }
}
window.restaurarDesdeJSON = restaurarDesdeJSON;

// ── Navegación: devuelve el nodo en la ruta actual ────────────
export function nivelActual(rutaActual) {
  let nivel = { hijos: datos };
  for (const i of rutaActual) nivel = nivel.hijos[i];
  return nivel;
}

// ── Sincronización automática al cambiar auth ─────────────────
onAuthStateChanged(auth, async (user) => {
  if (user) {
    const remoto = await cargarDatosUsuario(user.uid);
    datos = remoto ?? structuredClone(DATOS_POR_DEFECTO);
  } else {
    datos = structuredClone(DATOS_POR_DEFECTO);
  }
  window.datos = datos;
  if (_onDatosLoaded) _onDatosLoaded();
});
