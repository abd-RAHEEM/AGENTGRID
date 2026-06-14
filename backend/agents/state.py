"""
state.py
Shared state schema for AGENTGRID multi-agent system.
All agents read/write a single CommunityState object that flows
through the LangGraph sequentially.

DO NOT MODIFY FIELD NAMES — frontend and backend depend on these shapes.
"""

from typing import TypedDict, List


class SolarState(TypedDict):
    current_generation: float       # kWh right now
    forecast_24h: List[float]        # hourly forecast (next 24h)
    surplus_now: float               # generation - current total demand
    low_gen_windows: List[str]       # ISO timestamps / hour labels of low generation


class BatteryState(TypedDict):
    soc: float                       # state-of-charge 0-100%
    capacity: float                  # total kWh capacity
    charge_rate: float               # max kW charge/discharge
    available_discharge: float       # kWh available for discharge right now
    health_pct: float                # 0-100% battery health


class HouseState(TypedDict):
    house_id: str
    current_demand: float            # kWh
    forecast_demand: float           # next hour kWh
    flexibility: float               # 0 (inflexible) - 1 (fully deferrable)
    priority: str                    # "critical" | "normal" | "flexible"


class EVState(TypedDict):
    ev_id: str
    charge_needed: float             # kWh remaining to reach target SoC
    departure_time: str              # ISO timestamp
    currently_charging: bool
    v2g_eligible: bool
    flex_window_hrs: float           # hours of flexibility before departure


class GridState(TypedDict):
    price_per_kwh: float
    availability: bool
    carbon_intensity: float          # gCO2/kWh
    max_import_kw: float
    peak_hours: List[str]


class CommunityState(TypedDict):
    solar: SolarState
    battery: BatteryState
    households: List[HouseState]
    evs: List[EVState]
    grid: GridState
    timestamp: str
    decisions: dict                  # populated by optimizer at end
    logs: List[str]                  # human-readable agent negotiation logs
