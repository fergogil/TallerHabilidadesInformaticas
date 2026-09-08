/**
 * Motor de diapositivas.
 * Lee contenido.json y construye una diapositiva por bloque, más una
 * de portada (título + introducción + créditos) y una de cierre
 * (navegación al módulo anterior/siguiente).
 *
 * Cada bloque tiene un campo opcional "tipo":
 *   - "concepto" (o ausente): título + texto esencial + gráfico opcional. Default.
 *   - "ejercicio": patrón fijo Análisis → Diseño → Implementación (bloque.pasos).
 *   - "quiz-opciones": preguntas de opción múltiple con retroalimentación inmediata.
 *   - "evaluacion-numerica": expresiones con respuesta numérica verificable.
 *
 * El acordeón "Profundizar" vive en la barra de navegación inferior (no
 * dentro de cada diapositiva) y funciona igual sin importar el tipo de bloque.
 */

let indiceActual = 0;
let totalDiapositivas = 0;

async function cargarContenidoModulo() {
  const respuesta = await fetch('contenido.json');
  if (!respuesta.ok) {
    throw new Error('No se pudo cargar contenido.json');
  }
  return respuesta.json();
}

function escaparHtml(texto) {
  const contenedor = document.createElement('div');
  contenedor.textContent = texto;
  return contenedor.innerHTML;
}

function crearDiapositivaPortada(datos) {
  const div = document.createElement('section');
  div.className = 'diapositiva diapositiva-portada';
  div.innerHTML = `
    <h1>${datos.titulo}</h1>
    <p class="introduccion">${datos.introduccion}</p>
    <p class="creditos">© 2026 Fernando González Gil · Docente, Universidad del Valle. Contenido desarrollado con el apoyo de Claude (Anthropic).</p>
  `;
  return div;
}

/** Agrega el acordeón "Profundizar" a cualquier tipo de diapositiva, si el bloque lo tiene. */
function aplicarProfundizar(div, bloque, htmlPrevio) {
  const idAcordeon = `acordeon-${bloque.id}`;
  if (bloque.profundizar) {
    div.dataset.acordeonId = idAcordeon;
    return htmlPrevio + `
      <div class="acordeon-contenido" id="${idAcordeon}">
        <div class="acordeon-cuerpo">${bloque.profundizar}</div>
      </div>
    `;
  }
  return htmlPrevio;
}

function crearDiapositivaConceptual(bloque) {
  const div = document.createElement('section');
  div.className = 'diapositiva';
  let html = `
    <h2>${bloque.titulo}</h2>
    ${bloque.grafico ? `<img class="grafico" src="../../assets/img/diagramas/${bloque.grafico}" alt="">` : ''}
    <p class="esencial">${bloque.esencial}</p>
  `;
  div.innerHTML = aplicarProfundizar(div, bloque, html);
  return div;
}

function crearDiapositivaEjercicio(bloque) {
  const div = document.createElement('section');
  div.className = 'diapositiva';

  const pasosHtml = bloque.pasos.map((paso) => `
    <div class="paso-ejercicio">
      <div class="etiqueta-paso">${paso.etiqueta}</div>
      ${paso.codigo ? `<pre class="codigo">${escaparHtml(paso.codigo)}</pre>` : `<p>${paso.contenido}</p>`}
    </div>
  `).join('');

  let html = `
    <h2>${bloque.titulo}</h2>
    <div class="bloque-ejercicio">${pasosHtml}</div>
  `;
  div.innerHTML = aplicarProfundizar(div, bloque, html);
  return div;
}

function crearDiapositivaQuiz(bloque) {
  const div = document.createElement('section');
  div.className = 'diapositiva';

  const preguntasHtml = bloque.preguntas.map((pregunta, iPregunta) => {
    const opcionesHtml = pregunta.opciones.map((opcion, iOpcion) => `
      <button class="opcion-quiz" data-index="${iOpcion}">${opcion}</button>
    `).join('');
    return `
      <div class="pregunta-quiz" data-correcta="${pregunta.correcta}">
        <p class="enunciado-quiz">${pregunta.enunciado}</p>
        <div class="opciones-quiz">${opcionesHtml}</div>
        <p class="feedback-quiz" hidden></p>
      </div>
    `;
  }).join('');

  let html = `
    <h2>${bloque.titulo}</h2>
    ${bloque.esencial ? `<p class="esencial">${bloque.esencial}</p>` : ''}
    <div class="lista-preguntas-quiz">${preguntasHtml}</div>
  `;
  div.innerHTML = aplicarProfundizar(div, bloque, html);

  div.querySelectorAll('.pregunta-quiz').forEach((preguntaDiv) => {
    const correcta = Number(preguntaDiv.dataset.correcta);
    preguntaDiv.querySelectorAll('.opcion-quiz').forEach((boton) => {
      boton.addEventListener('click', () => {
        const elegida = Number(boton.dataset.index);
        const feedback = preguntaDiv.querySelector('.feedback-quiz');
        preguntaDiv.querySelectorAll('.opcion-quiz').forEach((b) => { b.disabled = true; });
        if (elegida === correcta) {
          boton.classList.add('correcta');
          feedback.textContent = '✓ ¡Correcto!';
          feedback.classList.add('feedback-correcta');
        } else {
          boton.classList.add('incorrecta');
          preguntaDiv.querySelectorAll('.opcion-quiz')[correcta].classList.add('correcta');
          feedback.textContent = '✗ La respuesta correcta está resaltada en verde.';
          feedback.classList.add('feedback-incorrecta');
        }
        feedback.hidden = false;
      });
    });
  });

  return div;
}

