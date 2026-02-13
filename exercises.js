// exercises.js - Sistema híbrido: API ExerciseDB + Backup Local
// Busca primero en API, luego en backup local si no encuentra

const API_KEY = 'b5ca83a7dcmsh8a7247721faf4acp1e37e1jsn97465806a370';
const API_HOST = 'edb-with-videos-and-images-by-ascendapi.p.rapidapi.com';
const BASE_URL = 'https://edb-with-videos-and-images-by-ascendapi.p.rapidapi.com/api/v1';

// Cache local
let exercisesCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 1000 * 60 * 30; // 30 minutos

// =====================
// BACKUP LOCAL - Ejercicios que no están en plan básico de la API
// =====================
const exercisesBackup = [
  /* ================= PECHO ================= */
  { id:"press_banca_barra", nombre:"Press banca barra", grupo_muscular:["pecho","triceps"], equipamiento:"barra", tipo_movimiento:"empuje_horizontal", imagen:"" },
  { id:"press_banca_mancuernas", nombre:"Press banca mancuernas", grupo_muscular:["pecho","triceps"], equipamiento:"mancuernas", tipo_movimiento:"empuje_horizontal", imagen:"" },
  { id:"press_banca_smith", nombre:"Press banca smith", grupo_muscular:["pecho"], equipamiento:"smith", tipo_movimiento:"empuje_horizontal", imagen:"" },
  { id:"press_inclinado_barra", nombre:"Press inclinado barra", grupo_muscular:["pecho"], equipamiento:"barra", tipo_movimiento:"empuje_horizontal", imagen:"" },
  { id:"press_inclinado_mancuernas", nombre:"Press inclinado mancuernas", grupo_muscular:["pecho"], equipamiento:"mancuernas", tipo_movimiento:"empuje_horizontal", imagen:"" },
  { id:"press_declinado_barra", nombre:"Press declinado barra", grupo_muscular:["pecho"], equipamiento:"barra", tipo_movimiento:"empuje_horizontal", imagen:"" },
  { id:"fondos_pecho", nombre:"Fondos pecho", grupo_muscular:["pecho","triceps"], equipamiento:"peso_corporal", tipo_movimiento:"empuje_vertical", imagen:"" },
  { id:"fondos_pecho_lastrados", nombre:"Fondos pecho lastrados", grupo_muscular:["pecho"], equipamiento:"lastre", tipo_movimiento:"empuje_vertical", imagen:"" },
  { id:"flexiones", nombre:"Flexiones", grupo_muscular:["pecho"], equipamiento:"peso_corporal", tipo_movimiento:"empuje_horizontal", imagen:"" },
  { id:"flexiones_pies_elevados", nombre:"Flexiones pies elevados", grupo_muscular:["pecho"], equipamiento:"peso_corporal", tipo_movimiento:"empuje_horizontal", imagen:"" },
  { id:"aperturas_mancuernas_plano", nombre:"Aperturas mancuernas plano", grupo_muscular:["pecho"], equipamiento:"mancuernas", tipo_movimiento:"aislamiento", imagen:"" },
  { id:"aperturas_mancuernas_inclinado", nombre:"Aperturas mancuernas inclinado", grupo_muscular:["pecho"], equipamiento:"mancuernas", tipo_movimiento:"aislamiento", imagen:"" },
  { id:"aperturas_poleas_altas", nombre:"Aperturas poleas altas", grupo_muscular:["pecho"], equipamiento:"polea", tipo_movimiento:"aislamiento", imagen:"" },
  { id:"aperturas_poleas_bajas", nombre:"Aperturas poleas bajas", grupo_muscular:["pecho"], equipamiento:"polea", tipo_movimiento:"aislamiento", imagen:"" },

  /* ================= ESPALDA ================= */
  { id:"dominadas_pronadas", nombre:"Dominadas pronadas", grupo_muscular:["espalda","biceps"], equipamiento:"peso_corporal", tipo_movimiento:"tiron_vertical", imagen:"" },
  { id:"dominadas_supinas", nombre:"Dominadas supinas", grupo_muscular:["espalda","biceps"], equipamiento:"peso_corporal", tipo_movimiento:"tiron_vertical", imagen:"" },
  { id:"dominadas_neutras", nombre:"Dominadas neutras", grupo_muscular:["espalda"], equipamiento:"peso_corporal", tipo_movimiento:"tiron_vertical", imagen:"" },
  { id:"dominadas_lastradas", nombre:"Dominadas lastradas", grupo_muscular:["espalda"], equipamiento:"lastre", tipo_movimiento:"tiron_vertical", imagen:"" },
  { id:"jalon_pecho_ancho", nombre:"Jalón pecho ancho", grupo_muscular:["espalda"], equipamiento:"polea", tipo_movimiento:"tiron_vertical", imagen:"" },
  { id:"jalon_pecho_estrecho", nombre:"Jalón pecho estrecho", grupo_muscular:["espalda"], equipamiento:"polea", tipo_movimiento:"tiron_vertical", imagen:"" },
  { id:"remo_barra", nombre:"Remo barra", grupo_muscular:["espalda"], equipamiento:"barra", tipo_movimiento:"tiron_horizontal", imagen:"" },
  { id:"remo_barra_supino", nombre:"Remo barra supino", grupo_muscular:["espalda"], equipamiento:"barra", tipo_movimiento:"tiron_horizontal", imagen:"" },
  { id:"remo_mancuerna", nombre:"Remo mancuerna", grupo_muscular:["espalda"], equipamiento:"mancuernas", tipo_movimiento:"tiron_horizontal", imagen:"" },
  { id:"remo_polea_baja", nombre:"Remo polea baja", grupo_muscular:["espalda"], equipamiento:"polea", tipo_movimiento:"tiron_horizontal", imagen:"" },
  { id:"remo_maquina", nombre:"Remo máquina", grupo_muscular:["espalda"], equipamiento:"maquina", tipo_movimiento:"tiron_horizontal", imagen:"" },
  { id:"pullover_polea", nombre:"Pullover polea", grupo_muscular:["espalda"], equipamiento:"polea", tipo_movimiento:"aislamiento", imagen:"" },

  /* ================= HOMBROS ================= */
  { id:"press_militar_barra", nombre:"Press militar barra", grupo_muscular:["hombros","triceps"], equipamiento:"barra", tipo_movimiento:"empuje_vertical", imagen:"" },
  { id:"press_militar_mancuernas", nombre:"Press militar mancuernas", grupo_muscular:["hombros"], equipamiento:"mancuernas", tipo_movimiento:"empuje_vertical", imagen:"" },
  { id:"press_hombros_maquina", nombre:"Press hombros máquina", grupo_muscular:["hombros"], equipamiento:"maquina", tipo_movimiento:"empuje_vertical", imagen:"" },
  { id:"arnold_press", nombre:"Arnold press", grupo_muscular:["hombros"], equipamiento:"mancuernas", tipo_movimiento:"empuje_vertical", imagen:"" },
  { id:"elevaciones_laterales", nombre:"Elevaciones laterales", grupo_muscular:["hombro_lateral"], equipamiento:"mancuernas", tipo_movimiento:"aislamiento", imagen:"" },
  { id:"elevaciones_laterales_polea", nombre:"Elevaciones laterales polea", grupo_muscular:["hombro_lateral"], equipamiento:"polea", tipo_movimiento:"aislamiento", imagen:"" },
  { id:"pajaros", nombre:"Pájaros", grupo_muscular:["hombro_posterior"], equipamiento:"mancuernas", tipo_movimiento:"aislamiento", imagen:"" },
  { id:"face_pull", nombre:"Face pull", grupo_muscular:["hombro_posterior"], equipamiento:"polea", tipo_movimiento:"aislamiento", imagen:"" },

  /* ================= PIERNAS ================= */
  { id:"sentadilla_barra", nombre:"Sentadilla barra", grupo_muscular:["piernas","gluteos"], equipamiento:"barra", tipo_movimiento:"sentadilla", imagen:"" },
  { id:"sentadilla_frontal", nombre:"Sentadilla frontal", grupo_muscular:["piernas"], equipamiento:"barra", tipo_movimiento:"sentadilla", imagen:"" },
  { id:"sentadilla_goblet", nombre:"Sentadilla goblet", grupo_muscular:["piernas"], equipamiento:"mancuernas", tipo_movimiento:"sentadilla", imagen:"" },
  { id:"prensa_piernas", nombre:"Prensa piernas", grupo_muscular:["piernas"], equipamiento:"maquina", tipo_movimiento:"sentadilla", imagen:"" },
  { id:"zancadas", nombre:"Zancadas", grupo_muscular:["piernas","gluteos"], equipamiento:"mancuernas", tipo_movimiento:"sentadilla", imagen:"" },
  { id:"bulgara", nombre:"Sentadilla búlgara", grupo_muscular:["piernas","gluteos"], equipamiento:"mancuernas", tipo_movimiento:"sentadilla", imagen:"" },
  { id:"peso_muerto", nombre:"Peso muerto", grupo_muscular:["espalda","gluteos"], equipamiento:"barra", tipo_movimiento:"bisagra_cadera", imagen:"" },
  { id:"peso_muerto_rumano", nombre:"Peso muerto rumano", grupo_muscular:["isquiotibiales"], equipamiento:"barra", tipo_movimiento:"bisagra_cadera", imagen:"" },
  { id:"hip_thrust", nombre:"Hip thrust", grupo_muscular:["gluteos"], equipamiento:"barra", tipo_movimiento:"bisagra_cadera", imagen:"" },
  { id:"extension_cuadriceps", nombre:"Extensión cuádriceps", grupo_muscular:["cuadriceps"], equipamiento:"maquina", tipo_movimiento:"aislamiento", imagen:"" },
  { id:"curl_femoral", nombre:"Curl femoral", grupo_muscular:["isquiotibiales"], equipamiento:"maquina", tipo_movimiento:"aislamiento", imagen:"" },
  { id:"gemelos_maquina", nombre:"Gemelos máquina", grupo_muscular:["gemelos"], equipamiento:"maquina", tipo_movimiento:"aislamiento", imagen:"" },

  /* ================= BRAZOS ================= */
  { id:"curl_barra", nombre:"Curl barra", grupo_muscular:["biceps"], equipamiento:"barra", tipo_movimiento:"aislamiento", imagen:"" },
  { id:"curl_ez", nombre:"Curl barra EZ", grupo_muscular:["biceps"], equipamiento:"barra_ez", tipo_movimiento:"aislamiento", imagen:"" },
  { id:"curl_mancuernas", nombre:"Curl mancuernas", grupo_muscular:["biceps"], equipamiento:"mancuernas", tipo_movimiento:"aislamiento", imagen:"" },
  { id:"curl_martillo", nombre:"Curl martillo", grupo_muscular:["biceps"], equipamiento:"mancuernas", tipo_movimiento:"aislamiento", imagen:"" },
  { id:"curl_polea", nombre:"Curl polea", grupo_muscular:["biceps"], equipamiento:"polea", tipo_movimiento:"aislamiento", imagen:"" },
  { id:"press_frances", nombre:"Press francés", grupo_muscular:["triceps"], equipamiento:"barra", tipo_movimiento:"aislamiento", imagen:"" },
  { id:"extension_triceps_polea", nombre:"Extensión tríceps polea", grupo_muscular:["triceps"], equipamiento:"polea", tipo_movimiento:"aislamiento", imagen:"" },
  { id:"fondos_triceps", nombre:"Fondos tríceps", grupo_muscular:["triceps"], equipamiento:"peso_corporal", tipo_movimiento:"empuje_horizontal", imagen:"" },

  /* ================= CORE ================= */
  { id:"plancha", nombre:"Plancha", grupo_muscular:["core"], equipamiento:"peso_corporal", tipo_movimiento:"estabilizacion", imagen:"" },
  { id:"crunch", nombre:"Crunch", grupo_muscular:["core"], equipamiento:"peso_corporal", tipo_movimiento:"flexion_columna", imagen:"" },
  { id:"rueda_abdominal", nombre:"Rueda abdominal", grupo_muscular:["core"], equipamiento:"rueda", tipo_movimiento:"estabilizacion", imagen:"" },
  { id:"elevaciones_piernas", nombre:"Elevaciones piernas", grupo_muscular:["core"], equipamiento:"peso_corporal", tipo_movimiento:"flexion_cadera", imagen:"" }
];

