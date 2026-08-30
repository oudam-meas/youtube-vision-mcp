# youtube-vision-mcp — Cloudflare Workers port

The same three MCP tools as `../server.py` (`summarize_video`,
`extract_diagrams`, `ask_about_timestamp`), running as a remote MCP server
on Cloudflare's Workers free tier instead of a self-hosted box. Calls
Gemini's `generateContent` REST endpoint directly via `fetch`, so there's
no Node-only SDK dependency — it runs unmodified in the Workers isolate.

Built with [`agents`](https://github.com/cloudflare/agents)' `McpAgent`
(wraps `@modelcontextprotocol/sdk`), backed by a Durable Object per Cloudflare's
remote-MCP pattern.

## A note if you're on Termux/Android

`wrangler` depends on `workerd`, whose install script rejects Node's
`process.platform === "android"` (Termux's Node reports that instead of
`linux`). Everything here was built and dry-run bundled inside a
`proot-distro` Ubuntu container, where Node reports `linux` normally:

```bash
proot-distro install ubuntu
proot-distro login ubuntu
# inside the container: install Node from nodejs.org (not apt — the apt
# nodejs package drags in an X11/mesa dependency tree), then:
cd /path/to/youtube-vision-mcp/cloudflare-worker
npm install
```

`wrangler deploy` (uploads the bundle, doesn't run it locally) works fine
this way. `wrangler dev`'s local preview spins up `workerd` itself, which
crashed here on an mmap/tcmalloc allocation under proot — if you need local
dev preview, use a real Linux/macOS/WSL machine instead.

## Auth

The Worker is otherwise open to the internet, and every call spends *your*
Gemini quota/billing, not the caller's — so it requires a secret token
embedded in the URL path: `/mcp/<token>` (and `/sse/<token>`). Anything
else, including the bare `/mcp`, 404s indistinguishably from an unknown
route. No OAuth server or header config needed — it works with any MCP
client (like Claude's Custom Connector) that just calls a fixed URL; you
just register the token-bearing URL once.

Generate a token and set it before your first deploy:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
npm run secret:auth-token   # paste the generated value when prompted
```

Treat the resulting connector URL (with the token in it) as a secret —
don't paste it into a public README, issue, or gist.

## Deploy

```bash
npm install
npx wrangler login          # or set CLOUDFLARE_API_TOKEN
npm run secret:gemini       # prompts for your Gemini API key, stores it as a secret
npm run secret:auth-token   # prompts for the token above, stores it as a secret
npm run deploy
```

If your Cloudflare account has never used Workers before, `wrangler deploy`
fails with *"you need a workers.dev subdomain"* (error 10063) until you
visit the account-level **Workers & Pages** page in the dashboard once —
that's what provisions `<your-subdomain>.workers.dev`. It's a one-time,
account-wide step; after that, deploys just work.

This publishes to `https://youtube-vision-mcp.<your-subdomain>.workers.dev`,
with the MCP endpoint at `/mcp/<token>` (and `/sse/<token>` for SSE-based
clients). Register that full URL, token included, as a Custom Connector in
Claude → Settings → Connectors — no tunnel, no restart-to-get-a-new-URL
problem.

**Status:** deployed and verified — a `POST /mcp` with an `initialize`
request returns a valid MCP handshake (`serverInfo.name:
"youtube-vision-gap-filler"`).

`GEMINI_MODEL` defaults to `gemini-3.5-flash` (set in `wrangler.jsonc`
under `vars`); change it there if needed.
