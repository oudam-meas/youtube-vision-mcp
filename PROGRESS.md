# youtube-vision-mcp — Handoff Note

## What this project is

An MCP server that fills the "visual gap" in YouTube analysis. It exposes
three tools to Claude (or any MCP client) that call Google AI Studio's
Gemini API, which can natively watch a YouTube video (audio + sampled
frames) and extract diagrams, summaries, and timestamped insights that
transcript-only tools miss.

## Current state — working as of 2026-08-30

- MCP server runs on Android via Termux
- Transport: `streamable-http` on `0.0.0.0:8000`
- Endpoint: `/mcp`
- Exposed via Cloudflare quick tunnel (`trycloudflare.com`)
- Registered as a Custom Connector in claude.ai
- Gemini API key stored securely at `~/.config/youtube-vision-mcp/.env`

## Project structure

```
~/programs/youtube-vision-mcp/
├── server.py          # MCP server — wraps Gemini API video tools
├── requirements.txt   # Python dependencies
├── start.sh           # Start server + tunnel + wake lock
├── status.sh          # Check running status + print tunnel URL
├── stop.sh            # Stop all processes + release wake lock
└── README.md          # Full documentation with copy-paste commands
```

Gemini API key lives outside the project at:
```
~/.config/youtube-vision-mcp/.env   (chmod 600)
```

## MCP tools exposed

| Tool | What it does |
|------|-------------|
| `summarize_video(youtube_url)` | Full summary + timestamped outline + key takeaways |
| `extract_diagrams(youtube_url)` | Finds all diagrams/slides, describes them, outputs Mermaid |
| `ask_about_timestamp(youtube_url, timestamp, question)` | Targeted question about a specific moment |

## Known pain points / lessons learned

- `mcp` v2.x renamed `FastMCP` → use `from mcp.server.mcpserver import MCPServer as FastMCP`
- `requirements.txt` must be pinned to `mcp[cli]>=1.2.0,<2`
- `pydantic-core` and `cryptography` fail to compile from source on Termux
  (Android aarch64 target not supported by rustup) — fix: `pkg install -y python-pydantic-core python-cryptography` BEFORE running `pip install -r requirements.txt`
- SSE transport (deprecated in MCP spec) causes 405 errors — stick with `streamable-http`
- Cloudflare quick tunnel URL changes on every restart — see Next Tasks below

---

## Next tasks

### 1. Static domain name (priority: high)
The Cloudflare quick tunnel (`trycloudflare.com`) generates a new random
URL on every restart. This means manually updating the Claude connector
URL every time the server restarts — fragile and annoying.

**Goal:** A fixed `https://mcp.yourdomain.com/mcp` URL that never changes.

**Steps:**
- Create a free Cloudflare account at cloudflare.com
- Run `cloudflared login` in Termux — it prints a browser auth URL
- Create a named tunnel: `cloudflared tunnel create youtube-vision-mcp`
- Create `~/.cloudflared/config.yml` pointing at `localhost:8000`
- Either: bring your own domain and run `cloudflared tunnel route dns ...`
- Or: explore whether Cloudflare offers a free subdomain for named tunnels
- Update `start.sh` to use `cloudflared tunnel run youtube-vision-mcp`
  instead of `cloudflared tunnel --url http://localhost:8000`
- Update the Claude connector URL once — never again

**Free domain options to explore:**
- `is-a.dev` — free `.is-a.dev` subdomains via GitHub PR, works with
  Cloudflare DNS
- Freenom — `.tk`/`.ml`/`.ga` free domains (availability varies)
- Cloudflare Registrar — cheap `.com` (~$10/year), no markup over ICANN

---

### 2. Git repository — done
The project is now under version control and pushed to a public GitHub
repo. On a new phone, fresh setup is now:
```bash
pkg install -y python-pydantic-core python-cryptography
git clone <this-repo-url> ~/programs/youtube-vision-mcp
cd ~/programs/youtube-vision-mcp
pip install -r requirements.txt
# restore .env manually (never committed)
bash start.sh
```

---

### 3. Free hosting options (priority: medium)
Running on the phone works but depends on the phone staying on and awake.
Explore moving the server to a free cloud host so it runs 24/7 without
draining the phone battery or depending on Android not killing the process.

**Options to evaluate:**

| Option | Free tier | Notes |
|--------|-----------|-------|
| Fly.io | 3 shared VMs free | Best DX, `fly launch` just works, persistent IPv6 |
| Render | 1 free web service | Spins down after 15min inactivity — bad for MCP |
| Railway | $5 free credit/month | Straightforward deploy from GitHub |
| Hugging Face Spaces | Free CPU spaces | Designed for ML apps, worth exploring |
| Oracle Cloud Free Tier | 2 ARM VMs always free | Most powerful free option, permanent, some setup |
| Google Cloud Run | Free tier generous | Scales to zero — same spin-down issue as Render |

**Recommendation to explore first:** Fly.io — ARM support, no spin-down
on free tier, and `fly launch` from the repo root is a single command.
Oracle Cloud free ARM VMs are the best long-term option if you want a
proper always-on server at zero cost.

**What changes when hosted remotely:**
- Remove Cloudflare tunnel entirely — use the host's public URL directly
- Set `GEMINI_API_KEY` as an environment secret on the host (not in `.env`)
- `start.sh`/`stop.sh` become irrelevant — host manages the process
- Static URL solves the connector-update problem automatically

---

## Quick start (existing phone)

```bash
bash ~/programs/youtube-vision-mcp/start.sh
bash ~/programs/youtube-vision-mcp/status.sh
# copy tunnel URL → update claude.ai connector if it changed
```

## Quick start (new phone)

```bash
# 1. Install Termux from F-Droid
termux-setup-storage
pkg update -y && pkg upgrade -y

# 2. Install native build prerequisites
pkg install -y python-pydantic-core python-cryptography

# 3. Clone repo
git clone <this-repo-url> ~/programs/youtube-vision-mcp
cd ~/programs/youtube-vision-mcp

# 4. Install dependencies
pip install -r requirements.txt

# 5. Restore API key
mkdir -p ~/.config/youtube-vision-mcp
echo "GEMINI_API_KEY=your-key" > ~/.config/youtube-vision-mcp/.env
chmod 600 ~/.config/youtube-vision-mcp/.env

# 6. Start
bash start.sh
```
