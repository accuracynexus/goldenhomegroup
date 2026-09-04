// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

/**
 * Golden Home Group — sitio público + panel administrativo.
 *
 * Modo servidor: las fichas de propiedad y el listado se arman en el
 * servidor con los datos de SQLite, así el HTML ya sale completo para los
 * buscadores. Las páginas que no dependen de la base (Nosotros, Vende,
 * Servicios, legales) se marcan `prerender = true` y salen estáticas.
 */
export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),

  site: process.env.SITE_URL || 'https://goldenhomegroup.com',

  server: { port: 4321, host: true },

  build: { format: 'file' },   // /compra.html en vez de /compra/index.html

  vite: {
    build: {
      // node:sqlite y sharp son nativos: no deben empaquetarse
      rollupOptions: { external: ['node:sqlite', 'sharp'] }
    }
  }
});
