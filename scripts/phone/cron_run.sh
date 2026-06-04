#!/data/data/com.termux/files/usr/bin/bash
# Wrapper de cron para el worker de Sorpresas.
# Corre el job SOLO si IG_PUBLISH=1. Con el interruptor apagado no genera ni
# publica nada (no gasta cuota de MiniMax). Todo queda logueado.
export PATH=/data/data/com.termux/files/usr/bin:/data/data/com.termux/files/usr/bin/applets:$PATH
export PREFIX=/data/data/com.termux/files/usr
cd "$HOME/sorpresas-worker" || exit 1
mkdir -p logs
ts="$(date '+%F %T')"

# Lock por job: evita que el mismo script se solape consigo mismo (cada job tiene
# su propio lock, así jobs distintos no se bloquean entre sí). El lock se libera
# solo al terminar (se cierra el fd 9).
job="$(basename -- "${1:-job}" .py)"
exec 9>"logs/.lock-$job" 2>/dev/null
if command -v flock >/dev/null && ! flock -n 9; then
  echo "$ts  [busy] $* ya está corriendo, salto" >> logs/cron.log
  exit 0
fi

# Jobs de solo-lectura (analítica/salud/email): corren aunque IG_PUBLISH=0,
# porque no publican ni gastan cuota — así sigues recibiendo stats y alertas.
case "$job" in
  report|shadowban_check|health_check|daily_stats|mentions|best_time|data_content|leads) ro=1 ;;
  *) ro=0 ;;
esac
if [ "$ro" = 0 ] && ! grep -q '^IG_PUBLISH=1' .env; then
  echo "$ts  [skip] IG_PUBLISH off — $*" >> logs/cron.log
  exit 0
fi
echo "$ts  [run]  $*" >> logs/cron.log
python3 "$@" >> logs/cron.log 2>&1
echo "$(date '+%F %T')  [done] $* (exit $?)" >> logs/cron.log
