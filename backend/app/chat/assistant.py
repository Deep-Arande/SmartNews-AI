from typing import Dict, Any, List, Tuple

from google.genai import types

from app.services.verification_service import get_gemini_client
from app.utils.logger import get_logger

logger = get_logger(__name__)


def build_context(session_doc: Dict[str, Any]) -> Dict[str, Any]:
    """
    Extract a lean subset of the stored session for the prompt:
      - top 3 claims
      - top 3 search results
      - top 2 sources
      - score, verdict, query
    """
    return {
        "query": session_doc.get("query", ""),
        "verdict": session_doc.get("verdict", "Unverified"),
        "score": session_doc.get("score", 0.0),
        "explanation": session_doc.get("explanation", ""),
        "claims": session_doc.get("claims", [])[:3],
        "results": session_doc.get("results", [])[:3],
        "sources": session_doc.get("sources", [])[:2],
    }


def build_prompt(
    context: Dict[str, Any],
    last_n_chat: List[Dict[str, str]],
    question: str,
) -> str:
    """
    Assemble the structured fact-check assistant prompt.
    Uses only stored session data — no live search or scraping.
    """
    claims_text = "\n".join(
        f"  - [{c.get('verdict', '?')}] {c.get('claim', '')}: {c.get('explanation', '')}"
        for c in context["claims"]
    ) or "  None available."

    results_text = "\n".join(
        f"  - {r.get('title', r.get('href', 'Link'))}: {r.get('href', '')}"
        for r in context["results"]
    ) or "  None available."

    # Sources may be dicts or Pydantic-serialised objects
    sources_text = "\n".join(
        f"  - [{s.get('domain', '?')}] credibility={s.get('credibility_score', '?')}: {s.get('url', '')}"
        if isinstance(s, dict)
        else f"  - {s}"
        for s in context["sources"]
    ) or "  None available."

    history_text = ""
    if last_n_chat:
        lines = []
        for turn in last_n_chat:
            lines.append(f"User: {turn.get('question', '')}")
            lines.append(f"Assistant: {turn.get('answer', '')}")
        history_text = "\n".join(lines)
    else:
        history_text = "None."

    prompt = f"""You are a fact-check assistant.
Use ONLY the provided data to answer the question.

Data:
Query: {context['query']}
Overall Verdict: {context['verdict']} (score: {context['score']:.2f})
Summary: {context['explanation']}

Claims:
{claims_text}

Search Results:
{results_text}

Sources:
{sources_text}

Previous conversation:
{history_text}

Current question: {question}

Answer clearly, concisely, and factually.
Do not hallucinate. If information is missing, say so."""

    return prompt


async def generate_answer(
    session_doc: Dict[str, Any],
    question: str,
) -> Tuple[str, int]:
    """
    Build the prompt, call Gemini gemini-2.5-flash at temperature=0.2,
    and return (answer_text, token_count).
    """
    context = build_context(session_doc)

    # Use last 3 turns for conversational continuity
    chat_history: List[Dict] = session_doc.get("chat_history", [])
    last_n_chat = chat_history[-3:]

    prompt = build_prompt(context, last_n_chat, question)

    client = get_gemini_client()
    if not client:
        logger.warning("No GEMINI_API_KEY configured — returning mock answer.")
        return "No AI backend configured. Please set GEMINI_API_KEY.", 0

    logger.info(
        "Calling Gemini for chat answer.",
        extra={"question": question[:80]},
    )

    response = await client.aio.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
        config=types.GenerateContentConfig(
            temperature=0.2,
        ),
    )

    answer_text: str = response.text or ""
    token_count: int = 0
    if response.usage_metadata:
        token_count = (
            (response.usage_metadata.prompt_token_count or 0)
            + (response.usage_metadata.candidates_token_count or 0)
        )

    return answer_text.strip(), token_count