function crearDiapositivaEvaluacionNumerica(bloque) {
  const div = document.createElement('section');
  div.className = 'diapositiva';

  const valoresTexto = Object.entries(bloque.valores)
    .map(([nombre, valor]) => `${nombre} = ${valor}`)
    .join('; ');

  const filasHtml = bloque.expresiones.map((expresion, i) => `
    <div class="fila-evaluacion" data-respuesta="${expresion.respuesta}">
      <span class="enunciado-eval">${expresion.enunciado}</span>
      <input type="text" class="input-eval" inputmode="decimal" aria-label="Tu respuesta para ${expresion.enunciado}">
      <button class="boton-verificar-fila" data-fila="${i}">Verificar</button>
      <span class="feedback-eval" hidden></span>
    </div>
  `).join('');

  let html = `
    <h2>${bloque.titulo}</h2>
    <p class="esencial">Con ${valoresTexto}, calcula el valor de cada expresión:</p>
    <div class="lista-evaluacion">${filasHtml}</div>
  `;
  div.innerHTML = aplicarProfundizar(div, bloque, html);

  div.querySelectorAll('.fila-evaluacion').forEach((fila) => {
    const respuestaCorrecta = Number(fila.dataset.respuesta);
    const boton = fila.querySelector('.boton-verificar-fila');
    const input = fila.querySelector('.input-eval');
    const feedback = fila.querySelector('.feedback-eval');

    const verificar = () => {
      const valorIngresado = Number(input.value.replace(',', '.'));
      feedback.hidden = false;
      feedback.classList.remove('feedback-correcta', 'feedback-incorrecta');
      if (!Number.isNaN(valorIngresado) && Math.abs(valorIngresado - respuestaCorrecta) < 0.01) {
        feedback.textContent = '✓ Correcto';
        feedback.classList.add('feedback-correcta');
      } else {
        feedback.textContent = '✗ Intenta de nuevo';
        feedback.classList.add('feedback-incorrecta');
      }
    };

    boton.addEventListener('click', verificar);
    input.addEventListener('keydown', (evento) => {
      if (evento.key === 'Enter') verificar();
    });
  });

  return div;
}

function crearDiapositivaConcepto(bloque) {
  switch (bloque.tipo) {
    case 'ejercicio': return crearDiapositivaEjercicio(bloque);
    case 'quiz-opciones': return crearDiapositivaQuiz(bloque);
    case 'evaluacion-numerica': return crearDiapositivaEvaluacionNumerica(bloque);
    default: return crearDiapositivaConceptual(bloque);
  }
}

function crearDiapositivaCierre(datos) {
  const anterior = datos.anterior
    ? `<a href="../${datos.anterior}/index.html">&larr; Anterior</a>`
    : '<span></span>';
  const siguiente = datos.siguiente
    ? `<a href="../${datos.siguiente}/index.html">Siguiente &rarr;</a>`
    : '<span></span>';

  const div = document.createElement('section');
  div.className = 'diapositiva diapositiva-cierre';
  div.innerHTML = `
    <h2>Fin del módulo</h2>
    <p class="introduccion">Continúa cuando estés listo.</p>
    <nav class="navegacion-modulos">${anterior}${siguiente}</nav>
  `;
  return div;
}

function irADiapositiva(nuevoIndice) {
  const diapositivas = document.querySelectorAll('.diapositiva');
  diapositivas[indiceActual].classList.remove('activa');
  indiceActual = Math.max(0, Math.min(nuevoIndice, totalDiapositivas - 1));
  diapositivas[indiceActual].classList.add('activa');
  actualizarControlesNavegacion();
  actualizarBotonProfundizar();
}

