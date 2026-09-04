/* ==========================================================================
   Carga las fotografías que entrega el cliente.

   Cada propiedad lleva DOS imágenes con encuadres distintos, porque se ven
   en sitios distintos:

     · CARD    (4:3)  → la tarjeta del listado, el buscador y el inicio
     · PORTADA (16:9) → la imagen grande de la página de la propiedad

   El cliente las numera por catálogo, no por código: "INMUEBLE 7 CARD" es el
   séptimo inmueble del documento de Junín, y "INMUEBLE 3 LIMA PORTADA" el
   tercero del de Lima. La tabla de abajo traduce esa numeración a los ids de
   la base, siguiendo el mismo orden en que las propiedades aparecen en cada
   catálogo de origen:

     Junín → _legacy/assets/js/data.js
     Lima  → scripts/seed-lima.mjs

   Es idempotente: el nombre del archivo lleva un resumen del contenido, así
   que volver a correrlo sobre las mismas imágenes no duplica nada. Si el
   cliente cambia una foto, el resumen cambia y con él el nombre, que es lo
   que permite cachearlas para siempre sin servir una versión vieja.

   Uso:  node scripts/importar-fotos.mjs
         node scripts/importar-fotos.mjs "D:/otra/carpeta"
   ========================================================================== */
import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import sharp from 'sharp';

const ORIGEN = process.argv[2] || 'D:/Hennessy/INMUEBLES/LIMA INMUEBLES';
const DIR = process.env.UPLOADS_DIR || './uploads';
const RUTA_DB = process.env.DB_PATH || './data/golden.db';

/* Mismos límites que la subida desde el panel (src/pages/api/admin/subir.ts):
   lo que entra por un lado y por el otro tiene que quedar igual. */
const MAX_LADO = 2400;
const CALIDAD = 80;

/* id de la base ← nombre con que llegó la imagen */
const MAPA = [
  // --- Junín, en el orden del catálogo heredado -------------------------
  ['ghg-t01', 'INMUEBLE 1'],    // Terreno — Jr. Amazonas 269
  ['ghg-t02', 'INMUEBLE 2'],    // Terreno — Calle San Agustín con San Pablo Miki
  ['ghg-t03', 'INMUEBLE 3'],    // Terreno — Jirón 2 de Mayo
  ['ghg-t04', 'INMUEBLE 4'],    // Lotes — Matahuasi
  ['ghg-t05', 'INMUEBLE 5'],    // Lotes — Orcotuna
  ['ghg-t06', 'INMUEBLE 6'],    // Terreno — Av. Giráldez con Jr. Cahuide
  ['ghg-d01', 'INMUEBLE 7'],    // Dúplex — Edificio Los Ángeles II
  ['ghg-d02', 'INMUEBLE 8'],    // Dúplex — Jr. Los Rosales, El Tambo
  ['ghg-d03', 'INMUEBLE 9'],    // Departamento — Jardines de La Breña
  ['ghg-l01', 'INMUEBLE 10'],   // Inmueble comercial — Calle Los Olivos
  ['ghg-l02', 'INMUEBLE 11'],   // Piso comercial — Calle Real
  ['ghg-l03', 'INMUEBLE 12'],   // Local comercial — esquina, Jr. Ayacucho
  ['ghg-c01', 'INMUEBLE 13'],   // Casa multifamiliar — Jr. Junín 340

  // --- Lima, en el orden del documento del cliente ----------------------
  ['ghg-l04', 'INMUEBLE 1 LIMA'],  // Edificios comerciales — Av. Miguel Grau
  ['ghg-l05', 'INMUEBLE 2 LIMA'],  // Hostal, casa y cocheras — Mala
  ['ghg-t07', 'INMUEBLE 3 LIMA'],  // Terreno comercial — Prolongación Trujillo, Rímac
  ['ghg-t08', 'INMUEBLE 4 LIMA'],  // Terreno — Mala, Cañete
  ['ghg-t09', 'INMUEBLE 5 LIMA'],  // Terreno comercial — Pasaje Olivos, Mala
  ['ghg-t10', 'INMUEBLE 6 LIMA'],  // Terreno comercial — Prolongación Swaine, Mala
  ['ghg-l06', 'INMUEBLE 7 LIMA']   // Tienda comercial — Calle Real, Mala
];

