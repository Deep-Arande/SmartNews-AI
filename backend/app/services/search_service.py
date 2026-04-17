import os
from ddgs import DDGS
from typing import List
from urllib.parse import urlparse
import asyncio
import logging
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

MAX_URL_SEARCH = int(os.getenv("MAX_URL_SEARCH", 3))

# Domain category definitions for diverse selection
FACT_CHECK_DOMAINS = ["snopes.com", "politifact.com", "factcheck.org"]
NEWS_DOMAINS = ["reuters.com", "apnews.com", "bbc.com"]


def _extract_domain(url: str) -> str:
    """Extract the base domain from a URL (e.g. 'www.reuters.com' -> 'reuters.com')."""
    hostname = urlparse(url).hostname or ""
    # Strip 'www.' prefix if present
    return hostname.removeprefix("www.")


def _categorize_domain(domain: str) -> str:
    """Categorize a domain into 'fact_check', 'news', or 'other'."""
    for d in FACT_CHECK_DOMAINS:
        if d in domain:
            return "fact_check"
    for d in NEWS_DOMAINS:
        if d in domain:
            return "news"
    return "other"


def select_diverse_urls(urls: List[str], max_urls: int = MAX_URL_SEARCH) -> List[str]:
    """
    Select a diverse set of URLs ensuring representation from
    fact-checking, news, and fallback sources. No duplicate domains.
    
    Priority:
      1. First available fact-check domain
      2. First available news domain
      3. Fill remaining with best available unique domains
    """
    selected: List[str] = []
    used_domains: set = set()

    # Bucket URLs by category, preserving original order
    fact_check_urls: List[str] = []
    news_urls: List[str] = []
    other_urls: List[str] = []

    for url in urls:
        domain = _extract_domain(url)
        category = _categorize_domain(domain)
        if category == "fact_check":
            fact_check_urls.append(url)
        elif category == "news":
            news_urls.append(url)
        else:
            other_urls.append(url)

    # 1. Pick first fact-check URL
    for url in fact_check_urls:
        domain = _extract_domain(url)
        if domain not in used_domains:
            selected.append(url)
            used_domains.add(domain)
            break

    # 2. Pick first news URL
    for url in news_urls:
        domain = _extract_domain(url)
        if domain not in used_domains:
            selected.append(url)
            used_domains.add(domain)
            break

    # 3. Fill remaining slots with unique domains from all remaining URLs
    remaining = [u for u in urls if u not in selected]
    for url in remaining:
        if len(selected) >= max_urls:
            break
        domain = _extract_domain(url)
        if domain not in used_domains:
            selected.append(url)
            used_domains.add(domain)

    logger.info(f"Diverse URL selection: {[_extract_domain(u) for u in selected]} from {len(urls)} candidates.")
    return selected


async def search_web(query: str, max_results: int = MAX_URL_SEARCH) -> List[dict]:
    """
    Search duckduckgo strictly on trusted news and fact-checking websites.
    Fetches a larger pool internally to allow diverse selection downstream.
    """
    trusted_domains = [
        "reuters.com", "apnews.com", "bbc.com",
        "snopes.com", "politifact.com", "factcheck.org"
    ]
    domain_filter = " OR ".join([f"site:{domain}" for domain in trusted_domains])
    strict_query = f"{query} {domain_filter}"

    # Fetch a larger pool (3x) to give select_diverse_urls enough candidates
    internal_limit = max_results * 3

    def run_search():
        with DDGS() as ddgs:
            results = list(ddgs.text(strict_query, max_results=internal_limit))
            return results
    
    loop = asyncio.get_event_loop()
    results = await loop.run_in_executor(None, run_search)
    return results

async def generate_search_queries(base_query: str) -> List[str]:
    # Placeholder for multi-query generator. Just returning base for now.
    return [base_query]