// =====================
// DICCIONARIO DE TRADUCCIÓN COMPLETO
// =====================
const TRANSLATIONS = {
  // Nombres de ejercicios comunes
  'barbell bench press': 'press banca con barra',
  'dumbbell bench press': 'press banca con mancuernas',
  'incline barbell bench press': 'press inclinado con barra',
  'incline dumbbell bench press': 'press inclinado con mancuernas',
  'decline barbell bench press': 'press declinado con barra',
  'chest dips': 'fondos de pecho',
  'push-ups': 'flexiones',
  'push up': 'flexiones',
  'dumbbell flyes': 'aperturas con mancuernas',
  'dumbbell fly': 'aperturas con mancuernas',
  'cable crossover': 'aperturas en polea',
  'cable fly': 'aperturas en polea',
  
  'pull-ups': 'dominadas pronadas',
  'pull up': 'dominadas pronadas',
  'chin-ups': 'dominadas supinas',
  'chin up': 'dominadas supinas',
  'lat pulldown': 'jalón al pecho',
  'barbell row': 'remo con barra',
  'dumbbell row': 'remo con mancuerna',
  'cable row': 'remo en polea',
  'seated cable row': 'remo en polea sentado',
  'cable pullover': 'pullover en polea',
  
  'military press': 'press militar',
  'overhead press': 'press por encima de la cabeza',
  'shoulder press': 'press de hombros',
  'dumbbell shoulder press': 'press de hombros con mancuernas',
  'lateral raise': 'elevaciones laterales',
  'side lateral raise': 'elevaciones laterales',
  'rear delt fly': 'aperturas posteriores',
  'face pull': 'jalón facial',
  
  'barbell squat': 'sentadilla con barra',
  'back squat': 'sentadilla trasera',
  'front squat': 'sentadilla frontal',
  'goblet squat': 'sentadilla goblet',
  'leg press': 'prensa de piernas',
  'lunges': 'zancadas',
  'lunge': 'zancada',
  'bulgarian split squat': 'sentadilla búlgara',
  'deadlift': 'peso muerto',
  'romanian deadlift': 'peso muerto rumano',
  'hip thrust': 'empuje de cadera',
  'leg extension': 'extensión de cuádriceps',
  'leg curl': 'curl femoral',
  'calf raise': 'elevación de gemelos',
  
  'barbell curl': 'curl con barra',
  'ez bar curl': 'curl con barra EZ',
  'dumbbell curl': 'curl con mancuernas',
  'hammer curl': 'curl martillo',
  'cable curl': 'curl en polea',
  'tricep extension': 'extensión de tríceps',
  'triceps extension': 'extensión de tríceps',
  'skull crusher': 'press francés',
  'tricep dips': 'fondos de tríceps',
  
  'plank': 'plancha',
  'crunch': 'crunch abdominal',
  'ab wheel': 'rueda abdominal',
  'leg raise': 'elevación de piernas',
  'hanging leg raise': 'elevación de piernas colgado',
  
  // Palabras clave en nombres
  'dumbbell': 'con mancuernas',
  'dumbbells': 'con mancuernas',
  'barbell': 'con barra',
  'cable': 'en polea',
  'machine': 'en máquina',
  'smith': 'en smith',
  'band': 'con banda',
  'resistance band': 'con banda de resistencia',
  'kettlebell': 'con kettlebell',
  'bodyweight': 'con peso corporal',
  'weighted': 'con peso',
  
  // Verbos y acciones
  'press': 'press',
  'curl': 'curl',
  'raise': 'elevación',
  'extension': 'extensión',
  'row': 'remo',
  'pull': 'jalón',
  'push': 'empuje',
  'fly': 'apertura',
  'flyes': 'aperturas',
  'squat': 'sentadilla',
  'deadlift': 'peso muerto',
  'lunge': 'zancada',
  'crunch': 'crunch',
  'twist': 'giro',
  'rotation': 'rotación',
  
  // Posiciones y ángulos
  'incline': 'inclinado',
  'decline': 'declinado',
  'flat': 'plano',
  'seated': 'sentado',
  'standing': 'de pie',
  'lying': 'acostado',
  'prone': 'prono',
  'supine': 'supino',
  'overhead': 'por encima',
  'front': 'frontal',
  'back': 'trasero',
  'side': 'lateral',
  'rear': 'posterior',
  
  // Partes del cuerpo
  'chest': 'pecho',
  'back': 'espalda',
  'shoulders': 'hombros',
  'shoulder': 'hombro',
  'upper arms': 'brazos superiores',
  'lower arms': 'antebrazos',
  'upper legs': 'piernas superiores',
  'lower legs': 'piernas inferiores',
  'waist': 'cintura',
  'cardio': 'cardio',
  'neck': 'cuello',
  'core': 'core',
  'abs': 'abdominales',
  
  // Músculos específicos
  'pectorals': 'pectorales',
  'pecs': 'pectorales',
  'lats': 'dorsales',
  'latissimus': 'dorsal ancho',
  'delts': 'deltoides',
  'deltoids': 'deltoides',
  'anterior deltoid': 'deltoides anterior',
  'lateral deltoid': 'deltoides lateral',
  'posterior deltoid': 'deltoides posterior',
  'biceps': 'bíceps',
  'triceps': 'tríceps',
  'forearms': 'antebrazos',
  'quads': 'cuádriceps',
  'quadriceps': 'cuádriceps',
  'hamstrings': 'isquiotibiales',
  'glutes': 'glúteos',
  'gluteus': 'glúteo',
  'calves': 'gemelos',
  'gastrocnemius': 'gastrocnemio',
  'soleus': 'sóleo',
  'abdominals': 'abdominales',
  'obliques': 'oblicuos',
  'lower back': 'espalda baja',
  'upper back': 'espalda alta',
  'traps': 'trapecios',
  'trapezius': 'trapecio',
  'rhomboids': 'romboides',
  'erector spinae': 'erector espinal',
  'hip flexors': 'flexores de cadera',
  'adductors': 'aductores',
  'abductors': 'abductores',
  
  // Equipamiento
  'barbell': 'barra',
  'dumbbell': 'mancuerna',
  'dumbbells': 'mancuernas',
  'cable': 'polea',
  'cables': 'poleas',
  'machine': 'máquina',
  'body weight': 'peso corporal',
  'bodyweight': 'peso corporal',
  'band': 'banda',
  'bands': 'bandas',
  'kettlebell': 'kettlebell',
  'kettlebells': 'kettlebells',
  'smith machine': 'máquina smith',
  'rope': 'cuerda',
  'ez bar': 'barra EZ',
  'trap bar': 'barra hexagonal',
  'resistance band': 'banda de resistencia',
  'medicine ball': 'balón medicinal',
  'stability ball': 'pelota de estabilidad',
  'foam roller': 'rodillo de espuma',
  'pull up bar': 'barra de dominadas',
  'dip bar': 'barras paralelas',
  'bench': 'banco',
  
  // Instrucciones comunes
  'step': 'paso',
  'hold': 'mantén',
  'squeeze': 'aprieta',
  'contract': 'contrae',
  'extend': 'extiende',
  'flex': 'flexiona',
  'lift': 'levanta',
  'lower': 'baja',
  'push': 'empuja',
  'pull': 'tira',
  'grip': 'agarre',
  'wide grip': 'agarre ancho',
  'narrow grip': 'agarre estrecho',
  'overhand grip': 'agarre prono',
  'underhand grip': 'agarre supino',
  'neutral grip': 'agarre neutral',
  'feet': 'pies',
  'hands': 'manos',
  'arms': 'brazos',
  'legs': 'piernas',
  'slowly': 'lentamente',
  'controlled': 'controlado',
  'pause': 'pausa',
  'return': 'regresa',
  'starting position': 'posición inicial',
  'repeat': 'repite',
  
  // Niveles de dificultad
  'beginner': 'principiante',
  'intermediate': 'intermedio',
  'advanced': 'avanzado',
  'expert': 'experto',
  
  // Otros términos
  'single': 'individual',
  'double': 'doble',
  'alternating': 'alternado',
  'alternate': 'alterno',
  'unilateral': 'unilateral',
  'bilateral': 'bilateral',
  'compound': 'compuesto',
  'isolation': 'aislamiento',
  'strength': 'fuerza',
  'hypertrophy': 'hipertrofia',
  'endurance': 'resistencia',
  'power': 'potencia',
  'stability': 'estabilidad',
  'mobility': 'movilidad',
  'flexibility': 'flexibilidad'
};

