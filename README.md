# youtube-vision-mcp

An MCP server that lets Claude watch YouTube videos using Gemini's native
video understanding — extracting diagrams, summaries, and timestamped
insights that transcript-only tools miss.

Runs entirely on your Android phone via Termux + Cloudflare tunnel.

---

## First-time setup

### 1. Install Termux
Download from **F-Droid** (not the Play Store — that version is outdated).
https://f-droid.org

### 2. Grant storage access
```bash
termux-setup-storage
```

### 3. Run host setup (fixes Rust/native build errors)
```bash
bash host-setup.sh
```

### 4. Copy project files into place
```bash
cp ~/storage/downloads/server.py \
   ~/storage/downloads/requirements.txt \
   ~/storage/downloads/start.sh \
   ~/storage/downloads/status.sh \
   ~/storage/downloads/stop.sh \
   ~/programs/youtube-vision-mcp/
```

### 5. Make scripts executable
```bash
chmod +x ~/programs/youtube-vision-mcp/*.sh
```

### 6. Install Python dependencies
```bash
cd ~/programs/youtube-vision-mcp
pip install -r requirements.txt
```

### 7. Save your Gemini API key
Get a key from https://aistudio.google.com/apikey then:
```bash
mkdir -p ~/.config/youtube-vision-mcp
echo "GEMINI_API_KEY=your-actual-key-here" > ~/.config/youtube-vision-mcp/.env
chmod 600 ~/.config/youtube-vision-mcp/.env
```

Verify it saved:
```bash
cat ~/.config/youtube-vision-mcp/.env
```

---

## Daily use

### Start everything
```bash
bash ~/programs/youtube-vision-mcp/start.sh
```

### Check status + get tunnel URL
```bash
bash ~/programs/youtube-vision-mcp/status.sh
```

### Stop everything
```bash
bash ~/programs/youtube-vision-mcp/stop.sh
```

---

## Register with Claude

After running start.sh, get the tunnel URL:
```bash
grep https ~/programs/youtube-vision-mcp/tunnel.log
```

Then in your browser:
1. Go to **claude.ai → Settings → Connectors → Add Custom Connector**
2. Paste the `https://xxxx.trycloudflare.com` URL
3. Save

> **Note:** The tunnel URL changes every time you restart. Update the
> connector URL in Claude settings after each start.sh run.

---

## Logs

### Watch MCP server logs live
```bash
tail -f ~/programs/youtube-vision-mcp/server.log
```

### Watch tunnel logs live
```bash
tail -f ~/programs/youtube-vision-mcp/tunnel.log
```

### Check last 20 lines of each log
```bash
tail -20 ~/programs/youtube-vision-mcp/server.log
tail -20 ~/programs/youtube-vision-mcp/tunnel.log
```

---

## Troubleshooting

### MCP server won't start — missing module
```bash
cd ~/programs/youtube-vision-mcp
pip install -r requirements.txt
python -c "from mcp.server.mcpserver import MCPServer; print('ok')"
```

### google-genai import fails
```bash
python -m pip install google-genai
python -c "from google import genai; print('ok')"
```

### pydantic-core / cryptography Rust build error
```bash
pkg install -y python-pydantic-core python-cryptography
pip install -r requirements.txt
```

### If Termux prebuilts not available, install Rust instead
```bash
pkg install -y rust clang make
pip install -r requirements.txt
```

### Tunnel URL not showing in status
```bash
grep https ~/programs/youtube-vision-mcp/tunnel.log
```

### Kill everything manually if stop.sh fails
```bash
pkill -f "python server.py"
pkill -f cloudflared
```

### Android killed processes overnight
Disable battery optimization for Termux:
Android Settings → Apps → Termux → Battery → Unrestricted

Then restart:
```bash
bash ~/programs/youtube-vision-mcp/start.sh
```

---

## Project files

| File | Purpose |
|------|---------|
| server.py | MCP server — wraps Gemini API video tools |
| requirements.txt | Python dependencies |
| host-setup.sh | One-time host/environment setup |
| start.sh | Start server + tunnel + wake lock |
| status.sh | Check running status + print tunnel URL |
| stop.sh | Stop all processes + release wake lock |
| ~/.config/youtube-vision-mcp/.env | Gemini API key (never commit this) |

---

## MCP tools exposed

| Tool | What it does |
|------|-------------|
| summarize_video(youtube_url) | Full summary + timestamped outline + key takeaways |
| extract_diagrams(youtube_url) | Finds all diagrams/slides, describes them, outputs Mermaid code |
| ask_about_timestamp(youtube_url, timestamp, question) | Targeted question about a specific moment |

---

## Example Claude prompts

```
Use youtube-vision-gap-filler to extract diagrams from https://youtu.be/MrD9tCNpOvU
```

```
Use youtube-vision-gap-filler to summarize https://youtu.be/MrD9tCNpOvU
```

```
Use youtube-vision-gap-filler to ask about timestamp 12:45 in https://youtu.be/MrD9tCNpOvU — what diagram is shown at that point?
```

