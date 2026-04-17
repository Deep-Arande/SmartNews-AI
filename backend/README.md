# News Verification Engine

A claim-based fact-checking backend built with FastAPI, MongoDB, RAG, and LLMs.

## Features
- Search duckduckgo for claims
- Scrape websites with `crawl4ai` (or BeautifulSoup fallback)
- Extract multi-point claims via OpenAI LLM
- FAISS-based RAG service for evidence retrieval
- Entity-relationship graph mapping with `networkx`
- Scoring functionality based on conflict detection and source credibility 
- Detailed explanations of veracity

## Setup

1. **Python Environment**
```bash
python -m venv venv
# On Windows:
venv\Scripts\activate
# Install requirements
pip install -r requirements.txt
```

2. **Environment Variables**
Create a `.env` file in the root directory:
```env
OPENAI_API_KEY=your_openai_api_key  # Optional: Will use mock responses without it
MONGO_URI=mongodb://localhost:27017 # Optional: Defaults to localhost
```

3. **Run MongoDB Locally**
Make sure MongoDB is running on port 27017, or update your `MONGO_URI`.

4. **Run Server**
```bash
uvicorn app.main:app --reload
```

## Testing Endpoint
Send a POST request to `http://localhost:8000/verify/`

```json
{
  "query": "India banned XYZ app"
}
```

You'll receive a structured JSON verdict explaining the truth score.
