from datetime import datetime, timedelta
from typing import Optional, Dict, Any

from app.utils.logger import get_logger

logger = get_logger(__name__)

SESSION_TTL_MINUTES = 45


async def create_session_index(db) -> None:
    """Create TTL index on expires_at so MongoDB auto-deletes expired sessions."""
    try:
        await db.premium_sessions.create_index(
            "expires_at",
            expireAfterSeconds=0,
            name="premium_sessions_ttl_idx",
        )
        logger.info("TTL index on premium_sessions.expires_at ensured.")
    except Exception as e:
        logger.warning(f"Could not create TTL index: {e}")


async def create_session(db, session_id: str, pipeline_output: Dict[str, Any]) -> None:
    """
    Insert a new premium session document into MongoDB.

    pipeline_output must contain:
        query, claims, results, sources, score, verdict, explanation
    """
    now = datetime.utcnow()
    doc = {
        "session_id": session_id,
        "query": pipeline_output.get("query", ""),
        "claims": pipeline_output.get("claims", []),
        "results": pipeline_output.get("results", []),
        "sources": pipeline_output.get("sources", []),
        "score": pipeline_output.get("score", 0.0),
        "verdict": pipeline_output.get("verdict", "Unverified"),
        "explanation": pipeline_output.get("explanation", ""),
        "chat_history": [],
        "created_at": now,
        "expires_at": now + timedelta(minutes=SESSION_TTL_MINUTES),
    }
    await db.premium_sessions.insert_one(doc)
    logger.info(
        "Premium session created.",
        extra={"session_id": session_id},
    )


async def get_session(db, session_id: str) -> Optional[Dict[str, Any]]:
    """Return the session document or None if not found."""
    doc = await db.premium_sessions.find_one({"session_id": session_id})
    return doc


def is_expired(session_doc: Dict[str, Any]) -> bool:
    """Return True if the session has passed its expires_at timestamp."""
    expires_at: datetime = session_doc.get("expires_at")
    if expires_at is None:
        return True
    return datetime.utcnow() > expires_at


async def append_chat(db, session_id: str, question: str, answer: str) -> None:
    """
    Push a new chat entry to chat_history (capped at 5 most recent entries).
    Uses a two-step update: $push then $slice to keep the array bounded.
    """
    entry = {
        "question": question,
        "answer": answer,
        "timestamp": datetime.utcnow().isoformat(),
    }
    await db.premium_sessions.update_one(
        {"session_id": session_id},
        {
            "$push": {
                "chat_history": {
                    "$each": [entry],
                    "$slice": -5,  # keep only the last 5
                }
            }
        },
    )
    logger.info(
        "Chat entry appended.",
        extra={"session_id": session_id},
    )
