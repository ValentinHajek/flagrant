#!/bin/sh
# Lancé par cron toutes les 2 min sur hungry-morse (via flock) : déploie main quand un nouveau commit arrive.
# Déploiement manuel : deploy/deploy.sh --force
set -eu
cd /root/sites/flagrant-deploy/repo
git fetch -q origin main
if [ "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)" ] && [ "${1:-}" != "--force" ]; then exit 0; fi
git reset -q --hard origin/main
echo "$(date -Is) déploiement de $(git rev-parse --short HEAD)"
docker compose -f deploy/docker-compose.yml up -d --build --remove-orphans
docker image prune -f --filter label=com.docker.compose.project=flagrant >/dev/null # anciennes images de Flagrant seulement
