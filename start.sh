#!/data/data/com.termux/files/usr/bin/bash
cd ~/programs/youtube-vision-mcp

# Wake lock to stop Android killing processes
termux-wake-lock
echo "Wake lock acquired"

# Start MCP server in background
nohup python server.py > server.log 2>&1 &
echo $! > server.pid
echo "MCP server started (pid $(cat server.pid))"

# Start cloudflared tunnel in background
nohup cloudflared tunnel --url http://localhost:8000 > tunnel.log 2>&1 &
echo $! > tunnel.pid
echo "Tunnel started (pid $(cat tunnel.pid))"

# Wait for tunnel URL to appear in log
echo "Waiting for tunnel URL..."
sleep 5
grep -o 'https://.*trycloudflare.com' tunnel.log || echo "URL not ready yet — run: grep https tunnel.log"
