let timerInterval=null;

export function iniciarTimer(segundos){
  clearInterval(timerInterval);
  let tiempo=parseInt(segundos,10)||0;
  if(tiempo<=0) return;
  const fin=Date.now()+tiempo*1000;
  localStorage.setItem("timerFin",fin);
  mostrarTimer();
}

export function mostrarTimer(){
  clearInterval(timerInterval);
  const timerContainer=document.getElementById("timerContainer");
  const fin=parseInt(localStorage.getItem("timerFin"));
  if(!fin || !timerContainer) return;

  timerContainer.innerHTML="";
  timerContainer.className="timer-active";

  const tiempoLabel=document.createElement("div");
  tiempoLabel.className="timer-label";

  // Botón de Pausa
  const btnPause=document.createElement("button");
  btnPause.textContent="⏸";
  btnPause.className = "btn-pause";

  let pausado=false;
  let tiempoRestante=Math.floor((fin-Date.now())/1000);

  btnPause.onclick=()=> {
    if(!pausado){
      pausado=true;
      tiempoRestante=Math.floor((fin-Date.now())/1000);
      localStorage.setItem("timerPause",tiempoRestante);
      localStorage.removeItem("timerFin");
      btnPause.textContent="▶️";
    } else {
      pausado=false;
      const nuevoFin=Date.now()+tiempoRestante*1000;
      localStorage.setItem("timerFin",nuevoFin);
      localStorage.removeItem("timerPause");
      btnPause.textContent="⏸";
      mostrarTimer();
    }
  };

  // Botón de Parar
  const btnSkip=document.createElement("button");
  btnSkip.textContent="⏹";
  btnSkip.className = "btn-skip";
  btnSkip.onclick=()=> {
    clearInterval(timerInterval);
    timerContainer.innerHTML="";
    timerContainer.className=""; // Remover la clase timer-active
    localStorage.removeItem("timerFin");
    localStorage.removeItem("timerPause");
  };

  timerContainer.appendChild(tiempoLabel);
  timerContainer.appendChild(btnPause);
  timerContainer.appendChild(btnSkip);

  function actualizar(){
    let fin=parseInt(localStorage.getItem("timerFin"));
    if(!fin) return;
    let t=Math.floor((fin-Date.now())/1000);
    if(t<=0){
      clearInterval(timerInterval);
      timerContainer.innerHTML="";
      timerContainer.className=""; // Remover la clase timer-active
      localStorage.removeItem("timerFin");
      return;
    }
    const mm=Math.floor(t/60), ss=t%60;
    tiempoLabel.textContent=mm+":"+(ss<10?"0"+ss:ss);
  }

  actualizar();
  timerInterval=setInterval(actualizar,1000);
}

export function restaurarTimer(){
  const fin=parseInt(localStorage.getItem("timerFin"));
  if(fin) mostrarTimer();
}