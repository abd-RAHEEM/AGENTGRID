"""
AGENTGRID FastAPI backend.
Entry point: uvicorn main:app --reload --port 8000
(run from backend/ directory)
"""
from __future__ import annotations
import os
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

from routers.simulate import router as simulate_router
from routers.chat import router as chat_router
from routers.voice import router as voice_router

app = FastAPI(
    title="AGENTGRID API",
    description="Multi-agent energy OS backend",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex="https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(simulate_router)
app.include_router(chat_router)
app.include_router(voice_router)

@app.get("/health")
async def health():
    return {"status": "ok", "service": "agentgrid-backend"}
