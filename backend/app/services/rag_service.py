import numpy as np
import faiss
import os
from google import genai
from typing import List, Dict

def get_gemini_client():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return None
    return genai.Client(api_key=api_key)

async def get_embeddings(texts: List[str]) -> np.ndarray:
    client = get_gemini_client()
    if not client:
        # Mock embeddings - 768 dimensions for Gemini text-embedding-004 instead of 1536 for OpenAI
        return np.random.rand(len(texts), 768).astype('float32')
        
    try:
        response = await client.aio.models.embed_content(
            contents=texts,
            model="text-embedding-004"
        )
        embeddings = [data.values for data in response.embeddings]
        return np.array(embeddings).astype('float32')
    except Exception as e:
        print(f"Error getting embeddings: {e}")
        return np.random.rand(len(texts), 768).astype('float32')

async def index_and_retrieve(claims: List[str], documents: List[str], top_k: int = 3) -> Dict[str, List[str]]:
    """
    Chunks documents, creates a FAISS index, and retrieves top_k chunks for each claim.
    """
    # Simple chunking by paragraph
    chunks = []
    for doc in documents:
        paragraphs = [p.strip() for p in doc.split('\n\n') if len(p.strip()) > 50]
        chunks.extend(paragraphs)

    if not chunks:
        return {claim: [] for claim in claims}
        
    chunk_embeddings = await get_embeddings(chunks)
    
    d = chunk_embeddings.shape[1]
    index = faiss.IndexFlatL2(d)
    index.add(chunk_embeddings)
    
    claim_embeddings = await get_embeddings(claims)
    
    D, I = index.search(claim_embeddings, min(top_k, len(chunks)))
    
    results = {}
    for i, claim in enumerate(claims):
        relevant_chunks = [chunks[idx] for idx in I[i] if idx < len(chunks)]
        results[claim] = relevant_chunks
        
    return results