// =====================
// Mapeos
// =====================
const EQUIPMENT_MAP = {
  barbell: 'barra',
  dumbbell: 'mancuernas',
  cable: 'polea',
  machine: 'maquina',
  'body weight': 'peso_corporal',
  band: 'banda',
  kettlebell: 'kettlebell',
  smith: 'smith',
  rope: 'cuerda',
  barbells: 'barra',
  dumbbells: 'mancuernas',
  cables: 'polea',
  machines: 'maquina',
  bands: 'banda',
  kettlebells: 'kettlebell',
  'smith machine': 'smith'
};

const BODY_PART_MAP = {
  back: 'espalda',
  chest: 'pecho',
  shoulders: 'hombros',
  'upper arms': 'brazos',
  'lower arms': 'antebrazos',
  'upper legs': 'piernas',
  'lower legs': 'gemelos',
  waist: 'core',
  cardio: 'cardio',
  neck: 'cuello'
};

// =====================
// Función para traducir nombre de ejercicio
// =====================
function translateExerciseName(englishName) {
  const nameLower = englishName.toLowerCase().trim();
  
  // 1. Buscar traducción exacta primero
  if (TRANSLATIONS[nameLower]) {
    return capitalizeFirst(TRANSLATIONS[nameLower]);
  }
  
  // 2. Extraer componentes del ejercicio
  const components = parseExerciseName(nameLower);
  
  // 3. Construir nombre en español con orden correcto
  return buildSpanishName(components);
}

