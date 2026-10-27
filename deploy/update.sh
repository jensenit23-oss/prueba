#!/bin/bash
set -euo pipefail

if ! id prueba >/dev/null 2>&1; then
  sudo useradd --create-home --shell /bin/bash prueba
fi

sudo mkdir -p /var/www/prueba/backend /var/www/prueba/frontend /var/www/prueba/deploy

if ! command -v node >/dev/null 2>&1 || ! node -v | grep -Eq '^v(22|24)\.'; then
  sudo apt-get update
  sudo apt-get install -y curl ca-certificates
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo bash -
  sudo apt-get install -y nodejs
fi

cd /var/www/prueba
npm ci --omit=dev --prefix backend
npm ci --prefix frontend
npm run build --prefix frontend

if [ -f /etc/letsencrypt/live/prueba.lumenaaccess.com/fullchain.pem ]; then
  sudo cp /var/www/prueba/deploy/nginx/prueba.conf /etc/nginx/sites-available/prueba
else
  sudo cp /var/www/prueba/deploy/nginx/prueba.http.conf /etc/nginx/sites-available/prueba
fi
sudo ln -sfn /etc/nginx/sites-available/prueba /etc/nginx/sites-enabled/prueba
sudo rm -f /etc/nginx/sites-enabled/default

sudo cp /var/www/prueba/deploy/systemd/prueba-api.service /etc/systemd/system/prueba-api.service
sudo systemctl daemon-reload
sudo systemctl enable prueba-api

sudo nginx -t
sudo systemctl restart prueba-api
sudo systemctl reload nginx
