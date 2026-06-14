"""
simulate.py — Agent pipeline endpoints.
POST /simulate: run a scenario, return decisions + community metrics.
WS  /ws/negotiate: stream agent logs in real time via WebSocket.
"""
from __future__ import annotations
import asyncio
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from agents.run import run_cycle_full, generate_mock_community_state, inject_scenario
from agents.graph import app as langgraph_app

router = APIRouter()

# Scenario name mapping: frontend camelCase → backend snake_case
SCENARIO_MAP: dict[str, str | None] = {
    "normal":      None,            # no injection needed
    "cloudCover":  "cloud_cover",
    "heatwave":    "heatwave",
    "gridFailure": "grid_failure",
    "evSurge":     "ev_surge",
}

# Which agent node maps to which display name
AGENT_DISPLAY_NAMES: dict[str, str] = {
    "solar_agent":   "Solar",
    "battery_agent": "Battery",
    "house_agents":  "House",
    "ev_agent":      "EV",
    "grid_agent":    "Grid",
    "optimizer":     "Optimizer",
}

class SimulateRequest(BaseModel):
    scenario: str = "normal"
    seed: int = 42
    solar_pct: float = 100.0    # 0-100, scales solar current_generation
    battery_pct: float = 100.0  # 0-100, scales battery soc
    grid_pct: float = 100.0     # 0-100, scales grid max_import_kw

def _build_state(
    scenario_frontend: str,
    seed: int,
    solar_pct: float = 100.0,
    battery_pct: float = 100.0,
    grid_pct: float = 100.0,
) -> dict:
    """Generate mock state and inject the scenario, then scale values by slider percentages."""
    state = generate_mock_community_state(seed=seed)
    backend_scenario = SCENARIO_MAP.get(scenario_frontend)
    if backend_scenario:
        inject_scenario(state, backend_scenario)
    # Apply slider scaling AFTER scenario injection so they compound correctly
    state["solar"]["current_generation"] = round(
        state["solar"]["current_generation"] * (solar_pct / 100.0), 2
    )
    state["solar"]["forecast_24h"] = [
        round(v * (solar_pct / 100.0), 2)
        for v in state["solar"]["forecast_24h"]
    ]
    state["battery"]["soc"] = min(
        100.0, round(state["battery"]["soc"] * (battery_pct / 100.0), 1)
    )
    state["grid"]["max_import_kw"] = round(
        state["grid"]["max_import_kw"] * (grid_pct / 100.0), 1
    )
    return state

def _map_to_frontend_metrics(state: dict, decisions: dict) -> dict:
    """Convert backend state + decisions to frontend CommunityMetrics shape."""
    solar   = state.get("solar",   {})
    battery = state.get("battery", {})
    evs     = state.get("evs",     [])

    paused_ids   = set(decisions.get("ev_charging_paused", []))
    active_evs   = sum(
        1 for ev in evs
        if ev.get("currently_charging") and ev.get("ev_id") not in paused_ids
    )

    return {
        "solarGeneration": round(solar.get("current_generation", 0), 1),
        "batteryLevel":    round(battery.get("soc", 0), 1),
        "gridImport":      round(decisions.get("grid_import_kw", 0), 1),
        "evCount":         active_evs,
        "moneySaved":      round(decisions.get("estimated_savings_inr", 0), 0),
        "carbonReduced":   round(decisions.get("carbon_saved_kg", 0), 1),
        "renewableUsage":  round(decisions.get("renewable_utilization_pct", 0), 1),
    }

@router.post("/simulate")
async def simulate(req: SimulateRequest):
    """Run the full agent pipeline for a scenario synchronously."""
    loop = asyncio.get_event_loop()
    state = _build_state(
        req.scenario, req.seed,
        req.solar_pct, req.battery_pct, req.grid_pct
    )
    result = await loop.run_in_executor(None, run_cycle_full, state)
    decisions = result.get("decisions", {})
    return {
        "decisions":         decisions,
        "community_metrics": _map_to_frontend_metrics(result, decisions),
        "logs":              result.get("logs", []),
        "scenario":          req.scenario,
    }

@router.websocket("/ws/negotiate")
async def negotiate_websocket(websocket: WebSocket):
    """
    WebSocket: stream agent log lines in real time as each LangGraph node runs.
    Client sends: { "scenario": "cloudCover" }
    Server streams: { type: "log",       agent, message, timestamp }
                    { type: "decisions",  decisions, community_metrics }
                    { type: "done" }
    """
    await websocket.accept()
    try:
        data = await websocket.receive_json()
        scenario_frontend = data.get("scenario", "normal")
        solar_pct = float(data.get("solar_pct", 100.0))
        battery_pct = float(data.get("battery_pct", 100.0))
        grid_pct = float(data.get("grid_pct", 100.0))
        state = _build_state(scenario_frontend, seed=42, solar_pct=solar_pct,
                             battery_pct=battery_pct, grid_pct=grid_pct)

        # Run LangGraph synchronously in a thread pool (it's a sync generator).
        # We must clone/copy the logs at each snapshot because the state dictionary is mutated in place.
        def run_stream():
            snapshots = []
            for event in langgraph_app.stream(state):
                node_name = list(event.keys())[0]
                node_state = list(event.values())[0]
                snapshots.append((node_name, {
                    "logs": list(node_state.get("logs", [])),
                    "decisions": node_state.get("decisions", {}),
                    "solar": node_state.get("solar", {}),
                    "battery": node_state.get("battery", {}),
                    "evs": node_state.get("evs", []),
                }))
            return snapshots

        loop = asyncio.get_event_loop()
        events = await loop.run_in_executor(None, run_stream)

        prev_log_count = 0
        final_state: dict = {}

        for node_name, node_state in events:
            final_state = node_state

            new_logs = node_state.get("logs", [])[prev_log_count:]
            prev_log_count = len(node_state.get("logs", []))

            agent_display = AGENT_DISPLAY_NAMES.get(node_name, "System")
            timestamp = datetime.now().strftime("%H:%M:%S")

            for log_line in new_logs:
                await websocket.send_json({
                    "type":      "log",
                    "agent":     agent_display,
                    "message":   log_line,
                    "timestamp": timestamp,
                })
                # Pacing: creates the "watching agents think" effect
                await asyncio.sleep(0.38)

        decisions = final_state.get("decisions", {})
        community_metrics = _map_to_frontend_metrics(final_state, decisions)

        await websocket.send_json({
            "type":              "decisions",
            "decisions":         decisions,
            "community_metrics": community_metrics,
        })
        await websocket.send_json({"type": "done"})

    except WebSocketDisconnect:
        pass
    except Exception as e:
        try:
            await websocket.send_json({"type": "error", "message": str(e)})
        except Exception:
            pass