// Analiza el nombre del ejercicio y extrae sus componentes
function parseExerciseName(englishName) {
  const components = {
    action: '',        // curl, press, raise, etc.
    equipment: '',     // dumbbell, barbell, cable, etc.
    position: '',      // incline, decline, seated, etc.
    bodyPart: '',      // chest, shoulder, etc.
    grip: '',          // hammer, neutral, wide, etc.
    side: '',          // one arm, single, alternating, etc.
    variation: ''      // arnold, scott, etc.
  };
  
  const words = englishName.toLowerCase().split(/\s+/);
  
  // Detectar equipamiento
  const equipmentWords = ['dumbbell', 'dumbbells', 'barbell', 'cable', 'machine', 'kettlebell', 'band', 'smith', 'ez bar'];
  for (const eq of equipmentWords) {
    if (englishName.includes(eq)) {
      components.equipment = eq;
      break;
    }
  }
  
  // Detectar acción principal
  const actionWords = ['press', 'curl', 'raise', 'row', 'fly', 'flyes', 'extension', 'pulldown', 'pullover', 'squat', 'deadlift', 'lunge', 'thrust'];
  for (const action of actionWords) {
    if (words.includes(action) || words.includes(action + 's')) {
      components.action = action;
      break;
    }
  }
  
  // Detectar posición
  const positionWords = ['incline', 'decline', 'flat', 'seated', 'standing', 'lying', 'prone', 'overhead', 'front', 'back'];
  for (const pos of positionWords) {
    if (words.includes(pos)) {
      components.position = pos;
      break;
    }
  }
  
  // Detectar agarre
  const gripWords = ['hammer', 'neutral', 'wide', 'narrow', 'overhand', 'underhand', 'close', 'reverse'];
  for (const grip of gripWords) {
    if (words.includes(grip)) {
      components.grip = grip;
      break;
    }
  }
  
  // Detectar lado/variación
  if (englishName.includes('one arm') || englishName.includes('single arm')) {
    components.side = 'one arm';
  } else if (englishName.includes('alternating')) {
    components.side = 'alternating';
  }
  
  // Detectar parte del cuerpo
  const bodyPartWords = ['chest', 'shoulder', 'back', 'bicep', 'tricep', 'leg', 'lateral', 'rear'];
  for (const part of bodyPartWords) {
    if (englishName.includes(part)) {
      components.bodyPart = part;
      break;
    }
  }
  
  // Detectar variaciones especiales
  if (englishName.includes('arnold')) components.variation = 'arnold';
  if (englishName.includes('scott')) components.variation = 'scott';
  if (englishName.includes('bulgarian')) components.variation = 'bulgarian';
  if (englishName.includes('romanian')) components.variation = 'romanian';
  
  return components;
}

