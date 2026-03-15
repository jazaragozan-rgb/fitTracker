// ============================================================
// shared/utils.js
// Funciones de utilidad puras — sin dependencias externas.
// Si una función la usan 2 o más módulos, vive aquí.
// ============================================================


// ── Fechas ────────────────────────────────────────────────────

/**
 * Devuelve la fecha de hoy en formato YYYY-MM-DD (zona local).
 * Evita el problema de toISOString() que usa UTC.
 */
export function hoyISO() {
  const d = new Date();
  return _toISO(d);
}

/**
 * Convierte un objeto Date a string YYYY-MM-DD en zona local.
 */
export function dateToISO(date) {
  return _toISO(date);
}

function _toISO(d) {
  const yyyy = d.getFullYear();
  const mm   = String(d.getMonth() + 1).padStart(2, '0');
  const dd   = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Formatea una fecha ISO (YYYY-MM-DD) como texto legible.
 * Ej: "lunes, 14 de marzo de 2026"
 */
export function formatearFechaLarga(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr + 'T00:00:00');
  const texto = d.toLocaleDateString('es-ES', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
  return capitalizar(texto);
}

/**
 * Formatea una fecha ISO como texto corto.
 * Ej: "14 mar"
 */
export function formatearFechaCorta(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr + 'T00:00:00');
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

/**
 * Avanza o retrocede una fecha ISO N días. Devuelve nuevo YYYY-MM-DD.
 */
export function sumarDias(isoStr, dias) {
  const d = new Date(isoStr + 'T00:00:00');
  d.setDate(d.getDate() + dias);
  return _toISO(d);
}

/**
 * Formatea minutos como "1h 30min" o "45min".
 */
export function formatearDuracion(minutos) {
  if (!minutos) return '';
  if (minutos < 60) return `${minutos}min`;
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

/**
 * Formatea segundos como "MM:SS".
 */
export function formatearSegundos(segs) {
  const m = Math.floor(segs / 60);
  const s = segs % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}


// ── Texto ─────────────────────────────────────────────────────

/**
 * Pone en mayúscula la primera letra de un string.
 */
export function capitalizar(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}


// ── Números ───────────────────────────────────────────────────

/**
 * Redondea a N decimales (por defecto 1).
 */
export function redondear(num, decimales = 1) {
  return Math.round(num * 10 ** decimales) / 10 ** decimales;
}

/**
 * Calcula el 1RM estimado con la fórmula de Epley.
 * 1RM = peso × (1 + reps / 30)
 */
export function calcular1RM(peso, reps) {
  if (!peso || !reps) return 0;
  return redondear(peso * (1 + reps / 30));
}

/**
 * Calcula el volumen total de un array de series.
 * Cada serie: { peso, reps }
 */
export function calcularVolumen(series = []) {
  return series.reduce((total, s) => {
    return total + (parseFloat(s.peso) || 0) * (parseInt(s.reps) || 0);
  }, 0);
}


// ── DOM ───────────────────────────────────────────────────────

/**
 * Shorthand para document.getElementById.
 */
export const $ = id => document.getElementById(id);

/**
 * Muestra un elemento quitando la clase 'hidden'.
 */
export const show = el => el?.classList.remove('hidden');

/**
 * Oculta un elemento añadiendo la clase 'hidden'.
 */
export const hide = el => el?.classList.add('hidden');

/**
 * Detecta si estamos en la página de la app (subindex / app.html).
 */
export function isAppPage() {
  return !!document.getElementById('app') && !!document.getElementById('contenido');
}