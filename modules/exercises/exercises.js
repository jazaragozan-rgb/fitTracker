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
  { id:"elevaciones_piernas", nombre:"Elevaciones piernas", grupo_muscular:["core"], equipamiento:"peso_corporal", tipo_movimiento:"flexion_cadera", imagen:"" },
  { id:"crunch_invertido", nombre:"Crunch invertido", grupo_muscular:["abdominales","core"], equipamiento:"peso_corporal", tipo_movimiento:"flexion_columna", imagen:"" },
  { id:"crunch_bicicleta", nombre:"Crunch bicicleta", grupo_muscular:["abdominales","oblicuos"], equipamiento:"peso_corporal", tipo_movimiento:"rotacion", imagen:"" },
  { id:"crunch_polea", nombre:"Crunch en polea", grupo_muscular:["abdominales"], equipamiento:"polea", tipo_movimiento:"flexion_columna", imagen:"" },
  { id:"crunch_maquina", nombre:"Crunch en máquina", grupo_muscular:["abdominales"], equipamiento:"maquina", tipo_movimiento:"flexion_columna", imagen:"" },
  { id:"sit_up", nombre:"Sit up", grupo_muscular:["abdominales","core"], equipamiento:"peso_corporal", tipo_movimiento:"flexion_columna", imagen:"" },
  { id:"sit_up_banco_inclinado", nombre:"Sit up banco inclinado", grupo_muscular:["abdominales"], equipamiento:"banco", tipo_movimiento:"flexion_columna", imagen:"" },
  { id:"dead_bug", nombre:"Dead bug", grupo_muscular:["abdominales","core"], equipamiento:"peso_corporal", tipo_movimiento:"estabilizacion", imagen:"" },
  { id:"bird_dog", nombre:"Bird dog", grupo_muscular:["core","espalda_baja"], equipamiento:"peso_corporal", tipo_movimiento:"estabilizacion", imagen:"" },
  { id:"plancha_lateral", nombre:"Plancha lateral", grupo_muscular:["oblicuos","core"], equipamiento:"peso_corporal", tipo_movimiento:"estabilizacion", imagen:"" },
  { id:"plancha_lateral_elevacion_cadera", nombre:"Plancha lateral con elevación de cadera", grupo_muscular:["oblicuos","core"], equipamiento:"peso_corporal", tipo_movimiento:"estabilizacion", imagen:"" },
  { id:"plancha_con_toque_hombros", nombre:"Plancha con toque de hombros", grupo_muscular:["abdominales","core"], equipamiento:"peso_corporal", tipo_movimiento:"estabilizacion", imagen:"" },
  { id:"mountain_climbers", nombre:"Mountain climbers", grupo_muscular:["abdominales","cardio"], equipamiento:"peso_corporal", tipo_movimiento:"flexion_cadera", imagen:"" },
  { id:"pallof_press", nombre:"Pallof press", grupo_muscular:["oblicuos","core"], equipamiento:"polea", tipo_movimiento:"anti_rotacion", imagen:"" },
  { id:"woodchopper_polea", nombre:"Woodchopper en polea", grupo_muscular:["oblicuos","core"], equipamiento:"polea", tipo_movimiento:"rotacion", imagen:"" },
  { id:"giros_rusos", nombre:"Giros rusos", grupo_muscular:["oblicuos","abdominales"], equipamiento:"peso_corporal", tipo_movimiento:"rotacion", imagen:"" },
  { id:"giros_rusos_mancuerna", nombre:"Giros rusos con mancuerna", grupo_muscular:["oblicuos","abdominales"], equipamiento:"mancuernas", tipo_movimiento:"rotacion", imagen:"" },
  { id:"elevacion_rodillas_colgado", nombre:"Elevación de rodillas colgado", grupo_muscular:["abdominales","core"], equipamiento:"barra_dominadas", tipo_movimiento:"flexion_cadera", imagen:"" },
  { id:"elevacion_piernas_colgado", nombre:"Elevación de piernas colgado", grupo_muscular:["abdominales","core"], equipamiento:"barra_dominadas", tipo_movimiento:"flexion_cadera", imagen:"" },
  { id:"limpiaparabrisas_colgado", nombre:"Limpiaparabrisas colgado", grupo_muscular:["oblicuos","abdominales"], equipamiento:"barra_dominadas", tipo_movimiento:"rotacion", imagen:"" },

  /* ================= LUMBARES ================= */
  { id:"extension_lumbares", nombre:"Extensión de lumbares", grupo_muscular:["espalda_baja","gluteos"], equipamiento:"banco_romano", tipo_movimiento:"extension_cadera", imagen:"" },
  { id:"extension_lumbares_peso", nombre:"Extensión de lumbares con peso", grupo_muscular:["espalda_baja","gluteos"], equipamiento:"disco", tipo_movimiento:"extension_cadera", imagen:"" },
  { id:"extension_lumbares_maquina", nombre:"Extensión de lumbares en máquina", grupo_muscular:["espalda_baja"], equipamiento:"maquina", tipo_movimiento:"extension_columna", imagen:"" },
  { id:"buenos_dias_barra", nombre:"Buenos días con barra", grupo_muscular:["espalda_baja","isquiotibiales"], equipamiento:"barra", tipo_movimiento:"bisagra_cadera", imagen:"" },
  { id:"superman", nombre:"Superman", grupo_muscular:["espalda_baja","gluteos"], equipamiento:"peso_corporal", tipo_movimiento:"extension_columna", imagen:"" },
  { id:"superman_alternado", nombre:"Superman alternado", grupo_muscular:["espalda_baja","core"], equipamiento:"peso_corporal", tipo_movimiento:"extension_columna", imagen:"" },
  { id:"hiperextension_inversa", nombre:"Hiperextensión inversa", grupo_muscular:["espalda_baja","gluteos"], equipamiento:"maquina", tipo_movimiento:"extension_cadera", imagen:"" },
  { id:"puente_gluteo_marcha", nombre:"Puente de glúteo con marcha", grupo_muscular:["gluteos","core"], equipamiento:"peso_corporal", tipo_movimiento:"extension_cadera", imagen:"" },

  /* ================= PECHO - VARIANTES ================= */
  { id:"press_banca_mancuernas_agarre_neutro", nombre:"Press banca mancuernas agarre neutro", grupo_muscular:["pecho","triceps"], equipamiento:"mancuernas", tipo_movimiento:"empuje_horizontal", imagen:"" },
  { id:"press_banca_mancuernas_alternado", nombre:"Press banca mancuernas alternado", grupo_muscular:["pecho","core"], equipamiento:"mancuernas", tipo_movimiento:"empuje_horizontal", imagen:"" },
  { id:"press_inclinado_mancuernas_agarre_neutro", nombre:"Press inclinado mancuernas agarre neutro", grupo_muscular:["pecho","triceps"], equipamiento:"mancuernas", tipo_movimiento:"empuje_horizontal", imagen:"" },
  { id:"press_inclinado_smith", nombre:"Press inclinado smith", grupo_muscular:["pecho"], equipamiento:"smith", tipo_movimiento:"empuje_horizontal", imagen:"" },
  { id:"press_pecho_maquina", nombre:"Press de pecho en máquina", grupo_muscular:["pecho","triceps"], equipamiento:"maquina", tipo_movimiento:"empuje_horizontal", imagen:"" },
  { id:"press_pecho_maquina_unilateral", nombre:"Press de pecho en máquina unilateral", grupo_muscular:["pecho"], equipamiento:"maquina", tipo_movimiento:"empuje_horizontal", imagen:"" },
  { id:"press_polea_de_pie", nombre:"Press de pecho en polea de pie", grupo_muscular:["pecho","core"], equipamiento:"polea", tipo_movimiento:"empuje_horizontal", imagen:"" },
  { id:"flexiones_agarre_estrecho", nombre:"Flexiones agarre estrecho", grupo_muscular:["pecho","triceps"], equipamiento:"peso_corporal", tipo_movimiento:"empuje_horizontal", imagen:"" },
  { id:"flexiones_agarre_ancho", nombre:"Flexiones agarre ancho", grupo_muscular:["pecho"], equipamiento:"peso_corporal", tipo_movimiento:"empuje_horizontal", imagen:"" },
  { id:"flexiones_inclinadas", nombre:"Flexiones inclinadas", grupo_muscular:["pecho","triceps"], equipamiento:"peso_corporal", tipo_movimiento:"empuje_horizontal", imagen:"" },
  { id:"flexiones_declive", nombre:"Flexiones declive", grupo_muscular:["pecho","hombros"], equipamiento:"peso_corporal", tipo_movimiento:"empuje_horizontal", imagen:"" },
  { id:"flexiones_lastradas", nombre:"Flexiones lastradas", grupo_muscular:["pecho","triceps"], equipamiento:"lastre", tipo_movimiento:"empuje_horizontal", imagen:"" },
  { id:"pullover_mancuerna", nombre:"Pullover con mancuerna", grupo_muscular:["pecho","espalda"], equipamiento:"mancuernas", tipo_movimiento:"extension_hombro", imagen:"" },
  { id:"aperturas_maquina", nombre:"Aperturas en máquina", grupo_muscular:["pecho"], equipamiento:"maquina", tipo_movimiento:"aislamiento", imagen:"" },
  { id:"aperturas_polea_unilateral", nombre:"Aperturas en polea unilateral", grupo_muscular:["pecho"], equipamiento:"polea", tipo_movimiento:"aislamiento", imagen:"" },

  /* ================= ESPALDA - VARIANTES ================= */
  { id:"jalon_pecho_agarre_neutro", nombre:"Jalón al pecho agarre neutro", grupo_muscular:["espalda","biceps"], equipamiento:"polea", tipo_movimiento:"tiron_vertical", imagen:"" },
  { id:"jalon_pecho_agarre_supino", nombre:"Jalón al pecho agarre supino", grupo_muscular:["espalda","biceps"], equipamiento:"polea", tipo_movimiento:"tiron_vertical", imagen:"" },
  { id:"jalon_unilateral", nombre:"Jalón unilateral", grupo_muscular:["espalda"], equipamiento:"polea", tipo_movimiento:"tiron_vertical", imagen:"" },
  { id:"pulldown_brazos_rectos", nombre:"Jalón de brazos rectos", grupo_muscular:["espalda"], equipamiento:"polea", tipo_movimiento:"aislamiento", imagen:"" },
  { id:"remo_t_barra", nombre:"Remo en T", grupo_muscular:["espalda","biceps"], equipamiento:"barra", tipo_movimiento:"tiron_horizontal", imagen:"" },
  { id:"remo_t_maquina", nombre:"Remo en T en máquina", grupo_muscular:["espalda"], equipamiento:"maquina", tipo_movimiento:"tiron_horizontal", imagen:"" },
  { id:"remo_mancuerna_banco", nombre:"Remo con mancuerna apoyado en banco", grupo_muscular:["espalda"], equipamiento:"mancuernas", tipo_movimiento:"tiron_horizontal", imagen:"" },
  { id:"remo_mancuernas_inclinado", nombre:"Remo con mancuernas inclinado", grupo_muscular:["espalda","hombro_posterior"], equipamiento:"mancuernas", tipo_movimiento:"tiron_horizontal", imagen:"" },
  { id:"remo_polea_unilateral", nombre:"Remo unilateral en polea", grupo_muscular:["espalda"], equipamiento:"polea", tipo_movimiento:"tiron_horizontal", imagen:"" },
  { id:"remo_polea_agarre_ancho", nombre:"Remo en polea agarre ancho", grupo_muscular:["espalda"], equipamiento:"polea", tipo_movimiento:"tiron_horizontal", imagen:"" },
  { id:"remo_invertido", nombre:"Remo invertido", grupo_muscular:["espalda","biceps"], equipamiento:"peso_corporal", tipo_movimiento:"tiron_horizontal", imagen:"" },
  { id:"remo_invertido_pies_elevados", nombre:"Remo invertido pies elevados", grupo_muscular:["espalda","core"], equipamiento:"peso_corporal", tipo_movimiento:"tiron_horizontal", imagen:"" },
  { id:"encogimientos_barra", nombre:"Encogimientos con barra", grupo_muscular:["trapecios"], equipamiento:"barra", tipo_movimiento:"aislamiento", imagen:"" },
  { id:"encogimientos_mancuernas", nombre:"Encogimientos con mancuernas", grupo_muscular:["trapecios"], equipamiento:"mancuernas", tipo_movimiento:"aislamiento", imagen:"" },
  { id:"encogimientos_maquina", nombre:"Encogimientos en máquina", grupo_muscular:["trapecios"], equipamiento:"maquina", tipo_movimiento:"aislamiento", imagen:"" },

  /* ================= HOMBROS - VARIANTES ================= */
  { id:"press_militar_mancuernas_sentado", nombre:"Press militar mancuernas sentado", grupo_muscular:["hombros","triceps"], equipamiento:"mancuernas", tipo_movimiento:"empuje_vertical", imagen:"" },
  { id:"press_militar_mancuernas_de_pie", nombre:"Press militar mancuernas de pie", grupo_muscular:["hombros","core"], equipamiento:"mancuernas", tipo_movimiento:"empuje_vertical", imagen:"" },
  { id:"press_arnold_sentado", nombre:"Arnold press sentado", grupo_muscular:["hombros"], equipamiento:"mancuernas", tipo_movimiento:"empuje_vertical", imagen:"" },
  { id:"press_push_press", nombre:"Push press", grupo_muscular:["hombros","piernas"], equipamiento:"barra", tipo_movimiento:"empuje_vertical", imagen:"" },
  { id:"elevaciones_frontales_disco", nombre:"Elevaciones frontales con disco", grupo_muscular:["hombro_anterior"], equipamiento:"disco", tipo_movimiento:"aislamiento", imagen:"" },
  { id:"elevaciones_frontales_polea", nombre:"Elevaciones frontales en polea", grupo_muscular:["hombro_anterior"], equipamiento:"polea", tipo_movimiento:"aislamiento", imagen:"" },
  { id:"elevaciones_laterales_maquina", nombre:"Elevaciones laterales en máquina", grupo_muscular:["hombro_lateral"], equipamiento:"maquina", tipo_movimiento:"aislamiento", imagen:"" },
  { id:"elevaciones_laterales_unilaterales", nombre:"Elevaciones laterales unilaterales", grupo_muscular:["hombro_lateral"], equipamiento:"mancuernas", tipo_movimiento:"aislamiento", imagen:"" },
  { id:"pajaros_maquina", nombre:"Pájaros en máquina", grupo_muscular:["hombro_posterior"], equipamiento:"maquina", tipo_movimiento:"aislamiento", imagen:"" },
  { id:"pajaros_polea", nombre:"Pájaros en polea", grupo_muscular:["hombro_posterior"], equipamiento:"polea", tipo_movimiento:"aislamiento", imagen:"" },
  { id:"remo_al_menton_barra", nombre:"Remo al mentón con barra", grupo_muscular:["hombros","trapecios"], equipamiento:"barra", tipo_movimiento:"tiron_vertical", imagen:"" },
  { id:"remo_al_menton_polea", nombre:"Remo al mentón en polea", grupo_muscular:["hombros","trapecios"], equipamiento:"polea", tipo_movimiento:"tiron_vertical", imagen:"" },

  /* ================= PIERNAS Y GLUTEOS - VARIANTES ================= */
  { id:"sentadilla_barra_pausa", nombre:"Sentadilla con barra con pausa", grupo_muscular:["piernas","gluteos"], equipamiento:"barra", tipo_movimiento:"sentadilla", imagen:"" },
  { id:"sentadilla_smith", nombre:"Sentadilla en smith", grupo_muscular:["piernas","gluteos"], equipamiento:"smith", tipo_movimiento:"sentadilla", imagen:"" },
  { id:"sentadilla_sissy", nombre:"Sentadilla sissy", grupo_muscular:["cuadriceps"], equipamiento:"peso_corporal", tipo_movimiento:"sentadilla", imagen:"" },
  { id:"hack_squat", nombre:"Hack squat", grupo_muscular:["piernas","cuadriceps"], equipamiento:"maquina", tipo_movimiento:"sentadilla", imagen:"" },
  { id:"prensa_piernas_unilateral", nombre:"Prensa de piernas unilateral", grupo_muscular:["piernas","cuadriceps"], equipamiento:"maquina", tipo_movimiento:"sentadilla", imagen:"" },
  { id:"step_up", nombre:"Step up", grupo_muscular:["piernas","gluteos"], equipamiento:"banco", tipo_movimiento:"sentadilla", imagen:"" },
  { id:"step_up_mancuernas", nombre:"Step up con mancuernas", grupo_muscular:["piernas","gluteos"], equipamiento:"mancuernas", tipo_movimiento:"sentadilla", imagen:"" },
  { id:"zancada_atras", nombre:"Zancada hacia atrás", grupo_muscular:["piernas","gluteos"], equipamiento:"peso_corporal", tipo_movimiento:"sentadilla", imagen:"" },
  { id:"zancada_caminando", nombre:"Zancada caminando", grupo_muscular:["piernas","gluteos"], equipamiento:"mancuernas", tipo_movimiento:"sentadilla", imagen:"" },
  { id:"zancada_lateral", nombre:"Zancada lateral", grupo_muscular:["piernas","aductores"], equipamiento:"peso_corporal", tipo_movimiento:"sentadilla", imagen:"" },
  { id:"peso_muerto_sumo", nombre:"Peso muerto sumo", grupo_muscular:["gluteos","aductores"], equipamiento:"barra", tipo_movimiento:"bisagra_cadera", imagen:"" },
  { id:"peso_muerto_trap_bar", nombre:"Peso muerto con barra hexagonal", grupo_muscular:["piernas","gluteos"], equipamiento:"barra_hexagonal", tipo_movimiento:"bisagra_cadera", imagen:"" },
  { id:"peso_muerto_mancuernas", nombre:"Peso muerto con mancuernas", grupo_muscular:["isquiotibiales","gluteos"], equipamiento:"mancuernas", tipo_movimiento:"bisagra_cadera", imagen:"" },
  { id:"hip_thrust_maquina", nombre:"Hip thrust en máquina", grupo_muscular:["gluteos"], equipamiento:"maquina", tipo_movimiento:"extension_cadera", imagen:"" },
  { id:"hip_thrust_unilateral", nombre:"Hip thrust unilateral", grupo_muscular:["gluteos","core"], equipamiento:"peso_corporal", tipo_movimiento:"extension_cadera", imagen:"" },
  { id:"patada_gluteo_polea", nombre:"Patada de glúteo en polea", grupo_muscular:["gluteos"], equipamiento:"polea", tipo_movimiento:"extension_cadera", imagen:"" },
  { id:"patada_gluteo_maquina", nombre:"Patada de glúteo en máquina", grupo_muscular:["gluteos"], equipamiento:"maquina", tipo_movimiento:"extension_cadera", imagen:"" },
  { id:"abduccion_cadera_maquina", nombre:"Abducción de cadera en máquina", grupo_muscular:["gluteos"], equipamiento:"maquina", tipo_movimiento:"abduccion_cadera", imagen:"" },
  { id:"aduccion_cadera_maquina", nombre:"Aducción de cadera en máquina", grupo_muscular:["aductores"], equipamiento:"maquina", tipo_movimiento:"aduccion_cadera", imagen:"" },
  { id:"curl_femoral_tumbado", nombre:"Curl femoral tumbado", grupo_muscular:["isquiotibiales"], equipamiento:"maquina", tipo_movimiento:"flexion_rodilla", imagen:"" },
  { id:"curl_femoral_sentado", nombre:"Curl femoral sentado", grupo_muscular:["isquiotibiales"], equipamiento:"maquina", tipo_movimiento:"flexion_rodilla", imagen:"" },
  { id:"curl_femoral_unilateral", nombre:"Curl femoral unilateral", grupo_muscular:["isquiotibiales"], equipamiento:"maquina", tipo_movimiento:"flexion_rodilla", imagen:"" },
  { id:"curl_nordico", nombre:"Curl nórdico", grupo_muscular:["isquiotibiales"], equipamiento:"peso_corporal", tipo_movimiento:"flexion_rodilla", imagen:"" },
  { id:"extension_cuadriceps_unilateral", nombre:"Extensión de cuádriceps unilateral", grupo_muscular:["cuadriceps"], equipamiento:"maquina", tipo_movimiento:"extension_rodilla", imagen:"" },
  { id:"gemelo_de_pie", nombre:"Gemelo de pie", grupo_muscular:["gemelos"], equipamiento:"maquina", tipo_movimiento:"extension_tobillo", imagen:"" },
  { id:"gemelo_sentado", nombre:"Gemelo sentado", grupo_muscular:["gemelos"], equipamiento:"maquina", tipo_movimiento:"extension_tobillo", imagen:"" },
  { id:"gemelo_prensa", nombre:"Gemelo en prensa", grupo_muscular:["gemelos"], equipamiento:"maquina", tipo_movimiento:"extension_tobillo", imagen:"" },

  /* ================= BRAZOS - VARIANTES ================= */
  { id:"curl_barra_de_pie", nombre:"Curl con barra de pie", grupo_muscular:["biceps"], equipamiento:"barra", tipo_movimiento:"flexion_codo", imagen:"" },
  { id:"curl_predicador_barra", nombre:"Curl predicador con barra", grupo_muscular:["biceps"], equipamiento:"barra", tipo_movimiento:"flexion_codo", imagen:"" },
  { id:"curl_predicador_mancuerna", nombre:"Curl predicador con mancuerna", grupo_muscular:["biceps"], equipamiento:"mancuernas", tipo_movimiento:"flexion_codo", imagen:"" },
  { id:"curl_concentrado", nombre:"Curl concentrado", grupo_muscular:["biceps"], equipamiento:"mancuernas", tipo_movimiento:"flexion_codo", imagen:"" },
  { id:"curl_inclinado_mancuernas", nombre:"Curl inclinado con mancuernas", grupo_muscular:["biceps"], equipamiento:"mancuernas", tipo_movimiento:"flexion_codo", imagen:"" },
  { id:"curl_bayesiano", nombre:"Curl bayesiano", grupo_muscular:["biceps"], equipamiento:"polea", tipo_movimiento:"flexion_codo", imagen:"" },
  { id:"curl_inverso_barra", nombre:"Curl inverso con barra", grupo_muscular:["biceps","antebrazos"], equipamiento:"barra", tipo_movimiento:"flexion_codo", imagen:"" },
  { id:"extension_triceps_mancuerna", nombre:"Extensión de tríceps con mancuerna", grupo_muscular:["triceps"], equipamiento:"mancuernas", tipo_movimiento:"extension_codo", imagen:"" },
  { id:"extension_triceps_sobre_cabeza_polea", nombre:"Extensión de tríceps sobre cabeza en polea", grupo_muscular:["triceps"], equipamiento:"polea", tipo_movimiento:"extension_codo", imagen:"" },
  { id:"extension_triceps_unilateral_polea", nombre:"Extensión unilateral de tríceps en polea", grupo_muscular:["triceps"], equipamiento:"polea", tipo_movimiento:"extension_codo", imagen:"" },
  { id:"press_cerrado_barra", nombre:"Press banca agarre cerrado", grupo_muscular:["triceps","pecho"], equipamiento:"barra", tipo_movimiento:"empuje_horizontal", imagen:"" },
  { id:"patada_triceps_mancuerna", nombre:"Patada de tríceps con mancuerna", grupo_muscular:["triceps"], equipamiento:"mancuernas", tipo_movimiento:"extension_codo", imagen:"" },
  { id:"fondos_banco", nombre:"Fondos en banco", grupo_muscular:["triceps"], equipamiento:"banco", tipo_movimiento:"empuje_horizontal", imagen:"" },
  { id:"extension_muneca_barra", nombre:"Extensión de muñeca con barra", grupo_muscular:["antebrazos"], equipamiento:"barra", tipo_movimiento:"flexion_muneca", imagen:"" },
  { id:"curl_muneca_barra", nombre:"Curl de muñeca con barra", grupo_muscular:["antebrazos"], equipamiento:"barra", tipo_movimiento:"flexion_muneca", imagen:"" }
];

