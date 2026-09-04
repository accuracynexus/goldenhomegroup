/* ==========================================================================
   Catálogo de Lima.

   El seed original (scripts/seed.mjs) carga los inmuebles de Huancayo desde
   el sitio anterior. Estos llegaron después, en un documento aparte del
   cliente, así que viven en su propio archivo en vez de mezclarse con aquel.

   Es idempotente igual que el otro: inserta solo los ids que no existen, así
   nunca pisa una edición hecha desde el panel.

   Uso:  node scripts/seed-lima.mjs
   ========================================================================== */
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const RUTA = process.env.DB_PATH || './data/golden.db';
mkdirSync(dirname(resolve(RUTA)), { recursive: true });
const db = new DatabaseSync(resolve(RUTA));
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA busy_timeout = 5000');

/* Fotografías de maqueta, las mismas que ya usa el resto del catálogo.
   El cliente todavía no entrega las suyas (están en su Drive, sin
   procesar): cuando lleguen se reemplazan desde el panel, una por
   propiedad, porque la ficha ya no muestra galería. */
const FOTO = {
  oficinas: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80',
  casa:     'https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=1200&q=80',
  fachada:  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80',
  terreno:  'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80',
  campo:    'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
  tienda:   'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=80'
};

/* El sitio maneja cuatro tipos: terreno, casa, departamento y local. Los
   nombres del documento ("edificio comercial", "tienda comercial", "hostal
   + casa + cocheras") se guardan en `subtipo`, que es el que se muestra en
   la tarjeta y en la ficha; `tipo` queda como la categoría que filtra. */
