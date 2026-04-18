import time
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.db.mongodb import get_db
from app.db.session_store import create_session, get_session, is_expired, append_chat
from app.chat.assistant import generate_answer
from app.services.search_service import search_web, select_diverse_urls
from app.services.scraper_service import scrape_urls
from app.services.credibility_service import compute_credibility
from app.services.verification_service import verify_all_claims
from app.utils.logger import get_logger

logger = get_logger(__name__)

router = APIRouter()


# ─── Request / Response schemas ──────────────────────────────────────────────

class StartSessionRequest(BaseModel):
    query: str


class StartSessionResponse(BaseModel):
    session_id: str
    verdict: str
    score: float
    summary: str


class ChatRequest(BaseModel):
    session_id: str
    question: str


class ChatResponse(BaseModel):
    answer: str


# ─── Routes ──────────────────────────────────────────────────────────────────

@router.post("/start-session", response_model=StartSessionResponse)
async def start_session(request: StartSessionRequest, db=Depends(get_db)):
    """
    Run the full verification pipeline on the query, persist the result as a
    new premium session, and return a slim response with session_id.
    """
    query = request.query.strip()
    if not query:
        raise HTTPException(status_code=422, detail="query must not be empty.")

    logger.info("Starting premium session pipeline.", extra={"query": query[:80]})

    # 1. Search
    search_results = await search_web(query)
    urls = [res.get("href") for res in search_results if res.get("href")]
    urls = select_diverse_urls(list(set(urls)))

    # 2. Scrape
    sources = await scrape_urls(urls)

    # 3. Credibility
    sources = compute_credibility(sources)

    # 4. Build evidence text
    full_text = "\n\n".join(
        [f"SOURCE [{s.domain}]: {s.text_snippet}" for s in sources if s.text_snippet]
    )
    if not full_text:
        raise HTTPException(
            status_code=404,
            detail="Could not find sufficient information to verify this claim.",
        )

    # 5. LLM verification (single call)
    unified_result = await verify_all_claims(query, full_text)

    # 6. Serialize sources for storage (Pydantic → dict)
    serialised_sources = [
        s.model_dump() if hasattr(s, "model_dump") else s for s in sources
    ]

    # 7. Create session
    session_id = str(uuid4())
    pipeline_output = {
        "query": query,
        "claims": unified_result.get("claims", []),
        "results": search_results,
        "sources": serialised_sources,
        "score": unified_result.get("score", 0.0),
        "verdict": unified_result.get("verdict", "Unverified"),
        "explanation": unified_result.get("explanation", ""),
    }

    if db is not None:
        await create_session(db, session_id, pipeline_output)
    else:
        logger.warning("MongoDB unavailable; session not persisted.")

    logger.info(
        "Premium session created successfully.",
        extra={"session_id": session_id, "verdict": pipeline_output["verdict"]},
    )

    return StartSessionResponse(
        session_id=session_id,
        verdict=pipeline_output["verdict"],
        score=pipeline_output["score"],
        summary=pipeline_output["explanation"],
    )


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest, db=Depends(get_db)):
    """
    Answer a follow-up question using only the stored session data.
    Returns 404 if session not found, 410 if expired.
    """
    session_id = request.session_id.strip()
    question = request.question.strip()

    if not session_id or not question:
        raise HTTPException(status_code=422, detail="session_id and question are required.")

    # 1. Fetch session
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable.")

    session_doc = await get_session(db, session_id)
    if session_doc is None:
        raise HTTPException(status_code=404, detail="Session not found.")

    # 2. Expiry check
    if is_expired(session_doc):
        raise HTTPException(status_code=410, detail="Session has expired.")

    # 3 – 5. Generate answer
    t0 = time.perf_counter()
    answer, token_usage = await generate_answer(session_doc, question)
    response_time_ms = round((time.perf_counter() - t0) * 1000)

    # 6. Persist chat turn
    await append_chat(db, session_id, question, answer)

    logger.info(
        "Chat turn completed.",
        extra={
            "session_id": session_id,
            "response_time_ms": response_time_ms,
            "token_usage": token_usage,
        },
    )

    return ChatResponse(answer=answer)