/* --- Base ----------------------------------------------------------------- */
mkdirSync(dirname(resolve(RUTA_DB)), { recursive: true });
const db = new DatabaseSync(resolve(RUTA_DB));
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA busy_timeout = 5000');

/* El guion puede correr antes de que el servidor haya arrancado con el
   esquema nuevo, así que se asegura la columna por su cuenta. */
const columnas = new Set(db.prepare('PRAGMA table_info(propiedades)').all().map(c => c.name));
if (!columnas.has('portada')) {
  db.exec('ALTER TABLE propiedades ADD COLUMN portada TEXT');
  console.log('Se agregó la columna `portada`.');
}

mkdirSync(resolve(DIR), { recursive: true });

/* --- Proceso -------------------------------------------------------------- */

/** Convierte a WebP y devuelve la ruta pública. No reescribe lo ya convertido. */
async function convertir(archivo, id, ranura) {
  const ruta = resolve(ORIGEN, archivo);
  if (!existsSync(ruta)) return { error: `falta ${archivo}` };

  const bruto = readFileSync(ruta);
  const resumen = createHash('sha1').update(bruto).digest('hex').slice(0, 8);
  const nombre = `${id}-${ranura}-${resumen}.webp`;
  const destino = resolve(DIR, nombre);

  let bytes = 0;
  if (existsSync(destino)) {
    bytes = readFileSync(destino).length;
  } else {
    const salida = await sharp(bruto)
      .rotate()                                    // respeta la orientación EXIF
      .resize({ width: MAX_LADO, height: MAX_LADO, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: CALIDAD })
      .toBuffer();
    writeFileSync(destino, salida);
    bytes = salida.length;
  }
  return { url: `/uploads/${nombre}`, origen: bruto.length, bytes };
}

const buscar = db.prepare('SELECT id, titulo FROM propiedades WHERE id = ?');
const guardar = db.prepare(
  `UPDATE propiedades SET fotos = ?, portada = ?, editado_en = datetime('now') WHERE id = ?`
);

let listas = 0, saltadas = 0, pesoOrigen = 0, pesoFinal = 0;

for (const [id, base] of MAPA) {
  const fila = buscar.get(id);
  if (!fila) { console.log(`⚠ ${id}: no existe en la base, se salta.`); saltadas++; continue; }

  const tarjeta = await convertir(`${base} CARD.png`, id, 'tarjeta');
  const portada = await convertir(`${base} PORTADA.png`, id, 'portada');

  if (tarjeta.error || portada.error) {
    console.log(`⚠ ${id}: ${[tarjeta.error, portada.error].filter(Boolean).join(' · ')}`);
    saltadas++;
    continue;
  }

  guardar.run(JSON.stringify([tarjeta.url]), portada.url, id);
  pesoOrigen += tarjeta.origen + portada.origen;
  pesoFinal += tarjeta.bytes + portada.bytes;
  listas++;

  const mb = (n) => (n / 1024 / 1024).toFixed(2) + ' MB';
  console.log(`${id}  ${base.padEnd(16)} ${fila.titulo.slice(0, 52)}`);
  console.log(`        tarjeta ${tarjeta.url}  (${mb(tarjeta.bytes)})`);
  console.log(`        portada ${portada.url}  (${mb(portada.bytes)})`);
}

const mb = (n) => (n / 1024 / 1024).toFixed(1) + ' MB';
console.log(`\nPropiedades con fotografías: ${listas}${saltadas ? ` · sin tocar: ${saltadas}` : ''}`);
console.log(`Peso: ${mb(pesoOrigen)} de origen → ${mb(pesoFinal)} en WebP`);

const faltan = db.prepare(
  `SELECT COUNT(*) AS n FROM propiedades WHERE fotos LIKE '%unsplash%' OR fotos = '[]'`
).get();
console.log(`Propiedades que siguen con foto de ejemplo: ${faltan.n}`);

db.close();
