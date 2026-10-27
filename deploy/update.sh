#!/bin/bash
set -euo pipefail

log() {
  printf '[deploy] %s\n' "$1" >&2
}

log "Inicio de update.sh"

if ! id prueba >/dev/null 2>&1; then
  log "Creando el usuario prueba"
  sudo useradd --create-home --shell /bin/bash prueba
else
  log "El usuario prueba ya existe"
fi

log "Comprobando directorios"
sudo mkdir -p /var/www/prueba/backend /var/www/prueba/frontend /var/www/prueba/deploy

if ! command -v node >/dev/null 2>&1 || ! node -v | grep -Eq '^v(22|24)\.'; then
  log "Instalando Node 22"
  sudo apt-get update
  sudo apt-get install -y curl ca-certificates
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo bash -
  sudo apt-get install -y nodejs
else
  log "Node ya está instalado: $(node -v)"
fi

cd /var/www/prueba
log "Instalando dependencias del backend"
npm ci --omit=dev --prefix backend
if [ -f frontend/dist/index.html ]; then
  log "El frontend ya viene compilado"
else
  log "Compilando frontend en el servidor"
  npm ci --prefix frontend
  npm run build --prefix frontend
fi

if [ -f /etc/letsencrypt/live/prueba.chat-live-support.com/fullchain.pem ]; then
  log "Copiando nginx con HTTPS"
  sudo cp /var/www/prueba/deploy/nginx/prueba.conf /etc/nginx/sites-available/prueba
else
  log "Copiando nginx sin certificado"
  sudo cp /var/www/prueba/deploy/nginx/prueba.http.conf /etc/nginx/sites-available/prueba
fi
sudo ln -sfn /etc/nginx/sites-available/prueba /etc/nginx/sites-enabled/prueba
sudo rm -f /etc/nginx/sites-enabled/default

log "Actualizando el servicio prueba-api"
sudo cp /var/www/prueba/deploy/systemd/prueba-api.service /etc/systemd/system/prueba-api.service
sudo systemctl daemon-reload
sudo systemctl enable prueba-api

log "Comprobando nginx"
sudo nginx -t
log "Reiniciando la API"
sudo systemctl restart prueba-api
log "Recargando nginx"
sudo systemctl reload nginx
log "update.sh terminó"
