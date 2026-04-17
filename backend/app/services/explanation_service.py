import os
from google import genai
from app.models.schemas import ClaimResult, Source
from typing import List

def get_gemini_client():
    api_key = os.getenv("GEMINI_API_KEY")
    return genai.Client(api_key=api_key) if api_key else None

async def generate_explanation(claims: List[ClaimResult], sources: List[Source], score: float) -> str:
    """
    Use LLM to generate summary explanation.
    """
    client = get_gemini_client()
    if not client:
        return f"Mock explanation: Overall score is {score:.2f} based on {len(claims)} claims."
        
    claims_text = "\n".join([f"- {c.claim} [{c.verdict}]" for c in claims])
    sources_text = "\n".join([f"- {s.domain} (Trust: {s.credibility_score})" for s in sources])
    
    prompt = f"""
    You are a fact-checking AI reporting to the user.
    Based on the following data, write a concise, human-readable explanation of why the final truth score is {score:.2f}/1.0.
    
    Claims Verified:
    {claims_text}
    
    Sources Used:
    {sources_text}
    
    Output just the explanation text. Keep it under 150 words.
    """
    
    try:
        from google.genai import types
        response = await client.aio.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(temperature=0.0)
        )
        return response.text.strip()
    except Exception as e:
        print(f"Error generating explanation: {e}")
        return f"Failed to generate explanation. Score is {score:.2f}."
