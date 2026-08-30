/**
 * youtube-vision-mcp — Cloudflare Workers port
 * -------------------------------------------
 * Same three tools as ../server.py, running as a remote MCP server on
 * Cloudflare's free Workers tier instead of a self-hosted box. Calls
 * Gemini's generateContent REST endpoint directly (no Node-only SDK)
 * so it runs unmodified in the Workers isolate.
 *
 * Secrets/vars:
 *   GEMINI_API_KEY  - set via `wrangler secret put GEMINI_API_KEY`
 *   GEMINI_MODEL    - optional, set in wrangler.jsonc `vars` (defaults below)
 */

import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

interface Env {
	GEMINI_API_KEY: string;
	GEMINI_MODEL: string;
	MCP_AUTH_TOKEN: string;
	MCP_OBJECT: DurableObjectNamespace;
}

async function callGemini(env: Env, youtubeUrl: string, prompt: string): Promise<string> {
	const model = env.GEMINI_MODEL || "gemini-3.5-flash";
	const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`;

	const res = await fetch(url, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({
			contents: [
				{
					parts: [{ file_data: { file_uri: youtubeUrl } }, { text: prompt }],
				},
			],
		}),
	});

	if (!res.ok) {
		const body = await res.text();
		throw new Error(`Gemini API error ${res.status}: ${body}`);
	}

	const data = (await res.json()) as any;
	const parts = data?.candidates?.[0]?.content?.parts ?? [];
	const text = parts.map((p: any) => p.text ?? "").join("");
	return text || "(no content returned)";
}

export class YoutubeVisionMCP extends McpAgent<Env> {
	server = new McpServer({ name: "youtube-vision-gap-filler", version: "1.0.0" });

	async init() {
		this.server.tool(
			"summarize_video",
			"Watch a YouTube video (audio + sampled visual frames) and produce a " +
				"structured summary: overview, section outline with timestamps, and " +
				"key takeaways. Use this first for a general pass over a video.",
			{ youtube_url: z.string().describe("The YouTube video URL") },
			async ({ youtube_url }) => {
				const prompt =
					"Watch this video and give me: 1) a 3-5 sentence summary, " +
					"2) a timestamped section outline with 2-3 bullets per section, " +
					"3) 3-5 key takeaways. If you cannot confirm a timestamp, say so " +
					"rather than guessing.";
				const text = await callGemini(this.env, youtube_url, prompt);
				return { content: [{ type: "text" as const, text }] };
			}
		);

		this.server.tool(
			"extract_diagrams",
			"Focus specifically on visual diagrams, charts, slides, or whiteboard " +
				"drawings shown in the video. For each one found, return a timestamp, " +
				"a plain-language description of its structure, and a Mermaid-syntax " +
				"reconstruction where feasible.",
			{ youtube_url: z.string().describe("The YouTube video URL") },
			async ({ youtube_url }) => {
				const prompt =
					"Go through this video looking ONLY for diagrams, architecture " +
					"drawings, charts, or slides with visual models. For each: " +
					"1) approximate timestamp, 2) description of components and how " +
					"they connect (arrows, hierarchy, flow), 3) a Mermaid code block " +
					"reconstruction if possible. If none are visible, say so plainly. " +
					"Do not fabricate diagrams that aren't actually shown.";
				const text = await callGemini(this.env, youtube_url, prompt);
				return { content: [{ type: "text" as const, text }] };
			}
		);

		this.server.tool(
			"ask_about_timestamp",
			"Ask a targeted question about a specific moment in the video. " +
				'timestamp should be in MM:SS or HH:MM:SS format (e.g. "12:45").',
			{
				youtube_url: z.string().describe("The YouTube video URL"),
				timestamp: z.string().describe('Timestamp in MM:SS or HH:MM:SS format, e.g. "12:45"'),
				question: z.string().describe("The question to ask about that moment"),
			},
			async ({ youtube_url, timestamp, question }) => {
				const prompt = `At timestamp ${timestamp} in this video: ${question}`;
				const text = await callGemini(this.env, youtube_url, prompt);
				return { content: [{ type: "text" as const, text }] };
			}
		);
	}
}

// Constant-time compare so a mismatched token can't be brute-forced via
// response-time differences on the length/prefix.
function timingSafeEqual(a: string, b: string): boolean {
	if (a.length !== b.length) return false;
	let diff = 0;
	for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
	return diff === 0;
}

export default {
	fetch(request: Request, env: Env, ctx: ExecutionContext) {
		// CORS preflight must succeed without auth: a browser-based MCP client
		// sending a custom Authorization header cross-origin sends this OPTIONS
		// request first, and if it doesn't get a clean 2xx + matching
		// Access-Control-Allow-* headers, the browser blocks the real request
		// before it's ever sent — surfacing as "can't reach the server" even
		// though the Worker is up.
		if (request.method === "OPTIONS") {
			return new Response(null, {
				status: 204,
				headers: {
					"Access-Control-Allow-Origin": "*",
					"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
					"Access-Control-Allow-Headers": "Content-Type, Authorization, mcp-session-id, mcp-protocol-version",
					"Access-Control-Max-Age": "86400",
				},
			});
		}

		// Header-based auth: Claude's Custom Connector UI supports request
		// headers sent as this connector's credentials, stored securely and
		// never shown again — a better fit than a token in the URL, since
		// headers don't end up in browser history or referrer logs.
		const authHeader = request.headers.get("Authorization") ?? "";
		if (!timingSafeEqual(authHeader, `Bearer ${env.MCP_AUTH_TOKEN}`)) {
			return new Response("Unauthorized", {
				status: 401,
				headers: { "Access-Control-Allow-Origin": "*" },
			});
		}

		const url = new URL(request.url);

		if (url.pathname === "/sse" || url.pathname === "/sse/message") {
			return YoutubeVisionMCP.serveSSE("/sse").fetch(request, env, ctx);
		}

		if (url.pathname === "/mcp") {
			return YoutubeVisionMCP.serve("/mcp").fetch(request, env, ctx);
		}

		return new Response("Not found", { status: 404 });
	},
};
