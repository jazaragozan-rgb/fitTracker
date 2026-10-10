// Persistencia del historial nutricional en documentos diarios.
// Ruta: usuarios/{uid}/nutricion/{YYYY-MM-DD}
import { db } from '../core/firebase.js';
import {
  deleteField,
  doc,
  getDoc,
  runTransaction,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const migracionesEnCurso = new Map();

function refUsuario(uid) {
  return doc(db, 'usuarios', uid);
}

function refDia(uid, fecha) {
  return doc(db, 'usuarios', uid, 'nutricion', fecha);
}

async function migrarHistorialAntiguo(uid) {
  const usuarioRef = refUsuario(uid);
  const usuarioSnap = await getDoc(usuarioRef);
  const mapaAntiguo = usuarioSnap.exists() ? usuarioSnap.data().nutricion : null;
  if (!mapaAntiguo || typeof mapaAntiguo !== 'object' || Array.isArray(mapaAntiguo)) return;

  const mapaOriginal = JSON.stringify(mapaAntiguo);
  for (const [fecha, registroDia] of Object.entries(mapaAntiguo)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      throw new Error('Hay una fecha de nutrición antigua con formato inválido; no se eliminó ningún dato.');
    }
    if (!registroDia || typeof registroDia !== 'object' || !Array.isArray(registroDia.items)) {
      throw new Error('Hay registros nutricionales antiguos con formato inválido; no se eliminó ningún dato.');
    }
    const itemsAntiguos = registroDia.items;
    const diaRef = refDia(uid, fecha);
    const diaSnap = await getDoc(diaRef);
    // Si una ejecución previa ya copió este día, no lo dupliques al reintentar.
    if (diaSnap.exists() && diaSnap.data().legacyMigrated === true) continue;
    const itemsNuevos = diaSnap.exists() && Array.isArray(diaSnap.data().items)
      ? diaSnap.data().items
      : [];
    await setDoc(diaRef, {
      items: [...itemsNuevos, ...itemsAntiguos],
      updatedAt: registroDia?.updatedAt || new Date(),
      legacyMigrated: true
    }, { merge: true });
  }

  // Borra el mapa antiguo solo si sigue igual al que acabamos de copiar.
  await runTransaction(db, async transaction => {
    const actual = await transaction.get(usuarioRef);
    if (!actual.exists()) return;
    const mapaActual = actual.data().nutricion;
    if (JSON.stringify(mapaActual) !== mapaOriginal) {
      throw new Error('El historial nutricional cambió durante la migración. Vuelve a intentarlo.');
    }
    transaction.update(usuarioRef, {
      nutricion: deleteField(),
      nutricionMigrada: true
    });
  });
}

async function asegurarMigracion(uid) {
  if (!migracionesEnCurso.has(uid)) {
    const tarea = migrarHistorialAntiguo(uid).finally(() => migracionesEnCurso.delete(uid));
    migracionesEnCurso.set(uid, tarea);
  }
  return migracionesEnCurso.get(uid);
}

export async function obtenerRegistrosNutricion(user, fecha) {
  if (!user) return [];
  await asegurarMigracion(user.uid);
  const snap = await getDoc(refDia(user.uid, fecha));
  return snap.exists() && Array.isArray(snap.data().items) ? snap.data().items : [];
}

export async function obtenerRegistrosNutricionFechas(user, fechas) {
  if (!user) return [];
  await asegurarMigracion(user.uid);
  const snapshots = await Promise.all(fechas.map(fecha => getDoc(refDia(user.uid, fecha))));
  return snapshots.flatMap(snap =>
    snap.exists() && Array.isArray(snap.data().items) ? snap.data().items : []
  );
}

export async function guardarRegistrosNutricion(user, fecha, items) {
  if (!user) return;
  await asegurarMigracion(user.uid);
  await setDoc(refDia(user.uid, fecha), {
    items: Array.isArray(items) ? items : [],
    updatedAt: new Date()
  }, { merge: true });
}
