/* ==========================================================================
   Punto único de configuración editable.
   Si cambia un teléfono, un correo o una red social, se cambia SOLO acá.
   ========================================================================== */
export const TEL = '+51 936 342 373';
export const TEL_DIGITOS = '51936342373';
export const MAIL = 'ventas@goldenhomegroup.com';

export const REDES = {
  facebook: 'https://www.facebook.com/share/1EvrLJMWR9/?mibextid=wwXIfr',
  tiktok: 'https://www.tiktok.com/@inmobiliariagoldenhome?is_from_webapp=1&sender_device=pc',
  instagram: '#'   // pendiente: pegar aquí la URL oficial
};

/* `nombre` es como el cliente llama a cada oficina y es lo que se rotula en
   el mapa; `ciudad` se queda para el texto que lee un lector de pantalla, que
   necesita el lugar y no el cargo de la sede. `direccion` es además lo que se
   le pasa a Google Maps, así que va completa; `corta` es la que entra en la
   barra superior, donde no hay sitio para el país. */
export const SEDES = [
  { ciudad: 'Lima', nombre: 'Sede corporativa',
    direccion: 'Valladolid 224, La Molina, Lima, Perú',
    corta: 'Valladolid 224, La Molina, Lima' },
  { ciudad: 'Huancayo', nombre: 'Oficina Huancayo',
    direccion: 'Jr. Moquegua 1061, Huancayo, Junín, Perú',
    corta: 'Jr. Moquegua 1061, Huancayo' }
];

/* Video institucional del inicio, alojado en Google Drive.

   Se puede pegar el enlace tal como lo da Drive ("…/file/d/ID/view?usp=…")
   o el ID pelado: de ahí sale el reproductor incrustado. OJO con dos cosas:

   · El archivo tiene que estar compartido como "Cualquier persona con el
     enlace · Lector". Con el permiso por defecto, el visitante ve la
     pantalla de inicio de sesión de Google en lugar del video.
   · El enlace de una CARPETA no sirve: Drive incrusta por archivo.

   Para cambiar el video sin tocar el sitio, lo mejor es subir el nuevo
   archivo con "Administrar versiones" sobre el que ya está: el ID no cambia
   y acá no hay que modificar nada. Si se sube como archivo nuevo, hay que
   pegar el enlace nuevo en esta línea y volver a compilar.

   Vacío = el inicio muestra la placa de "próximamente". */
export const VIDEO_INICIO = 'https://drive.google.com/file/d/1KIVo9c0ifSG9_HkfAETdBlRXxUIxGgXb/view';

/* Proporción del video tal como se grabó: '16/9' apaisado, '9/16' vertical
   (de celular), '1/1' cuadrado. No es un capricho: Drive no dice de qué
   forma es el video, y la caja necesita saberlo para recortarlo bien. Si se
   pone mal, el reproductor deja franjas negras a los costados o arriba. */
export const VIDEO_INICIO_PROPORCION = '9/16';

export const MENSAJES = {
  general: 'Hola Golden Home Group 👋, quisiera recibir información.',
  propiedad: 'Hola, estoy interesado(a) en la propiedad "{titulo}". Quisiera recibir más información.',
  asesor: 'Hola Golden Home Group 👋, quisiera hablar con un asesor.'
};

export const EMPRESA = {
  nombre: 'Golden Home Group',
  lema: 'Más de 8 años creando oportunidades inmobiliarias',
  portafolio: 'Terrenos · Casas · Departamentos · Locales',
  anios: 8
};

export const MENU: [string, string][] = [
  ['/', 'Inicio'],
  ['/nosotros', 'Nosotros'],
  ['/compra', 'Compra'],
  ['/vende', 'Vende'],
  ['/servicios', 'Servicios'],
  ['/agente', 'Sé un agente'],
  ['/contacto', 'Contacto']
];

/** Enlace de WhatsApp con el mensaje ya cargado. */
export function waLink(msg?: string): string {
  return `https://wa.me/${TEL_DIGITOS}?text=${encodeURIComponent(msg || MENSAJES.general)}`;
}

/* --- Formato -------------------------------------------------------------
   Los inmuebles se publican en soles o en dólares según el anuncio
   original: nunca se convierte, se muestra en la moneda con la que se
   cargó. */
export const TIPOS: Record<string, { label: string; plural: string }> = {
  terreno: { label: 'Terreno', plural: 'Terrenos' },
  casa: { label: 'Casa', plural: 'Casas' },
  departamento: { label: 'Departamento', plural: 'Departamentos' },
  local: { label: 'Local', plural: 'Locales' }
};

export const OPERACIONES: Record<string, { label: string; verbo: string }> = {
  venta: { label: 'Venta', verbo: 'Comprar' },
  alquiler: { label: 'Alquiler', verbo: 'Alquilar' }
};

export const ESTADOS: Record<string, { label: string; clase: string }> = {
  disponible: { label: 'Disponible', clase: 'estado--ok' },
  reservado: { label: 'Reservado', clase: 'estado--warn' },
  vendido: { label: 'Vendido', clase: 'estado--off' },
  alquilado: { label: 'Alquilado', clase: 'estado--off' }
};

export const fmt = {
  precio(valor: number | null | undefined, moneda?: string | null): string {
    if (valor == null || valor === ('' as any)) return 'Consultar';
    return (moneda === 'USD' ? 'US$ ' : 'S/ ') + Number(valor).toLocaleString('es-PE');
  },
  precioM2(p: { precio_m2?: number | null; moneda?: string | null }): string {
    if (p.precio_m2 == null) return '';
    return fmt.precio(p.precio_m2, p.moneda) + ' / m²';
  },
  /* Los terrenos de Cañete llegan a 3,000 m²: sin separador de miles la
     cifra se lee mal. Los decimales se conservan cuando existen (413.38). */
  area(valor: number | null | undefined): string {
    if (valor == null) return '';
    return Number(valor).toLocaleString('es-PE', { maximumFractionDigits: 2 }) + ' m²';
  },
  tipo: (t: string) => TIPOS[t]?.label || t || '',
  operacion: (o: string) => OPERACIONES[o]?.label || o || '',
  estado: (e: string) => ESTADOS[e]?.label || e || '',
  claseEstado: (e: string) => ESTADOS[e]?.clase || ''
};
