from app.models.schemas import Source
from typing import List

# Mock domain trust list
DOMAIN_TRUST_LIST = {
    "reuters.com": 0.9,
    "apnews.com": 0.9,
    "bbc.com": 0.9,
    "nytimes.com": 0.8,
    "wsj.com": 0.8,
    "wikipedia.org": 0.7,
    "scam-news.com": 0.1
}

def compute_credibility(sources: List[Source]) -> List[Source]:
    """
    Assign credibility weights based on domain.
    """
    for source in sources:
        domain = source.domain.lower()
        score = 0.5 # Default medium
        
        for trusted_domain, weight in DOMAIN_TRUST_LIST.items():
            if trusted_domain in domain:
                score = weight
                break
                
        source.credibility_score = score
        
    return sources