// Construye el nombre en español con orden natural
function buildSpanishName(components) {
  const parts = [];
  
  // Mapeo de acciones a español
  const actionMap = {
    'press': 'Press',
    'curl': 'Curl',
    'raise': 'Elevación',
    'row': 'Remo',
    'fly': 'Apertura',
    'flyes': 'Aperturas',
    'extension': 'Extensión',
    'pulldown': 'Jalón',
    'pullover': 'Pullover',
    'squat': 'Sentadilla',
    'deadlift': 'Peso muerto',
    'lunge': 'Zancada',
    'thrust': 'Empuje'
  };
  
  // Mapeo de equipamiento a español
  const equipmentMap = {
    'dumbbell': 'con mancuernas',
    'dumbbells': 'con mancuernas',
    'barbell': 'con barra',
    'cable': 'en polea',
    'machine': 'en máquina',
    'kettlebell': 'con kettlebell',
    'band': 'con banda',
    'smith': 'en smith',
    'ez bar': 'con barra EZ'
  };
  
  // Mapeo de posiciones
  const positionMap = {
    'incline': 'inclinado',
    'decline': 'declinado',
    'flat': 'plano',
    'seated': 'sentado',
    'standing': 'de pie',
    'lying': 'acostado',
    'overhead': 'por encima',
    'front': 'frontal',
    'back': 'trasero'
  };
  
  // Mapeo de agarres
  const gripMap = {
    'hammer': 'martillo',
    'neutral': 'agarre neutral',
    'wide': 'agarre ancho',
    'narrow': 'agarre estrecho',
    'close': 'agarre cerrado',
    'overhand': 'agarre prono',
    'underhand': 'agarre supino',
    'reverse': 'agarre inverso'
  };
  
  // Mapeo de partes del cuerpo
  const bodyPartMap = {
    'chest': 'de pecho',
    'shoulder': 'de hombro',
    'back': 'de espalda',
    'bicep': 'de bíceps',
    'tricep': 'de tríceps',
    'leg': 'de pierna',
    'lateral': 'lateral',
    'rear': 'posterior'
  };
  
  // Estructura en español: 
  // NORMAL: [Acción] [Posición] [Equipamiento] [Agarre] [Lado] [Parte del cuerpo]
  // CON VARIACIÓN: [Acción] [Posición] [Equipamiento] [Variación] [Agarre] [Lado] [Parte del cuerpo]
  
  // Acción principal PRIMERO
  if (components.action && actionMap[components.action]) {
    parts.push(actionMap[components.action]);
  }
  
  // Posición
  if (components.position && positionMap[components.position]) {
    parts.push(positionMap[components.position]);
  }
  
  // Equipamiento
  if (components.equipment && equipmentMap[components.equipment]) {
    parts.push(equipmentMap[components.equipment]);
  }
  
  // Variación especial DESPUÉS del equipamiento (peso muerto rumano, sentadilla búlgara, arnold press)
  if (components.variation === 'romanian') parts.push('rumano');
  if (components.variation === 'bulgarian') parts.push('búlgara');
  if (components.variation === 'arnold') parts.push('arnold');
  
  // Agarre
  if (components.grip && gripMap[components.grip]) {
    parts.push(gripMap[components.grip]);
  }
  
  // Lado (un brazo, alternado)
  if (components.side === 'one arm') {
    parts.push('a un brazo');
  } else if (components.side === 'alternating') {
    parts.push('alternado');
  }
  
  // Parte del cuerpo
  if (components.bodyPart && bodyPartMap[components.bodyPart]) {
    parts.push(bodyPartMap[components.bodyPart]);
  }
  
  // Si no se pudo construir nada, usar traducción palabra por palabra como fallback
  if (parts.length === 0) {
    return capitalizeFirst(components.action || 'Ejercicio');
  }
  
  return parts.join(' ');
}

