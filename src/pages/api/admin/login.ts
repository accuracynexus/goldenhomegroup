import type { APIRoute } from 'astro';
import { autenticar, crearToken, cookieSesion, cookieCierre } from '../../../lib/auth';

export const prerender = false;

/* Retardo fijo ante credenciales incorrectas: encarece probar contraseñas
   a lo bruto sin castigar al usuario legítimo. */
const espera = (ms: number) => new Promise(r => setTimeout(r, ms));

export const POST: APIRoute = async ({ request }) => {
  let correo = '', clave = '';
  try {
    const body = await request.json();
    correo = String(body.correo || '').trim();
    clave = String(body.clave || '');
  } catch {
    return new Response(JSON.stringify({ error: 'Petición inválida.' }), { status: 400 });
  }

  if (!correo || !clave) {
    return new Response(JSON.stringify({ error: 'Ingresa tu correo y contraseña.' }), { status: 400 });
  }

  if (!autenticar(correo, clave)) {
    await espera(600);
    // Mensaje único: no revela si el correo existe o si falló la contraseña
    return new Response(JSON.stringify({ error: 'Usuario o contraseña incorrectos.' }), { status: 401 });
  }

  return new Response(JSON.stringify({ ok: true, correo }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Set-Cookie': cookieSesion(crearToken(correo)) }
  });
};

export const DELETE: APIRoute = async () =>
  new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Set-Cookie': cookieCierre() }
  });
