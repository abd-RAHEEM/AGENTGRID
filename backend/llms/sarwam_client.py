"""Sarvam AI client for AGENTGRID.

Sarvam is used only for the NLP layer (speech-to-text, text-to-speech,
and translation).  The main reasoning/chat brain is Groq LLaMA-3B.
"""

from __future__ import annotations

import asyncio
import base64
import io
import logging
import os
import tempfile
from typing import Any

try:
    import requests
except ImportError:  # pragma: no cover
    requests = None  # type: ignore[assignment]

try:
    from sarvamai import SarvamAI as SyncSarvamAI
except ImportError:  # pragma: no cover
    SyncSarvamAI = None  # type: ignore[assignment,misc]

logger = logging.getLogger(__name__)


class SarvamClient:
    """Sarvam AI SDK wrapper for energy-domain voice and translation tasks.

    Supported languages: English, Hindi, Telugu, Urdu.

    When ``SARVAM_API_KEY`` is configured the client uses the real SDK /
    REST endpoints.  When the key is missing the client falls back
    to lightweight mock responses so the backend remains runnable without
    credentials.
    """

    SUPPORTED_LANGUAGES = ["english", "hindi", "telugu", "urdu"]

    _LANGUAGE_CODES: dict[str, str] = {
        "english": "en-IN",
        "hindi": "hi-IN",
        "telugu": "te-IN",
        "urdu": "ur-IN",
    }

    _SPEAKERS: dict[str, str] = {
        "hindi": "ritu",
        "telugu": "kavitha",
        "urdu": "rehan",
        "english": "aditya",
    }

    def __init__(self) -> None:
        api_key_env = os.environ.get("SARVAM_API_KEY", "")
        if api_key_env == "your_sarvam_api_key_here":
            api_key_env = ""
        self.api_key = api_key_env
        self._mock_mode = not bool(self.api_key) or "your_" in self.api_key or requests is None
        if self._mock_mode:
            logger.warning(
                "SarvamClient running in MOCK mode (api_key=%s, requests=%s)",
                "present" if self.api_key else "MISSING",
                "available" if requests else "MISSING",
            )
        else:
            logger.info("SarvamClient initialized with real API key")

    def _validate_language(self, language: str) -> str:
        normalized = language.strip().lower()
        return normalized if normalized in self.SUPPORTED_LANGUAGES else "english"

    # ------------------------------------------------------------------ #
    #  Speech-to-Text  (REST API — multipart file upload)
    # ------------------------------------------------------------------ #
    async def speech_to_text(self, audio_data: bytes, language: str = "english") -> dict[str, Any]:
        """Transcribe audio using Sarvam REST STT API.

        Uses ``POST https://api.sarvam.ai/speech-to-text`` with multipart
        file upload as documented in the Sarvam API docs.

        Args:
            audio_data: Raw audio bytes (WAV, WebM, MP3, etc.).
            language: Target language from :attr:`SUPPORTED_LANGUAGES`.

        Returns:
            A dictionary containing ``transcript``, ``language``, and
            ``confidence``.
        """
        selected_language = self._validate_language(language)

        if self._mock_mode:
            logger.info("STT mock mode — returning default transcript")
            return {
                "transcript": "How can I reduce my electricity bill this month?",
                "language": selected_language,
                "confidence": 0.92,
            }

        if not audio_data or len(audio_data) < 100:
            logger.warning("STT called with empty/tiny audio (%d bytes)", len(audio_data))
            return {
                "transcript": "",
                "language": selected_language,
                "confidence": 0.0,
            }

        try:
            lang_code = self._LANGUAGE_CODES.get(selected_language, "en-IN")
            url = "https://api.sarvam.ai/speech-to-text"
            headers = {
                "api-subscription-key": self.api_key,
            }

            # Sarvam expects a file upload via multipart/form-data.
            # The browser records audio/webm; Sarvam accepts it.
            content_type = "audio/webm"
            if audio_data[:4] == b"RIFF":
                content_type = "audio/wav"
            elif audio_data[:3] == b"ID3" or audio_data[:2] == b"\xff\xfb":
                content_type = "audio/mpeg"

            files = {
                "file": ("recording.webm", io.BytesIO(audio_data), content_type),
            }
            data = {
                "model": "saaras:v3",
                "language_code": lang_code,
                "mode": "transcribe",
            }

            logger.info("Calling Sarvam STT: %d bytes, lang=%s, content_type=%s", len(audio_data), lang_code, content_type)

            # Run the blocking HTTP call in a thread pool to avoid blocking the event loop
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                lambda: requests.post(url, headers=headers, files=files, data=data, timeout=30),
            )

            logger.info("Sarvam STT response: status=%d", response.status_code)

            if response.status_code != 200:
                logger.error("Sarvam STT failed: status=%d, body=%s", response.status_code, response.text[:500])
                return {
                    "transcript": "",
                    "language": selected_language,
                    "confidence": 0.0,
                }

            result = response.json()
            logger.info("Sarvam STT result: %s", str(result)[:300])

            transcript = result.get("transcript", "")
            confidence = float(result.get("confidence", 0.85) or 0.85)

            return {
                "transcript": transcript,
                "language": selected_language,
                "confidence": confidence if transcript else 0.0,
            }

        except requests.exceptions.Timeout:
            logger.error("Sarvam STT timed out after 30s")
            return {
                "transcript": "",
                "language": selected_language,
                "confidence": 0.0,
            }
        except Exception as exc:
            logger.error("Sarvam STT unexpected error: %s", exc, exc_info=True)
            return {
                "transcript": "",
                "language": selected_language,
                "confidence": 0.0,
            }

    # ------------------------------------------------------------------ #
    #  Text-to-Speech  (REST API — returns base64 audio in JSON)
    # ------------------------------------------------------------------ #
    async def text_to_speech(self, text: str, language: str = "english") -> dict[str, Any]:
        """Convert text to speech using Sarvam TTS REST API.

        Uses ``POST https://api.sarvam.ai/text-to-speech`` which returns
        JSON with an ``audios`` array of base64-encoded WAV strings.

        Args:
            text: Text to synthesize.
            language: Target language from :attr:`SUPPORTED_LANGUAGES`.

        Returns:
            A dictionary containing ``audio_base64``, ``language``, and ``text``.
        """
        selected_language = self._validate_language(language)

        if self._mock_mode:
            logger.info("TTS mock mode — returning empty audio")
            return {
                "audio_base64": "",
                "language": selected_language,
                "text": text,
            }

        if not text or not text.strip():
            logger.warning("TTS called with empty text")
            return {
                "audio_base64": "",
                "language": selected_language,
                "text": text,
            }

        try:
            url = "https://api.sarvam.ai/text-to-speech"
            headers = {
                "api-subscription-key": self.api_key,
                "Content-Type": "application/json",
            }
            payload = {
                "text": text[:500],  # Sarvam has a text length limit
                "target_language_code": self._LANGUAGE_CODES.get(selected_language, "en-IN"),
                "speaker": self._SPEAKERS.get(selected_language, "aditya"),
                "model": "bulbul:v3",
                "pace": 1.1,
                "speech_sample_rate": 22050,
                "enable_preprocessing": True,
            }

            logger.info("Calling Sarvam TTS: %d chars, lang=%s, speaker=%s", len(text), selected_language, payload["speaker"])

            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                lambda: requests.post(url, headers=headers, json=payload, timeout=30),
            )

            logger.info("Sarvam TTS response: status=%d", response.status_code)

            if response.status_code != 200:
                logger.error("Sarvam TTS failed: status=%d, body=%s", response.status_code, response.text[:500])
                return {
                    "audio_base64": "",
                    "language": selected_language,
                    "text": text,
                }

            result = response.json()
            audios = result.get("audios", [])

            if audios and isinstance(audios, list) and len(audios) > 0:
                audio_b64 = audios[0]
                logger.info("Sarvam TTS success: audio base64 length=%d", len(audio_b64))
                return {
                    "audio_base64": audio_b64,
                    "audio_mime_type": "audio/wav",
                    "language": selected_language,
                    "text": text,
                }
            else:
                logger.warning("Sarvam TTS returned empty audios array: %s", str(result)[:300])
                return {
                    "audio_base64": "",
                    "language": selected_language,
                    "text": text,
                }

        except requests.exceptions.Timeout:
            logger.error("Sarvam TTS timed out after 30s")
            return {
                "audio_base64": "",
                "language": selected_language,
                "text": text,
            }
        except Exception as exc:
            logger.error("Sarvam TTS unexpected error: %s", exc, exc_info=True)
            return {
                "audio_base64": "",
                "language": selected_language,
                "text": text,
            }

    # ------------------------------------------------------------------ #
    #  Translation
    # ------------------------------------------------------------------ #
    async def translate(self, text: str, source_lang: str, target_lang: str) -> dict[str, Any]:
        """Translate text using Sarvam or return a mock translation.

        Args:
            text: Source text.
            source_lang: Source language from :attr:`SUPPORTED_LANGUAGES`.
            target_lang: Target language from :attr:`SUPPORTED_LANGUAGES`.

        Returns:
            A dictionary containing ``translated_text``, ``source_language``,
            and ``target_language``.
        """
        selected_source = self._validate_language(source_lang)
        selected_target = self._validate_language(target_lang)

        if selected_source == selected_target:
            return {
                "translated_text": text,
                "source_language": selected_source,
                "target_language": selected_target,
            }

        if self._mock_mode:
            mock_map: dict[tuple[str, str], str] = {
                ("english", "hindi"): "मैं अपने बिजली बिल को कम करने में मदद चाहता हूं।",
                ("english", "telugu"): "నా విద్యుత్ బిల్లు తగ్గించడంలో సహాయం కావాలి.",
                ("english", "urdu"): "میں اپنے بجلی کے بل کو کم کرنے میں مدد چاہتا ہوں۔",
                ("hindi", "english"): "I want help reducing my electricity bill.",
                ("telugu", "english"): "I want help reducing my electricity bill.",
                ("urdu", "english"): "I want help reducing my electricity bill.",
            }
            translated_text = mock_map.get(
                (selected_source, selected_target),
                f"[Mock {selected_target} translation] {text}",
            )
            return {
                "translated_text": translated_text,
                "source_language": selected_source,
                "target_language": selected_target,
            }

        try:
            url = "https://api.sarvam.ai/translate"
            headers = {
                "api-subscription-key": self.api_key,
                "Content-Type": "application/json",
            }
            payload = {
                "input": text,
                "source_language_code": self._LANGUAGE_CODES.get(selected_source, "en-IN"),
                "target_language_code": self._LANGUAGE_CODES.get(selected_target, "en-IN"),
                "model": "mayura:v1",
            }

            logger.info("Calling Sarvam Translate: %s -> %s", selected_source, selected_target)

            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                lambda: requests.post(url, headers=headers, json=payload, timeout=15),
            )

            if response.status_code != 200:
                logger.error("Sarvam Translate failed: status=%d, body=%s", response.status_code, response.text[:300])
                return {
                    "translated_text": text,
                    "source_language": selected_source,
                    "target_language": selected_target,
                }

            result = response.json()
            translated = result.get("translated_text", text)
            logger.info("Sarvam Translate success: '%s' -> '%s'", text[:50], str(translated)[:50])

            return {
                "translated_text": translated,
                "source_language": selected_source,
                "target_language": selected_target,
            }

        except Exception as exc:
            logger.error("Sarvam Translate error: %s", exc, exc_info=True)
            return {
                "translated_text": text,
                "source_language": selected_source,
                "target_language": selected_target,
            }