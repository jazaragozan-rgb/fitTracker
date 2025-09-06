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

export function mostrarConfirmacion(mensaje, onConfirm) {
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
  btnSi.textContent = 'Sí';
  btnSi.onclick = () => {
    modal.remove();
    if (onConfirm) onConfirm();
  };

  const btnNo = document.createElement('button');
  btnNo.textContent = 'No';
  btnNo.onclick = () => {
    modal.remove();
  };

  botones.appendChild(btnSi);
  botones.appendChild(btnNo);
  caja.appendChild(botones);

  modal.appendChild(caja);
  document.body.appendChild(modal);
}