// Función para traducir textos largos (instrucciones, descripciones)
function translateText(englishText) {
  if (!englishText) return '';
  
  let translated = englishText.toLowerCase();
  
  // Ordenar traducciones por longitud (más largas primero)
  const sortedTranslations = Object.entries(TRANSLATIONS)
    .sort((a, b) => b[0].length - a[0].length);
  
  for (const [eng, esp] of sortedTranslations) {
    const regex = new RegExp(`\\b${eng}\\b`, 'gi');
    translated = translated.replace(regex, esp);
  }
  
  // Capitalizar primera letra de cada oración
  return capitalizeSentences(translated.trim());
}

// Función para traducir arrays de textos
function translateArray(textArray) {
  if (!Array.isArray(textArray)) return [];
  return textArray.map(text => translateText(text));
}

// Capitalizar primera letra
function capitalizeFirst(text) {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// Capitalizar primera letra de cada oración
function capitalizeSentences(text) {
  if (!text) return '';
  return text.replace(/(^\w|\.\s+\w)/g, letter => letter.toUpperCase());
}

// =====================
// Helper fetch
// =====================
async function apiFetch(endpoint) {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'GET',
    headers: {
      'x-rapidapi-key': API_KEY,
      'x-rapidapi-host': API_HOST
    }
  });

  if (!response.ok) {
    throw new Error(`API Error ${response.status}`);
  }

  return response.json();
}

