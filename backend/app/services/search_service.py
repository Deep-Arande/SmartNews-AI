from ddgs import DDGS
from typing import List
import asyncio

async def search_web(query: str, max_results: int = 3) -> List[dict]:
    """
    Search duckduckgo strictly on trusted news and fact-checking websites.
    """
    trusted_domains = [
        "reuters.com", "apnews.com", "bbc.com",
        "snopes.com", "politifact.com", "factcheck.org"
    ]
    domain_filter = " OR ".join([f"site:{domain}" for domain in trusted_domains])
    strict_query = f"{query} {domain_filter}"

    def run_search():
        with DDGS() as ddgs:
            results = list(ddgs.text(strict_query, max_results=max_results))
            return results
    
    loop = asyncio.get_event_loop()
    results = await loop.run_in_executor(None, run_search)
    return results

async def generate_search_queries(base_query: str) -> List[str]:
    # Placeholder for multi-query generator. Just returning base for now.
    return [base_query]
