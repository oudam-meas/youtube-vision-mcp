#!/data/data/com.termux/files/usr/bin/bash
#
# stop.sh — gracefully stop all youtube-vision-mcp processes
#
# Run with:
#   bash ~/programs/youtube-vision-mcp/stop.sh

DIR="$HOME/programs/youtube-vision-mcp"

echo "== Stopping MCP Server =="
if [ -f "$DIR/server.pid" ]; then
    PID=$(cat "$DIR/server.pid")
    if kill -0 "$PID" 2>/dev/null; then
        kill "$PID"
        echo "  Stopped (pid $PID)"
    else
        echo "  Already stopped"
    fi
    rm -f "$DIR/server.pid"
else
    echo "  No server.pid found — nothing to stop"
fi

echo ""
echo "== Stopping Cloudflared Tunnel =="
if [ -f "$DIR/tunnel.pid" ]; then
    PID=$(cat "$DIR/tunnel.pid")
    if kill -0 "$PID" 2>/dev/null; then
        kill "$PID"
        echo "  Stopped (pid $PID)"
    else
        echo "  Already stopped"
    fi
    rm -f "$DIR/tunnel.pid"
else
    echo "  No tunnel.pid found — nothing to stop"
fi

echo ""
echo "== Releasing Wake Lock =="
termux-wake-unlock 2>/dev/null && echo "  Released" || echo "  Could not release (may not have been held)"

echo ""
echo "Done. Run start.sh to restart everything."