// =====================
// Obtener TODOS los ejercicios de la API
// =====================
async function fetchAllExercisesFromAPI() {
  if (exercisesCache && Date.now() - cacheTimestamp < CACHE_DURATION) {
    console.log(`💾 [CACHE] Usando ${exercisesCache.length} ejercicios en cache`);
    return exercisesCache;
  }

  try {
    console.log('🔄 [FETCH API] Iniciando carga con cursor pagination...');
    
    let allExercises = [];
    let exerciseIds = new Set();
    let cursor = null;
    let pageCount = 0;
    const limit = 25;
    let duplicateCount = 0;
    
    while (true) {
      pageCount++;
      
      const url = cursor 
        ? `/exercises?limit=${limit}&cursor=${cursor}`
        : `/exercises?limit=${limit}`;
      
      console.log(`📥 Página ${pageCount}${cursor ? ` (cursor: ${cursor.substring(0, 20)}...)` : ''}`);
      
      const response = await apiFetch(url);
      const batch = Array.isArray(response.data) ? response.data : [];
      
      if (pageCount === 1 && response.meta) {
        console.log(`📊 Total en API: ${response.meta.total} ejercicios`);
      }
      
      if (batch.length === 0) {
        console.log('✓ No hay más ejercicios en esta página');
        break;
      }
      
      let newExercises = 0;
      batch.forEach(ex => {
        if (!exerciseIds.has(ex.exerciseId)) {
          exerciseIds.add(ex.exerciseId);
          allExercises.push(ex);
          newExercises++;
        } else {
          duplicateCount++;
        }
      });
      
      console.log(`✓ +${newExercises} nuevos ejercicios (${batch.length - newExercises} duplicados) | Total único: ${allExercises.length}`);
      
      if (newExercises === 0) {
        console.log('⚠️ No se encontraron ejercicios nuevos, deteniendo...');
        break;
      }
      
      if (response.meta?.hasNextPage && response.meta?.nextCursor) {
        const newCursor = response.meta.nextCursor;
        
        if (newCursor === cursor) {
          console.warn('⚠️ Cursor no cambió, deteniendo para evitar loop infinito');
          break;
        }
        
        cursor = newCursor;
      } else {
        console.log('✓ No hay más páginas');
        break;
      }
      
      if (pageCount >= 50) {
        console.warn('⚠️ Límite de seguridad alcanzado (50 páginas)');
        break;
      }
      
      if (response.meta?.total && allExercises.length >= response.meta.total) {
        console.log('✓ Todos los ejercicios cargados según meta.total');
        break;
      }
    }
    
    console.log(`🎯 TOTAL API: ${allExercises.length} ejercicios únicos en ${pageCount} páginas`);
    if (duplicateCount > 0) {
      console.log(`⚠️ Se encontraron ${duplicateCount} duplicados (filtrados)`);
    }

    // Mapear y traducir ejercicios de la API
    exercisesCache = allExercises.map(ex => {
      let equip = 'sin_equipo';
      if (ex.equipments && Array.isArray(ex.equipments) && ex.equipments.length > 0) {
        equip = EQUIPMENT_MAP[ex.equipments[0].toLowerCase()] || ex.equipments[0];
      } else if (ex.equipment) {
        equip = EQUIPMENT_MAP[ex.equipment.toLowerCase()] || ex.equipment;
      }
      
      let bodyPart = 'general';
      if (ex.bodyParts && Array.isArray(ex.bodyParts) && ex.bodyParts.length > 0) {
        bodyPart = ex.bodyParts[0];
      } else if (ex.bodyPart) {
        bodyPart = ex.bodyPart;
      }
      
      // Traducir el músculo objetivo
      const targetMuscle = ex.target || ex.targetMuscle || 'general';
      const targetTranslated = TRANSLATIONS[targetMuscle.toLowerCase()] || targetMuscle;
      
      return {
        id: ex.exerciseId,
        nombre: translateExerciseName(ex.name),
        nombreOriginal: ex.name, // Guardar nombre original para búsquedas
        grupo_muscular: [
          BODY_PART_MAP[bodyPart.toLowerCase()] || translateText(bodyPart),
          targetTranslated
        ],
        equipamiento: equip,
        tipo_movimiento: 'compuesto',
        imagen: ex.imageUrl || '',
        video: ex.videoUrl || '',
        instrucciones: translateArray(ex.instructions || []),
        musculosSecundarios: translateArray(ex.secondaryMuscles || []),
        descripcion: translateText(ex.description || ''),
        dificultad: TRANSLATIONS[ex.difficulty?.toLowerCase()] || ex.difficulty || '',
        fuente: 'api'
      };
    });

    cacheTimestamp = Date.now();
    console.log(`✅ ${exercisesCache.length} ejercicios de API mapeados y traducidos`);
    
    return exercisesCache;
  } catch (error) {
    console.error('❌ [FETCH API] Error:', error);
    return [];
  }
}

