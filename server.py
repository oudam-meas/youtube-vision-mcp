"""
youtube-vision-mcp
-------------------
An MCP server that fills the "visual gap" left by transcript-only tools.
It calls Google AI Studio's Gemini API, which can natively ingest a
YouTube URL (audio + sampled video frames), and exposes that as MCP tools
that Claude (or any MCP client) can call.

Deploy this somewhere reachable over HTTPS (VPS, Fly.io, Render, Cloudflare
Worker w/ container, etc.) and register it as a Custom Connector in
Claude -> Settings -> Connectors. Mobile apps can then use it too, since
they only need the remote URL, not local execution.

Env vars required:
  GEMINI_API_KEY   - from https://aistudio.google.com/apikey
"""

import os
from dotenv import load_dotenv

load_dotenv(os.path.expanduser("~/.config/youtube-vision-mcp/.env"))

from google import genai
from mcp.server.mcpserver import MCPServer as FastMCP

GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-3.5-flash")

client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
mcp = FastMCP("youtube-vision-gap-filler")


def _call_gemini(youtube_url: str, prompt: str) -> str:
    response = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=[
            {"file_data": {"file_uri": youtube_url}},
            {"text": prompt},
        ],
    )
    return response.text or "(no content returned)"


@mcp.tool()
def summarize_video(youtube_url: str) -> str:
    """
    Watch a YouTube video (audio + sampled visual frames) and produce a
    structured summary: overview, section outline with timestamps, and
    key takeaways. Use this first for a general pass over a video.
    """
    prompt = (
        "Watch this video and give me: 1) a 3-5 sentence summary, "
        "2) a timestamped section outline with 2-3 bullets per section, "
        "3) 3-5 key takeaways. If you cannot confirm a timestamp, say so "
        "rather than guessing."
    )
    return _call_gemini(youtube_url, prompt)


@mcp.tool()
def extract_diagrams(youtube_url: str) -> str:
    """
    Focus specifically on visual diagrams, charts, slides, or whiteboard
    drawings shown in the video. For each one found, return a timestamp,
    a plain-language description of its structure, and a Mermaid-syntax
    reconstruction where feasible.
    """
    prompt = (
        "Go through this video looking ONLY for diagrams, architecture "
        "drawings, charts, or slides with visual models. For each: "
        "1) approximate timestamp, 2) description of components and how "
        "they connect (arrows, hierarchy, flow), 3) a Mermaid code block "
        "reconstruction if possible. If none are visible, say so plainly. "
        "Do not fabricate diagrams that aren't actually shown."
    )
    return _call_gemini(youtube_url, prompt)


@mcp.tool()
def ask_about_timestamp(youtube_url: str, timestamp: str, question: str) -> str:
    """
    Ask a targeted question about a specific moment in the video.
    timestamp should be in MM:SS or HH:MM:SS format (e.g. "12:45").
    """
    prompt = f"At timestamp {timestamp} in this video: {question}"
    return _call_gemini(youtube_url, prompt)


if __name__ == "__main__":
    # streamable-http so it can run as a remote MCP server reachable over HTTPS
    mcp.run(transport="streamable-http", host="0.0.0.0", port=8000)
