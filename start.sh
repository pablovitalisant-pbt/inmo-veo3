#!/usr/bin/env bash
set -euo pipefail

echo "[start] Python: $(python -V) at $(which python)"

# Verifica que 'python-multipart' esté importable en RUNTIME
if python - <<'PYCODE'
import sys
try:
    import multipart  # paquete de 'python-multipart'
    print("RUNTIME: multipart import OK")
    sys.exit(0)
except Exception as e:
    print("RUNTIME: multipart import FAIL:", e)
    sys.exit(1)
PYCODE
then
  echo "[start] python-multipart presente ✅"
else
  echo "[start] Instalando python-multipart en runtime…"
  python -m pip install --no-cache-dir python-multipart
fi

# Arranca la app
exec gunicorn -w 1 -k uvicorn.workers.UvicornWorker src.app.api:app --bind 0.0.0.0:${PORT:-8080}
