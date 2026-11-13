import { AI_COACH_API_URL } from './ai-coach-config.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const PERIOD_DAYS = 28;

function positiveNumber(value) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function addTarget(targets, value, maxLength = 16) {
  const target = String(value ?? '').trim();
  if (target && target.length <= maxLength && targets.size < 8) targets.add(target);
}

function getSessionDate(session) {
  if (!session.fecha || !/^\d{4}-\d{2}-\d{2}$/.test(session.fecha)) return null;
  const date = new Date(`${session.fecha}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function collectSessionActivity(node, activity) {
  const series = Array.isArray(node.series) ? node.series : [];
  const name = typeof node.nombre === 'string' ? node.nombre.trim().slice(0, 60) : '';
  let exercise = name ? activity.exercises.get(name) : null;

  if (name && series.length && !exercise) {
    exercise = {
      name,
      plannedSets: 0,
      completedSets: 0,
      repetitions: 0,
      volume: 0,
      bestWeight: 0,
      rirTotal: 0,
      rirCount: 0,
      targetReps: new Set(),
      targetWeights: new Set(),
      targetRir: new Set()
    };
    activity.exercises.set(name, exercise);
  }

  series.forEach(serie => {
    activity.plannedSets++;
    if (exercise) {
      exercise.plannedSets++;
    }

    if (!serie.completada) {
      if (exercise) {
        addTarget(exercise.targetReps, serie.reps);
        const targetWeight = positiveNumber(serie.peso);
        if (targetWeight) exercise.targetWeights.add(targetWeight);
        const targetRir = Number.parseFloat(serie.rir);
        if (Number.isFinite(targetRir) && targetRir >= 0 && targetRir <= 10 && exercise.targetRir.size < 8) {
          exercise.targetRir.add(targetRir);
        }
      }
      return;
    }
    activity.completedSets++;
    const reps = positiveNumber(serie.reps);
    const weight = positiveNumber(serie.peso);
    const rir = Number.parseFloat(serie.rir);

    if (reps > 0) activity.repetitions += reps;
    if (weight > 0 && reps > 0) activity.volume += weight * reps;
    if (exercise) {
      exercise.completedSets++;
      if (reps > 0) exercise.repetitions += reps;
      if (weight > 0 && reps > 0) {
        exercise.volume += weight * reps;
        exercise.bestWeight = Math.max(exercise.bestWeight, weight);
      }
      if (Number.isFinite(rir) && rir >= 0 && rir <= 10) {
        exercise.rirTotal += rir;
        exercise.rirCount++;
      }
    }
  });

  (node.hijos || []).forEach(child => collectSessionActivity(child, activity));
}

function countPlannedSessions(data, start, end) {
  let count = 0;
  (data?.[0]?.hijos || []).forEach(mesocycle => {
    (mesocycle.hijos || []).forEach(microcycle => {
      (microcycle.hijos || []).forEach(session => {
        const date = getSessionDate(session);
        if (date && date >= start && date <= end) count++;
      });
    });
  });
  return count;
}

export function analizarEstadisticasEntrenamiento(data, today = new Date()) {
  const endDate = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
  const currentStart = new Date(endDate.getTime() - (PERIOD_DAYS - 1) * DAY_MS);
  const previousStart = new Date(currentStart.getTime() - PERIOD_DAYS * DAY_MS);
  const previousEnd = new Date(currentStart.getTime() - DAY_MS);
  const inPeriod = (date, start, end) => date >= start && date <= end;
  const sessions = [];
  const exerciseEntries = [];
  const sessionHistory = { current: [], previous: [] };

  (data?.[0]?.hijos || []).forEach(mesocycle => {
    (mesocycle.hijos || []).forEach(microcycle => {
      (microcycle.hijos || []).forEach(session => {
        const date = getSessionDate(session);
        if (!date || date < previousStart || date > endDate) return;

        const activity = {
          plannedSets: 0,
          completedSets: 0,
          repetitions: 0,
          volume: 0,
          exercises: new Map()
        };
        (session.hijos || []).forEach(child => collectSessionActivity(child, activity));

        const recordedDuration = Number(session.duracionMinutos);
        const durationMinutes = Number.isFinite(recordedDuration) ? Math.max(0, recordedDuration) : 0;
        const sessionDetail = {
          date: session.fecha,
          name: typeof session.nombre === 'string' ? session.nombre.trim().slice(0, 80) : '',
          durationMinutes: Math.round(durationMinutes),
          plannedSets: activity.plannedSets,
          completedSets: activity.completedSets,
          repetitions: Math.round(activity.repetitions),
          volume: Math.round(activity.volume),
          exercises: [...activity.exercises.values()].map(exercise => ({
            name: exercise.name.slice(0, 60),
            plannedSets: exercise.plannedSets,
            completedSets: exercise.completedSets,
            repetitions: Math.round(exercise.repetitions),
            volume: Math.round(exercise.volume),
            bestWeight: exercise.bestWeight,
            averageRir: exercise.rirCount ? Math.round((exercise.rirTotal / exercise.rirCount) * 10) / 10 : null,
            targetReps: [...exercise.targetReps],
            targetWeights: [...exercise.targetWeights],
            targetRir: [...exercise.targetRir]
          }))
        };
        if (inPeriod(date, currentStart, endDate)) sessionHistory.current.push(sessionDetail);
        else if (inPeriod(date, previousStart, previousEnd)) sessionHistory.previous.push(sessionDetail);

        if (!activity.completedSets && durationMinutes === 0) return;

        sessions.push({ date, durationMinutes, activity });
        activity.exercises.forEach(exercise => exerciseEntries.push({ ...exercise, date }));
      });
    });
  });

  const currentSessions = sessions.filter(session => inPeriod(session.date, currentStart, endDate));
  const previousSessions = sessions.filter(session => inPeriod(session.date, previousStart, previousEnd));
  const currentEntries = exerciseEntries.filter(entry => inPeriod(entry.date, currentStart, endDate));
  const previousEntries = exerciseEntries.filter(entry => inPeriod(entry.date, previousStart, previousEnd));
  const summarizePeriod = (periodSessions, start, end) => {
    const completedSets = periodSessions.reduce((total, session) => total + session.activity.completedSets, 0);
    const repetitions = periodSessions.reduce((total, session) => total + session.activity.repetitions, 0);
    const totalVolume = periodSessions.reduce((total, session) => total + session.activity.volume, 0);
    const timedSessions = periodSessions.filter(session => session.durationMinutes > 0);
    const totalDuration = timedSessions.reduce((total, session) => total + session.durationMinutes, 0);
    const periodEntries = exerciseEntries.filter(entry => inPeriod(entry.date, start, end));
    const exerciseNames = new Set(periodEntries.map(entry => entry.name));

    return {
      completedSets,
      repetitions: Math.round(repetitions),
      exerciseVariety: exerciseNames.size,
      totalDurationMinutes: Math.round(totalDuration),
      sessionsWithDuration: timedSessions.length,
      averageDurationMinutes: timedSessions.length ? Math.round(totalDuration / timedSessions.length) : null,
      volume: Math.round(totalVolume)
    };
  };

  const summarizeExercise = (entries, name) => {
    const matching = entries.filter(entry => entry.name === name);
    return {
      exposures: matching.length,
      completedSets: matching.reduce((total, entry) => total + entry.completedSets, 0),
      repetitions: Math.round(matching.reduce((total, entry) => total + entry.repetitions, 0)),
      volume: Math.round(matching.reduce((total, entry) => total + entry.volume, 0)),
      bestWeight: Math.max(0, ...matching.map(entry => entry.bestWeight))
    };
  };

  const exerciseNames = new Set([...currentEntries, ...previousEntries].map(entry => entry.name));
  const exerciseProgress = [...exerciseNames].map(name => ({
    name,
    previous: summarizeExercise(previousEntries, name),
    current: summarizeExercise(currentEntries, name)
  })).sort((a, b) => (b.previous.exposures + b.current.exposures) - (a.previous.exposures + a.current.exposures))
    .slice(0, 5);

  const plannedCurrent = countPlannedSessions(data, currentStart, endDate);
  const plannedPrevious = countPlannedSessions(data, previousStart, previousEnd);
  const currentSummary = summarizePeriod(currentSessions, currentStart, endDate);
  const previousSummary = summarizePeriod(previousSessions, previousStart, previousEnd);

  return {
    current: {
      sessions: currentSessions.length,
      planned: plannedCurrent,
      ...currentSummary,
      adherence: plannedCurrent ? Math.round((currentSessions.length / plannedCurrent) * 100) : null
    },
    previous: {
      sessions: previousSessions.length,
      planned: plannedPrevious,
      ...previousSummary,
      adherence: plannedPrevious ? Math.round((previousSessions.length / plannedPrevious) * 100) : null
    },
    volumeChange: previousSummary.volume > 0
      ? Math.round(((currentSummary.volume - previousSummary.volume) / previousSummary.volume) * 100)
      : null,
    exerciseProgress,
    sessionHistory
  };
}

function createMetric(label, value) {
  const metric = document.createElement('div');
  metric.className = 'training-insight-metric';
  const amount = document.createElement('strong');
  amount.textContent = String(value);
  const caption = document.createElement('span');
  caption.textContent = label;
  metric.append(amount, caption);
  return metric;
}

function createInterpretations(stats) {
  const interpretations = [];
  const { current, previous } = stats;

  if (previous.sessions > 0) {
    const difference = current.sessions - previous.sessions;
    if (difference > 0) {
      interpretations.push(`Has completado ${difference} sesión${difference === 1 ? '' : 'es'} más que en los 28 días anteriores.`);
    } else if (difference < 0) {
      interpretations.push(`Has completado ${Math.abs(difference)} sesión${Math.abs(difference) === 1 ? '' : 'es'} menos que en los 28 días anteriores.`);
    } else {
      interpretations.push('Has mantenido el mismo número de sesiones que en los 28 días anteriores.');
    }
  } else if (current.sessions > 0) {
    interpretations.push('Ya hay sesiones registradas en este periodo; todavía no hay un periodo anterior comparable.');
  } else {
    interpretations.push('Aún no hay sesiones completadas en los últimos 28 días.');
  }

  if (stats.volumeChange === null) {
    interpretations.push('No hay suficiente volumen registrado en ambos periodos para comparar la carga total.');
  } else if (stats.volumeChange > 0) {
    interpretations.push(`El volumen registrado ha aumentado un ${stats.volumeChange}% respecto a los 28 días anteriores.`);
  } else if (stats.volumeChange < 0) {
    interpretations.push(`El volumen registrado ha disminuido un ${Math.abs(stats.volumeChange)}% respecto a los 28 días anteriores.`);
  } else {
    interpretations.push('El volumen registrado se ha mantenido igual que en los 28 días anteriores.');
  }

  if (current.adherence === null) {
    interpretations.push('No hay sesiones programadas con fecha en los últimos 28 días para calcular la adherencia.');
  } else {
    interpretations.push(`Has completado ${current.sessions} de ${current.planned} sesiones programadas en este periodo (${current.adherence}%).`);
  }

  const changedExercise = stats.exerciseProgress.find(exercise =>
    exercise.previous.bestWeight > 0
    && exercise.current.bestWeight > 0
    && exercise.current.bestWeight !== exercise.previous.bestWeight);
  if (changedExercise) {
    const difference = Math.round(((changedExercise.current.bestWeight - changedExercise.previous.bestWeight)
      / changedExercise.previous.bestWeight) * 100);
    if (difference > 0) {
      interpretations.push(`En ${changedExercise.name}, tu mejor peso registrado ha aumentado un ${difference}% (${changedExercise.current.bestWeight} kg frente a ${changedExercise.previous.bestWeight} kg).`);
    } else {
      interpretations.push(`En ${changedExercise.name}, tu mejor peso registrado ha disminuido un ${Math.abs(difference)}% (${changedExercise.current.bestWeight} kg frente a ${changedExercise.previous.bestWeight} kg).`);
    }
  } else if (!stats.exerciseProgress.some(exercise => exercise.previous.bestWeight > 0 && exercise.current.bestWeight > 0)) {
    interpretations.push('Aún no hay suficientes registros de ejercicios con peso en ambos periodos para comparar la progresión.');
  }

  return interpretations;
}

export function crearResumenEstadisticasEntrenamiento(data) {
  const stats = analizarEstadisticasEntrenamiento(data);
  const card = document.createElement('section');
  card.className = 'training-insights-card';

  const heading = document.createElement('h3');
  heading.className = 'training-insights-title';
  heading.textContent = 'Evolución de tus entrenamientos';

  const description = document.createElement('p');
  description.className = 'training-insights-description';
  description.textContent = 'Comparación de los últimos 28 días con los 28 anteriores. Interpretación automática basada en tus registros.';

  const metrics = document.createElement('div');
  metrics.className = 'training-insights-metrics';
  metrics.append(
    createMetric('Sesiones (28 días)', stats.current.sessions),
    createMetric('Volumen (28 días)', `${stats.current.volume} kg`),
    createMetric('Sesiones anteriores', stats.previous.sessions),
    createMetric('Adherencia al plan', stats.current.adherence === null ? '—' : `${stats.current.adherence}%`)
  );

  const list = document.createElement('ul');
  list.className = 'training-insights-list';
  createInterpretations(stats).forEach(text => {
    const item = document.createElement('li');
    item.textContent = text;
    list.appendChild(item);
  });

  const note = document.createElement('p');
  note.className = 'training-insights-note';
  note.textContent = 'Estas observaciones describen tus registros; no son recomendaciones médicas ni tienen en cuenta factores que no hayas registrado.';

  const coach = document.createElement('section');
  coach.className = 'training-insights-coach';
  const coachHeading = document.createElement('h4');
  coachHeading.className = 'training-insights-coach-title';
  coachHeading.textContent = 'Consejo de IA';
  const coachPrivacy = document.createElement('p');
  coachPrivacy.className = 'training-insights-coach-privacy';
  coachPrivacy.textContent = 'Al solicitarlo, se enviará a Cloudflare el resumen agregado y cada sesión fechada de los dos periodos de 28 días, con ejercicios, series, repeticiones, cargas y RIR. No se envía el historial fuera de esos periodos ni otros datos personales.';
  const coachResult = document.createElement('p');
  coachResult.className = 'training-insights-coach-result';
  coachResult.setAttribute('aria-live', 'polite');
  coachResult.textContent = AI_COACH_API_URL
    ? 'El consejo se genera solo cuando pulses el botón. Sin límite diario por usuario; sujeto a la cuota compartida de Cloudflare.'
    : 'Para activar la IA, configura la URL de tu Cloudflare Worker después de desplegarlo.';
  const coachButton = document.createElement('button');
  coachButton.type = 'button';
  coachButton.className = 'training-insights-coach-button';
  coachButton.textContent = 'Generar consejo';
  coachButton.disabled = !AI_COACH_API_URL;
  coachButton.addEventListener('click', async () => {
    coachButton.disabled = true;
    coachButton.textContent = 'Generando…';
    coachResult.textContent = 'Analizando tus sesiones de los últimos 56 días; puede tardar hasta 90 segundos…';

    try {
      const { auth } = await import('../../core/firebase.js');
      const user = auth.currentUser;
      if (!user) {
        coachResult.textContent = 'Inicia sesión para solicitar un consejo.';
        return;
      }

      const token = await user.getIdToken();
      const response = await fetch(AI_COACH_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          metrics: {
            current: stats.current,
            previous: stats.previous,
            volumeChange: stats.volumeChange,
            exerciseProgress: stats.exerciseProgress,
            sessionHistory: stats.sessionHistory
          }
        }),
        signal: AbortSignal.timeout(90_000)
      });

      const result = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(result?.error || `El servicio respondió con el estado ${response.status}.`);
      }
      if (typeof result?.advice !== 'string' || !result.advice.trim()) {
        throw new Error('El servicio no devolvió un consejo válido.');
      }
      coachResult.textContent = result.advice.trim();
    } catch (error) {
      console.error('[ai-coach] No se pudo obtener el consejo:', error);
      coachResult.textContent = `No se pudo generar el consejo: ${error.message || 'error desconocido'}. Tus estadísticas siguen disponibles.`;
    } finally {
      coachButton.disabled = !AI_COACH_API_URL;
      coachButton.textContent = 'Generar consejo';
    }
  });
  coach.append(coachHeading, coachPrivacy, coachButton, coachResult);

  card.append(heading, description, metrics, list, note, coach);
  return card;
}
