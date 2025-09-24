// live.js
// Lógica para el entrenamiento en vivo

// Inicia el flujo de selección (nuevo / registrado)
export function iniciarEntrenamiento() {
  mostrarSeleccionEntrenamiento();
}

// Muestra un modal para elegir tipo de entrenamiento
function mostrarSeleccionEntrenamiento() {
  const modal = document.createElement("div");
  modal.className = "modal-overlay";
  modal.innerHTML = `
    <div class="modal">
      <h2>Entrenamiento</h2>
      <button id="nuevoEntrenamiento">Nuevo entrenamiento</button>
      <button id="entrenamientoRegistrado">Usar uno registrado</button>
      <button id="cerrarModal">Cancelar</button>
    </div>
  `;
  document.body.appendChild(modal);

  modal.querySelector("#nuevoEntrenamiento").onclick = () => {
    modal.remove();
    abrirEntrenamientoEnVivo({});
  };
  modal.querySelector("#entrenamientoRegistrado").onclick = () => {
    modal.remove();
    // TODO: aquí puedes listar entrenamientos guardados y cargar uno
    abrirEntrenamientoEnVivo({ ejercicios: [] });
  };
  modal.querySelector("#cerrarModal").onclick = () => modal.remove();
}

// Crea la pantalla completa de entrenamiento
function abrirEntrenamientoEnVivo(entrenamiento) {
  const overlay = document.createElement("div");
  overlay.className = "entrenamiento-overlay";
  overlay.innerHTML = `
    <div class="entrenamiento-header">
      <h2>Entrenamiento en vivo</h2>
      <button id="cerrarEntrenamiento">✖</button>
    </div>
    <div id="zonaEjercicios"></div>
    <button id="agregarEjercicio">➕ Añadir ejercicio</button>
  `;
  document.body.appendChild(overlay);

  overlay.querySelector("#cerrarEntrenamiento").onclick = () => {
    guardarEntrenamiento();
    overlay.remove();
  };
  overlay.querySelector("#agregarEjercicio").onclick = () => agregarEjercicio();

  // Renderizar ejercicios guardados (si hay)
  if (entrenamiento.ejercicios) {
    entrenamiento.ejercicios.forEach(e => agregarEjercicio(e.nombre, e.series));
  }
}

// Agrega un ejercicio con series
function agregarEjercicio(nombre = "", series = []) {
  const zona = document.getElementById("zonaEjercicios");

  const ejercicioDiv = document.createElement("div");
  ejercicioDiv.className = "ejercicio";
  ejercicioDiv.innerHTML = `
    <input type="text" class="nombre-ejercicio" value="${nombre}" placeholder="Nombre del ejercicio" />
    <div class="series"></div>
    <button class="agregarSerie">Añadir serie</button>
  `;

  const seriesContainer = ejercicioDiv.querySelector(".series");
  ejercicioDiv.querySelector(".agregarSerie").onclick = () => {
    agregarSerie(seriesContainer);
  };

  zona.appendChild(ejercicioDiv);

  // Renderizar series guardadas (si hay)
  series.forEach(s => agregarSerie(seriesContainer, s));
}

// Agrega una fila de serie (reps + peso)
function agregarSerie(container, serie = { repeticiones: "", peso: "" }) {
  const serieDiv = document.createElement("div");
  serieDiv.className = "serie";
  serieDiv.innerHTML = `
    <input type="number" class="reps" placeholder="Reps" value="${serie.repeticiones}" />
    <input type="number" class="peso" placeholder="Peso" value="${serie.peso}" />
  `;
  container.appendChild(serieDiv);
}

// Devuelve el estado actual del entrenamiento
function guardarEntrenamiento() {
  const ejercicios = [];
  document.querySelectorAll(".ejercicio").forEach(ejDiv => {
    const nombre = ejDiv.querySelector(".nombre-ejercicio").value;
    const series = [];
    ejDiv.querySelectorAll(".serie").forEach(sDiv => {
      series.push({
        repeticiones: sDiv.querySelector(".reps").value,
        peso: sDiv.querySelector(".peso").value
      });
    });
    ejercicios.push({ nombre, series });
  });

  console.log("Entrenamiento guardado:", ejercicios);
  // TODO: aquí puedes guardar en Firebase o en tu modelo
}
