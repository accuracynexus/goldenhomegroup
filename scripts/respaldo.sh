#!/bin/sh
# ============================================================================
# Copia de seguridad de la base y las fotografías.
#
# Uso:      sh scripts/respaldo.sh
# Diario:   crontab -e   y agregar:
#           0 3 * * * cd /ruta/al/proyecto && sh scripts/respaldo.sh >> respaldos/registro.log 2>&1
# ============================================================================
set -e

DESTINO="${DESTINO:-./respaldos}"
DB="${DB_PATH:-./data/golden.db}"
FOTOS="${UPLOADS_DIR:-./uploads}"
CONSERVAR_DIAS="${CONSERVAR_DIAS:-30}"
SELLO=$(date +%Y%m%d-%H%M%S)

mkdir -p "$DESTINO"

# .backup de SQLite copia de forma consistente aunque haya escrituras en
# curso: copiar el archivo con `cp` podría dejarlo a medias.
if [ -f "$DB" ]; then
  if command -v sqlite3 >/dev/null 2>&1; then
    sqlite3 "$DB" ".backup '$DESTINO/golden-$SELLO.db'"
  else
    # Sin sqlite3 instalado, el propio Node lo hace igual de bien
    node -e "
      const {DatabaseSync}=require('node:sqlite');
      const db=new DatabaseSync(process.argv[1], {readOnly:true});
      db.exec(\"VACUUM INTO '\" + process.argv[2] + \"'\");
      db.close();
    " "$DB" "$DESTINO/golden-$SELLO.db"
  fi
  echo "$(date '+%F %T')  base respaldada: golden-$SELLO.db"
else
  echo "$(date '+%F %T')  aviso: no se encontró la base en $DB"
fi

# Las fotos: se comprimen enteras (suelen ser pocos MB en WebP)
if [ -d "$FOTOS" ] && [ -n "$(ls -A "$FOTOS" 2>/dev/null)" ]; then
  tar -czf "$DESTINO/fotos-$SELLO.tar.gz" -C "$(dirname "$FOTOS")" "$(basename "$FOTOS")"
  echo "$(date '+%F %T')  fotos respaldadas: fotos-$SELLO.tar.gz"
fi

# Se borran las copias más viejas que el plazo indicado
find "$DESTINO" -name 'golden-*.db' -mtime "+$CONSERVAR_DIAS" -delete 2>/dev/null || true
find "$DESTINO" -name 'fotos-*.tar.gz' -mtime "+$CONSERVAR_DIAS" -delete 2>/dev/null || true

echo "$(date '+%F %T')  listo. Copias guardadas en $DESTINO (se conservan $CONSERVAR_DIAS días)"
