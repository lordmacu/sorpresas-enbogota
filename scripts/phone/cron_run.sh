#!/data/data/com.termux/files/usr/bin/bash
# Wrapper de cron para el worker de Sorpresas.
# Corre el job SOLO si IG_PUBLISH=1. Con el interruptor apagado no genera ni
# publica nada (no gasta cuota de MiniMax). Todo queda logueado.
export PATH=/data/data/com.termux/files/usr/bin:/data/data/com.termux/files/usr/bin/applets:$PATH
export PREFIX=/data/data/com.termux/files/usr
cd "$HOME/sorpresas-worker" || exit 1
mkdir -p logs
ts="$(date '+%F %T')"
if ! grep -q '^IG_PUBLISH=1' .env; then
  echo "$ts  [skip] IG_PUBLISH off — $*" >> logs/cron.log
  exit 0
fi
echo "$ts  [run]  $*" >> logs/cron.log
python3 "$@" >> logs/cron.log 2>&1
echo "$(date '+%F %T')  [done] $* (exit $?)" >> logs/cron.log
