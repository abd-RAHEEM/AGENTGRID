"""
run.py
Public entrypoint for the AGENTGRID multi-agent system, plus mock data
generators for testing and demo purposes.

Exposes:
- run_cycle(state_dict) -> dict        : run full agent cycle, return decisions
- run_cycle_full(state_dict) -> dict   : run full agent cycle, return full state (incl. logs)
- inject_scenario(state, event)        : re-exported from scenarios.py
- generate_mock_community_state()      : 50 households, 10 EVs, 1 battery, 1 solar, 1 grid
"""

import random
from datetime import datetime, timedelta, timezone

from agents.state import CommunityState
from agents.graph import app
from agents.scenarios import inject_scenario  # re-export for FastAPI consumers
from agents.logger import clear_logs

__all__ = ["run_cycle", "run_cycle_full", "inject_scenario", "generate_mock_community_state"]


def run_cycle(state_dict: dict) -> dict:
    """Run the full agent cycle and return only the decisions dict.

    This is the public function called by Member 4's FastAPI service.
    """
    result = app.invoke(state_dict)
    return result["decisions"]


def run_cycle_full(state_dict: dict) -> CommunityState:
    """Run the full agent cycle and return the entire enriched state,
    including the human-readable negotiation logs (state['logs']).

    Useful for the demo's "Agent negotiation log" panel.
    """
    result = app.invoke(state_dict)
    return result


def generate_mock_community_state(seed: int = 42) -> CommunityState:
    """Generate a realistic mock CommunityState for testing/demo.

    Includes:
    - 1 solar plant
    - 1 community battery
    - 50 households
    - 10 EVs
    - 1 grid connection
    """
    rng = random.Random(seed)

    now = datetime.now(timezone.utc)
    timestamp = now.isoformat()

    # --- Solar ---
    current_generation = round(rng.uniform(150.0, 400.0), 2)
    forecast_24h = [round(max(0.0, rng.gauss(current_generation * 0.8, 60.0)), 2) for _ in range(24)]

    solar = {
        "current_generation": current_generation,
        "forecast_24h": forecast_24h,
        "surplus_now": 0.0,           # populated by SolarAgent
        "low_gen_windows": [],         # populated by SolarAgent
    }

    # --- Battery ---
    battery = {
        "soc": round(rng.uniform(40.0, 95.0), 1),
        "capacity": 120.0,             # kWh, community battery
        "charge_rate": 30.0,           # kW
        "available_discharge": 0.0,    # populated by BatteryAgent
        "health_pct": round(rng.uniform(85.0, 100.0), 1),
    }

    # --- Households (50) ---
    priorities = ["critical", "normal", "flexible"]
    priority_weights = [0.15, 0.55, 0.30]  # 15% critical, 55% normal, 30% flexible

    households = []
    for i in range(50):
        priority = rng.choices(priorities, weights=priority_weights, k=1)[0]
        current_demand = round(rng.uniform(0.8, 5.5), 2)
        forecast_demand = round(max(0.0, rng.gauss(current_demand, 0.5)), 2)
        flexibility = round(rng.uniform(0.0, 0.2), 2) if priority != "flexible" else round(rng.uniform(0.3, 0.9), 2)

        households.append({
            "house_id": f"H{i:02d}",
            "current_demand": current_demand,
            "forecast_demand": forecast_demand,
            "flexibility": flexibility,
            "priority": priority,
        })

    # --- EVs (10) ---
    evs = []
    for i in range(10):
        departure_hours = rng.uniform(1.0, 12.0)
        departure_time = (now + timedelta(hours=departure_hours)).isoformat()
        currently_charging = rng.random() < 0.5

        evs.append({
            "ev_id": f"EV{i}",
            "charge_needed": round(rng.uniform(2.0, 20.0), 2),
            "departure_time": departure_time,
            "currently_charging": currently_charging,
            "v2g_eligible": False,        # populated by EVAgent
            "flex_window_hrs": 0.0,        # populated by EVAgent
        })

    # --- Grid ---
    grid = {
        "price_per_kwh": round(rng.uniform(6.0, 10.0), 2),
        "availability": True,
        "carbon_intensity": round(rng.uniform(400.0, 750.0), 1),
        "max_import_kw": 200.0,
        "peak_hours": ["18:00", "19:00", "20:00", "21:00"],
    }

    state: CommunityState = {
        "solar": solar,
        "battery": battery,
        "households": households,
        "evs": evs,
        "grid": grid,
        "timestamp": timestamp,
        "decisions": {},
        "logs": [],
    }

    clear_logs(state)
    return state


if __name__ == "__main__":
    # Quick manual smoke test.
    state = generate_mock_community_state()
    result = run_cycle_full(state)

    print("=== Decisions ===")
    for key, value in result["decisions"].items():
        print(f"  {key}: {value}")

    print("\n=== Negotiation Log ===")
    for line in result["logs"]:
        print(f"  - {line}")