const propiedades = [
  /* ---------------------------------------------------------------- 01 --
     Dos edificios en el Cercado: es la operación más grande del catálogo,
     de ahí que vaya destacada. */
  {
    id: 'ghg-l04',
    titulo: 'Edificios comerciales en venta — Av. Miguel Grau y Jr. Sandia',
    subtipo: 'Edificio comercial',
    tipo: 'local',
    precio: 3255000, moneda: 'USD', precio_m2: 1500,
    direccion: 'Av. Miguel Grau 227-231-233 y Jr. Sandia 443-17',
    ubicacion: 'Av. Miguel Grau 227, Cercado de Lima',
    distrito: 'Cercado de Lima',
    region: 'Lima',
    mapa: 'Av. Miguel Grau 227, Cercado de Lima, Perú',
    area: 413.38,
    area_construida: 2170,
    niveles: 5,
    descripcion: 'Conjunto de dos edificios comerciales en el centro de Lima, con 2,170 m² construidos sobre 413.38 m² de terreno. El edificio de Av. Miguel Grau tiene 5 pisos, azotea y sótano; el de Jr. Sandia, 4 pisos y sótano. Ideal para oficinas, instituciones, almacenes, centros empresariales o inversión inmobiliaria.',
    caracteristicas: [
      'Edificio Av. Miguel Grau: 5 pisos, azotea y sótano',
      'Edificio Jr. Sandia: 4 pisos y sótano',
      'Terreno Av. Miguel Grau: 313.38 m²',
      'Terreno Jr. Sandia: 100 m²',
      'Área construida total: 2,170 m²',
      'Apto para oficinas, almacenes o centros empresariales',
      'Precio negociable'
    ],
    documentacion: 'Libre de hipotecas y gravámenes, lista para transferencia.',
    fotos: [FOTO.oficinas],
    destacada: true
  },

  /* ---------------------------------------------------------------- 02 --
     Hostal en marcha con casa y cocheras: se cataloga como local porque su
     uso es comercial, aunque incluya vivienda. */
  {
    id: 'ghg-l05',
    titulo: 'Hostal, casa y cocheras en venta — Mala, Cañete',
    subtipo: 'Hostal con casa y cocheras',
    tipo: 'local',
    precio: 320000, moneda: 'USD', precio_m2: 400,
    direccion: 'Antigua Panamericana Sur',
    ubicacion: 'Antigua Panamericana Sur, Mala',
    distrito: 'Mala',
    region: 'Lima',
    referencia: 'Esquina con dos frentes y salida directa a la Antigua Panamericana Sur',
    mapa: 'Antigua Panamericana Sur, Mala, Cañete, Perú',
    area: 800,
    frontis: '10 ml de frente y 80 ml de largo',
    habitaciones: 40,
    estacionamientos: 3,
    niveles: 3,
    descripcion: 'Propiedad multifuncional de 800 m² sobre la Antigua Panamericana Sur, en Mala. Incluye un hostal de 3 pisos con 40 habitaciones, una casa independiente de 2 pisos, cocheras y áreas complementarias. Su ubicación en esquina, con dos frentes y salida directa a la vía principal, la hace apta para proyectos hoteleros, turísticos o comerciales.',
    caracteristicas: [
      'Hostal de 3 pisos con 40 habitaciones',
      'Casa independiente de 2 pisos: 3 habitaciones, sala, cocina y ambientes adicionales',
      'Cochera frontal y 2 cocheras laterales con salida directa a calle',
      'Quiosco para desayunos o comidas',
      'Pozo de agua subterránea y patio',
      'Esquina con dos frentes sobre la Panamericana Sur',
      'Precio rebajado: antes US$ 500/m², ahora US$ 400/m²',
      'Precio negociable'
    ],
    documentacion: 'Libre de hipotecas y gravámenes, lista para transferencia.',
    fotos: [FOTO.casa],
    destacada: true
  },

  /* ---------------------------------------------------------------- 03 -- */
  {
    id: 'ghg-t07',
    titulo: 'Terreno comercial en venta — Prolongación Trujillo, Rímac',
    subtipo: 'Terreno comercial',
    tipo: 'terreno',
    precio: 546000, moneda: 'USD', precio_m2: 650,
    direccion: 'Prolongación Trujillo',
    ubicacion: 'Prolongación Trujillo, Rímac',
    distrito: 'Rímac',
    region: 'Lima',
    mapa: 'Prolongación Trujillo, Rímac, Lima, Perú',
    area: 840,
    area_construida: 10,
    descripcion: 'Terreno comercial de 840 m² en Prolongación Trujillo, Rímac, con primer piso y puerta a calle que facilita el acceso directo. Apto para desarrollo comercial, almacenes, oficinas o actividades empresariales.',
    caracteristicas: [
      'Primer piso con puerta a calle',
      'Apto para almacenes, oficinas o desarrollo comercial',
      'Precio rebajado: antes US$ 1,000/m², ahora US$ 650/m²',
      'Precio negociable'
    ],
    documentacion: 'Libre de hipotecas y gravámenes, lista para transferencia.',
    fotos: [FOTO.terreno]
  },

  /* ---------------------------------------------------------------- 04 -- */
  {
    id: 'ghg-t08',
    titulo: 'Terreno en venta — Mala, Cañete',
    subtipo: 'Terreno',
    tipo: 'terreno',
    precio: 320000, moneda: 'USD', precio_m2: 160,
    ubicacion: 'Mala, Cañete',
    distrito: 'Mala',
    region: 'Lima',
    referencia: 'Al costado del Hotel Costa Riviera',
    mapa: 'Hotel Costa Riviera, Mala, Cañete, Perú',
    area: 2000,
    descripcion: 'Terreno de 2,000 m² al costado del Hotel Costa Riviera, en Mala, Cañete. Cuenta con puerta de ingreso de 3.5 metros y está en una zona hotelera y turística con potencial de crecimiento, apta para proyectos inmobiliarios, comerciales o de inversión.',
    caracteristicas: [
      'Puerta de ingreso de 3.5 metros',
      'Zona hotelera y turística en crecimiento',
      'Apto para proyectos inmobiliarios, comerciales o turísticos',
      'Precio rebajado: antes US$ 230/m², ahora US$ 160/m²',
      'Precio negociable'
    ],
    documentacion: 'Libre de hipotecas y gravámenes, lista para transferencia.',
    fotos: [FOTO.campo]
  },

  /* ---------------------------------------------------------------- 05 -- */
  {
    id: 'ghg-t09',
    titulo: 'Terreno comercial en venta — Pasaje Olivos, Mala',
    subtipo: 'Terreno comercial',
    tipo: 'terreno',
    precio: 510000, moneda: 'USD', precio_m2: 170,
    direccion: 'Pasaje Olivos',
    ubicacion: 'Pasaje Olivos, Mala',
    distrito: 'Mala',
    region: 'Lima',
    referencia: 'Frente al Colegio Parroquial',
    mapa: 'Pasaje Olivos, Mala, Cañete, Perú',
    area: 3000,
    descripcion: 'Terreno comercial de 3,000 m² frente al Colegio Parroquial, en Pasaje Olivos, Mala. Su amplia puerta de ingreso de 10 x 10 metros permite el acceso de vehículos, y cuenta además con área de control de cancha. Apto para proyectos comerciales, educativos, deportivos o inmobiliarios.',
    caracteristicas: [
      'Puerta de ingreso de 10 m x 10 m',
      'Área de control de cancha',
      'Frente a institución educativa',
      'Apto para proyectos comerciales, educativos o deportivos',
      'Precio rebajado: antes US$ 300/m², ahora US$ 170/m²',
      'Precio negociable'
    ],
    documentacion: 'Libre de hipotecas y gravámenes, lista para transferencia.',
    fotos: [FOTO.terreno]
  },

  /* ---------------------------------------------------------------- 06 -- */
  {
    id: 'ghg-t10',
    titulo: 'Terreno comercial en venta — Prolongación Swaine, Mala',
    subtipo: 'Terreno comercial',
    tipo: 'terreno',
    precio: 150000, moneda: 'USD', precio_m2: 250,
    direccion: 'Prolongación Swaine',
    ubicacion: 'Prolongación Swaine, Mala',
    distrito: 'Mala',
    region: 'Lima',
    mapa: 'Prolongación Swaine, Mala, Cañete, Perú',
    area: 600,
    area_construida: 150,
    descripcion: 'Terreno comercial de 600 m² con 150 m² ya construidos, en Prolongación Swaine, Mala. La construcción existente permite aprovechar el espacio desde el primer momento, con posibilidades de uso como almacén, taller, negocio, oficina o inversión inmobiliaria.',
    caracteristicas: [
      '150 m² de construcción existente',
      'Apto para almacenes, talleres, negocios u oficinas',
      'Precio rebajado: antes US$ 300/m², ahora US$ 250/m²',
      'Precio negociable'
    ],
    documentacion: 'Libre de hipotecas y gravámenes, lista para transferencia.',
    fotos: [FOTO.fachada]
  },

  /* ---------------------------------------------------------------- 07 -- */
  {
    id: 'ghg-l06',
    titulo: 'Tienda comercial en venta — Calle Real, Mala',
    subtipo: 'Tienda comercial',
    tipo: 'local',
    precio: 50000, moneda: 'USD',
    direccion: 'Calle Real',
    ubicacion: 'Calle Real, Mala',
    distrito: 'Mala',
    region: 'Lima',
    mapa: 'Calle Real, Mala, Cañete, Perú',
    area: 17,
    descripcion: 'Tienda comercial de 17 m² en Calle Real, Mala, en plena zona comercial con flujo constante de clientes. Apta para negocios minoristas, oficinas, servicios profesionales o como primera inversión comercial.',
    caracteristicas: [
      'Ubicada en zona comercial con flujo de clientes',
      'Apta para negocio minorista, oficina o servicios profesionales',
      'Precio negociable'
    ],
    documentacion: 'Libre de hipotecas y gravámenes, lista para transferencia.',
    fotos: [FOTO.tienda]
  }
];

