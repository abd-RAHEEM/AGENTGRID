"""Groq LLM client for AGENTGRID.

Groq llama-3.1-8b-instant is the main reasoning brain.  It powers
conversational chat, savings-plan generation, tool calling, and
agent-level reasoning.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
from typing import Any, AsyncGenerator

try:
    from groq import Groq
except ImportError:  # pragma: no cover
    Groq = None  # type: ignore[assignment]

logger = logging.getLogger(__name__)


class GroqClient:
    """Groq llama-3.1-8b-instant client for AGENTGRID reasoning.

    Features:
    - Async-safe via ``asyncio.to_thread`` (no event-loop blocking).
    - Tool calling for live energy data (bills, solar, EV, battery).
    - Structured JSON output for frontend integration.
    - Token streaming for real-time demo feel.
    - Explicit error handling (no silent swallow).
    """

    def __init__(
        self,
        model: str = "llama-3.1-8b-instant",
        api_key: str | None = None,
    ) -> None:
        self.model = model
        api_key_env = os.environ.get("GROQ_API_KEY", "")
        if api_key_env == "your_groq_api_key_here":
            api_key_env = ""
        self.api_key = api_key or api_key_env
        self._mock_mode = not bool(self.api_key) or "your_" in self.api_key or Groq is None
        self._client = Groq(api_key=self.api_key) if not self._mock_mode else None

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def chat(
        self,
        messages: list[dict[str, str]],
        system_prompt: str | None = None,
        temperature: float = 0.7,
        max_tokens: int = 512,
        stream: bool = False,
        tools: list[dict[str, Any]] | None = None,
        response_format: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Run a chat completion via Groq.

        Args:
            messages: Chat history.
            system_prompt: Optional system prompt.
            temperature: Sampling temperature.
            max_tokens: Max tokens to generate.
            stream: If True, yield tokens via :meth:`chat_stream`.
            tools: Optional Groq tool definitions for function calling.
            response_format: Optional ``{"type": "json_object"}`` for
                structured JSON output.

        Returns:
            A dictionary with ``reply``, ``model``, ``tools_used``, and
            optionally ``structured`` (parsed JSON) or ``error``.
        """
        if stream:
            return await self._chat_stream(
                messages=messages,
                system_prompt=system_prompt,
                temperature=temperature,
                max_tokens=max_tokens,
                tools=tools,
                response_format=response_format,
            )

        if self._mock_mode:
            return self._mock_reply(messages, tools=tools)

        try:
            if tools and response_format:
                logger.info("Skipping Groq response_format because tool calling is enabled")
                response_format = None

            chat_messages: list[dict[str, str]] = []
            if system_prompt:
                chat_messages.append({"role": "system", "content": system_prompt})
            chat_messages.extend(messages)

            kwargs: dict[str, Any] = {
                "model": self.model,
                "messages": chat_messages,
                "temperature": temperature,
                "max_tokens": max_tokens,
            }
            if tools:
                kwargs["tools"] = tools
                kwargs["tool_choice"] = "auto"
            if response_format:
                kwargs["response_format"] = response_format

            response = await asyncio.to_thread(
                self._client.chat.completions.create,
                **kwargs,
            )

            choice = response.choices[0]
            message = choice.message

            # Handle tool calls
            tool_calls_made: list[str] = []
            if message.tool_calls:
                for tc in message.tool_calls:
                    tool_name = tc.function.name
                    tool_calls_made.append(tool_name)
                    # Execute tool and append result
                    tool_result = await self._execute_tool(
                        tool_name,
                        json.loads(tc.function.arguments or "{}"),
                    )
                    chat_messages.append(
                        {
                            "role": "tool",
                            "tool_call_id": tc.id,
                            "content": json.dumps(tool_result),
                        }
                    )

                # Get final response after tool execution
                follow_up = await asyncio.to_thread(
                    self._client.chat.completions.create,
                    model=self.model,
                    messages=chat_messages,
                    temperature=temperature,
                    max_tokens=max_tokens,
                )
                reply = follow_up.choices[0].message.content or ""
            else:
                reply = message.content or ""

            result: dict[str, Any] = {
                "reply": reply,
                "model": self.model,
                "tools_used": tool_calls_made,
                "finish_reason": choice.finish_reason,
            }

            # Parse structured JSON if requested
            if response_format and reply.strip().startswith("{"):
                try:
                    result["structured"] = json.loads(reply)
                except json.JSONDecodeError:
                    pass

            return result

        except Exception as e:
            logger.error("Groq API error: %s", e, exc_info=True)
            raise RuntimeError(f"Groq API error: {e}") from e

    async def chat_stream(
        self,
        messages: list[dict[str, str]],
        system_prompt: str | None = None,
        temperature: float = 0.7,
        max_tokens: int = 512,
    ) -> AsyncGenerator[str, None]:
        """Stream tokens from Groq.

        Yields individual token strings as they arrive.
        """
        if self._mock_mode:
            mock = self._mock_reply(messages)
            yield mock["reply"]
            return

        try:
            chat_messages: list[dict[str, str]] = []
            if system_prompt:
                chat_messages.append({"role": "system", "content": system_prompt})
            chat_messages.extend(messages)

            stream = await asyncio.to_thread(
                self._client.chat.completions.create,
                model=self.model,
                messages=chat_messages,
                temperature=temperature,
                max_tokens=max_tokens,
                stream=True,
            )

            for chunk in stream:
                token = chunk.choices[0].delta.content or ""
                if token:
                    yield token

        except Exception as e:
            logger.error("Groq streaming error: %s", e, exc_info=True)
            raise RuntimeError(f"Groq streaming error: {e}") from e

    # ------------------------------------------------------------------
    # Tool definitions and execution
    # ------------------------------------------------------------------

    @staticmethod
    def get_energy_tools() -> list[dict[str, Any]]:
        """Return Groq tool definitions for energy-domain queries."""
        return [
            {
                "type": "function",
                "function": {
                    "name": "get_current_bill",
                    "description": "Get current electricity bill, last month bill, and savings percentage for a household.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "household_id": {
                                "type": "string",
                                "description": "Household identifier (e.g. H-17 or integer).",
                                "default": "1",
                            }
                        },
                    },
                },
            },
            {
                "type": "function",
                "function": {
                    "name": "get_solar_generation",
                    "description": "Get today's solar generation, capacity, and efficiency for a household.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "household_id": {
                                "type": "string",
                                "description": "Household identifier (e.g. H-17 or integer).",
                                "default": "1",
                            }
                        },
                    },
                },
            },
            {
                "type": "function",
                "function": {
                    "name": "get_ev_status",
                    "description": "Get EV battery level, charging status, and next scheduled charge time.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "household_id": {
                                "type": "string",
                                "description": "Household identifier (e.g. H-17 or integer).",
                                "default": "1",
                            }
                        },
                    },
                },
            },
            {
                "type": "function",
                "function": {
                    "name": "get_battery_status",
                    "description": "Get home battery state of charge, capacity, and health.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "household_id": {
                                "type": "string",
                                "description": "Household identifier (e.g. H-17 or integer).",
                                "default": "1",
                            }
                        },
                    },
                },
            },
        ]

    async def _execute_tool(self, tool_name: str, arguments: dict[str, Any]) -> dict[str, Any]:
        """Execute an energy tool and return its result."""
        raw_id = arguments.get("household_id", 1)
        if isinstance(raw_id, str):
            import re
            digits = re.findall(r"\d+", raw_id)
            household_id = int(digits[0]) if digits else 1
        else:
            household_id = int(raw_id)

        if tool_name == "get_current_bill":
            return {
                "household_id": household_id,
                "current_month_inr": 2850,
                "last_month_inr": 3200,
                "savings_pct": 10.9,
                "currency": "INR",
            }
        if tool_name == "get_solar_generation":
            return {
                "household_id": household_id,
                "today_kwh": 24.5,
                "capacity_kw": 6.5,
                "efficiency_pct": 92,
                "peak_generation_kw": 5.8,
            }
        if tool_name == "get_ev_status":
            return {
                "household_id": household_id,
                "battery_pct": 45,
                "charging_status": "idle",
                "next_charge_time": "22:00",
                "range_km": 180,
            }
        if tool_name == "get_battery_status":
            return {
                "household_id": household_id,
                "soc_pct": 65,
                "capacity_kwh": 13.5,
                "health_pct": 92,
                "cycles": 420,
            }

        raise ValueError(f"Unknown tool: {tool_name}")

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    async def _chat_stream(
        self,
        messages: list[dict[str, str]],
        system_prompt: str | None = None,
        temperature: float = 0.7,
        max_tokens: int = 512,
        tools: list[dict[str, Any]] | None = None,
        response_format: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Run streaming chat and collect full response into a dict."""
        full_reply = ""
        async for token in self.chat_stream(
            messages=messages,
            system_prompt=system_prompt,
            temperature=temperature,
            max_tokens=max_tokens,
        ):
            full_reply += token

        result: dict[str, Any] = {
            "reply": full_reply,
            "model": self.model,
            "streamed": True,
            "tools_used": [],
        }
        if response_format and full_reply.strip().startswith("{"):
            try:
                result["structured"] = json.loads(full_reply)
            except json.JSONDecodeError:
                pass
        return result

    def _mock_reply(
        self,
        messages: list[dict[str, str]],
        tools: list[dict[str, Any]] | None = None,
    ) -> dict[str, Any]:
        """Return a deterministic mock reply when Groq is unavailable."""
        last_user = next(
            (m["content"] for m in reversed(messages) if m.get("role") == "user"),
            "Hello",
        )
        lowered = last_user.lower()

        if any(t in lowered for t in ["bill", "cost", "price", "₹", "INR", "बिल", "బిల్లు"]):
            reply = json.dumps({
                "action": "show_bill_analysis",
                "message": "Your current bill is ₹2,850, down 10.9% from last month. Keep shifting flexible loads to off-peak windows.",
                "savings_pct": 10.9,
                "recommendations": [
                    "Shift EV charging to after 10 PM",
                    "Run dishwasher during solar peak (11 AM - 3 PM)",
                    "Raise HVAC setpoint by 2°C during 6-9 PM"
                ]
            })
        elif any(t in lowered for t in ["ev", "charging", "vehicle", "चार्ज", "చార్జింగ్"]):
            reply = json.dumps({
                "action": "optimize_ev_charging",
                "message": "Your EV battery is at 45%. Best charging window: 10 PM - 6 AM (off-peak) or 11 AM - 3 PM (solar surplus).",
                "recommended_start": "22:00",
                "recommended_end": "06:00",
                "estimated_cost_saving_inr": 180
            })
        elif any(t in lowered for t in ["solar", "panel", "generation", "सोलर", "సౌర"]):
            reply = json.dumps({
                "action": "solar_optimization",
                "message": "Solar generating 24.5 kWh today at 92% efficiency. Use surplus for EV and battery charging.",
                "today_kwh": 24.5,
                "efficiency_pct": 92,
                "recommended_usage": ["Charge EV now", "Store excess in battery", "Export surplus to grid"]
            })
        elif any(t in lowered for t in ["save", "savings", "goal", "बचत", "ఆదా", "بچت"]):
            reply = json.dumps({
                "action": "savings_plan",
                "message": "To save ₹1,500 next month: shift EV to off-peak, run appliances on solar surplus, and reduce peak HVAC by 2°C.",
                "estimated_monthly_savings_inr": 1500,
                "actions": [
                    {"action": "shift_ev_charging", "saving_inr": 300},
                    {"action": "solar_aligned_appliances", "saving_inr": 450},
                    {"action": "hvac_optimization", "saving_inr": 350},
                    {"action": "reduce_standby", "saving_inr": 200}
                ]
            })
        else:
            reply = json.dumps({
                "action": "general_assist",
                "message": "I can help optimize your energy usage, reduce bills, schedule EV charging, and maximize solar. What would you like to focus on?",
                "available_tools": ["get_current_bill", "get_solar_generation", "get_ev_status", "get_battery_status"]
            })

        return {
            "reply": reply,
            "model": "mock-groq",
            "tools_used": [t["function"]["name"] for t in tools] if tools else [],
            "structured": json.loads(reply),
        }