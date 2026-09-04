# Golden Home Group

Sitio web e intranet de la inmobiliaria. Astro con renderizado en servidor,
base SQLite y despliegue en un VPS con Docker.

## Cómo está armado

| Capa | Qué usa |
|---|---|
| Páginas | Astro 7, componentes `.astro`, sin React ni Vue |
| Estilos | CSS plano: `src/styles/global.css` + estilos por componente |
| Servidor | Node standalone (`@astrojs/node`), puerto 4321 |
| Base | SQLite (`node:sqlite`), archivo en `data/golden.db` |
| Sesiones | Cookie firmada con HMAC-SHA256, 8 horas |
| Fotos | Se suben a `uploads/`, convertidas a WebP con sharp |
| Despliegue | Docker Compose: la app + Caddy (HTTPS automático) |

Tres dependencias: `astro`, `@astrojs/node` y `sharp`.

### Qué se arma en el servidor y qué es estático

Las páginas que dependen de la base se arman en cada visita, para que el
contenido salga ya dentro del HTML y los buscadores lo lean:

- `/` · `/compra` · `/resultados` · `/propiedad` · `/admin`

Las que no cambian se generan una sola vez al compilar:

- `/nosotros` · `/vende` · `/servicios` · `/agente` · `/contacto` · `/privacidad` · `/terminos`

## Trabajar en local

```bash
npm install
npm run db:seed     # crea la base y el usuario del panel (solo la 1ª vez)
npm run dev         # http://localhost:4321
```

El panel está en `/admin`. Si no indicas contraseña, `db:seed` genera una al
azar y la muestra una única vez por consola:

```bash
ADMIN_EMAIL=admin@goldenhomegroup.com ADMIN_PASSWORD='tu-clave' npm run db:seed
```

## Estructura

```
src/
  pages/            una página por archivo; las de /api son el backend
    api/admin/      login, propiedades y subida de fotos
  components/       piezas reutilizables (tarjeta, buscador, formulario…)
  layouts/Base      cabeza del documento, cabecera y pie
  lib/
    db.ts           TODO el acceso a datos (cambiar de motor = tocar solo esto)
    auth.ts         sesiones y contraseñas
    config.ts       teléfonos, correos, redes, textos de marca
    contenido.ts    listas de textos que recorren las páginas
    iconos.ts       los SVG del sitio
public/             se sirve tal cual: imágenes y los JS del navegador
scripts/
  seed.mjs          carga inicial de la base
  respaldo.sh       copia de seguridad
data/               la base (no va al repositorio)
uploads/            fotos subidas desde el panel (no van al repositorio)
_legacy/            el sitio anterior, guardado como referencia
```

## Publicar en el servidor

Requisitos: Docker y Docker Compose en el VPS, y el dominio apuntando a su IP.

```bash
cp .env.example .env
openssl rand -hex 32      # pegar el resultado en AUTH_SECRET
nano .env                 # completar AUTH_SECRET y DOMINIO

docker compose up -d --build
docker compose exec web node scripts/seed.mjs   # solo la primera vez
```

Caddy pide el certificado HTTPS solo; no hay que configurar nada más.

**Actualizar:**

```bash
git pull && docker compose up -d --build
```

La base y las fotos viven en `./data` y `./uploads`, montados como volúmenes:
sobreviven a cada nueva versión.

## Copias de seguridad

```bash
sh scripts/respaldo.sh
```

Deja una copia de la base y un comprimido de las fotos en `respaldos/`, y
borra las de más de 30 días. Para que corra sola cada madrugada:

```bash
crontab -e
0 3 * * * cd /ruta/al/proyecto && sh scripts/respaldo.sh >> respaldos/registro.log 2>&1
```

Guarda una copia **fuera del servidor**: si se pierde el VPS, se pierden los
respaldos que estén solo en él.

## Cosas que conviene saber

- **`node:sqlite` es experimental.** Funciona bien, pero su API podría cambiar
  entre versiones de Node. Si algún día conviene fijarlo, se reemplaza por
  `better-sqlite3` tocando solo `src/lib/db.ts`.
- **`AUTH_SECRET` es obligatorio en producción**: sin él la app no arranca, a
  propósito. Si se cambia, se cierran todas las sesiones abiertas.
- **Las fotos de propiedades** se convierten a WebP al subirlas (máx. 2400 px,
  calidad 80). El original no se guarda.
- **Los datos del cliente** (teléfono, correo, redes) están en
  `src/lib/config.ts` y también en la copia embebida de `public/js/sitio.js`:
  si cambia alguno, actualizar los dos.
