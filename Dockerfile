# ============================================================================
# Golden Home Group — imagen del sitio (Astro SSR + SQLite)
#
# Dos etapas: la primera compila con todas las dependencias, la segunda se
# queda solo con lo necesario para correr. La imagen final no lleva el
# código fuente ni las herramientas de compilación.
# ============================================================================

# --- Etapa 1: compilar -------------------------------------------------------
FROM node:24-slim AS build
WORKDIR /app

# Solo los manifiestos primero: si no cambian, Docker reutiliza la capa de
# dependencias y la compilación siguiente es mucho más rápida.
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build


# --- Etapa 2: ejecutar -------------------------------------------------------
FROM node:24-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=4321 \
    DB_PATH=/app/data/golden.db \
    UPLOADS_DIR=/app/uploads

# Solo las dependencias de producción (sharp incluido, que es nativo)
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist
COPY scripts ./scripts

# Los datos y las fotos viven en volúmenes: sobreviven a cada nueva versión
RUN mkdir -p /app/data /app/uploads && chown -R node:node /app

# No correr como root: si algún día se escapa algo, que sea con permisos mínimos
USER node

EXPOSE 4321

# Comprueba que el servidor responde de verdad, no solo que el proceso vive
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:4321/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "./dist/server/entry.mjs"]
