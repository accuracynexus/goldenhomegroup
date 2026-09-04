/* ==========================================================================
   Acceso a datos — SQLite
   Todo el trato con la base vive acá. Si algún día se cambia de motor
   (better-sqlite3, Postgres…), se reescribe este archivo y nada más: el
   resto del sitio solo usa las funciones exportadas al final.
   ========================================================================== */
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const RUTA = process.env.DB_PATH || './data/golden.db';

mkdirSync(dirname(resolve(RUTA)), { recursive: true });

const db = new DatabaseSync(resolve(RUTA));

/* WAL permite leer mientras se escribe: con el panel abierto y visitas
   entrando a la vez, nadie queda bloqueado esperando. */
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');
db.exec('PRAGMA busy_timeout = 5000');

/* --- Esquema -------------------------------------------------------------
   Se crea al arrancar si no existe, así el primer despliegue no necesita
   ningún paso manual de migración. */
db.exec(`
  CREATE TABLE IF NOT EXISTS propiedades (
    id                      TEXT PRIMARY KEY,
    titulo                  TEXT NOT NULL,
    subtipo                 TEXT,
    tipo                    TEXT NOT NULL,
    operacion               TEXT NOT NULL DEFAULT 'venta',
    estado                  TEXT NOT NULL DEFAULT 'disponible',
    precio                  REAL,
    moneda                  TEXT NOT NULL DEFAULT 'PEN',
    precio_m2               REAL,
    direccion               TEXT,
    ubicacion               TEXT,
    distrito                TEXT,
    region                  TEXT,
    referencia              TEXT,
    mapa                    TEXT,
    area                    REAL,
    area_construida         REAL,
    frontis                 TEXT,
    parametros_construccion TEXT,
    linderos                TEXT,
    habitaciones            INTEGER,
    banos                   INTEGER,
    estacionamientos        INTEGER,
    piso                    INTEGER,
    niveles                 INTEGER,
    descripcion             TEXT,
    caracteristicas         TEXT NOT NULL DEFAULT '[]',   -- JSON
    documentacion           TEXT,
    fotos                   TEXT NOT NULL DEFAULT '[]',   -- JSON
    portada                 TEXT,
    destacada               INTEGER NOT NULL DEFAULT 0,
    visible                 INTEGER NOT NULL DEFAULT 1,
    creado_en               TEXT NOT NULL DEFAULT (datetime('now')),
    editado_en              TEXT NOT NULL DEFAULT (datetime('now'))
  );

`);

/* --- Migraciones ---------------------------------------------------------
   `CREATE TABLE IF NOT EXISTS` no toca una tabla que ya existe, así que las
   columnas nuevas se agregan acá. Se consulta el esquema en vez de intentar
   el ALTER y descartar el error: así un fallo real sí se nota. */
