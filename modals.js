// Función auxiliar: resetea todas las series a no completadas (completada = false)
function resetCompletadas(nodo) {
  if (!nodo) return;
  // Si es array, recorrer
  if (Array.isArray(nodo)) {
    nodo.forEach(n => resetCompletadas(n));
    return;
  }
  // nodo es objeto: mirar series e hijos
  if (Array.isArray(nodo.series)) {
    nodo.series.forEach(s => { s.completada = false; });
  }
  if (Array.isArray(nodo.hijos)) {
    nodo.hijos.forEach(h => resetCompletadas(h));
  }
}

// Muestra el menú de opciones (Editar, Eliminar, Copiar) como modal flotante
export function mostrarMenuOpciones({ anchorElement, onEditar, onEliminar, onCopiar }) {
  let anterior = document.getElementById('modalMenuOpciones');
  if (anterior) anterior.remove();

  const menu = document.createElement('div');
  menu.id = 'modalMenuOpciones';
  menu.className = 'menu-opciones';
  menu.style.position = 'fixed';
  menu.style.background = '#fff';
  menu.style.border = '1px solid #ccc';
  menu.style.borderRadius = '8px';
  menu.style.boxShadow = '0 2px 8px #bbb';
  menu.style.zIndex = '1000';
  menu.style.display = 'flex';
  menu.style.flexDirection = 'column';
  menu.style.minWidth = '120px';

  // Posicionamiento relativo al botón
  if (anchorElement) {
    const rect = anchorElement.getBoundingClientRect();
    menu.style.top = (rect.bottom + window.scrollY) + 'px';
    menu.style.visibility = 'hidden';
    document.body.appendChild(menu);
    menu.style.left = (rect.right + window.scrollX - menu.offsetWidth) + 'px';
    menu.style.visibility = 'visible';
  } else {
    menu.style.top = '40px';
    menu.style.right = '10px';
    document.body.appendChild(menu);
  }
  menu.style.textAlign = 'left';

  // Estilos comunes para botones
  const btnStyle = { display:'block', width:'100%', height:'30px', border:'none', background:'none', padding:'8px', margin:'2px', textAlign:'left' };

  // Editar
  const editarBtn = document.createElement('button');
  editarBtn.textContent = 'Editar';
  Object.assign(editarBtn.style, btnStyle);
  editarBtn.onclick = (e) => {
    e.stopPropagation();
    menu.remove();
    if (onEditar) onEditar();
  };
  menu.appendChild(editarBtn);

  // Eliminar
  const eliminarBtn = document.createElement('button');
  eliminarBtn.textContent = 'Eliminar';
  Object.assign(eliminarBtn.style, btnStyle);
  eliminarBtn.onclick = (e) => {
    e.stopPropagation();
    menu.remove();
    if (onEliminar) onEliminar();
  };
  menu.appendChild(eliminarBtn);

  // Copiar (robusta: maneja retorno directo, promise o asignación a window.itemCopiado)
  const copiarBtn = document.createElement('button');
  copiarBtn.textContent = 'Copiar';
  Object.assign(copiarBtn.style, btnStyle);
  copiarBtn.onclick = async (e) => {
    e.stopPropagation();
    menu.remove();
    if (!onCopiar) return;

    try {
      const ret = onCopiar(); // puede devolver algo o asignar window.itemCopiado
      const resolved = (ret && typeof ret.then === 'function') ? await ret : ret;

      // prioridad: lo que retorne la función, si no -> window.itemCopiado
      let resultado = resolved || window.itemCopiado || null;

      if (!resultado) {
        // nada devuelto ni window.itemCopiado definido: nada que resetear
        return;
      }

      // Normalizar: resultado puede ser { nivel, datos } o puede ser directamente los datos.
      let datosCopiados;
      if (resultado && resultado.datos) datosCopiados = resultado.datos;
      else datosCopiados = resultado;

      if (!datosCopiados) return;

      // Resetear recursivamente las series dentro de la copia
      resetCompletadas(datosCopiados);

      // Guardar la copia reseteada en window.itemCopiado (forma consistente)
      if (resultado && resultado.datos) {
        // resultado ya tenía la forma {nivel, datos}
        resultado.datos = datosCopiados;
        window.itemCopiado = resultado;
      } else {
        // no tenía nivel, intentar mantener nivel anterior si existía
        const nivelPrev = window.itemCopiado ? window.itemCopiado.nivel : undefined;
        window.itemCopiado = { nivel: nivelPrev, datos: datosCopiados };
      }
    } catch (err) {
      console.error('Error en onCopiar:', err);
    }
  };
  menu.appendChild(copiarBtn);

  // Cerrar al hacer click fuera
  setTimeout(() => {
    document.addEventListener('mousedown', function cerrar(e) {
      if (!menu.contains(e.target)) {
        menu.remove();
        document.removeEventListener('mousedown', cerrar);
      }
    });
  }, 50);

  document.body.appendChild(menu);
}