function normalizarNombreEjercicio(nombre) {
  return String(nombre || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

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
// Helpers de mapeo de ejercicios
// =====================
function mapApiExercise(ex) {
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

  const targetMuscle = ex.target || ex.targetMuscle || 'general';
  const targetTranslated = TRANSLATIONS[targetMuscle.toLowerCase()] || targetMuscle;

  return {
    id: ex.exerciseId,
    nombre: translateExerciseName(ex.name),
    nombreOriginal: ex.name,
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
}

function mapBackupExercise(ex) {
  return {
    ...ex,
    fuente: 'backup'
  };
}

function filterBackupExercises(query) {
  const queryLower = query.toLowerCase().trim();
  const matched = exercisesBackup.filter(ex => {
    const nombre = ex.nombre.toLowerCase();
    const id = ex.id.toLowerCase();
    return nombre.includes(queryLower) || id.includes(queryLower);
  });
  return matched.map(mapBackupExercise);
}

function deduplicarEjercicios(ejercicios) {
  const nombresVistos = new Set();
  const idsVistos = new Set();
  return ejercicios.filter(ejercicio => {
    const nombre = normalizarNombreEjercicio(ejercicio.nombre);
    const id = String(ejercicio.id || '').trim();
    if ((nombre && nombresVistos.has(nombre)) || (id && idsVistos.has(id))) return false;
    if (nombre) nombresVistos.add(nombre);
    if (id) idsVistos.add(id);
    return true;
  });
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

    exercisesCache = deduplicarEjercicios(allExercises.map(mapApiExercise));
    cacheTimestamp = Date.now();
    console.log(`✅ ${exercisesCache.length} ejercicios de API mapeados y traducidos`);
    
    return exercisesCache;
  } catch (error) {
    console.error('❌ [FETCH API] Error:', error);
    return [];
  }
}

async function searchExercisesFromAPI(query, limit = 25, cursor = null) {
  const encodedQuery = encodeURIComponent(query.trim());
  const url = cursor
    ? `/exercises?name=${encodedQuery}&limit=${limit}&cursor=${cursor}`
    : `/exercises?name=${encodedQuery}&limit=${limit}`;
  const response = await apiFetch(url);
  return response;
}

async function searchExercisesByName(query, limit = 25, cursor = null) {
  if (!query || query.trim().length < 2) {
    return { results: [], nextCursor: null, hasMore: false };
  }

  try {
    const response = await searchExercisesFromAPI(query, limit, cursor);
    const apiResults = Array.isArray(response.data) ? response.data.map(mapApiExercise) : [];
    const backupNames = new Set(exercisesBackup.map(ex => normalizarNombreEjercicio(ex.nombre)));
    const uniqueApiResults = deduplicarEjercicios(apiResults)
      .filter(ex => !backupNames.has(normalizarNombreEjercicio(ex.nombre)));
    const nextCursor = response.meta?.nextCursor || null;
    const hasMore = !!nextCursor;
    return { results: uniqueApiResults, nextCursor, hasMore };
  } catch (error) {
    console.error('❌ [BÚSQUEDA API] Error:', error);
    return { results: [], nextCursor: null, hasMore: false };
  }
}

function searchExercisesBackupByName(query) {
  if (!query || query.trim().length < 2) return [];
  return filterBackupExercises(query);
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
    const apiKeys = new Set(apiExercises.flatMap(ex => [
      `id:${ex.id}`,
      `nombre:${normalizarNombreEjercicio(ex.nombre)}`
    ]));
    const uniqueBackup = backupWithSource.filter(ex => !apiKeys.has(`id:${ex.id}`) &&
      !apiKeys.has(`nombre:${normalizarNombreEjercicio(ex.nombre)}`));

    const allExercises = deduplicarEjercicios([...apiExercises, ...uniqueBackup]);
    
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
  searchExercisesBackupByName,
  getExercisesByBodyPart,
  exercisesBackup,
  BODY_PART_MAP,
  EQUIPMENT_MAP,
  TRANSLATIONS
};

export default fetchAllExercises;