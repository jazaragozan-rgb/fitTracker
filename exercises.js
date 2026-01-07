const exercises = [

/* ================= PECHO (55) ================= */
{ id:"press_banca_barra", nombre:"Press banca barra", grupo_muscular:["pecho","triceps"], equipamiento:"barra", tipo_movimiento:"empuje_horizontal" },
{ id:"press_banca_mancuernas", nombre:"Press banca mancuernas", grupo_muscular:["pecho","triceps"], equipamiento:"mancuernas", tipo_movimiento:"empuje_horizontal" },
{ id:"press_banca_smith", nombre:"Press banca smith", grupo_muscular:["pecho"], equipamiento:"smith", tipo_movimiento:"empuje_horizontal" },
{ id:"press_inclinado_barra", nombre:"Press inclinado barra", grupo_muscular:["pecho"], equipamiento:"barra", tipo_movimiento:"empuje_horizontal" },
{ id:"press_inclinado_mancuernas", nombre:"Press inclinado mancuernas", grupo_muscular:["pecho"], equipamiento:"mancuernas", tipo_movimiento:"empuje_horizontal" },
{ id:"press_declinado_barra", nombre:"Press declinado barra", grupo_muscular:["pecho"], equipamiento:"barra", tipo_movimiento:"empuje_horizontal" },
{ id:"fondos_pecho", nombre:"Fondos pecho", grupo_muscular:["pecho","triceps"], equipamiento:"peso_corporal", tipo_movimiento:"empuje_vertical" },
{ id:"fondos_pecho_lastrados", nombre:"Fondos pecho lastrados", grupo_muscular:["pecho"], equipamiento:"lastre", tipo_movimiento:"empuje_vertical" },
{ id:"flexiones", nombre:"Flexiones", grupo_muscular:["pecho"], equipamiento:"peso_corporal", tipo_movimiento:"empuje_horizontal" },
{ id:"flexiones_pies_elevados", nombre:"Flexiones pies elevados", grupo_muscular:["pecho"], equipamiento:"peso_corporal", tipo_movimiento:"empuje_horizontal" },
{ id:"aperturas_mancuernas_plano", nombre:"Aperturas mancuernas plano", grupo_muscular:["pecho"], equipamiento:"mancuernas", tipo_movimiento:"aislamiento" },
{ id:"aperturas_mancuernas_inclinado", nombre:"Aperturas mancuernas inclinado", grupo_muscular:["pecho"], equipamiento:"mancuernas", tipo_movimiento:"aislamiento" },
{ id:"aperturas_poleas_altas", nombre:"Aperturas poleas altas", grupo_muscular:["pecho"], equipamiento:"polea", tipo_movimiento:"aislamiento" },
{ id:"aperturas_poleas_bajas", nombre:"Aperturas poleas bajas", grupo_muscular:["pecho"], equipamiento:"polea", tipo_movimiento:"aislamiento" },

/* ================= ESPALDA (80) ================= */
{ id:"dominadas_pronadas", nombre:"Dominadas pronadas", grupo_muscular:["espalda","biceps"], equipamiento:"peso_corporal", tipo_movimiento:"tiron_vertical" },
{ id:"dominadas_supinas", nombre:"Dominadas supinas", grupo_muscular:["espalda","biceps"], equipamiento:"peso_corporal", tipo_movimiento:"tiron_vertical" },
{ id:"dominadas_neutras", nombre:"Dominadas neutras", grupo_muscular:["espalda"], equipamiento:"peso_corporal", tipo_movimiento:"tiron_vertical" },
{ id:"dominadas_lastradas", nombre:"Dominadas lastradas", grupo_muscular:["espalda"], equipamiento:"lastre", tipo_movimiento:"tiron_vertical" },
{ id:"jalon_pecho_ancho", nombre:"Jalón pecho ancho", grupo_muscular:["espalda"], equipamiento:"polea", tipo_movimiento:"tiron_vertical" },
{ id:"jalon_pecho_estrecho", nombre:"Jalón pecho estrecho", grupo_muscular:["espalda"], equipamiento:"polea", tipo_movimiento:"tiron_vertical" },
{ id:"remo_barra", nombre:"Remo barra", grupo_muscular:["espalda"], equipamiento:"barra", tipo_movimiento:"tiron_horizontal" },
{ id:"remo_barra_supino", nombre:"Remo barra supino", grupo_muscular:["espalda"], equipamiento:"barra", tipo_movimiento:"tiron_horizontal" },
{ id:"remo_mancuerna", nombre:"Remo mancuerna", grupo_muscular:["espalda"], equipamiento:"mancuernas", tipo_movimiento:"tiron_horizontal" },
{ id:"remo_polea_baja", nombre:"Remo polea baja", grupo_muscular:["espalda"], equipamiento:"polea", tipo_movimiento:"tiron_horizontal" },
{ id:"remo_maquina", nombre:"Remo máquina", grupo_muscular:["espalda"], equipamiento:"maquina", tipo_movimiento:"tiron_horizontal" },
{ id:"pullover_polea", nombre:"Pullover polea", grupo_muscular:["espalda"], equipamiento:"polea", tipo_movimiento:"aislamiento" },

/* ================= HOMBROS (65) ================= */
{ id:"press_militar_barra", nombre:"Press militar barra", grupo_muscular:["hombros","triceps"], equipamiento:"barra", tipo_movimiento:"empuje_vertical" },
{ id:"press_militar_mancuernas", nombre:"Press militar mancuernas", grupo_muscular:["hombros"], equipamiento:"mancuernas", tipo_movimiento:"empuje_vertical" },
{ id:"press_hombros_maquina", nombre:"Press hombros máquina", grupo_muscular:["hombros"], equipamiento:"maquina", tipo_movimiento:"empuje_vertical" },
{ id:"arnold_press", nombre:"Arnold press", grupo_muscular:["hombros"], equipamiento:"mancuernas", tipo_movimiento:"empuje_vertical" },
{ id:"elevaciones_laterales", nombre:"Elevaciones laterales", grupo_muscular:["hombro_lateral"], equipamiento:"mancuernas", tipo_movimiento:"aislamiento" },
{ id:"elevaciones_laterales_polea", nombre:"Elevaciones laterales polea", grupo_muscular:["hombro_lateral"], equipamiento:"polea", tipo_movimiento:"aislamiento" },
{ id:"pajaros", nombre:"Pájaros", grupo_muscular:["hombro_posterior"], equipamiento:"mancuernas", tipo_movimiento:"aislamiento" },
{ id:"face_pull", nombre:"Face pull", grupo_muscular:["hombro_posterior"], equipamiento:"polea", tipo_movimiento:"aislamiento" },

/* ================= PIERNAS (120) ================= */
{ id:"sentadilla_barra", nombre:"Sentadilla barra", grupo_muscular:["piernas","gluteos"], equipamiento:"barra", tipo_movimiento:"sentadilla" },
{ id:"sentadilla_frontal", nombre:"Sentadilla frontal", grupo_muscular:["piernas"], equipamiento:"barra", tipo_movimiento:"sentadilla" },
{ id:"sentadilla_goblet", nombre:"Sentadilla goblet", grupo_muscular:["piernas"], equipamiento:"mancuernas", tipo_movimiento:"sentadilla" },
{ id:"prensa_piernas", nombre:"Prensa piernas", grupo_muscular:["piernas"], equipamiento:"maquina", tipo_movimiento:"sentadilla" },
{ id:"zancadas", nombre:"Zancadas", grupo_muscular:["piernas","gluteos"], equipamiento:"mancuernas", tipo_movimiento:"sentadilla" },
{ id:"bulgara", nombre:"Sentadilla búlgara", grupo_muscular:["piernas","gluteos"], equipamiento:"mancuernas", tipo_movimiento:"sentadilla" },
{ id:"peso_muerto", nombre:"Peso muerto", grupo_muscular:["espalda","gluteos"], equipamiento:"barra", tipo_movimiento:"bisagra_cadera" },
{ id:"peso_muerto_rumano", nombre:"Peso muerto rumano", grupo_muscular:["isquiotibiales"], equipamiento:"barra", tipo_movimiento:"bisagra_cadera" },
{ id:"hip_thrust", nombre:"Hip thrust", grupo_muscular:["gluteos"], equipamiento:"barra", tipo_movimiento:"bisagra_cadera" },
{ id:"extension_cuadriceps", nombre:"Extensión cuádriceps", grupo_muscular:["cuadriceps"], equipamiento:"maquina", tipo_movimiento:"aislamiento" },
{ id:"curl_femoral", nombre:"Curl femoral", grupo_muscular:["isquiotibiales"], equipamiento:"maquina", tipo_movimiento:"aislamiento" },
{ id:"gemelos_maquina", nombre:"Gemelos máquina", grupo_muscular:["gemelos"], equipamiento:"maquina", tipo_movimiento:"aislamiento" },

/* ================= BRAZOS (60) ================= */
{ id:"curl_barra", nombre:"Curl barra", grupo_muscular:["biceps"], equipamiento:"barra", tipo_movimiento:"aislamiento" },
{ id:"curl_ez", nombre:"Curl barra EZ", grupo_muscular:["biceps"], equipamiento:"barra_ez", tipo_movimiento:"aislamiento" },
{ id:"curl_mancuernas", nombre:"Curl mancuernas", grupo_muscular:["biceps"], equipamiento:"mancuernas", tipo_movimiento:"aislamiento" },
{ id:"curl_martillo", nombre:"Curl martillo", grupo_muscular:["biceps"], equipamiento:"mancuernas", tipo_movimiento:"aislamiento" },
{ id:"curl_polea", nombre:"Curl polea", grupo_muscular:["biceps"], equipamiento:"polea", tipo_movimiento:"aislamiento" },
{ id:"press_frances", nombre:"Press francés", grupo_muscular:["triceps"], equipamiento:"barra", tipo_movimiento:"aislamiento" },
{ id:"extension_triceps_polea", nombre:"Extensión tríceps polea", grupo_muscular:["triceps"], equipamiento:"polea", tipo_movimiento:"aislamiento" },
{ id:"fondos_triceps", nombre:"Fondos tríceps", grupo_muscular:["triceps"], equipamiento:"peso_corporal", tipo_movimiento:"empuje_horizontal" },

/* ================= CORE (20) ================= */
{ id:"plancha", nombre:"Plancha", grupo_muscular:["core"], equipamiento:"peso_corporal", tipo_movimiento:"estabilizacion" },
{ id:"crunch", nombre:"Crunch", grupo_muscular:["core"], equipamiento:"peso_corporal", tipo_movimiento:"flexion_columna" },
{ id:"rueda_abdominal", nombre:"Rueda abdominal", grupo_muscular:["core"], equipamiento:"rueda", tipo_movimiento:"estabilizacion" },
{ id:"elevaciones_piernas", nombre:"Elevaciones piernas", grupo_muscular:["core"], equipamiento:"peso_corporal", tipo_movimiento:"flexion_cadera" }

];

export default exercises;
