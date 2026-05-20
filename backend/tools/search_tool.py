"""
search_tool.py - Web search simulation tool.
In production, replace the _do_search method with a real search API
(e.g. Brave Search, Serper, Tavily, or DuckDuckGo API).
"""
import json
from typing import Any
from datetime import datetime

from .base_tool import BaseTool
from utils.logger import logger


class SearchTool(BaseTool):
    """
    Web search tool. Returns search results for a query.

    To use a real search API, replace _do_search() with an httpx call
    to your preferred provider (Brave, Serper, Tavily, etc.)
    """

    @property
    def name(self) -> str:
        return "web_search"

    @property
    def description(self) -> str:
        return (
            "Search the web for current information. Use this when you need up-to-date "
            "facts, news, or information you're not confident about. Provide a clear, "
            "specific search query for best results."
        )

    @property
    def input_schema(self) -> dict:
        return {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "The search query. Be specific and concise."
                },
                "num_results": {
                    "type": "integer",
                    "description": "Number of results to return (1-5). Default: 3",
                    "default": 3
                }
            },
            "required": ["query"]
        }

    async def execute(self, query: str, num_results: int = 3, **kwargs: Any) -> str:
        """Performs the search and returns formatted results."""
        try:
            logger.info("Web search: '{}'", query)
            results = await self._do_search(query, num_results)
            return results
        except Exception as e:
            logger.error("Search error for '{}': {}", query, e)
            return f"Search failed: {str(e)}"

    async def _do_search(self, query: str, num_results: int) -> str:
        """
        Performs the actual search. Replace this with a real API call.

        Example with Brave Search API:
        ─────────────────────────────
        import httpx
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://api.search.brave.com/res/v1/web/search",
                headers={"X-Subscription-Token": BRAVE_API_KEY},
                params={"q": query, "count": num_results}
            )
            data = response.json()
            results = []
            for r in data.get("web", {}).get("results", []):
                results.append(f"- [{r['title']}]({r['url']})\n  {r['description']}")
            return "\n".join(results)
        """
        # ── DEMO FALLBACK ── Replace this with a real search API ──
        current_date = datetime.utcnow().strftime("%Y-%m-%d")
        mock_results = f"""Search results for: "{query}" (as of {current_date})

**Note**: This is a demo search. Connect a real search API (Brave, Serper, Tavily)
by replacing _do_search() in backend/tools/search_tool.py.

**Simulated Result 1**: Based on available knowledge about "{query}"
- The topic covers several important aspects that are well-documented
- Multiple reliable sources confirm the key concepts involved
- For current data, a live search API is recommended

**Simulated Result 2**: Related context
- Additional background information would appear here from real search
- Sources would be linked for verification

To add real search: Set BRAVE_API_KEY or SERPER_API_KEY in .env"""
        return mock_results
