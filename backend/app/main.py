import sys
import asyncio

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

from fastapi import FastAPI
from app.routes.verify import router as verify_router
from app.db.mongodb import connect_to_mongo, close_mongo_connection
import uvicorn
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(
    title="News Verification Engine",
    description="Fact-checking API based on RAG and LLMs",
    version="1.0.0"
)

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins, including file:// where your index.html runs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_db_client():
    await connect_to_mongo()

@app.on_event("shutdown")
async def shutdown_db_client():
    await close_mongo_connection()

app.include_router(verify_router, prefix="/verify", tags=["Verify"])

@app.get("/")
def root():
    return {"message": "Welcome to the News Verification Engine API. POST to /verify for fact checking."}

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
