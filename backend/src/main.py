from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import asyncio
import logging

from api.routes import game_routes, websocket_routes
from core.database import database

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(game_routes.router)
app.include_router(websocket_routes.router)

@app.on_event("startup")
async def startup():
    """Connect to the database with retries.

    This helps with transient DNS or DB readiness failures when running under
    docker-compose (the container DNS or DB may not be immediately available).
    """
    logger = logging.getLogger("backend.startup")
    max_retries = 10
    delay = 1.0
    for attempt in range(1, max_retries + 1):
        try:
            await database.connect()
            logger.info("Connected to database on attempt %d", attempt)
            break
        except Exception as e:
            # Catch transient name resolution or connection errors and retry
            logger.warning("Database connect attempt %d/%d failed: %s", attempt, max_retries, e)
            if attempt == max_retries:
                logger.error("Exceeded max retries connecting to database. Raising.")
                raise
            await asyncio.sleep(delay)


@app.on_event("shutdown")
async def shutdown():
    await database.disconnect()

def run_app():
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
