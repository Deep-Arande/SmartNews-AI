from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import datetime

class VerificationRequest(BaseModel):
    query: str

class Source(BaseModel):
    url: str
    domain: str
    text_snippet: Optional[str] = None
    credibility_score: Optional[float] = 0.5

class ClaimResult(BaseModel):
    claim: str
    verdict: str  # True, False, Unverified
    explanation: str

class GraphData(BaseModel):
    nodes: List[Dict[str, Any]]
    edges: List[Dict[str, Any]]

class VerificationResponse(BaseModel):
    verdict: str
    score: float
    claims: List[ClaimResult]
    results: List[Dict[str, Any]]
    sources: List[Source]
    graph: GraphData
    explanation: str
    
class VerificationDocument(VerificationResponse):
    query: str
    created_at: datetime
