import type { APIRoute } from 'astro';
import { readFile, stat } from 'node:fs/promises';
import { resolve, basename, extname } from 'node:path';

export const prerender = false;

const DIR = process.env.UPLOADS_DIR || './uploads';

const TIPOS: Record<string, string> = {
  '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.png': 'image/png', '.avif': 'image/avif'
};

/* Sirve las fotos subidas desde el disco del servidor.

   La carpeta vive FUERA de dist/ a propósito: así las imágenes sobreviven a
   cada nueva compilación y despliegue. */
export const GET: APIRoute = async ({ params }) => {
  // basename descarta cualquier "../": sin esto se podría pedir un archivo
  // de otra carpeta del servidor a través de la URL.
  const pedido = basename(String(params.file || ''));
  if (!pedido) return new Response('No encontrado', { status: 404 });

  const ext = extname(pedido).toLowerCase();
  if (!TIPOS[ext]) return new Response('No encontrado', { status: 404 });

  const ruta = resolve(DIR, pedido);
  try {
    const info = await stat(ruta);
    if (!info.isFile()) return new Response('No encontrado', { status: 404 });

    return new Response(await readFile(ruta), {
      headers: {
        'Content-Type': TIPOS[ext],
        // El nombre lleva marca de tiempo y azar: nunca se reutiliza,
        // así que se puede cachear sin miedo.
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Length': String(info.size)
      }
    });
  } catch {
    return new Response('No encontrado', { status: 404 });
  }
};
