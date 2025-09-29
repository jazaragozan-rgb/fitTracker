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

  // Establecer top
  menu.style.top = (rect.bottom + window.scrollY) + 'px';

  // Posicionar left usando un truco: calcular ancho sin necesidad de setTimeout
  menu.style.visibility = 'hidden'; // ocultamos mientras calculamos
  document.body.appendChild(menu); // añadir al DOM para medir offsetWidth
  menu.style.left = (rect.right + window.scrollX - menu.offsetWidth) + 'px';
  menu.style.visibility = 'visible'; // mostrar ya en posición correcta
  
  } else {
    menu.style.top = '40px';
    menu.style.right = '10px';
    document.body.appendChild(menu);
  }
  // Alinear textos a la izquierda
  menu.style.textAlign = 'left';

  // Editar
  const editarBtn = document.createElement('button');
  editarBtn.textContent = 'Editar';
  editarBtn.style.display = 'block';
  editarBtn.style.width = '100%';
  editarBtn.style.height = '30px';
  editarBtn.style.border = 'none';
  editarBtn.style.background = 'none';
  editarBtn.style.padding = '8px';
  editarBtn.style.margin = '2px';
  editarBtn.onclick = (e) => {
    e.stopPropagation();
    menu.remove();
    if (onEditar) onEditar();
  };
  menu.appendChild(editarBtn);

  // Eliminar
  const eliminarBtn = document.createElement('button');
  eliminarBtn.textContent = 'Eliminar';
  eliminarBtn.style.display = 'block';
  eliminarBtn.style.width = '100%';
  eliminarBtn.style.height = '30px';
  eliminarBtn.style.border = 'none';
  eliminarBtn.style.background = 'none';
  eliminarBtn.style.padding = '8px';
  eliminarBtn.style.margin = '2px';
  eliminarBtn.onclick = (e) => {
    e.stopPropagation();
    menu.remove();
    if (onEliminar) onEliminar();
  };
  menu.appendChild(eliminarBtn);

  // Copiar
  const copiarBtn = document.createElement('button');
  copiarBtn.textContent = 'Copiar';
  copiarBtn.style.display = 'block';
  copiarBtn.style.width = '100%';
  copiarBtn.style.height = '30px';
  copiarBtn.style.border = 'none';
  copiarBtn.style.background = 'none';
  copiarBtn.style.padding = '8px';
  copiarBtn.style.margin = '2px';
  copiarBtn.onclick = (e) => {
    e.stopPropagation();
    menu.remove();
    if (onCopiar) onCopiar();
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

