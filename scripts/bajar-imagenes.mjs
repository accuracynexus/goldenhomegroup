/* ==========================================================================
   Trae a casa las fotografías decorativas del sitio.

   Antes se pedían a images.unsplash.com en cada visita. Eso significaba una
   conexión a un tercero por imagen, sin control del peso ni del formato, y
   un sitio que se ve roto si ese servicio falla o cambia una URL.

   Este guion las baja una vez, las convierte a WebP con el mismo criterio
   que las fotos de las propiedades, y las deja en public/assets/img/, que
   Astro publica tal cual y Caddy sirve con caché larga.

   Deja constancia de dónde salió cada una: son de Unsplash, cuya licencia
   permite usarlas y alojarlas sin atribución, pero conviene poder rastrear
   el origen si alguna hay que reemplazar.

   Es idempotente: vuelve a bajar y reescribir siempre, así que correrlo de
   nuevo simplemente refresca los archivos.

   Uso:  node scripts/bajar-imagenes.mjs
   ========================================================================== */
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';

const DESTINO = './public/assets/img';
const CALIDAD = 80;

/* archivo · id de Unsplash · ancho al que se usa · para qué es */
const IMAGENES = [
  ['banner-inicio',       '1600596542815-ffad4c1539a9', 1600, 'Portada del inicio — residencia moderna'],
  ['banner-compra',       '1600585154340-be6161a56a0c', 1600, 'Portada de /compra'],
  ['hero-nosotros',       '1486406146926-c627a92ad1ab', 1800, 'Cabecera de /nosotros'],
  ['hero-agente',         '1521737604893-d14cc237f11d', 1600, 'Cabecera de /agente'],
  ['nosotros-propiedad',  '1600585154340-be6161a56a0c', 1200, 'Bloque de dos columnas en /nosotros'],
  ['inicio-interior',     '1600607687939-ce8a6c25118c', 1200, 'Bloque "+8 años" del inicio'],
  ['video-placa',         '1600596542815-ffad4c1539a9', 1200, 'Placa del video cuando todavía no hay ninguno'],

  /* Las tres tarjetas de servicios del inicio. Las dos últimas se cambiaron:
     "Vende" mostraba un campo al atardecer y "Sé un agente" un pasillo de
     oficina — ninguna decía nada de lo que la tarjeta ofrece. */
  ['servicio-compra',     '1600596542815-ffad4c1539a9', 1000, 'Tarjeta "Compra tu propiedad"'],
  ['servicio-vende',      '1638262052640-82e94d64664a', 1000, 'Tarjeta "Vende tu propiedad" — cierre de trato'],
  ['servicio-agente',     '1714647212555-520e683791e9', 1000, 'Tarjeta "Sé un agente" — agente con clientes']
];

mkdirSync(resolve(DESTINO), { recursive: true });

let pesoOrigen = 0, pesoFinal = 0;

for (const [nombre, id, ancho, para] of IMAGENES) {
  const url = `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${ancho}&q=85`;
  const res = await fetch(url);
  if (!res.ok) { console.log(`⚠ ${nombre}: ${res.status} ${res.statusText}`); continue; }

  const entrada = Buffer.from(await res.arrayBuffer());
  const salida = await sharp(entrada)
    .resize({ width: ancho, withoutEnlargement: true })
    .webp({ quality: CALIDAD })
    .toBuffer();

  const archivo = `${nombre}.webp`;
  writeFileSync(resolve(DESTINO, archivo), salida);

  const meta = await sharp(salida).metadata();
  pesoOrigen += entrada.length;
  pesoFinal += salida.length;

  const kb = (n) => Math.round(n / 1024) + ' kB';
  console.log(`${archivo.padEnd(24)} ${meta.width}x${meta.height}  ${kb(entrada.length)} → ${kb(salida.length)}   ${para}`);
}

const kb = (n) => (n / 1024).toFixed(0) + ' kB';
console.log(`\nTotal: ${kb(pesoOrigen)} de origen → ${kb(pesoFinal)} en WebP`);
