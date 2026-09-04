import type { APIRoute } from 'astro';
import { sesionDe } from '../../../lib/auth';
import { listarTodas, obtener, crear, actualizar, eliminar } from '../../../lib/db';

export const prerender = false;

const json = (datos: unknown, status = 200) =>
  new Response(JSON.stringify(datos), { status, headers: { 'Content-Type': 'application/json' } });

/* Toda operación exige sesión válida: la comprobación vive en el servidor,
   así que da igual lo que el navegador diga tener. */
function exigirSesion(request: Request) {
  return sesionDe(request) ? null : json({ error: 'Sesión expirada.' }, 401);
}

/** Campos que el panel puede escribir. Cualquier otro que llegue se ignora,
    para que nadie pueda inyectar columnas por la API. */
const PERMITIDOS = new Set([
  'titulo', 'subtipo', 'tipo', 'operacion', 'estado', 'precio', 'moneda', 'precio_m2',
  'direccion', 'ubicacion', 'distrito', 'region', 'referencia', 'mapa', 'area', 'area_construida',
  'frontis', 'parametros_construccion', 'linderos', 'habitaciones', 'banos',
  'estacionamientos', 'piso', 'niveles', 'descripcion', 'caracteristicas',
  'documentacion', 'fotos', 'portada', 'destacada', 'visible'
]);

const NUMERICOS = new Set(['precio', 'precio_m2', 'area', 'area_construida',
  'habitaciones', 'banos', 'estacionamientos', 'piso', 'niveles']);

function limpiar(body: Record<string, any>) {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(body)) {
    if (!PERMITIDOS.has(k)) continue;
    if (NUMERICOS.has(k)) out[k] = v === '' || v === null || v === undefined ? null : Number(v);
    else out[k] = v;
  }
  return out;
}

export const GET: APIRoute = async ({ request }) => {
  const no = exigirSesion(request); if (no) return no;
  return json(listarTodas());
};

export const POST: APIRoute = async ({ request }) => {
  const no = exigirSesion(request); if (no) return no;
  try {
    const body = await request.json();
    const datos = limpiar(body);
    if (!datos.titulo) return json({ error: 'El título es obligatorio.' }, 400);
    if (!datos.tipo) return json({ error: 'El tipo de propiedad es obligatorio.' }, 400);
    return json(crear(datos), 201);
  } catch (e: any) {
    return json({ error: e.message || 'No se pudo crear la propiedad.' }, 400);
  }
};

export const PATCH: APIRoute = async ({ request, url }) => {
  const no = exigirSesion(request); if (no) return no;
  const id = url.searchParams.get('id');
  if (!id) return json({ error: 'Falta el id.' }, 400);
  if (!obtener(id, true)) return json({ error: 'No existe esa propiedad.' }, 404);
  try {
    return json(actualizar(id, limpiar(await request.json())));
  } catch (e: any) {
    return json({ error: e.message || 'No se pudo guardar.' }, 400);
  }
};

export const DELETE: APIRoute = async ({ request, url }) => {
  const no = exigirSesion(request); if (no) return no;
  const id = url.searchParams.get('id');
  if (!id) return json({ error: 'Falta el id.' }, 400);
  return eliminar(id) ? json({ ok: true }) : json({ error: 'No existe esa propiedad.' }, 404);
};
