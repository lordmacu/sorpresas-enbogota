#!/data/data/com.termux/files/usr/bin/bash
# Activa el calendario del worker de Sorpresas en Termux.
# Es seguro correrlo cuando quieras: el cron queda cargado pero NO publica nada
# hasta que pongas IG_PUBLISH=1 en ~/sorpresas-worker/.env (lo controla cron_run.sh).
set -e
cd "$HOME/sorpresas-worker"

# 1) cron (cronie) si falta
if ! command -v crond >/dev/null; then
  echo "· instalando cronie…"; pkg install -y cronie
fi

# 2) cargar el calendario
crontab sorpresas.cron
echo "✓ crontab cargado:"; crontab -l | grep -vE '^#|^$'

# 3) arrancar crond
if ! pgrep -x crond >/dev/null; then crond; fi
echo "✓ crond corriendo (pid $(pgrep -x crond | head -1))"

# 4) wake-lock para que el celular no suspenda el worker
termux-wake-lock && echo "✓ wake-lock activo"

# 5) arranque automático tras reiniciar (necesita la app Termux:Boot instalada)
mkdir -p "$HOME/.termux/boot"
cat > "$HOME/.termux/boot/start-sorpresas.sh" <<'EOF'
#!/data/data/com.termux/files/usr/bin/bash
termux-wake-lock
crond
EOF
chmod +x "$HOME/.termux/boot/start-sorpresas.sh"
echo "✓ arranque automático creado (instala la app 'Termux:Boot' para que se active solo tras reiniciar el celular)"
echo
echo "Estado del interruptor: IG_PUBLISH=$(grep '^IG_PUBLISH=' .env | cut -d= -f2)"
echo "Para EMPEZAR a publicar de verdad: pon IG_PUBLISH=1 en .env"
