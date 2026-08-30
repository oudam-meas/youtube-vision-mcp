ENV_FILE := $(HOME)/.config/youtube-vision-mcp/.env

.PHONY: help install run cf-install cf-login cf-secret-gemini cf-secret-auth cf-deploy cf-dev cf-setup

help:
	@echo "Python server"
	@echo "  make install          pip install -r requirements.txt"
	@echo "  make run              start the MCP server on :8000"
	@echo ""
	@echo "Cloudflare Worker"
	@echo "  make cf-login         authenticate with Cloudflare"
	@echo "  make cf-install       npm install in cloudflare-worker/"
	@echo "  make cf-secret-gemini push GEMINI_API_KEY from ~/.config/youtube-vision-mcp/.env"
	@echo "  make cf-secret-auth   push MCP_AUTH_TOKEN from ~/.config/youtube-vision-mcp/.env"
	@echo "  make cf-deploy        deploy to workers.dev"
	@echo "  make cf-dev           local dev server"
	@echo "  make cf-setup         first-time setup: install + secrets + deploy"

# ── Python server ─────────────────────────────────────────────────────────────

install:
	pip install -r requirements.txt

run:
	python server.py

# ── Cloudflare Worker ─────────────────────────────────────────────────────────

cf-install:
	npm install --prefix cloudflare-worker

cf-login:
	cd cloudflare-worker && npx wrangler login

cf-secret-gemini:
	grep '^GEMINI_API_KEY=' $(ENV_FILE) | cut -d= -f2- | (cd cloudflare-worker && npx wrangler secret put GEMINI_API_KEY)

cf-secret-auth:
	grep '^MCP_AUTH_TOKEN=' $(ENV_FILE) | cut -d= -f2- | (cd cloudflare-worker && npx wrangler secret put MCP_AUTH_TOKEN)

cf-deploy:
	cd cloudflare-worker && npx wrangler deploy

cf-dev:
	cd cloudflare-worker && npx wrangler dev

# Full first-time Cloudflare setup: install → secrets → deploy
cf-setup: cf-install cf-secret-gemini cf-secret-auth cf-deploy
