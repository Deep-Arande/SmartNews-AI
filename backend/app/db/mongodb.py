from motor.motor_asyncio import AsyncIOMotorClient
import os

client = None
db = None

async def connect_to_mongo():
    global client, db
    mongo_url = os.getenv("MONGO_URI", "mongodb://localhost:27017")
    client = AsyncIOMotorClient(mongo_url)
    db = client.fact_checker

async def close_mongo_connection():
    global client
    if client is not None:
        client.close()

def get_db():
    return db
