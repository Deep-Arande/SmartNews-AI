from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime
import asyncio
import logging
from typing import List

from app.models.schemas import VerificationRequest, VerificationResponse, VerificationDocument, ClaimResult
from app.db.mongodb import get_db
from app.services.search_service import search_web
from app.services.scraper_service import scrape_urls
from app.services.credibility_service import compute_credibility
from app.services.graph_service import build_knowledge_graph, detect_conflicts
from app.services.verification_service import verify_all_claims

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

router = APIRouter()

@router.post("/", response_model=VerificationResponse)
async def verify_news(request: VerificationRequest, db=Depends(get_db)):
    try:
        query = request.query
        logger.info(f"--- Started verification pipeline for query: '{query}' ---")
        
        # 1. Search Web
        logger.info("Executing web search against trusted domains...")
        search_results = await search_web(query)
        urls = [res.get('href') for res in search_results if res.get('href')]
        urls = list(set(urls))[:3] # Limit to top 3 for speed
        logger.info(f"Found {len(urls)} trusted URLs to scrape.")
        
        # 2. Scrape Content
        sources = await scrape_urls(urls)
        logger.info(f"Successfully scraped content from {len(sources)} sources.")
        
        # 3. Compute Credibility
        sources = compute_credibility(sources)
        
        # Combine all text for context
        full_text = "\n\n".join([f"SOURCE [{s.domain}]: {s.text_snippet}" for s in sources if s.text_snippet])
        
        if not full_text:
            logger.error("No valid text context sourced. Aborting.")
            raise HTTPException(status_code=404, detail="Could not find sufficient information to verify this claim.")
            
        # 4. SINGLE UNIFIED LLM CALL
        # Replaces Extraction, RAG Embeddings, Verification Loops, and Explanation Generations
        logger.info("Dispatching full evidence context to unified LLM pipeline...")
        unified_result = await verify_all_claims(query, full_text)
        
        # Format the received JSON output back to Pydantic objects
        claim_results = []
        for c in unified_result.get("claims", []):
            claim_results.append(ClaimResult(
                claim=c.get("claim"),
                verdict=c.get("verdict"),
                explanation=c.get("explanation")
            ))
            
        # 5. Knowledge Graph & Conflict Detection (Fast, native CPU operations, 0 API cost)
        logger.info("Building Knowledge Graph and detecting conflicts...")
        graph_data = build_knowledge_graph(claim_results)
        conflicts = detect_conflicts(graph_data)
        
        score = unified_result.get("score", 0.0)
        verdict = unified_result.get("verdict", "Unverified")
        explanation = unified_result.get("explanation", "No explanation available.")

        response_model = VerificationResponse(
            verdict=verdict,
            score=score,
            claims=claim_results,
            results=search_results,
            sources=sources,
            graph=graph_data,
            explanation=explanation
        )
        
        # 6. Save to DB
        if db is not None:
            logger.info("Persisting verification record to MongoDB...")
            doc = VerificationDocument(
                **response_model.model_dump(),
                query=query,
                created_at=datetime.utcnow()
            )
            await db.verifications.insert_one(doc.model_dump())
            
        logger.info("--- Pipeline executed successfully. Returning payload. ---")
        return response_model
        
    except Exception as e:
        logger.error(f"FATAL Pipeline Error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/dummy", response_model=VerificationResponse)
async def dummy_verify_news():
    try:
        # Dummy response data
        dummy_response = VerificationResponse(
            verdict="False",
            score=0.15,
            claims=[
                ClaimResult(
                    claim="The earth is flat.",
                    verdict="False",
                    explanation="Scientific evidence from satellite imagery, gravity, and circum-navigation proves the Earth is an oblate spheroid, not flat."
                ),
                ClaimResult(
                    claim="Water boils at 100 degrees Celsius at sea level.",
                    verdict="True",
                    explanation="This is a known scientific fact; the boiling point of pure water at 1 atmosphere of pressure is exactly 100°C."
                )
            ],
            results=[],
            sources=[
                {
                    "domain": "nasa.gov",
                    "url": "https://www.nasa.gov",
                    "credibility_score": 0.99,
                    "text_snippet": "Earth is not flat."
                },
                {
                    "domain": "science.org",
                    "url": "https://www.science.org",
                    "credibility_score": 0.95,
                    "text_snippet": "Water boils at 100 degrees Celsius."
                }
            ],
            graph={
                "nodes": [
                    {"id": "Earth", "label": "Earth", "type": "Concept"},
                    {"id": "Flat", "label": "Flat", "type": "Concept"},
                    {"id": "Claim1", "label": "Earth is flat", "type": "Claim"},
                    {"id": "Source1", "label": "NASA", "type": "Source"}
                ],
                "edges": [
                    {"from": "Claim1", "to": "Earth", "relation": "RELATES_TO"},
                    {"from": "Claim1", "to": "Flat", "relation": "RELATES_TO"},
                    {"from": "Source1", "to": "Claim1", "relation": "CONTRADICTS"}
                ]
            },
            explanation="The primary claim that the Earth is flat has been debunked by multiple credible sources, including NASA. Another claim about water's boiling point was found to be true. Overall, the core premise of the submitted query is false."
        )
        return dummy_response
    except Exception as e:
        logger.error(f"FATAL Pipeline Error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
