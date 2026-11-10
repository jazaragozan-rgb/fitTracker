const DAY_MS = 24 * 60 * 60 * 1000;
const PERIOD_DAYS = 28;

function getSessionDate(session) {
  if (!session.fecha || !/^\d{4}-\d{2}-\d{2}$/.test(session.fecha)) return null;
  const date = new Date(`${session.fecha}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function hasCompletedSet(node) {
  if ((node.series || []).some(serie => serie.completada)) return true;
  return (node.hijos || []).some(hasCompletedSet);
}

function collectExerciseEntries(node, date, completedOnly, entries) {
  const series = completedOnly
    ? (node.series || []).filter(serie => serie.completada)
    : (node.series || []);

  if (series.length && node.nombre) {
    const validSeries = series.map(serie => ({
      weight: Number.parseFloat(serie.peso) || 0,
      reps: Number.parseFloat(serie.reps) || 0
    })).filter(serie => serie.weight > 0 && serie.reps > 0);

    if (validSeries.length) {
      entries.push({
        name: node.nombre,
        date,
        maxWeight: Math.max(...validSeries.map(serie => serie.weight)),
        volume: validSeries.reduce((total, serie) => total + serie.weight * serie.reps, 0)
      });
    }
  }

  (node.hijos || []).forEach(child => collectExerciseEntries(child, date, completedOnly, entries));
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
  const sessions = [];
  const exerciseEntries = [];

  (data?.[0]?.hijos || []).forEach(mesocycle => {
    (mesocycle.hijos || []).forEach(microcycle => {
      (microcycle.hijos || []).forEach(session => {
        const date = getSessionDate(session);
        if (!date || date > endDate) return;

        const hasCompletedSets = hasCompletedSet(session);
        if (!hasCompletedSets && !(Number(session.duracionMinutos) > 0)) return;

        sessions.push({ date });
        (session.hijos || []).forEach(child => {
          collectExerciseEntries(child, date, hasCompletedSets, exerciseEntries);
        });
      });
    });
  });

  const inPeriod = (date, start, end) => date >= start && date <= end;
  const currentSessions = sessions.filter(session => inPeriod(session.date, currentStart, endDate));
  const previousSessions = sessions.filter(session => inPeriod(session.date, previousStart, previousEnd));
  const currentEntries = exerciseEntries.filter(entry => inPeriod(entry.date, currentStart, endDate));
  const previousEntries = exerciseEntries.filter(entry => inPeriod(entry.date, previousStart, previousEnd));
  const volume = entries => entries.reduce((sum, entry) => sum + entry.volume, 0);
  const currentVolume = volume(currentEntries);
  const previousVolume = volume(previousEntries);

  const exerciseNames = new Set([...currentEntries, ...previousEntries].map(entry => entry.name));
  const exerciseProgress = [...exerciseNames].map(name => {
    const maxFor = entries => Math.max(0, ...entries.filter(entry => entry.name === name).map(entry => entry.maxWeight));
    return {
      name,
      previousBest: maxFor(previousEntries),
      currentBest: maxFor(currentEntries),
      exposures: [...currentEntries, ...previousEntries].filter(entry => entry.name === name).length
    };
  }).filter(exercise => exercise.previousBest > 0 && exercise.currentBest > 0 && exercise.exposures >= 2)
    .sort((a, b) => b.exposures - a.exposures)
    .slice(0, 5);

  const plannedCurrent = countPlannedSessions(data, currentStart, endDate);
  const plannedPrevious = countPlannedSessions(data, previousStart, previousEnd);

  return {
    current: {
      sessions: currentSessions.length,
      planned: plannedCurrent,
      volume: Math.round(currentVolume),
      adherence: plannedCurrent ? Math.round((currentSessions.length / plannedCurrent) * 100) : null
    },
    previous: {
      sessions: previousSessions.length,
      planned: plannedPrevious,
      volume: Math.round(previousVolume),
      adherence: plannedPrevious ? Math.round((previousSessions.length / plannedPrevious) * 100) : null
    },
    volumeChange: previousVolume > 0 ? Math.round(((currentVolume - previousVolume) / previousVolume) * 100) : null,
    exerciseProgress
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

  const changedExercise = stats.exerciseProgress.find(exercise => exercise.currentBest !== exercise.previousBest);
  if (changedExercise) {
    const difference = Math.round(((changedExercise.currentBest - changedExercise.previousBest) / changedExercise.previousBest) * 100);
    if (difference > 0) {
      interpretations.push(`En ${changedExercise.name}, tu mejor peso registrado ha aumentado un ${difference}% (${changedExercise.currentBest} kg frente a ${changedExercise.previousBest} kg).`);
    } else {
      interpretations.push(`En ${changedExercise.name}, tu mejor peso registrado ha disminuido un ${Math.abs(difference)}% (${changedExercise.currentBest} kg frente a ${changedExercise.previousBest} kg).`);
    }
  } else if (stats.exerciseProgress.length === 0) {
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

  card.append(heading, description, metrics, list, note);
  return card;
}
