ENV_FILE := $(HOME)/.config/youtube-vision-mcp/.env

.PHONY: install login secret-gemini secret-auth deploy dev setup

install:
	npm install

login:
	npx wrangler login

secret-gemini:
	grep '^GEMINI_API_KEY=' $(ENV_FILE) | cut -d= -f2- | npx wrangler secret put GEMINI_API_KEY

secret-auth:
	grep '^MCP_AUTH_TOKEN=' $(ENV_FILE) | cut -d= -f2- | npx wrangler secret put MCP_AUTH_TOKEN

deploy:
	npx wrangler deploy

dev:
	npx wrangler dev

# Full first-time setup: install → secrets → deploy
setup: install secret-gemini secret-auth deploy
