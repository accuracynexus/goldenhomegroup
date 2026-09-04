/* ==========================================================================
   Sesión del panel administrativo.

   No hay servicio externo ni librería: la sesión es una cookie firmada con
   HMAC-SHA256 usando el secreto del servidor. El navegador puede leer su
   contenido pero no puede alterarlo sin invalidar la firma, y la cookie va
   httpOnly para que ningún script de la página pueda leerla.

   Las contraseñas se guardan con scrypt (derivación lenta, resistente a
   fuerza bruta) y se comparan en tiempo constante.
   ========================================================================== */
import { createHmac, timingSafeEqual, randomBytes, scryptSync } from 'node:crypto';
import { buscarUsuario } from './db';

const SECRETO = process.env.AUTH_SECRET || '';
const NOMBRE_COOKIE = 'ghg_sesion';
const DURACION_H = 8;

if (!SECRETO && process.env.NODE_ENV === 'production') {
  throw new Error('Falta AUTH_SECRET: define el secreto antes de arrancar en producción.');
}

/* En desarrollo se usa un secreto fijo y conocido. Antes se generaba uno al
   azar en cada arranque, y como el servidor se reinicia con cada cambio, la
   sesión se caía sola: el panel quedaba abierto pero cada llamada devolvía
   401 sin explicación aparente.

   No es un riesgo: en producción la comprobación de arriba impide arrancar
   sin un AUTH_SECRET propio. */
const CLAVE = SECRETO || 'desarrollo-local-no-usar-en-produccion';

const b64 = (s: string | Buffer) => Buffer.from(s).toString('base64url');
const deB64 = (s: string) => Buffer.from(s, 'base64url').toString('utf8');

function firmar(datos: string): string {
  return createHmac('sha256', CLAVE).update(datos).digest('base64url');
}

/** Compara sin filtrar información por el tiempo que tarda. */
function igualSeguro(a: string, b: string): boolean {
  const ba = Buffer.from(a), bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

/* --- Contraseñas ---------------------------------------------------------- */

/** Formato guardado: scrypt$<sal hex>$<derivada hex> */
export function hashClave(clave: string): string {
  const sal = randomBytes(16);
  const dk = scryptSync(clave, sal, 64);
  return `scrypt$${sal.toString('hex')}$${dk.toString('hex')}`;
}

export function verificarClave(clave: string, guardado: string): boolean {
  const [algo, salHex, dkHex] = guardado.split('$');
  if (algo !== 'scrypt' || !salHex || !dkHex) return false;
  const dk = scryptSync(clave, Buffer.from(salHex, 'hex'), 64);
  const esperado = Buffer.from(dkHex, 'hex');
  return dk.length === esperado.length && timingSafeEqual(dk, esperado);
}

/* --- Sesión --------------------------------------------------------------- */
export interface Sesion { correo: string; expira: number; }

export function crearToken(correo: string): string {
  const cuerpo = b64(JSON.stringify({
    correo,
    expira: Date.now() + DURACION_H * 3600_000
  }));
  return `${cuerpo}.${firmar(cuerpo)}`;
}

export function leerToken(token: string | undefined): Sesion | null {
  if (!token) return null;
  const [cuerpo, firma] = token.split('.');
  if (!cuerpo || !firma) return null;
  if (!igualSeguro(firma, firmar(cuerpo))) return null;   // alterada
  try {
    const s = JSON.parse(deB64(cuerpo)) as Sesion;
    return s.expira > Date.now() ? s : null;              // vencida
  } catch { return null; }
}

/* --- Ayudas para las rutas ------------------------------------------------ */
export function cookieSesion(token: string): string {
  const seguro = process.env.NODE_ENV === 'production' ? ' Secure;' : '';
  return `${NOMBRE_COOKIE}=${token}; Path=/; HttpOnly;${seguro} SameSite=Lax; Max-Age=${DURACION_H * 3600}`;
}

export function cookieCierre(): string {
  const seguro = process.env.NODE_ENV === 'production' ? ' Secure;' : '';
  return `${NOMBRE_COOKIE}=; Path=/; HttpOnly;${seguro} SameSite=Lax; Max-Age=0`;
}

/** Lee la sesión desde la petición. Devuelve null si no hay o no es válida. */
export function sesionDe(request: Request): Sesion | null {
  const cookies = request.headers.get('cookie') || '';
  const par = cookies.split(';').map(c => c.trim()).find(c => c.startsWith(NOMBRE_COOKIE + '='));
  return leerToken(par?.slice(NOMBRE_COOKIE.length + 1));
}

/** Valida usuario y contraseña contra la base. */
export function autenticar(correo: string, clave: string): boolean {
  const u = buscarUsuario(correo);
  // Se calcula igual aunque el usuario no exista, para no revelar por el
  // tiempo de respuesta si el correo está registrado o no.
  if (!u) { scryptSync(clave, 'sal-ficticia', 64); return false; }
  return verificarClave(clave, u.clave_hash);
}

export { NOMBRE_COOKIE };
