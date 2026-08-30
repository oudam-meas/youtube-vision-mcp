#!/data/data/com.termux/files/usr/bin/bash
#
# status.sh — check status of all youtube-vision-mcp processes
#
# Run with:
#   bash ~/programs/youtube-vision-mcp/status.sh

DIR="$HOME/programs/youtube-vision-mcp"

echo "== MCP Server =="
if [ -f "$DIR/server.pid" ]; then
    PID=$(cat "$DIR/server.pid")
    if kill -0 "$PID" 2>/dev/null; then
        echo "  RUNNING (pid $PID)"
    else
        echo "  DEAD (pid $PID no longer exists)"
    fi
else
    echo "  NOT STARTED (no server.pid found)"
fi

echo ""
echo "== Cloudflared Tunnel =="
if [ -f "$DIR/tunnel.pid" ]; then
    PID=$(cat "$DIR/tunnel.pid")
    if kill -0 "$PID" 2>/dev/null; then
        echo "  RUNNING (pid $PID)"
        echo "  URL:"
        grep -o 'https://.*trycloudflare.com' "$DIR/tunnel.log" 2>/dev/null \
            | tail -1 \
            | sed 's/^/    /' \
            || echo "    (URL not yet printed — check tunnel.log)"
    else
        echo "  DEAD (pid $PID no longer exists)"
    fi
else
    echo "  NOT STARTED (no tunnel.pid found)"
fi

echo ""
echo "== Wake Lock =="
if termux-wake-lock 2>/dev/null; then
    echo "  ACTIVE"
else
    echo "  NOT ACTIVE — run: termux-wake-lock"
fi

echo ""
echo "== Logs =="
echo "  MCP server : tail -f $DIR/server.log"
echo "  Tunnel     : tail -f $DIR/tunnel.log"

