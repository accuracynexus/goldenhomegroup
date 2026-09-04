/* ==========================================================================
   Carga inicial de la base.

   Lee el catálogo del sitio anterior (_legacy/assets/js/data.js) y lo vuelca
   en SQLite, y crea el usuario del panel si todavía no hay ninguno.

   Es idempotente: se puede correr las veces que haga falta. Las propiedades
   se insertan solo si su id no existe, así nunca pisa cambios hechos desde
   el panel.

   Uso:  node scripts/seed.mjs
         ADMIN_EMAIL=... ADMIN_PASSWORD=... node scripts/seed.mjs
   ========================================================================== */
import { readFileSync, existsSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { randomBytes, scryptSync } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const RUTA = process.env.DB_PATH || './data/golden.db';
mkdirSync(dirname(resolve(RUTA)), { recursive: true });
const db = new DatabaseSync(resolve(RUTA));
db.exec('PRAGMA journal_mode = WAL');

/* Mismo esquema que src/lib/db.ts: el seed puede correr antes del primer
   arranque del servidor, así que crea las tablas si no están. */
db.exec(`
  CREATE TABLE IF NOT EXISTS propiedades (
    id TEXT PRIMARY KEY, titulo TEXT NOT NULL, subtipo TEXT, tipo TEXT NOT NULL,
    operacion TEXT NOT NULL DEFAULT 'venta', estado TEXT NOT NULL DEFAULT 'disponible',
    precio REAL, moneda TEXT NOT NULL DEFAULT 'PEN', precio_m2 REAL,
    direccion TEXT, ubicacion TEXT, distrito TEXT, region TEXT, referencia TEXT, mapa TEXT,
    area REAL, area_construida REAL, frontis TEXT, parametros_construccion TEXT,
    linderos TEXT, habitaciones INTEGER, banos INTEGER, estacionamientos INTEGER,
    piso INTEGER, niveles INTEGER, descripcion TEXT,
    caracteristicas TEXT NOT NULL DEFAULT '[]', documentacion TEXT,
    fotos TEXT NOT NULL DEFAULT '[]',
    destacada INTEGER NOT NULL DEFAULT 0, visible INTEGER NOT NULL DEFAULT 1,
    creado_en TEXT NOT NULL DEFAULT (datetime('now')),
    editado_en TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_prop_visible  ON propiedades(visible);
  CREATE INDEX IF NOT EXISTS idx_prop_tipo     ON propiedades(tipo);
  CREATE INDEX IF NOT EXISTS idx_prop_distrito ON propiedades(distrito);
  CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT, correo TEXT NOT NULL UNIQUE,
    clave_hash TEXT NOT NULL, creado_en TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

/* --- Propiedades ---------------------------------------------------------- */
const ORIGEN = './_legacy/assets/js/data.js';
let propiedades = [];

if (existsSync(ORIGEN)) {
  const src = readFileSync(ORIGEN, 'utf8');
  const m = src.match(/GHG\.propiedadesSemilla\s*=\s*(\[[\s\S]*?\n\];)/);
  if (m) {
    // El catálogo es un literal de JavaScript, no JSON: se evalúa en un
    // ámbito acotado en vez de intentar analizarlo con JSON.parse.
    propiedades = new Function(`return ${m[1].replace(/;\s*$/, '')}`)();
  }
}

if (!propiedades.length) {
  console.error(`No se encontró el catálogo en ${ORIGEN}. Nada que cargar.`);
} else {
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
      // El catálogo heredado del sitio anterior es íntegramente de Junín
      p.direccion ?? null, p.ubicacion ?? null, p.distrito ?? null, p.region ?? 'Junín',
      p.referencia ?? null, p.mapa ?? null, p.area ?? null, p.area_construida ?? null,
      p.frontis ?? null, p.parametros_construccion ?? null, p.linderos ?? null,
      p.habitaciones ?? null, p.banos ?? null, p.estacionamientos ?? null,
      p.piso ?? null, p.niveles ?? null, p.descripcion ?? null,
      JSON.stringify(p.caracteristicas ?? []), p.documentacion ?? null,
      JSON.stringify(p.fotos ?? []), p.destacada ? 1 : 0, p.visible === false ? 0 : 1
    );
    nuevas++;
  }
  console.log(`Propiedades — nuevas: ${nuevas}, ya estaban: ${saltadas}`);
}

/* --- Usuario del panel ---------------------------------------------------- */
const { n } = db.prepare('SELECT COUNT(*) AS n FROM usuarios').get();

if (Number(n) > 0) {
  console.log(`Usuarios — ya hay ${n}, no se crea ninguno.`);
} else {
  const correo = (process.env.ADMIN_EMAIL || 'admin@goldenhomegroup.com').toLowerCase().trim();
  // Sin contraseña indicada se genera una al azar y se muestra UNA vez:
  // así ningún despliegue queda con una clave por defecto conocida.
  const clave = process.env.ADMIN_PASSWORD || randomBytes(9).toString('base64url');
  const sal = randomBytes(16);
  const hash = `scrypt$${sal.toString('hex')}$${scryptSync(clave, sal, 64).toString('hex')}`;

  db.prepare('INSERT INTO usuarios (correo, clave_hash) VALUES (?, ?)').run(correo, hash);

  console.log('\n──────────────────────────────────────────────');
  console.log('  Usuario del panel creado');
  console.log(`  Correo:     ${correo}`);
  console.log(`  Contraseña: ${clave}`);
  if (!process.env.ADMIN_PASSWORD) console.log('  (generada al azar — anótala, no se vuelve a mostrar)');
  console.log('──────────────────────────────────────────────\n');
}

const total = db.prepare('SELECT COUNT(*) AS n FROM propiedades').get();
console.log(`Base lista en ${resolve(RUTA)} — ${total.n} propiedades.`);
db.close();
