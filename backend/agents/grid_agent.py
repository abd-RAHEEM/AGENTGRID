"""
grid_agent.py
GridAgent: tracks pricing, availability, carbon intensity, and peak hours.

Responsibilities (per architecture):
- Pricing
- Availability
- Carbon intensity
- Peak hours

This agent primarily validates/normalizes grid state and surfaces
relevant signals (peak pricing, high carbon intensity, unavailability)
into the negotiation log for the optimizer and demo.
"""

from agents.state import CommunityState
from agents.logger import log_event

# Above this carbon intensity (gCO2/kWh), grid power is considered "dirty"
# and should be avoided where possible.
HIGH_CARBON_INTENSITY_THRESHOLD = 500.0

# Current hour label used to check against peak_hours (format "HH:00").
def _current_hour_label(state: CommunityState) -> str:
    timestamp = state.get("timestamp", "")
    try:
        # timestamp expected as ISO format; extract hour.
        hour_part = timestamp.split("T")[1][:2] if "T" in timestamp else timestamp[11:13]
        return f"{hour_part}:00"
    except (IndexError, ValueError):
        return ""


def grid_agent_fn(state: CommunityState) -> CommunityState:
    """Validate grid state and annotate logs with pricing/carbon/peak signals."""
    grid = state["grid"]

    grid["price_per_kwh"] = max(0.0, float(grid["price_per_kwh"]))
    grid["carbon_intensity"] = max(0.0, float(grid["carbon_intensity"]))
    grid["max_import_kw"] = max(0.0, float(grid["max_import_kw"]))
    grid["availability"] = bool(grid["availability"])

    state["grid"] = grid

    if not grid["availability"]:
        log_event(
            state,
            "Grid Agent: Grid unavailable — community must rely on solar + "
            "battery only this cycle."
        )
    else:
        log_event(
            state,
            f"Grid Agent: Grid available, price Rs {grid['price_per_kwh']:.2f}/kWh, "
            f"carbon intensity {grid['carbon_intensity']:.0f} gCO2/kWh, "
            f"max import {grid['max_import_kw']:.1f} kW."
        )

    if grid["carbon_intensity"] >= HIGH_CARBON_INTENSITY_THRESHOLD:
        log_event(
            state,
            f"Grid Agent: Carbon intensity {grid['carbon_intensity']:.0f} gCO2/kWh "
            f"is high — prefer battery/solar over grid import."
        )

    current_hour = _current_hour_label(state)
    if current_hour and current_hour in grid["peak_hours"]:
        log_event(
            state,
            f"Grid Agent: Current hour {current_hour} is a peak-pricing window — "
            f"minimizing grid import is a priority."
        )

    return state
