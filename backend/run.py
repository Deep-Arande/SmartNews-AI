import sys
import asyncio
import platform

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

import uvicorn

if __name__ == "__main__":
    print("Starting Uvicorn Server with WindowsProactorEventLoopPolicy...")
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=False)
