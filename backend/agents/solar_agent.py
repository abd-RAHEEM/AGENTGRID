"""
solar_agent.py
SolarAgent: reads solar generation and forecasts, computes surplus
relative to current community demand, and flags low-generation windows.

Responsibilities (per architecture):
- Read solar generation
- Read forecasts
- Compute surplus
- Detect low-generation windows
- Annotate state
"""

from agents.state import CommunityState
from agents.logger import log_event

# A forecast hour is considered "low generation" if it falls below this
# fraction of the current generation peak (or an absolute floor).
LOW_GEN_THRESHOLD_KWH = 5.0

# Hour labels corresponding to forecast_24h indices (0 = current hour + 1, etc.)
# Used purely for human-readable log/window labelling.
_HOUR_LABELS = [f"{h:02d}:00" for h in range(24)]


def solar_agent_fn(state: CommunityState) -> CommunityState:
    """Enrich state with solar surplus and low-generation window info.

    Surplus is computed as current solar generation minus the sum of
    current household demand. Low-generation windows are derived from
    forecast_24h values below LOW_GEN_THRESHOLD_KWH.
    """
    solar = state["solar"]
    households = state["households"]

    total_demand_now = sum(h["current_demand"] for h in households)
    surplus_now = solar["current_generation"] - total_demand_now

    low_gen_windows: list[str] = []
    for idx, forecast_kwh in enumerate(solar["forecast_24h"]):
        if forecast_kwh < LOW_GEN_THRESHOLD_KWH:
            label = _HOUR_LABELS[idx % 24]
            low_gen_windows.append(label)

    solar["surplus_now"] = round(surplus_now, 3)
    solar["low_gen_windows"] = low_gen_windows
    state["solar"] = solar

    if surplus_now >= 0:
        log_event(
            state,
            f"Solar Agent: Generation {solar['current_generation']:.1f} kWh, "
            f"surplus of {surplus_now:.1f} kWh available for battery/grid export."
        )
    else:
        deficit_pct = (
            abs(surplus_now) / total_demand_now * 100 if total_demand_now > 0 else 0.0
        )
        log_event(
            state,
            f"Solar Agent: Generation {solar['current_generation']:.1f} kWh insufficient, "
            f"shortfall of {abs(surplus_now):.1f} kWh ({deficit_pct:.0f}% of demand)."
        )

    if low_gen_windows:
        log_event(
            state,
            f"Solar Agent: {len(low_gen_windows)} low-generation window(s) detected "
            f"in next 24h: {', '.join(low_gen_windows[:5])}"
            + (" ..." if len(low_gen_windows) > 5 else "")
        )

    return state
