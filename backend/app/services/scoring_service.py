from app.models.schemas import ClaimResult, Source
from typing import List

def compute_final_score(claims: List[ClaimResult], sources: List[Source], conflicts: int) -> float:
    """
    Compute final trust score based on claims, sources, and graph conflicts.
    Score between 0 and 1.
    """
    if not claims:
        return 0.0
        
    true_count = sum(1 for c in claims if c.verdict == "True")
    
    total_claims = len(claims)
    claim_ratio = true_count / total_claims if total_claims > 0 else 0
    
    avg_credibility = sum(s.credibility_score for s in sources) / len(sources) if sources else 0.5
    
    penalty = conflicts * 0.1
    
    final_score = (claim_ratio * 0.6) + (avg_credibility * 0.4) - penalty
    return max(0.0, min(1.0, final_score))
