#!/bin/sh
set -e

echo "[entrypoint] Running database migrations..."
python manage.py migrate --no-input

echo "[entrypoint] Collecting static files..."
python manage.py collectstatic --no-input --clear

echo "[entrypoint] Starting gunicorn on 0.0.0.0:${PORT:-8000}..."
exec gunicorn qls.wsgi:application \
  --bind "0.0.0.0:${PORT:-8000}" \
  --workers 2 \
  --threads 4 \
  --timeout 120 \
  --access-logfile - \
  --error-logfile -