const columnas = new Set(
  db.prepare(`PRAGMA table_info(propiedades)`).all().map((c: any) => c.name)
);
if (!columnas.has('region')) {
  db.exec(`ALTER TABLE propiedades ADD COLUMN region TEXT`);
}
if (!columnas.has('portada')) {
  db.exec(`ALTER TABLE propiedades ADD COLUMN portada TEXT`);
}

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_prop_visible  ON propiedades(visible);
  CREATE INDEX IF NOT EXISTS idx_prop_tipo     ON propiedades(tipo);
  CREATE INDEX IF NOT EXISTS idx_prop_distrito ON propiedades(distrito);
  CREATE INDEX IF NOT EXISTS idx_prop_region   ON propiedades(region);

  CREATE TABLE IF NOT EXISTS usuarios (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    correo     TEXT NOT NULL UNIQUE,
    clave_hash TEXT NOT NULL,
    creado_en  TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

/* --- Tipos --------------------------------------------------------------- */
export interface Propiedad {
  id: string;
  titulo: string;
  subtipo: string | null;
  tipo: 'terreno' | 'casa' | 'departamento' | 'local';
  operacion: 'venta' | 'alquiler';
  estado: 'disponible' | 'reservado' | 'vendido' | 'alquilado';
  precio: number | null;
  moneda: 'PEN' | 'USD';
  precio_m2: number | null;
  direccion: string | null;
  ubicacion: string | null;
  distrito: string | null;
  /* Zona comercial: la agencia opera en Lima y en Junín, y el sitio lo
     distingue en las tarjetas y en el listado de compra. */
  region: string | null;
  referencia: string | null;
  mapa: string | null;
  area: number | null;
  area_construida: number | null;
  frontis: string | null;
  parametros_construccion: string | null;
  linderos: string | null;
  habitaciones: number | null;
  banos: number | null;
  estacionamientos: number | null;
  piso: number | null;
  niveles: number | null;
  descripcion: string | null;
  caracteristicas: string[];
  documentacion: string | null;
  /* Dos imágenes por propiedad, con encuadres distintos porque se ven en
     sitios distintos: `fotos[0]` es la de la tarjeta (4:3, listados y
     buscador) y `portada` la de la ficha (16:9, a todo lo ancho). Si no hay
     portada, la ficha cae en la de la tarjeta. */
  fotos: string[];
  portada: string | null;
  destacada: boolean;
  visible: boolean;
  creado_en: string;
  editado_en: string;
}

export interface Filtros {
  tipo?: string;
  operacion?: string;
  ubicacion?: string;
  region?: string;
  precioMin?: number;
  precioMax?: number;
  areaMin?: number;
  areaMax?: number;
}

/* SQLite no tiene arreglos ni booleanos: las listas viajan como JSON y los
   booleanos como 0/1. Acá se traducen de vuelta a tipos de JavaScript. */
function hidratar(fila: any): Propiedad {
  const lista = (t: string) => { try { return JSON.parse(t || '[]'); } catch { return []; } };
  return {
    ...fila,
    caracteristicas: lista(fila.caracteristicas),
    fotos: lista(fila.fotos),
    destacada: !!fila.destacada,
    visible: !!fila.visible
  };
}

/* --- Lectura ------------------------------------------------------------- */

/** Solo lo publicado: es lo que ve cualquier visitante. */
export function listarPublicas(): Propiedad[] {
  return db.prepare(
    `SELECT * FROM propiedades WHERE visible = 1 ORDER BY creado_en DESC`
  ).all().map(hidratar);
}

/** Todo, incluidas las ocultas: solo para el panel. */
export function listarTodas(): Propiedad[] {
  return db.prepare(`SELECT * FROM propiedades ORDER BY creado_en DESC`).all().map(hidratar);
}

export function obtener(id: string, incluirOcultas = false): Propiedad | null {
  const fila = incluirOcultas
    ? db.prepare(`SELECT * FROM propiedades WHERE id = ?`).get(id)
    : db.prepare(`SELECT * FROM propiedades WHERE id = ? AND visible = 1`).get(id);
  return fila ? hidratar(fila) : null;
}

export function destacadas(max = 6): Propiedad[] {
  const todas = listarPublicas();
  const marcadas = todas.filter(p => p.destacada);
  // Si no hay suficientes marcadas, se completa con el resto: la grilla del
  // inicio siempre llega a su cupo.
  if (marcadas.length >= max) return marcadas.slice(0, max);
  return marcadas.concat(todas.filter(p => !p.destacada)).slice(0, max);
}

export function filtrar(f: Filtros = {}): Propiedad[] {
  return listarPublicas().filter(p => {
    if (f.tipo && p.tipo !== f.tipo) return false;
    if (f.operacion && p.operacion !== f.operacion) return false;
    if (f.region && (p.region || '') !== f.region) return false;
    if (f.precioMin != null && Number(p.precio || 0) < f.precioMin) return false;
    if (f.precioMax != null && Number(p.precio || 0) > f.precioMax) return false;
    if (f.areaMin != null && Number(p.area || 0) < f.areaMin) return false;
    if (f.areaMax != null && Number(p.area || 0) > f.areaMax) return false;
    if (f.ubicacion) {
      const q = f.ubicacion.toLowerCase().trim();
      if (p.distrito) { if (p.distrito.toLowerCase() !== q) return false; }
      else if (`${p.ubicacion || ''} ${p.titulo}`.toLowerCase().indexOf(q) === -1) return false;
    }
    return true;
  });
}

/** Rango real de un campo, para los controles del buscador. */
export function rangoDe(campo: 'precio' | 'area'): { min: number; max: number } {
  const fila: any = db.prepare(
    `SELECT MIN(${campo}) AS min, MAX(${campo}) AS max
       FROM propiedades WHERE visible = 1 AND ${campo} > 0`
  ).get();
  return { min: Number(fila?.min || 0), max: Number(fila?.max || 0) };
}

/** Zonas con propiedades publicadas, con cuántas tiene cada una. Alimenta
    las pestañas del listado de compra. */
export function regiones(): { nombre: string; total: number }[] {
  return db.prepare(
    `SELECT region AS nombre, COUNT(*) AS total
       FROM propiedades
      WHERE visible = 1 AND region IS NOT NULL AND region <> ''
      GROUP BY region ORDER BY total DESC, nombre COLLATE NOCASE`
  ).all().map((f: any) => ({ nombre: f.nombre, total: Number(f.total) }));
}

/** Distritos presentes en el catálogo, para el desplegable de ubicación. */
export function ubicaciones(): string[] {
  return db.prepare(
    `SELECT DISTINCT COALESCE(distrito, ubicacion) AS u
       FROM propiedades WHERE visible = 1 AND u IS NOT NULL AND u <> ''
      ORDER BY u COLLATE NOCASE`
  ).all().map((f: any) => f.u);
}

/* --- Escritura (panel) ---------------------------------------------------- */
const CAMPOS = [
  'titulo', 'subtipo', 'tipo', 'operacion', 'estado', 'precio', 'moneda', 'precio_m2',
  'direccion', 'ubicacion', 'distrito', 'region', 'referencia', 'mapa', 'area', 'area_construida',
  'frontis', 'parametros_construccion', 'linderos', 'habitaciones', 'banos',
  'estacionamientos', 'piso', 'niveles', 'descripcion', 'caracteristicas',
  'documentacion', 'fotos', 'portada', 'destacada', 'visible'
] as const;

/** Deja los valores listos para SQLite: arreglos a JSON, booleanos a 0/1. */
function aFila(datos: Record<string, any>) {
  const fila: Record<string, any> = {};
  for (const c of CAMPOS) {
    if (!(c in datos)) continue;
    const v = datos[c];
    if (c === 'caracteristicas' || c === 'fotos') fila[c] = JSON.stringify(v ?? []);
    else if (c === 'destacada' || c === 'visible') fila[c] = v ? 1 : 0;
    else fila[c] = v === '' || v === undefined ? null : v;
  }
  return fila;
}

/** Genera un id legible y único a partir del tipo: ghg-c03, ghg-t07… */
function nuevoId(tipo: string): string {
  const letra = ({ terreno: 't', casa: 'c', departamento: 'd', local: 'l' } as any)[tipo] || 'p';
  const fila: any = db.prepare(
    `SELECT id FROM propiedades WHERE id LIKE ? ORDER BY id DESC LIMIT 1`
  ).get(`ghg-${letra}%`);
  const ultimo = fila ? parseInt(String(fila.id).replace(/\D/g, ''), 10) || 0 : 0;
  return `ghg-${letra}${String(ultimo + 1).padStart(2, '0')}`;
}

export function crear(datos: Record<string, any>): Propiedad {
  const fila = aFila(datos);
  const id = datos.id || nuevoId(datos.tipo || 'terreno');
  const cols = Object.keys(fila);
  db.prepare(
    `INSERT INTO propiedades (id, ${cols.join(', ')})
     VALUES (?, ${cols.map(() => '?').join(', ')})`
  ).run(id, ...cols.map(c => fila[c]));
  return obtener(id, true)!;
}

export function actualizar(id: string, datos: Record<string, any>): Propiedad | null {
  const fila = aFila(datos);
  const cols = Object.keys(fila);
  if (!cols.length) return obtener(id, true);
  db.prepare(
    `UPDATE propiedades SET ${cols.map(c => `${c} = ?`).join(', ')},
            editado_en = datetime('now')
      WHERE id = ?`
  ).run(...cols.map(c => fila[c]), id);
  return obtener(id, true);
}

export function eliminar(id: string): boolean {
  return db.prepare(`DELETE FROM propiedades WHERE id = ?`).run(id).changes > 0;
}

/* --- Usuarios del panel --------------------------------------------------- */
export function buscarUsuario(correo: string) {
  return db.prepare(`SELECT * FROM usuarios WHERE correo = ?`).get(correo.toLowerCase().trim()) as
    { id: number; correo: string; clave_hash: string } | undefined;
}

export function crearUsuario(correo: string, claveHash: string) {
  db.prepare(`INSERT INTO usuarios (correo, clave_hash) VALUES (?, ?)`)
    .run(correo.toLowerCase().trim(), claveHash);
}

export function hayUsuarios(): boolean {
  const f: any = db.prepare(`SELECT COUNT(*) AS n FROM usuarios`).get();
  return Number(f.n) > 0;
}

export default db;