/* --- Carga ---------------------------------------------------------------- */
const yaExiste = db.prepare('SELECT 1 FROM propiedades WHERE id = ?');
const insertar = db.prepare(`
  INSERT INTO propiedades
    (id, titulo, subtipo, tipo, operacion, estado, precio, moneda, precio_m2,
     direccion, ubicacion, distrito, region, referencia, mapa, area, area_construida,
     frontis, parametros_construccion, linderos, habitaciones, banos,
     estacionamientos, piso, niveles, descripcion, caracteristicas,
     documentacion, fotos, destacada, visible)
  VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);

let nuevas = 0, saltadas = 0;
for (const p of propiedades) {
  if (yaExiste.get(p.id)) { saltadas++; continue; }
  insertar.run(
    p.id, p.titulo, p.subtipo ?? null, p.tipo, p.operacion ?? 'venta',
    p.estado ?? 'disponible', p.precio ?? null, p.moneda ?? 'PEN', p.precio_m2 ?? null,
    p.direccion ?? null, p.ubicacion ?? null, p.distrito ?? null, p.region ?? null,
    p.referencia ?? null, p.mapa ?? null, p.area ?? null, p.area_construida ?? null,
    p.frontis ?? null, p.parametros_construccion ?? null, p.linderos ?? null,
    p.habitaciones ?? null, p.banos ?? null, p.estacionamientos ?? null,
    p.piso ?? null, p.niveles ?? null, p.descripcion ?? null,
    JSON.stringify(p.caracteristicas ?? []), p.documentacion ?? null,
    JSON.stringify(p.fotos ?? []), p.destacada ? 1 : 0, p.visible === false ? 0 : 1
  );
  nuevas++;
}

const total = db.prepare('SELECT COUNT(*) AS n FROM propiedades').get();
console.log(`Lima — nuevas: ${nuevas}, ya estaban: ${saltadas}. Total en la base: ${total.n}.`);
db.close();
