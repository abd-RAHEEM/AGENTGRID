"""
voice.py — Voice endpoints: STT and TTS via Sarvam AI.
POST /voice/stt: audio file → transcript
POST /voice/tts: text → base64 audio
"""
from __future__ import annotations
from fastapi import APIRouter, File, UploadFile, Query
from pydantic import BaseModel
from llms.sarwam_client import SarvamClient

router = APIRouter(prefix="/voice", tags=["voice"])

_sarvam = SarvamClient()

VALID_LANGUAGES = ["english", "hindi", "telugu", "urdu"]

@router.post("/stt")
async def speech_to_text(
    audio: UploadFile = File(...),
    language: str = Query(default="english"),
):
    """Convert audio recording to text transcript."""
    if language not in VALID_LANGUAGES:
        language = "english"

    audio_bytes = await audio.read()
    result = await _sarvam.speech_to_text(audio_bytes, language=language)
    return result   # { transcript, language, confidence }

class TTSRequest(BaseModel):
    text:     str
    language: str = "english"

@router.post("/tts")
async def text_to_speech(req: TTSRequest):
    """Convert text to speech audio (returns base64 WAV)."""
    language = req.language if req.language in VALID_LANGUAGES else "english"
    result = await _sarvam.text_to_speech(req.text, language=language)
    return result   # { audio_base64, language, text }
