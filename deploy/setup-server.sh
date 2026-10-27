#!/bin/bash
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  echo "Ejecuta este script con sudo en el VPS."
  exit 1
fi

APP_USER="${SUDO_USER:-prueba}"
APP_DIR=/var/www/prueba

apt-get update
apt-get install -y nginx postgresql curl ca-certificates rsync
if ! command -v node >/dev/null 2>&1 || ! node -v | grep -q '^v22\|^v24'; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi

id -u prueba >/dev/null 2>&1 || useradd --create-home --shell /bin/bash prueba
sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname = 'prueba'" | grep -q 1 || sudo -u postgres psql -c "CREATE USER prueba WITH PASSWORD 'prueba';"
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname = 'prueba'" | grep -q 1 || sudo -u postgres psql -c "CREATE DATABASE prueba OWNER prueba;"

install -d -o "$APP_USER" -g "$APP_USER" "$APP_DIR"
if [ ! -f "$APP_DIR/backend/.env" ]; then
  install -d -o "$APP_USER" -g "$APP_USER" "$APP_DIR/backend"
  cat > "$APP_DIR/backend/.env" <<'EOF'
APP_MODE=production
NODE_ENV=production
PORT=3000
PGHOST=localhost
PGPORT=5432
PGUSER=prueba
PGPASSWORD=prueba
PGDATABASE=prueba
EOF
  chown "$APP_USER:$APP_USER" "$APP_DIR/backend/.env"
fi

if [ -f /etc/letsencrypt/live/prueba.chat-live-support.com/fullchain.pem ] && [ -f "$APP_DIR/deploy/nginx/prueba.conf" ]; then
  cp "$APP_DIR/deploy/nginx/prueba.conf" /etc/nginx/sites-available/prueba
elif [ -f "$APP_DIR/deploy/nginx/prueba.http.conf" ]; then
  cp "$APP_DIR/deploy/nginx/prueba.http.conf" /etc/nginx/sites-available/prueba
fi
if [ -f /etc/nginx/sites-available/prueba ]; then
  ln -sfn /etc/nginx/sites-available/prueba /etc/nginx/sites-enabled/prueba
  rm -f /etc/nginx/sites-enabled/default
fi
if [ -f "$APP_DIR/deploy/systemd/prueba-api.service" ]; then
  cp "$APP_DIR/deploy/systemd/prueba-api.service" /etc/systemd/system/prueba-api.service
  systemctl daemon-reload
  systemctl enable prueba-api
fi

cat > /etc/sudoers.d/prueba-deploy <<'EOF'
prueba ALL=(root) NOPASSWD: /usr/bin/systemctl restart prueba-api, /usr/bin/systemctl reload nginx, /usr/sbin/nginx -t, /usr/bin/cp /var/www/prueba/deploy/nginx/prueba.conf /etc/nginx/sites-available/prueba, /usr/bin/ln -sfn /etc/nginx/sites-available/prueba /etc/nginx/sites-enabled/prueba
EOF
chmod 440 /etc/sudoers.d/prueba-deploy

nginx -t
systemctl reload nginx
echo "Servidor listo. El deploy de GitHub publica en ${APP_DIR}."
