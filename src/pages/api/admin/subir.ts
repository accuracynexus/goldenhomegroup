import type { APIRoute } from 'astro';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { sesionDe } from '../../../lib/auth';

export const prerender = false;

const DIR = process.env.UPLOADS_DIR || './uploads';
const MAX_BYTES = 12 * 1024 * 1024;          // 12 MB por archivo
const MAX_LADO = 2400;                        // px del lado mayor
const TIPOS_OK = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/heic']);

const json = (d: unknown, s = 200) =>
  new Response(JSON.stringify(d), { status: s, headers: { 'Content-Type': 'application/json' } });

export const POST: APIRoute = async ({ request }) => {
  if (!sesionDe(request)) return json({ error: 'Sesión expirada.' }, 401);

  let form: FormData;
  try { form = await request.formData(); }
  catch { return json({ error: 'Petición inválida.' }, 400); }

  const archivos = form.getAll('fotos').filter(f => f instanceof File) as File[];
  if (!archivos.length) return json({ error: 'No llegó ninguna imagen.' }, 400);

  await mkdir(resolve(DIR), { recursive: true });

  const subidas: string[] = [];
  const errores: string[] = [];

  for (const archivo of archivos) {
    try {
      if (archivo.size > MAX_BYTES) { errores.push(`${archivo.name}: supera los 12 MB`); continue; }
      // El tipo declarado no basta: sharp falla abajo si el contenido no es
      // una imagen real, y ese fallo es la validación de verdad.
      if (archivo.type && !TIPOS_OK.has(archivo.type)) {
        errores.push(`${archivo.name}: formato no admitido`); continue;
      }

      const entrada = Buffer.from(await archivo.arrayBuffer());

      /* Todo se guarda en WebP: pesa mucho menos que un JPG de cámara y lo
         entienden todos los navegadores actuales. Se reduce solo si excede
         el lado máximo, nunca se amplía. */
      const salida = await sharp(entrada)
        .rotate()                                            // respeta la orientación EXIF
        .resize({ width: MAX_LADO, height: MAX_LADO, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();

      const nombre = `${Date.now()}-${randomUUID().slice(0, 8)}.webp`;
      await writeFile(resolve(DIR, nombre), salida);
      subidas.push(`/uploads/${nombre}`);
    } catch {
      errores.push(`${archivo.name}: no se pudo procesar (¿está dañada?)`);
    }
  }

  if (!subidas.length) return json({ error: errores.join(' · ') || 'No se pudo subir.' }, 400);
  return json({ fotos: subidas, errores });
};