function actualizarControlesNavegacion() {
  const botonAnterior = document.querySelector('[data-boton-anterior]');
  const botonSiguiente = document.querySelector('[data-boton-siguiente]');
  const contador = document.querySelector('[data-contador]');
  const puntos = document.querySelectorAll('.punto-diapositiva');

  botonAnterior.disabled = indiceActual === 0;
  botonSiguiente.disabled = indiceActual === totalDiapositivas - 1;
  contador.textContent = `${indiceActual + 1} / ${totalDiapositivas}`;

  puntos.forEach((punto, i) => {
    punto.classList.toggle('activo', i === indiceActual);
  });
}

/** Muestra/oculta el botón "Profundizar" según la diapositiva activa,
 *  y siempre lo deja colapsado al entrar a una diapositiva nueva. */
function actualizarBotonProfundizar() {
  const boton = document.querySelector('[data-boton-profundizar]');
  const diapositivaActiva = document.querySelectorAll('.diapositiva')[indiceActual];
  const idAcordeon = diapositivaActiva.dataset.acordeonId;

  if (!idAcordeon) {
    boton.hidden = true;
    return;
  }

  boton.hidden = false;
  boton.setAttribute('aria-controls', idAcordeon);
  boton.setAttribute('aria-expanded', 'false');
  boton.querySelector('.texto').textContent = 'Profundizar';
  document.getElementById(idAcordeon).classList.remove('abierto');
}

function alternarProfundizar() {
  const boton = document.querySelector('[data-boton-profundizar]');
  const idAcordeon = boton.getAttribute('aria-controls');
  const contenido = document.getElementById(idAcordeon);
  const abierto = boton.getAttribute('aria-expanded') === 'true';

  boton.setAttribute('aria-expanded', String(!abierto));
  contenido.classList.toggle('abierto', !abierto);
  boton.querySelector('.texto').textContent = !abierto ? 'Ocultar' : 'Profundizar';
}

function crearBarraNavegacion() {
  const barra = document.createElement('div');
  barra.className = 'barra-navegacion';

  const puntosHtml = Array.from({ length: totalDiapositivas }, (_, i) =>
    `<button class="punto-diapositiva" data-ir-a="${i}" aria-label="Ir a la diapositiva ${i + 1}"></button>`
  ).join('');

  barra.innerHTML = `
    <button class="boton-profundizar" data-boton-profundizar hidden aria-expanded="false">
      <span class="icono">▸</span><span class="texto">Profundizar</span>
    </button>
    <div class="controles-centro">
      <button class="boton-nav" data-boton-anterior>&larr; Anterior</button>
      <span class="contador-diapositivas" data-contador></span>
      <div class="puntos-diapositivas">${puntosHtml}</div>
      <button class="boton-nav" data-boton-siguiente>Siguiente &rarr;</button>
    </div>
  `;

  barra.querySelector('[data-boton-anterior]').addEventListener('click', () => irADiapositiva(indiceActual - 1));
  barra.querySelector('[data-boton-siguiente]').addEventListener('click', () => irADiapositiva(indiceActual + 1));
  barra.querySelector('[data-boton-profundizar]').addEventListener('click', alternarProfundizar);
  barra.querySelectorAll('.punto-diapositiva').forEach((punto) => {
    punto.addEventListener('click', () => irADiapositiva(Number(punto.dataset.irA)));
  });

  return barra;
}

function iniciarNavegacionTeclado() {
  document.addEventListener('keydown', (evento) => {
    if (evento.key === 'ArrowRight') irADiapositiva(indiceActual + 1);
    if (evento.key === 'ArrowLeft') irADiapositiva(indiceActual - 1);
  });
}

async function renderizarModulo() {
  const escenario = document.querySelector('.escenario');

  try {
    const datos = await cargarContenidoModulo();
    document.title = `${datos.titulo} · Taller de Habilidades Informáticas`;

    escenario.appendChild(crearDiapositivaPortada(datos));
    datos.bloques.forEach((bloque) => {
      escenario.appendChild(crearDiapositivaConcepto(bloque));
    });
    escenario.appendChild(crearDiapositivaCierre(datos));

    totalDiapositivas = escenario.querySelectorAll('.diapositiva').length;
    escenario.querySelector('.diapositiva').classList.add('activa');

    document.querySelector('.barra-navegacion-contenedor').appendChild(crearBarraNavegacion());
    actualizarControlesNavegacion();
    actualizarBotonProfundizar();
    iniciarNavegacionTeclado();
  } catch (error) {
    escenario.innerHTML = `<p style="color:#A80410;">
      No se pudo cargar el contenido del módulo (${error.message}).
      Si estás abriendo el archivo directamente (file://), usa un servidor
      local (por ejemplo, la extensión "Live Server" de VS Code).
    </p>`;
  }
}

document.addEventListener('DOMContentLoaded', renderizarModulo);