// =====================
// FUNCIÓN PRINCIPAL: Obtener todos los ejercicios (API + Backup)
// =====================
async function fetchAllExercises() {
  try {
    // Obtener ejercicios de la API
    const apiExercises = await fetchAllExercisesFromAPI();
    
    // Marcar ejercicios del backup
    const backupWithSource = exercisesBackup.map(ex => ({
      ...ex,
      fuente: 'backup'
    }));
    
    // Combinar sin duplicados (priorizar API)
    const apiIds = new Set(apiExercises.map(ex => ex.id));
    const uniqueBackup = backupWithSource.filter(ex => !apiIds.has(ex.id));
    
    const allExercises = [...apiExercises, ...uniqueBackup];
    
    console.log(`📊 TOTAL COMBINADO: ${allExercises.length} ejercicios`);
    console.log(`   ├─ API: ${apiExercises.length}`);
    console.log(`   └─ Backup: ${uniqueBackup.length}`);
    
    return allExercises;
  } catch (error) {
    console.error('❌ [FETCH ALL] Error, usando solo backup:', error);
    return exercisesBackup.map(ex => ({ ...ex, fuente: 'backup' }));
  }
}

// =====================
// BÚSQUEDA HÍBRIDA: Primero API, luego Backup
// =====================
async function searchExercisesByName(query) {
  try {
    console.log('🔍 [BÚSQUEDA HÍBRIDA] Buscando:', query);
    
    const allExercises = await fetchAllExercises();
    
    if (allExercises.length === 0) {
      console.warn('⚠️ No hay ejercicios disponibles');
      return [];
    }
    
    const queryLower = query.toLowerCase().trim();
    
    // Buscar tanto en nombre traducido como en nombre original
    const filtered = allExercises.filter(ex => {
      const matchesNombre = ex.nombre.toLowerCase().includes(queryLower);
      const matchesOriginal = ex.nombreOriginal && ex.nombreOriginal.toLowerCase().includes(queryLower);
      return matchesNombre || matchesOriginal;
    });
    
    // Ordenar: primero API, luego backup
    filtered.sort((a, b) => {
      if (a.fuente === 'api' && b.fuente === 'backup') return -1;
      if (a.fuente === 'backup' && b.fuente === 'api') return 1;
      return 0;
    });
    
    console.log(`✓ ${filtered.length} resultados para "${query}"`);
    console.log(`   ├─ API: ${filtered.filter(ex => ex.fuente === 'api').length}`);
    console.log(`   └─ Backup: ${filtered.filter(ex => ex.fuente === 'backup').length}`);
    
    return filtered;
  } catch (error) {
    console.error('❌ [BÚSQUEDA] Error:', error);
    return [];
  }
}

// =====================
// Ejercicios por grupo muscular
// =====================
async function getExercisesByBodyPart(bodyPart) {
  try {
    console.log('💪 [GRUPO MUSCULAR] Buscando:', bodyPart);
    
    const allExercises = await fetchAllExercises();
    const bodyPartLower = bodyPart.toLowerCase();
    
    const filtered = allExercises.filter(ex => {
      const grupos = ex.grupo_muscular.map(g => g.toLowerCase());
      return grupos.some(g => g.includes(bodyPartLower));
    });
    
    // Ordenar: primero API, luego backup
    filtered.sort((a, b) => {
      if (a.fuente === 'api' && b.fuente === 'backup') return -1;
      if (a.fuente === 'backup' && b.fuente === 'api') return 1;
      return 0;
    });
    
    console.log(`✓ ${filtered.length} ejercicios para ${bodyPart}`);
    console.log(`   ├─ API: ${filtered.filter(ex => ex.fuente === 'api').length}`);
    console.log(`   └─ Backup: ${filtered.filter(ex => ex.fuente === 'backup').length}`);
    
    return filtered;
  } catch (error) {
    console.error('❌ [GRUPO MUSCULAR] Error:', error);
    return [];
  }
}

// =====================
// EXPORTAR
// =====================
export {
  fetchAllExercises,
  searchExercisesByName,
  getExercisesByBodyPart,
  exercisesBackup,
  BODY_PART_MAP,
  EQUIPMENT_MAP,
  TRANSLATIONS
};

export default fetchAllExercises;