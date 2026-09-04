/* ==========================================================================
   GOLDEN HOME GROUP — main.js
   Comportamiento compartido por todas las páginas:
     1. Enlaces dinámicos (WhatsApp, correo, año)
     2. Header y menú lateral
     3. Animaciones al hacer scroll y contadores
     4. Favoritos
     5. Acordeón de preguntas frecuentes
     6. Formularios → WhatsApp
     7. Flotantes y barra de scroll
   Los datos editables están en config.js; el catálogo, en data.js.
   ========================================================================== */
(function () {
  'use strict';

  const $  = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));

  /* La configuración viaja embebida: el sitio ya no carga config.js aparte.
     Si cambia un dato, se edita en src/lib/config.ts y también acá. */
  const CFG = {
    whatsapp: '51936342373',
    email: 'ventas@goldenhomegroup.com',
    mensajes: {
      general:   'Hola Golden Home Group 👋, quisiera recibir información.',
      propiedad: 'Hola, estoy interesado(a) en la propiedad "{titulo}". Quisiera recibir más información.',
      asesor:    'Hola Golden Home Group 👋, quisiera hablar con un asesor.'
    }
  };
  window.GHG = window.GHG || {};

  /* Arma un enlace de WhatsApp con el mensaje indicado */
  GHG.waLink = function (msg) {
    return 'https://wa.me/' + CFG.whatsapp + '?text=' + encodeURIComponent(msg || CFG.mensajes.general);
  };

  /* ------------------------------------------------------------------
     1. Enlaces dinámicos
     ------------------------------------------------------------------ */
  $$('[data-wa]').forEach(el => {
    const clave = el.dataset.wa;                       // general | asesor | vender…
    el.href = GHG.waLink(CFG.mensajes[clave] || CFG.mensajes.general);
  });

  $$('[data-tel]').forEach(el => { el.href = 'tel:+' + CFG.whatsapp; });
  $$('[data-mail]').forEach(el => { el.href = 'mailto:' + CFG.email; });

  const yearEl = $('#year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ------------------------------------------------------------------
     2. Header sticky, menú lateral y "volver arriba"
     ------------------------------------------------------------------ */
  const header = $('#header');
  const toTop  = $('#toTop');

  const alScrollear = () => {
    const y = window.scrollY;
    if (header) header.classList.toggle('is-stuck', y > 10);
    if (toTop)  toTop.classList.toggle('is-visible', y > 500);
  };
  // Un trackpad o mouse de alta frecuencia dispara muchos eventos "scroll"
  // por fotograma; agrupar el trabajo en un solo rAF evita repetirlo de más.
  let scrollPendiente = false;
  window.addEventListener('scroll', () => {
    if (scrollPendiente) return;
    scrollPendiente = true;
    requestAnimationFrame(() => { alScrollear(); scrollPendiente = false; });
  }, { passive: true });
  alScrollear();

  if (toTop) toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  // Los flotantes se elevan al llegar al pie para no tapar el copyright
  const pie = $('.footer__bottom');
  const flotantes = [toTop, $('.wa')].filter(Boolean);
  if (pie && flotantes.length && 'IntersectionObserver' in window) {
    new IntersectionObserver(([en]) => {
      flotantes.forEach(f => f.classList.toggle('is-lifted', en.isIntersecting));
    }, { threshold: 0 }).observe(pie);
  }

  const nav     = $('#nav');
  const burger  = $('#burger');
  const overlay = $('.nav-overlay');

  const cerrarNav = () => {
    if (!nav) return;
    nav.classList.remove('is-open');
    if (overlay) overlay.classList.remove('is-open');
    if (burger) { burger.classList.remove('is-open'); burger.setAttribute('aria-expanded', 'false'); }
    if (header) header.classList.remove('is-navopen');
    document.body.style.overflow = '';
  };
  const abrirNav = () => {
    if (!nav) return;
    cerrarFavoritos();
    nav.classList.add('is-open');
    if (overlay) overlay.classList.add('is-open');
    if (burger) { burger.classList.add('is-open'); burger.setAttribute('aria-expanded', 'true'); }
    if (header) header.classList.add('is-navopen');
    document.body.style.overflow = 'hidden';
  };

  if (burger && nav) {
    burger.addEventListener('click', () => nav.classList.contains('is-open') ? cerrarNav() : abrirNav());
    if (overlay) overlay.addEventListener('click', cerrarNav);
    const navClose = $('#navClose');
    if (navClose) navClose.addEventListener('click', cerrarNav);
    $$('.nav a').forEach(a => a.addEventListener('click', cerrarNav));
    window.addEventListener('resize', () => { if (window.innerWidth > 992) cerrarNav(); });
  }

  /* La página actual la marca el servidor, en Header.astro. Acá vivía una
     copia que comparaba el último tramo de la URL ("compra") contra el href
     del enlace ("/compra"): del sitio anterior, cuando los enlaces eran
     "compra.html". Nunca coincidía, así que en cada carga apagaba el
     resaltado que venía en el HTML. */

  /* ------------------------------------------------------------------
     3. Animaciones al hacer scroll + contadores
     ------------------------------------------------------------------ */
  GHG.ui = GHG.ui || {};

  GHG.ui.revelar = function (contenedor) {
    const els = $$('.reveal', contenedor || document);
    // Sin IntersectionObserver, o con la pestaña sin pintar (segundo plano,
    // captura, impresión), no hay animación que mostrar: se revela todo para
    // que el contenido nunca quede invisible.
    if (!('IntersectionObserver' in window) || document.visibilityState === 'hidden') {
      els.forEach(el => el.classList.add('is-in'));
      return;
    }
    const io = new IntersectionObserver((entradas, obs) => {
      entradas.forEach(en => {
        if (!en.isIntersecting) return;
        const retraso = Number(en.target.dataset.delay || 0) * 90;
        setTimeout(() => en.target.classList.add('is-in'), retraso);
        obs.unobserve(en.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });
    els.forEach(el => io.observe(el));
  };
  GHG.ui.revelar();

  (function contadores() {
    const nums = $$('[data-count]');
    if (!nums.length || !('IntersectionObserver' in window)) return;

    const correr = (el) => {
      const meta = parseFloat(el.dataset.count);
      const sufijo = el.dataset.suffix || '';
      const inicio = performance.now();
      const paso = (ahora) => {
        const p = Math.min((ahora - inicio) / 1600, 1);
        const suave = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(meta * suave).toLocaleString('es-PE') + sufijo;
        if (p < 1) requestAnimationFrame(paso);
      };
      requestAnimationFrame(paso);
    };

    const io = new IntersectionObserver((es, obs) => {
      es.forEach(e => { if (e.isIntersecting) { correr(e.target); obs.unobserve(e.target); } });
    }, { threshold: 0.4 });
    nums.forEach(n => io.observe(n));
  })();

  /* ------------------------------------------------------------------
     4. Favoritos (se guardan en el navegador)
     ------------------------------------------------------------------ */
  const CLAVE = 'ghg:favoritos';

  const almacen = {
    leer() { try { return JSON.parse(localStorage.getItem(CLAVE)) || []; } catch (e) { return []; } },
    escribir(l) { try { localStorage.setItem(CLAVE, JSON.stringify(l)); } catch (e) { /* modo privado */ } }
  };

  let lista = almacen.leer();

  const favBtn    = $('#favBtn');
  const favCount  = $('#favCount');
  const favsBox   = $('#favs');
  const favsPanel = $('#favsPanel');
  const favsList  = $('#favsList');
  const favsEmpty = $('#favsEmpty');
  const favsFoot  = $('#favsFoot');
  const favsN     = $('#favsN');
  const favsSend  = $('#favsSend');

  GHG.favoritos = {
    tiene(id) { return lista.some(f => String(f.id) === String(id)); },
    alternar(prop) {
      if (this.tiene(prop.id)) {
        lista = lista.filter(f => String(f.id) !== String(prop.id));
      } else {
        lista.push({
          id: prop.id, titulo: prop.titulo,
          // El precio llega ya formateado desde el servidor
          precio: prop.precio || '',
          operacion: prop.operacion, ubicacion: prop.ubicacion,
          foto: prop.foto || ''
        });
        if (favBtn) { favBtn.classList.remove('is-bump'); void favBtn.offsetWidth; favBtn.classList.add('is-bump'); }
      }
      almacen.escribir(lista);
      pintarFavoritos();
    }
  };

  function pintarFavoritos() {
    const n = lista.length;

    if (favCount) { favCount.textContent = n; favCount.hidden = n === 0; }
    if (favsN) favsN.textContent = n;
    if (favBtn) favBtn.classList.toggle('has-items', n > 0);
    if (favsEmpty) favsEmpty.hidden = n > 0;
    if (favsFoot) favsFoot.hidden = n === 0;

    if (favsList) {
      favsList.innerHTML = lista.map(f => `
        <li class="favs__item" data-id="${f.id}">
          <span class="favs__thumb">${f.foto ? `<img src="${f.foto}" alt="" loading="lazy">` : ''}</span>
          <span class="favs__info">
            <a class="favs__name" href="propiedad.html?id=${encodeURIComponent(f.id)}">${f.titulo}</a>
            <span class="favs__loc">${f.ubicacion || ''}</span>
            <span class="favs__price">${f.precio || ''}</span>
          </span>
          <button class="favs__del" type="button" aria-label="Quitar de favoritos">
            <svg viewBox="0 0 24 24" class="ico"><path d="m6 6 12 12M18 6 6 18"/></svg>
          </button>
        </li>`).join('');
    }

    if (favsSend) {
      const detalle = lista.map((f, i) => `${i + 1}. ${f.titulo}${f.precio ? ' — ' + f.precio : ''}`).join('\n');
      favsSend.href = GHG.waLink('Hola Golden Home Group 👋, me interesan estas propiedades:\n' + detalle);
    }

    sincronizarCorazones();
  }

  function sincronizarCorazones() {
    $$('.card').forEach(card => {
      const btn = $('.fav', card);
      if (!btn) return;
      const activo = GHG.favoritos.tiene(card.dataset.id);
      btn.classList.toggle('is-active', activo);
      btn.setAttribute('aria-pressed', activo ? 'true' : 'false');
      btn.setAttribute('aria-label', activo ? 'Quitar de favoritos' : 'Guardar propiedad');
    });
  }

  /* Las tarjetas ya vienen armadas del servidor: sus corazones se conectan
     una sola vez al cargar la página (ver la llamada al final del bloque). */
  GHG.ui.conectarFavoritos = function (contenedor) {
    $$('.card .fav', contenedor || document).forEach(btn => {
      if (btn.dataset.listo) return;
      btn.dataset.listo = '1';
      btn.addEventListener('click', () => {
        // La tarjeta la armó el servidor y trae sus datos en atributos data-*:
        // ya no hace falta tener el catálogo entero cargado en el navegador.
        const card = btn.closest('.card');
        GHG.favoritos.alternar({
          id: card.dataset.id,
          titulo: card.dataset.titulo || '',
          precio: card.dataset.precio || '',
          operacion: card.dataset.operacion || '',
          ubicacion: card.dataset.ubicacion || '',
          foto: card.dataset.foto || ''
        });
      });
    });
    sincronizarCorazones();
  };

  // Conectar las tarjetas que el servidor ya dejó en la página
  GHG.ui.conectarFavoritos();

  /* Panel de favoritos */
  let favsAbierto = false;

  function ubicarFavoritos() {
    if (!header) return;
    const top = Math.max(0, header.getBoundingClientRect().bottom);
    document.documentElement.style.setProperty('--fav-top', top + 'px');
  }

  function abrirFavoritos() {
    if (!favsBox || favsAbierto) return;
    favsAbierto = true;
    ubicarFavoritos();
    favsBox.hidden = false;
    void favsBox.offsetWidth;
    favsBox.classList.add('is-open');
    if (favBtn) { favBtn.classList.add('is-open'); favBtn.setAttribute('aria-expanded', 'true'); }
  }

  function cerrarFavoritos() {
    if (!favsBox || !favsAbierto) return;
    favsAbierto = false;
    favsBox.classList.remove('is-open');
    if (favBtn) { favBtn.classList.remove('is-open'); favBtn.setAttribute('aria-expanded', 'false'); }
    const fin = () => { if (!favsAbierto) favsBox.hidden = true; };
    if (favsPanel) favsPanel.addEventListener('transitionend', fin, { once: true });
    setTimeout(fin, 400);
  }

  if (favBtn) favBtn.addEventListener('click', () => favsAbierto ? cerrarFavoritos() : abrirFavoritos());
  const favsVeil = $('#favsVeil'), favsClose = $('#favsClose');
  if (favsVeil)  favsVeil.addEventListener('click', cerrarFavoritos);
  if (favsClose) favsClose.addEventListener('click', cerrarFavoritos);
  window.addEventListener('scroll', () => { if (favsAbierto) ubicarFavoritos(); }, { passive: true });
  window.addEventListener('resize', () => { if (favsAbierto) ubicarFavoritos(); });

  if (favsList) {
    favsList.addEventListener('click', e => {
      const del = e.target.closest('.favs__del');
      if (del) {
        const id = del.closest('.favs__item').dataset.id;
        lista = lista.filter(f => String(f.id) !== String(id));
        almacen.escribir(lista);
        pintarFavoritos();
        return;
      }
      if (e.target.closest('.favs__name')) cerrarFavoritos();
    });
  }

  const favsClear = $('#favsClear');
  if (favsClear) favsClear.addEventListener('click', () => { lista = []; almacen.escribir(lista); pintarFavoritos(); });

  pintarFavoritos();

  /* ------------------------------------------------------------------
     5. Preguntas frecuentes (una respuesta abierta a la vez)
     ------------------------------------------------------------------ */
  const faqBtns = $$('.faq__q');
  faqBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.faq__item');
      const abrir = !item.classList.contains('is-open');
      faqBtns.forEach(b => {
        b.closest('.faq__item').classList.remove('is-open');
        b.setAttribute('aria-expanded', 'false');
      });
      if (abrir) { item.classList.add('is-open'); btn.setAttribute('aria-expanded', 'true'); }
    });
  });

  /* ------------------------------------------------------------------
     5b. Carrusel de testimonios (Inicio): un testimonio grande a la vez
     ------------------------------------------------------------------ */
  const testiPaneles = $$('.testi-grande');
  if (testiPaneles.length) {
    const testiPersonas = $$('.confianza__persona');
    let testiActual = 0;

    const mostrarTesti = i => {
      testiActual = (i + testiPaneles.length) % testiPaneles.length;
      testiPaneles.forEach((p, j) => {
        const activo = j === testiActual;
        p.classList.toggle('is-active', activo);
        // el lector de pantalla solo debe anunciar la cita visible
        if (activo) p.removeAttribute('aria-hidden'); else p.setAttribute('aria-hidden', 'true');
      });
      testiPersonas.forEach((b, j) => {
        b.classList.toggle('is-active', j === testiActual);
        b.setAttribute('aria-selected', j === testiActual);
      });
    };

    testiPersonas.forEach((b, i) => b.addEventListener('click', () => { mostrarTesti(i); testiReiniciar(); }));
    const testiPrev = $('#testiPrev'), testiNext = $('#testiNext');
    if (testiPrev) testiPrev.addEventListener('click', () => { mostrarTesti(testiActual - 1); testiReiniciar(); });
    if (testiNext) testiNext.addEventListener('click', () => { mostrarTesti(testiActual + 1); testiReiniciar(); });

    // Avanza solo; se pausa con el mouse encima y retoma al salir (antes se
    // apagaba para siempre con solo pasar el cursor por arriba una vez)
    let testiAuto = null;
    const testiIniciar = () => {
      if (testiAuto) return;
      testiAuto = setInterval(() => mostrarTesti(testiActual + 1), 7000);
    };
    const testiPausar = () => { clearInterval(testiAuto); testiAuto = null; };
    // Tras tocar un control, el reloj vuelve a empezar: si no, la rotación
    // podía saltar de inmediato justo después de elegir un testimonio.
    function testiReiniciar(){ testiPausar(); testiIniciar(); }

    testiIniciar();
    const testiCarrusel = $('.testi-carrusel');
    testiCarrusel.addEventListener('mouseenter', testiPausar);
    testiCarrusel.addEventListener('mouseleave', testiIniciar);
  }

  /* ------------------------------------------------------------------
     5c. Adjuntar archivos: lista de elegidos y arrastrar-soltar
     ------------------------------------------------------------------ */
  $$('[data-adjunto]').forEach(caja => {
    const input = $('.adjunto__input', caja);
    const lista = $('[data-adjunto-lista]', caja);
    if (!input || !lista) return;

    const peso = b => b < 1024 * 1024
      ? Math.max(1, Math.round(b / 1024)) + ' KB'
      : (b / 1048576).toFixed(1).replace('.0', '') + ' MB';

    const icoDoc = '<svg viewBox="0 0 24 24" class="ico"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z"/><path d="M14 3v5h5"/></svg>';
    const icoX = '<svg viewBox="0 0 24 24" class="ico"><path d="m6 6 12 12M18 6 6 18"/></svg>';

    const pintar = () => {
      const archivos = Array.from(input.files || []);
      lista.hidden = !archivos.length;
      lista.innerHTML = archivos.map((f, i) => `
        <li class="adjunto__archivo">
          <span class="adjunto__miniatura" data-mini="${i}">${icoDoc}</span>
          <span class="adjunto__nombre"><strong></strong><span>${peso(f.size)}</span></span>
          <button type="button" class="adjunto__quitar" data-quitar="${i}" aria-label="Quitar archivo">${icoX}</button>
        </li>`).join('');

      // el nombre se escribe como texto, nunca como HTML
      archivos.forEach((f, i) => {
        lista.children[i].querySelector('.adjunto__nombre strong').textContent = f.name;
        if (f.type.startsWith('image/')) {
          const img = new Image();
          img.alt = '';
          img.src = URL.createObjectURL(f);
          img.onload = () => URL.revokeObjectURL(img.src);
          const mini = lista.querySelector(`[data-mini="${i}"]`);
          mini.innerHTML = '';
          mini.appendChild(img);
        }
      });
    };

    /* Quitar uno: FileList es de solo lectura, así que se rearma con
       DataTransfer y se vuelve a asignar al input. */
    lista.addEventListener('click', e => {
      const btn = e.target.closest('[data-quitar]');
      if (!btn) return;
      const fuera = Number(btn.dataset.quitar);
      const dt = new DataTransfer();
      Array.from(input.files).forEach((f, i) => { if (i !== fuera) dt.items.add(f); });
      input.files = dt.files;
      pintar();
    });

    input.addEventListener('change', pintar);

    const zona = $('.adjunto__zona', caja);
    ['dragenter', 'dragover'].forEach(ev => zona.addEventListener(ev, e => {
      e.preventDefault(); caja.classList.add('is-sobre');
    }));
    ['dragleave', 'drop'].forEach(ev => zona.addEventListener(ev, e => {
      e.preventDefault(); caja.classList.remove('is-sobre');
    }));
    zona.addEventListener('drop', e => {
      const soltados = Array.from(e.dataTransfer.files || []);
      if (!soltados.length) return;
      const dt = new DataTransfer();
      // sin `multiple` solo se conserva el último que se suelte
      (input.multiple ? Array.from(input.files).concat(soltados) : soltados.slice(-1))
        .forEach(f => dt.items.add(f));
      input.files = dt.files;
      pintar();
    });
  });

  /* ------------------------------------------------------------------
     6. Formularios → WhatsApp
     Cada formulario declara su título con data-form-titulo. Al enviarse,
     se valida, se arma un mensaje ordenado y se abre el chat.
     ------------------------------------------------------------------ */
  /* Revisa todos los campos: los obligatorios no pueden ir vacíos y el formato
     se comprueba siempre que haya un valor, aunque el campo sea opcional. */
  function validar(form) {
    let ok = true;

    $$('input, select, textarea', form).forEach(campo => {
      if (campo.type === 'file') return;

      const grupo = campo.closest('.form__field');
      const error = grupo ? $('.form__error', grupo) : null;
      const valor = campo.value.trim();
      let msg = '';

      if (campo.required && !valor) msg = 'Este campo es obligatorio.';
      else if (valor && campo.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor)) msg = 'Revisa el correo ingresado.';
      else if (valor && campo.type === 'tel' && valor.replace(/\D/g, '').length < 6) msg = 'Revisa el número ingresado.';

      if (grupo) grupo.classList.toggle('has-error', !!msg);
      if (error) error.textContent = msg;
      if (msg) ok = false;
    });

    return ok;
  }

  $$('form[data-form-titulo]').forEach(form => {
    form.addEventListener('submit', e => {
      e.preventDefault();
      if (!validar(form)) {
        const primero = $('.form__field.has-error input, .form__field.has-error select, .form__field.has-error textarea', form);
        if (primero) primero.focus();
        return;
      }

      const lineas = ['*' + form.dataset.formTitulo + '*', ''];

      $$('input, select, textarea', form).forEach(campo => {
        if (!campo.name || campo.type === 'file') return;
        if ((campo.type === 'checkbox' || campo.type === 'radio') && !campo.checked) return;

        const valor = campo.value.trim();
        if (!valor) return;

        const etiqueta = (form.querySelector(`label[for="${campo.id}"]`) || {}).textContent || campo.name;
        lineas.push(etiqueta.replace('*', '').trim() + ': ' + valor);
      });

      // Los archivos no viajan por WhatsApp: se avisa para que los envíen en el chat
      const archivos = $$('input[type="file"]', form).filter(i => i.files && i.files.length);
      if (archivos.length) lineas.push('', '(Adjunto los archivos en este chat)');

      window.open(GHG.waLink(lineas.join('\n')), '_blank', 'noopener');

      const aviso = $('.form__ok', form);
      if (aviso) aviso.hidden = false;
      form.reset();
    });

    // Al corregir un campo desaparece su error
    $$('input, select, textarea', form).forEach(campo => {
      campo.addEventListener('input', () => {
        const grupo = campo.closest('.form__field');
        if (grupo && grupo.classList.contains('has-error') && campo.value.trim()) {
          grupo.classList.remove('has-error');
          const error = $('.form__error', grupo);
          if (error) error.textContent = '';
        }
      });
    });
  });

  /* Si se llega al contacto desde una ficha, se precarga el motivo */
  (function contactoDesdeFicha() {
    const idProp = new URLSearchParams(location.search).get('propiedad');
    const motivo = $('#c-motivo');
    const mensaje = $('#c-mensaje');
    if (!idProp || !motivo) return;
    motivo.value = 'Quiero comprar';
    if (mensaje && !mensaje.value) mensaje.value = 'Hola, quisiera recibir información sobre la propiedad ' + idProp + '.';
  })();

  /* ------------------------------------------------------------------
     7. Barra de desplazamiento dorada (solo escritorio)
     ------------------------------------------------------------------ */
  (function barraScroll() {
    if (window.matchMedia('(pointer:coarse)').matches ||
        window.matchMedia('(max-width:992px)').matches) return;

    const barra = document.createElement('div');
    barra.className = 'cscroll';
    barra.setAttribute('aria-hidden', 'true');
    const pulgar = document.createElement('div');
    pulgar.className = 'cscroll__thumb';
    barra.appendChild(pulgar);
    document.body.appendChild(barra);

    const maximo = () => document.documentElement.scrollHeight - window.innerHeight;

    function actualizar() {
      const max = maximo();
      if (max <= 4) { barra.classList.remove('is-ready'); return; }
      const pista = barra.clientHeight;
      const alto = Math.max(46, (window.innerHeight / document.documentElement.scrollHeight) * pista);
      pulgar.style.height = alto + 'px';
      pulgar.style.transform = 'translateY(' + (window.scrollY / max) * (pista - alto) + 'px)';
      barra.classList.add('is-ready');
    }

    let esperando = false;
    window.addEventListener('scroll', () => {
      if (esperando) return;
      esperando = true;
      requestAnimationFrame(() => { actualizar(); esperando = false; });
    }, { passive: true });
    window.addEventListener('resize', actualizar);
    if ('ResizeObserver' in window) new ResizeObserver(actualizar).observe(document.body);
    actualizar();

    let arrastrando = false, inicioY = 0, inicioScroll = 0;
    pulgar.addEventListener('pointerdown', e => {
      arrastrando = true; inicioY = e.clientY; inicioScroll = window.scrollY;
      barra.classList.add('is-dragging');
      try { pulgar.setPointerCapture(e.pointerId); } catch (_) {}
      e.preventDefault();
    });
    pulgar.addEventListener('pointermove', e => {
      if (!arrastrando) return;
      const pista = barra.clientHeight;
      const alto = pulgar.offsetHeight;
      window.scrollTo(0, inicioScroll + ((e.clientY - inicioY) / (pista - alto)) * maximo());
    });
    const soltar = () => { arrastrando = false; barra.classList.remove('is-dragging'); };
    pulgar.addEventListener('pointerup', soltar);
    pulgar.addEventListener('pointercancel', soltar);
  })();

  /* Escape cierra lo que esté abierto */
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    cerrarFavoritos();
    cerrarNav();
  });
})();
