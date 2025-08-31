export function mostrarSelectorMarca(serie,onSelect){
  let anterior=document.getElementById('modalSelector'); if(anterior) anterior.remove();
  const modal=document.createElement('div'); modal.id='modalSelector';
  modal.style.position='fixed'; modal.style.top='0'; modal.style.left='0'; modal.style.width='100%'; modal.style.height='100%';
  modal.style.background='rgba(0,0,0,0.4)'; modal.style.display='flex'; modal.style.alignItems='center'; modal.style.justifyContent='center';
  const caja=document.createElement('div'); caja.style.background='#fff'; caja.style.padding='1em'; caja.style.borderRadius='10px';

  ['W - Serie de calentamiento','D - Dropset','R - Rest pause','F - Serie fallada','★'].forEach(op=>{
    const b=document.createElement('button');
    b.textContent=op; b.style.margin='0.5em';
    b.onclick=()=>{ serie.marca=op; localStorage.setItem("misDatos",JSON.stringify(serie)); modal.remove(); if(onSelect) onSelect(); };
    caja.appendChild(b);
  });
  modal.appendChild(caja); document.body.appendChild(modal);
}

export function mostrarConfirmacion(mensaje,onConfirm){
  let anterior=document.getElementById('modalConfirmacion'); if(anterior) anterior.remove();
  const modal=document.createElement('div'); modal.id='modalConfirmacion';
  modal.style.position='fixed'; modal.style.top='0'; modal.style.left='0'; modal.style.width='100%'; modal.style.height='100%';
  modal.style.background='rgba(0,0,0,0.4)'; modal.style.display='flex'; modal.style.alignItems='center'; modal.style.justifyContent='center';
  const caja=document.createElement('div'); caja.style.background='#fff'; caja.style.padding='2em'; caja.style.borderRadius='10px';
  caja.textContent=mensaje;
  const btn=document.createElement('button'); btn.textContent='Sí'; btn.onclick=()=>{modal.remove(); if(onConfirm) onConfirm();};
  caja.appendChild(btn); modal.appendChild(caja); document.body.appendChild(modal);
}
