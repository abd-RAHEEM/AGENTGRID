"""
chat.py — AI chat endpoint powered by Groq LLaMA-3.1-8b-instant.
POST /chat: single-turn chat with community context.
"""
from __future__ import annotations
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from llms.groq_client import GroqClient
from llms.sarwam_client import SarvamClient

router = APIRouter(prefix="/chat", tags=["chat"])

_groq = GroqClient()
_sarvam = SarvamClient()

SYSTEM_PROMPT_TEMPLATE = """You are ARIA, the AI energy advisor for AGENTGRID — an autonomous multi-agent energy management system for a 50-home residential community in India.

Current community status:
- Solar Generation: {solar_generation} kWh
- Battery Level: {battery_level}%
- Grid Import: {grid_import} kWh
- Active EVs Charging: {ev_count}/10
- Renewable Usage: {renewable_usage}%
- Active Scenario: {active_scenario}
{house_section}
You help residents:
- Understand their energy usage and solar generation
- Optimize EV charging to save money
- Reduce electricity bills (use ₹ for rupees, kWh for energy)
- Interpret what the autonomous agents are doing
- Plan for events like heatwaves, cloud cover, grid outages

Rules:
- Keep responses concise, actionable, and specific
- Always respond in the same language the user writes in
- Use ₹ for currency, kWh for energy units
- If asked about savings, give specific rupee estimates when possible
- You can understand and respond in English, Hindi, Telugu, and Urdu"""

class ChatMessage(BaseModel):
    role: str   # "user" | "assistant"
    content: str

class HouseContext(BaseModel):
    house_id: str = ""
    consumption: float = 0.0
    solar_contribution_pct: float = 0.0
    energy_source: str = "mixed"
    solar_supply_kwh: float = 0.0
    battery_supply_kwh: float = 0.0
    grid_supply_kwh: float = 0.0

class CommunityContext(BaseModel):
    solarGeneration: float = 280
    batteryLevel:    float = 68
    gridImport:      float = 42
    evCount:         int   = 7
    renewableUsage:  float = 85
    activeScenario:  str   = "normal"
    selectedHouse:   Optional[HouseContext] = None

class ChatRequest(BaseModel):
    message:  str
    language: str = "english"
    history:  list[ChatMessage] = []
    context:  Optional[CommunityContext] = None

@router.post("")
async def chat(req: ChatRequest):
    ctx = req.context or CommunityContext()
    user_lang = req.language.lower().strip()
    
    # 1. Translate user message to English if it's not English
    english_message = req.message
    if user_lang != "english":
        translation_res = await _sarvam.translate(req.message, source_lang=user_lang, target_lang="english")
        english_message = translation_res.get("translated_text", req.message)
        
    # 2. Translate chat history to English if needed
    translated_history = []
    for msg in req.history:
        content = msg.content
        if user_lang != "english":
            translation_res = await _sarvam.translate(msg.content, source_lang=user_lang, target_lang="english")
            content = translation_res.get("translated_text", msg.content)
        translated_history.append({"role": msg.role, "content": content})

    house_section = ""
    if ctx.selectedHouse and ctx.selectedHouse.house_id:
        h = ctx.selectedHouse
        house_section = f"""
Currently selected house: {h.house_id}
- Consumption: {h.consumption:.1f} kWh
- Energy source type: {h.energy_source}
- Solar supplying: {h.solar_supply_kwh:.2f} kWh ({h.solar_contribution_pct:.0f}% of need)
- Battery supplying: {h.battery_supply_kwh:.2f} kWh
- Grid supplying: {h.grid_supply_kwh:.2f} kWh
"""
    system_prompt = SYSTEM_PROMPT_TEMPLATE.format(
        solar_generation = ctx.solarGeneration,
        battery_level    = ctx.batteryLevel,
        grid_import      = ctx.gridImport,
        ev_count         = ctx.evCount,
        renewable_usage  = ctx.renewableUsage,
        active_scenario  = ctx.activeScenario,
        house_section    = house_section,
    )
    
    messages = translated_history + [{"role": "user", "content": english_message}]
    
    result = await _groq.chat(
        messages      = messages,
        system_prompt = system_prompt,
        tools         = GroqClient.get_energy_tools(),
        temperature   = 0.7,
        max_tokens    = 512,
    )
    
    raw_reply = result.get("reply", "")
    structured = result.get("structured")
    
    # 3. Translate response back to the user's language if it's not English
    final_reply = raw_reply
    if user_lang != "english" and raw_reply:
        trans_reply = await _sarvam.translate(raw_reply, source_lang="english", target_lang=user_lang)
        final_reply = trans_reply.get("translated_text", raw_reply)
        
    if user_lang != "english" and structured and "message" in structured:
        trans_struct = await _sarvam.translate(structured["message"], source_lang="english", target_lang=user_lang)
        structured["message"] = trans_struct.get("translated_text", structured["message"])

    return {
        "reply":      final_reply,
        "structured": structured,
        "tools_used": result.get("tools_used", []),
        "model":      result.get("model", ""),
    }
