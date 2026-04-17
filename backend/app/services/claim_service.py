import os
from google import genai
from typing import List

def get_gemini_client():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return None
    return genai.Client(api_key=api_key)

async def extract_claims(text: str) -> List[str]:
    """
    Extract factual claims from text using LLM.
    """
    client = get_gemini_client()
    if not client:
        return [f"Mock claim extracted from: {text[:50]}..."]

    try:
        from google.genai import types
        prompt = f"System: Extract factual claims from the text as short bullet points. Provide one claim per line, with no bullets or markdown.\n\nText: {text[:3000]}"
        response = await client.aio.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(temperature=0.0)
        )
        claims = response.text.split("\n")
        claims = [c.strip("-* ") for c in claims if c.strip()]
        return claims
    except Exception as e:
        print(f"Error extracting claims: {e}")
        return ["Failed to extract claims due to API error."]