// modals.js
export function mostrarSelectorMarca(serie, index, onSelect) {
  let anterior = document.getElementById('modalSelector');
  if (anterior) anterior.remove();

  const modal = document.createElement('div');
  modal.id = 'modalSelector';
  modal.style.position = 'fixed';
  modal.style.top = '0';
  modal.style.left = '0';
  modal.style.width = '100%';
  modal.style.height = '100%';
  modal.style.background = 'rgba(0,0,0,0.4)';
  modal.style.display = 'flex';
  modal.style.alignItems = 'center';
  modal.style.justifyContent = 'center';
  modal.style.zIndex = '99999';

  const caja = document.createElement('div');
  caja.style.background = '#fff';
  caja.style.padding = '1em';
  caja.style.borderRadius = '10px';

  // ✅ Primero la opción con el número de la serie
  const opciones = [
    { inicial: (index + 1).toString(), texto: `Serie ${index + 1}` },
    { inicial: 'W', texto: 'Serie de calentamiento' },
    { inicial: 'D', texto: 'Dropset' },
    { inicial: 'R', texto: 'Rest pause' },
    { inicial: 'F', texto: 'Serie fallada' }
  ];

  opciones.forEach(op => {
    const b = document.createElement('button');
    b.textContent = `${op.inicial} - ${op.texto}`;
    b.style.margin = '0.5em';
    b.onclick = (e) => {
      e.stopPropagation();
      // Guardamos solo la inicial o número
      serie.marca = op.inicial;
      modal.remove();
      if (onSelect) onSelect(serie, index);
    };
    caja.appendChild(b);
  });

  // ✅ Botón cancelar genérico
  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Cancelar';
  cancelBtn.style.margin = '0.5em';
  cancelBtn.onclick = (e) => {
    e.stopPropagation();
    modal.remove();
  };
  caja.appendChild(cancelBtn);

  modal.appendChild(caja);
  document.body.appendChild(modal);
}

export function mostrarConfirmacion(mensaje, onConfirm, onCancel = null, textoConfirm = 'Sí', textoCancel = 'No') {
  let anterior = document.getElementById('modalConfirmacion');
  if (anterior) anterior.remove();

  const modal = document.createElement('div');
  modal.id = 'modalConfirmacion';
  modal.style.position = 'fixed';
  modal.style.top = '0';
  modal.style.left = '0';
  modal.style.width = '100%';
  modal.style.height = '100%';
  modal.style.background = 'rgba(0,0,0,0.4)';
  modal.style.display = 'flex';
  modal.style.alignItems = 'center';
  modal.style.justifyContent = 'center';
  modal.style.zIndex = '9999';

  const caja = document.createElement('div');
  caja.style.background = '#fff';
  caja.style.padding = '2em';
  caja.style.borderRadius = '10px';
  caja.style.display = 'flex';
  caja.style.flexDirection = 'column';
  caja.style.alignItems = 'center';
  caja.style.gap = '1em';

  const texto = document.createElement('p');
  texto.textContent = mensaje;
  texto.style.marginBottom = '1em';
  texto.style.textAlign = 'center';
  caja.appendChild(texto);

  const botones = document.createElement('div');
  botones.style.display = 'flex';
  botones.style.gap = '1em';

  const btnSi = document.createElement('button');
  btnSi.textContent = textoConfirm;
  btnSi.onclick = () => {
    modal.remove();
    if (onConfirm) onConfirm();
  };

  const btnNo = document.createElement('button');
  btnNo.textContent = textoCancel;
  btnNo.onclick = () => {
    modal.remove();
    if (onCancel) onCancel();
  };

  botones.appendChild(btnSi);
  botones.appendChild(btnNo);
  caja.appendChild(botones);

  modal.appendChild(caja);
  document.body.appendChild(modal);
}

