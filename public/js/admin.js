/* ==========================================================================
   Panel administrativo — Golden Home Group
   Habla con las rutas del propio servidor Astro:
     POST/DELETE /api/admin/login        · iniciar y cerrar sesión
     /api/admin/propiedades              · listar, crear, editar, eliminar
     POST /api/admin/subir               · subir la fotografía

   La sesión es una cookie firmada que el navegador no puede leer ni
   falsificar (httpOnly + HMAC): va sola en cada petición, así que acá no se
   guarda ningún token. Quien decide si algo se puede hacer es el servidor.
   ========================================================================== */
(function () {
  'use strict';

  const $  = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));

  const esc = (t) => String(t == null ? '' : t)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  /* Cada inmueble se publica en la moneda de su anuncio original: nunca se
     convierte, solo se muestra con el símbolo que le corresponde. */
  const fmtPrecio = (valor, moneda) => valor == null || valor === ''
    ? 'Consultar'
    : (moneda === 'USD' ? 'US$ ' : 'S/ ') + Number(valor).toLocaleString('es-PE');

  let propiedades = [];
  let editando = null;      // id de la propiedad abierta, o null si es nueva
  let fotoTarjeta = null;   // imagen 4:3 del listado  (va a fotos[0])
  let fotoPortada = null;   // imagen 16:9 de la ficha (va a la columna portada)

  /* ------------------------------------------------------------------
     1. Sesión
     ------------------------------------------------------------------ */
  async function entrar(correo, clave) {
    const r = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ correo, clave })
    });
    const datos = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(datos.error || 'Usuario o contraseña incorrectos');
  }

  async function salir() {
    await fetch('/api/admin/login', { method: 'DELETE' }).catch(() => {});
  }

  /* ------------------------------------------------------------------
     2. Llamadas a la API del panel
     ------------------------------------------------------------------ */
  async function api(ruta, opciones) {
    const res = await fetch(ruta, Object.assign({
      headers: Object.assign({ 'Content-Type': 'application/json' },
                             (opciones && opciones.headers) || {})
    }, opciones));

    // La cookie venció o no hay sesión: se vuelve a la pantalla de acceso
    if (res.status === 401) { mostrarAcceso(); throw new Error('Sesión expirada'); }

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Ocurrió un error');
    }
    return res.status === 204 ? null : res.json().catch(() => null);
  }

  function aviso(texto, esError) {
    const el = $('#aviso');
    el.textContent = texto;
    el.classList.toggle('is-error', !!esError);
    el.hidden = false;
    requestAnimationFrame(() => el.classList.add('is-visible'));
    clearTimeout(aviso._t);
    aviso._t = setTimeout(() => {
      el.classList.remove('is-visible');
      setTimeout(() => { el.hidden = true; }, 300);
    }, 2600);
  }

  /* ------------------------------------------------------------------
     3. Acceso
     ------------------------------------------------------------------ */
  function mostrarAcceso() {
    $('#acceso').hidden = false;
    $('#panel').hidden = true;
  }

  function mostrarPanel() {
    $('#acceso').hidden = true;
    $('#panel').hidden = false;
    cargar();
  }

  $('#formLogin').addEventListener('submit', async (e) => {
    e.preventDefault();
    const error = $('#loginError');
    const btn = $('#btnEntrar');
    const correo = $('#usuario');
    const clave = $('#clave');

    error.hidden = true;

    // Validación propia: el formulario va con novalidate para que el aviso
    // salga en el mismo lugar que los errores del servidor, y no en un
    // globo del navegador con otro idioma y otro estilo.
    if (!correo.value.trim()) return fallar('Ingresa tu correo.', correo);
    if (!clave.value) return fallar('Ingresa tu contraseña.', clave);

    btn.disabled = true;
    btn.classList.add('is-cargando');
    try {
      await entrar(correo.value.trim(), clave.value);
      clave.value = '';
      mostrarPanel();
    } catch (err) {
      // La contraseña se limpia y toma el foco: reintentar es escribir y ya
      clave.value = '';
      fallar(err.message, clave);
    } finally {
      btn.disabled = false;
      btn.classList.remove('is-cargando');
    }

    function fallar(mensaje, campo) {
      error.textContent = mensaje;
      error.hidden = false;
      if (campo) campo.focus();
    }
  });

  /* Mostrar u ocultar la contraseña: ayuda a corregir un tipeo sin borrar
     todo, sobre todo desde el celular. */
  const verClave = $('#verClave');
  if (verClave) {
    verClave.addEventListener('click', () => {
      const campo = $('#clave');
      const mostrando = campo.type === 'text';
      campo.type = mostrando ? 'password' : 'text';
      verClave.setAttribute('aria-pressed', String(!mostrando));
      verClave.setAttribute('aria-label', mostrando ? 'Mostrar contraseña' : 'Ocultar contraseña');
      verClave.classList.toggle('is-viendo', !mostrando);
      campo.focus();
    });
  }

  $('#btnSalir').addEventListener('click', async () => {
    await salir();
    mostrarAcceso();
    // Al volver, el foco va al correo para poder entrar de nuevo enseguida
    $('#usuario')?.focus();
  });

  /* ------------------------------------------------------------------
     4. Listado
     ------------------------------------------------------------------ */
  async function cargar() {
    try {
      // Con sesión, la política "lectura total para administradores" trae
      // todo: publicadas, ocultas, destacadas o no.
      propiedades = await api('/api/admin/propiedades') || [];
      pintar();
    } catch (err) { /* la sesión caducó: ya se mostró el acceso */ }
  }

  function filtrar() {
    const texto = $('#buscar').value.toLowerCase().trim();
    const tipo = $('#filtroTipo').value;
    const estado = $('#filtroEstado').value;
    const zona = $('#filtroZona').value;

    return propiedades.filter(p => {
      if (tipo && p.tipo !== tipo) return false;
      if (estado && p.estado !== estado) return false;
      if (zona && (p.region || '') !== zona) return false;
      if (texto) {
        const donde = (p.titulo + ' ' + (p.ubicacion || '') + ' ' + p.id).toLowerCase();
        if (!donde.includes(texto)) return false;
      }
      return true;
    });
  }

  /* Iconos del resumen: cada cifra se reconoce de un vistazo por su símbolo */
  const ICO_RESUMEN = {
    total: '<svg viewBox="0 0 24 24"><path d="m3 11 9-7 9 7"/><path d="M5.5 9.5V20h13V9.5"/><path d="M10 20v-5h4v5"/></svg>',
    publicadas: '<svg viewBox="0 0 24 24"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="3"/></svg>',
    destacadas: '<svg viewBox="0 0 24 24"><path d="m12 4 2.4 5 5.6.8-4 3.9 1 5.5-5-2.6-5 2.6 1-5.5-4-3.9 5.6-.8Z"/></svg>',
    disponibles: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="m8.5 12 2.5 2.5 4.5-5"/></svg>'
  };

  function pintar() {
    /* Resumen */
    const publicadas = propiedades.filter(p => p.visible !== false).length;
    const ocultas = propiedades.length - publicadas;
    const destacadas = propiedades.filter(p => p.destacada).length;
    const disponibles = propiedades.filter(p => p.estado === 'disponible').length;
    const cerradas = propiedades.length - disponibles;

    // La nota al pie explica el número, en vez de dejarlo suelto
    const tarjeta = (clave, valor, titulo, nota, extra) => `
      <div class="tarjeta tarjeta--${clave}">
        <span class="tarjeta__ico">${ICO_RESUMEN[clave]}</span>
        <div class="tarjeta__dato">
          <strong>${valor}</strong>
          <span>${titulo}</span>
        </div>
        ${nota ? `<p class="tarjeta__nota${extra ? ' ' + extra : ''}">${nota}</p>` : ''}
      </div>`;

    $('#resumen').innerHTML = [
      tarjeta('total', propiedades.length, 'propiedades cargadas',
              ocultas ? `${ocultas} sin publicar` : 'todas publicadas',
              ocultas ? 'tarjeta__nota--aviso' : ''),
      tarjeta('publicadas', publicadas, 'visibles en la web', 'las que ve el visitante'),
      tarjeta('destacadas', destacadas, 'destacadas',
              destacadas ? 'aparecen primero en el inicio' : 'el inicio completa con las demás'),
      tarjeta('disponibles', disponibles, 'disponibles',
              cerradas ? `${cerradas} reservadas o cerradas` : 'ninguna reservada ni cerrada')
    ].join('');

    /* Filas */
    const lista = filtrar();
    $('#vacio').hidden = lista.length > 0;

    $('#filas').innerHTML = lista.map(p => `
      <tr data-id="${esc(p.id)}">
        <td>
          <div class="prop">
            <img src="${esc(p.fotos && p.fotos[0] ? p.fotos[0] : '/assets/img/og-cover.svg')}" alt="">
            <div>
              <strong>${esc(p.titulo)}</strong>
              <span>${p.region ? `<b class="zona">${esc(p.region)}</b> · ` : ''}${esc(p.ubicacion || 'Sin ubicación')} · ${esc(p.id)}</span>
            </div>
          </div>
        </td>
        <td data-col="Tipo">${esc(p.subtipo || p.tipo)}</td>
        <td data-col="Operación"><span class="pill pill--${esc(p.operacion)}">${p.operacion === 'venta' ? 'Venta' : 'Alquiler'}</span></td>
        <td class="precio" data-col="Precio">${esc(fmtPrecio(p.precio, p.moneda))}${p.operacion === 'alquiler' ? '/mes' : ''}</td>
        <td data-col="Estado"><span class="pill pill--${esc(p.estado)}">${esc(p.estado)}</span></td>
        <td data-col="Destacada">
          <label class="switch"><input type="checkbox" data-campo="destacada" ${p.destacada ? 'checked' : ''}><span></span></label>
        </td>
        <td data-col="Publicada">
          <label class="switch"><input type="checkbox" data-campo="visible" ${p.visible !== false ? 'checked' : ''}><span></span></label>
        </td>
        <td data-col="">
          <div class="acciones">
            <button class="icono" data-accion="editar" title="Editar" aria-label="Editar">
              <svg viewBox="0 0 24 24"><path d="M4 20h4l10-10-4-4L4 16v4Z"/><path d="m14 6 4 4"/></svg>
            </button>
            <button class="icono" data-accion="duplicar" title="Duplicar" aria-label="Duplicar">
              <svg viewBox="0 0 24 24"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M15 5H6a2 2 0 0 0-2 2v9"/></svg>
            </button>
            <button class="icono icono--borrar" data-accion="eliminar" title="Eliminar" aria-label="Eliminar">
              <svg viewBox="0 0 24 24"><path d="M5 7h14M10 7V5h4v2M6 7l1 13h10l1-13"/><path d="M10 11v6M14 11v6"/></svg>
            </button>
          </div>
        </td>
      </tr>`).join('');
  }

  ['#buscar', '#filtroTipo', '#filtroZona', '#filtroEstado'].forEach(sel => {
    $(sel).addEventListener('input', pintar);
  });

  /* Acciones de cada fila */
  $('#filas').addEventListener('click', async (e) => {
    const boton = e.target.closest('[data-accion]');
    if (!boton) return;
    const id = boton.closest('tr').dataset.id;
    const prop = propiedades.find(p => p.id === id);
    if (!prop) return;

    if (boton.dataset.accion === 'editar') return abrirModal(prop);

    if (boton.dataset.accion === 'duplicar') {
      // id, creado_en y editado_en los pone la base; no se envían
      const copia = Object.assign({}, prop, { titulo: prop.titulo + ' (copia)', visible: false });
      delete copia.id; delete copia.creado_en; delete copia.editado_en; delete copia.creada_por;
      try {
        await api('/api/admin/propiedades', { method: 'POST', body: JSON.stringify(copia) });
        aviso('Propiedad duplicada. Queda sin publicar hasta que la revises.');
        cargar();
      } catch (err) { aviso(err.message, true); }
    }

    if (boton.dataset.accion === 'eliminar') {
      if (!confirm('¿Eliminar "' + prop.titulo + '"? Esta acción no se puede deshacer.')) return;
      try {
        await api('/api/admin/propiedades?id=' + encodeURIComponent(id), { method: 'DELETE' });
        aviso('Propiedad eliminada.');
        cargar();
      } catch (err) { aviso(err.message, true); }
    }
  });

  /* Interruptores de la tabla: guardan al instante */
  $('#filas').addEventListener('change', async (e) => {
    const campo = e.target.dataset.campo;
    if (!campo) return;
    const id = e.target.closest('tr').dataset.id;
    try {
      await api('/api/admin/propiedades?id=' + encodeURIComponent(id), {
        method: 'PATCH',
        body: JSON.stringify({ [campo]: e.target.checked })
      });
      const p = propiedades.find(x => x.id === id);
      if (p) p[campo] = e.target.checked;
      pintar();
      aviso(campo === 'visible'
        ? (e.target.checked ? 'Propiedad publicada.' : 'Propiedad oculta en la web.')
        : (e.target.checked ? 'Destacada en el inicio.' : 'Ya no aparece como destacada.'));
    } catch (err) { aviso(err.message, true); cargar(); }
  });

  /* ------------------------------------------------------------------
     5. Formulario
     ------------------------------------------------------------------ */
  const modal = $('#modal');
  const form = $('#formProp');

  // Columnas numéricas de la tabla: todo lo demás en el formulario es texto,
  // casilla o el arreglo de características.
  const NUMERICOS = ['precio', 'precio_m2', 'area', 'area_construida',
    'habitaciones', 'banos', 'estacionamientos', 'piso', 'niveles'];

  function abrirModal(prop) {
    editando = prop ? prop.id : null;
    $('#modalTitulo').textContent = prop ? 'Editar propiedad' : 'Nueva propiedad';
    $('#btnEliminar').hidden = !prop;

    form.reset();
    // Una imagen por ranura: la ficha ya no muestra galería
    fotoTarjeta = (prop && Array.isArray(prop.fotos) && prop.fotos[0]) || null;
    fotoPortada = (prop && prop.portada) || null;

    if (prop) {
      $$('input[name], select[name], textarea[name]', form).forEach(campo => {
        const v = prop[campo.name];
        if (campo.type === 'checkbox') campo.checked = !!v;
        else if (campo.name === 'caracteristicas') campo.value = (v || []).join('\n');
        else campo.value = v == null ? '' : v;
      });
    } else {
      form.visible.checked = true;
      form.moneda.value = 'PEN';
    }

    pintarFotos();
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    setTimeout(() => form.titulo.focus(), 50);
  }

  function cerrarModal() {
    modal.hidden = true;
    document.body.style.overflow = '';
    editando = null;
  }

  $('#btnNueva').addEventListener('click', () => abrirModal(null));
  $('#modalCerrar').addEventListener('click', cerrarModal);
  $('#btnCancelar').addEventListener('click', cerrarModal);
  $('#modalVeil').addEventListener('click', cerrarModal);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !modal.hidden) cerrarModal(); });

  /* Arma el cuerpo para Supabase: números como número (o null), la lista de
     características como arreglo, y las cadenas vacías opcionales como null
     en vez de "" (para no ensuciar los filtros de la web con textos vacíos). */
  function leerFormulario() {
    const datos = {};
    $$('input[name], select[name], textarea[name]', form).forEach(campo => {
      const nombre = campo.name;
      if (campo.type === 'checkbox') { datos[nombre] = campo.checked; return; }
      if (nombre === 'caracteristicas') {
        datos[nombre] = campo.value.split('\n').map(c => c.trim()).filter(Boolean);
        return;
      }
      if (NUMERICOS.includes(nombre)) {
        datos[nombre] = campo.value === '' ? null : Number(campo.value);
        return;
      }
      const v = campo.value.trim();
      datos[nombre] = v === '' ? null : v;
    });
    datos.fotos = fotoTarjeta ? [fotoTarjeta] : [];
    datos.portada = fotoPortada;
    return datos;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const datos = leerFormulario();

    if (!datos.titulo) { aviso('El título es obligatorio.', true); form.titulo.focus(); return; }

    const btn = $('#btnGuardar');
    btn.disabled = true;
    btn.textContent = 'Guardando…';

    try {
      if (editando) {
        await api('/api/admin/propiedades?id=' + encodeURIComponent(editando), {
          method: 'PATCH', body: JSON.stringify(datos)
        });
        aviso('Cambios guardados.');
      } else {
        await api('/api/admin/propiedades', { method: 'POST', body: JSON.stringify(datos) });
        aviso('Propiedad creada.');
      }
      cerrarModal();
      cargar();
    } catch (err) {
      aviso(err.message, true);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Guardar propiedad';
    }
  });

  $('#btnEliminar').addEventListener('click', async () => {
    if (!editando) return;
    if (!confirm('¿Eliminar esta propiedad? Esta acción no se puede deshacer.')) return;
    try {
      await api('/api/admin/propiedades?id=' + encodeURIComponent(editando), { method: 'DELETE' });
      aviso('Propiedad eliminada.');
      cerrarModal();
      cargar();
    } catch (err) { aviso(err.message, true); }
  });

  /* ------------------------------------------------------------------
     6. Las dos fotografías
     La tarjeta (4:3) y la portada de la ficha (16:9) se cargan por separado
     porque se ven recortadas de forma distinta: la misma imagen en los dos
     sitios pierde la mitad del encuadre en uno de ellos.
     ------------------------------------------------------------------ */
  const RANURAS = {
    tarjeta: { caja: '#fotoTarjeta', input: 'archivoTarjeta', sello: 'Tarjeta',
               vacia: 'Agregar la fotografía de la tarjeta', proporcion: '4:3' },
    portada: { caja: '#fotoPortada', input: 'archivoPortada', sello: 'Portada',
               vacia: 'Agregar la portada de la ficha', proporcion: '16:9' }
  };

  const leerRanura = (r) => (r === 'tarjeta' ? fotoTarjeta : fotoPortada);
  function guardarRanura(r, valor) {
    if (r === 'tarjeta') fotoTarjeta = valor; else fotoPortada = valor;
    pintarRanura(r);
  }

  function pintarRanura(r) {
    const cfg = RANURAS[r];
    const foto = leerRanura(r);
    $(cfg.caja).innerHTML = foto
      ? `<div class="portadilla__marco">
           <img src="${esc(foto)}" alt="${esc(cfg.sello)}">
           <span class="portadilla__sello">${esc(cfg.sello)}</span>
           <div class="portadilla__acc">
             <label class="portadilla__btn" for="${cfg.input}">Cambiar</label>
             <button type="button" class="portadilla__btn portadilla__btn--quitar" data-quitar>Quitar</button>
           </div>
         </div>`
      : `<label class="portadilla__vacia" for="${cfg.input}">
           <svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2.5"/><circle cx="8.5" cy="10" r="1.6"/><path d="m4 17 4.8-4.6a1.8 1.8 0 0 1 2.5 0L16 17"/><path d="m13.5 14.6 1.9-1.8a1.8 1.8 0 0 1 2.5 0L20 15"/></svg>
           <strong>${esc(cfg.vacia)}</strong>
           <span>JPG, PNG o WebP · ${cfg.proporcion} · hasta 12 MB</span>
         </label>`;
  }

  function pintarFotos() { pintarRanura('tarjeta'); pintarRanura('portada'); }

  /* La foto viaja al servidor, que la reduce y la convierte a WebP antes de
     guardarla. Acá no se toca la imagen: subir el original tal cual y dejar
     que el servidor lo procese es más simple y más seguro que comprimir en
     el navegador. La que se sube reemplaza a la que hubiera en esa ranura. */
  async function subir(archivo, r) {
    aviso('Subiendo la fotografía…');
    const datos = new FormData();
    datos.append('fotos', archivo);
    try {
      const res = await fetch('/api/admin/subir', { method: 'POST', body: datos });
      if (res.status === 401) { mostrarAcceso(); return; }

      const cuerpo = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(cuerpo.error || 'No se pudo subir la fotografía');

      const subida = (cuerpo.fotos || [])[0];
      if (!subida) throw new Error((cuerpo.errores || [])[0] || 'No se pudo subir la fotografía');

      guardarRanura(r, subida);
      aviso(`${RANURAS[r].sello}: fotografía lista.`);
    } catch (err) {
      aviso(err.message, true);
    }
  }

  Object.keys(RANURAS).forEach((r) => {
    const cfg = RANURAS[r];
    $(cfg.caja).addEventListener('click', (e) => {
      if (e.target.closest('[data-quitar]')) guardarRanura(r, null);
    });
    $('#' + cfg.input).addEventListener('change', async (e) => {
      const archivo = (e.target.files || [])[0];
      if (archivo) await subir(archivo, r);
      e.target.value = '';
    });
  });

  /* ------------------------------------------------------------------
     7. Menú lateral (solo teléfono y tableta)
     Los tres botones de la barra no caben en fila en una pantalla angosta:
     apilados se llevaban medio alto de la pantalla en cada vista. Se van a
     un cajón que abre la hamburguesa. En escritorio nada de esto se aplica:
     el cajón es la misma caja de siempre, sin posicionar.
     ------------------------------------------------------------------ */
  const btnMenu = $('#btnMenu');
  const menuVelo = $('#menuVelo');
  const anchoCajon = matchMedia('(max-width:900px)');

  function menu(abrir) {
    document.body.classList.toggle('menu-abierto', abrir);
    btnMenu.setAttribute('aria-expanded', String(abrir));
    btnMenu.setAttribute('aria-label', abrir ? 'Cerrar el menú' : 'Abrir el menú');
  }
  const menuAbierto = () => document.body.classList.contains('menu-abierto');

  btnMenu.addEventListener('click', () => menu(!menuAbierto()));
  menuVelo.addEventListener('click', () => menu(false));

  /* Cualquier acción del cajón lo cierra: se pulsa para hacer algo en el
     panel, y dejarlo abierto taparía justo lo que se acaba de pedir. */
  $('#barraAcciones').addEventListener('click', (e) => {
    if (e.target.closest('.btn')) menu(false);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menuAbierto()) menu(false);
  });

  /* Al ensanchar la ventana el cajón deja de existir, pero la clase seguiría
     puesta y el body bloqueado sin nada que lo explique. */
  anchoCajon.addEventListener('change', (e) => { if (!e.matches) menu(false); });

  /* --- Arranque ------------------------------------------------------------
     Qué pantalla se ve ya lo decidió el servidor al entregar la página, así
     que acá no se pregunta nada: si el panel está a la vista, se piden sus
     datos y listo. Si la cookie venciera entre medio, `api()` responde 401 y
     devuelve al acceso. */
  if (!$('#panel').hidden) {
    cargar();
  } else {
    $('#usuario')?.focus();
  }
})();
