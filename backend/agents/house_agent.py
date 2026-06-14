"""
house_agent.py
HouseAgent (house_agents_fn): processes all households in a single
vectorized pass — avoids creating one LangGraph node per household.

Responsibilities (per architecture):
- Process all households
- Calculate demand
- Calculate flexibility
- Calculate priorities

Supports 50+ households efficiently via a single batch operation
(no per-house graph nodes, no per-house LLM calls).
"""

from agents.state import CommunityState
from agents.logger import log_event


def house_agents_fn(state: CommunityState) -> CommunityState:
    """Process all households in one vectorized batch.

    For each household, this normalizes/derives:
    - current_demand (kept as-is, validated to be non-negative)
    - forecast_demand (kept as-is, validated to be non-negative)
    - flexibility (clamped to [0, 1])
    - priority (validated against allowed set, defaulting to "normal")

    Aggregates summary statistics for the negotiation log.
    """
    households = state["households"]
    n = len(households)

    valid_priorities = {"critical", "normal", "flexible"}

    total_demand = 0.0
    total_forecast = 0.0
    flexible_count = 0
    critical_count = 0
    total_deferrable_kwh = 0.0

    for house in households:
        # Validate / clamp demand values.
        house["current_demand"] = max(0.0, float(house["current_demand"]))
        house["forecast_demand"] = max(0.0, float(house["forecast_demand"]))

        # Clamp flexibility to [0, 1].
        flexibility = float(house["flexibility"])
        house["flexibility"] = min(1.0, max(0.0, flexibility))

        # Validate priority.
        if house["priority"] not in valid_priorities:
            house["priority"] = "normal"

        total_demand += house["current_demand"]
        total_forecast += house["forecast_demand"]

        if house["priority"] == "flexible":
            flexible_count += 1
            total_deferrable_kwh += house["current_demand"] * house["flexibility"]
        elif house["priority"] == "critical":
            critical_count += 1

    state["households"] = households

    avg_demand = total_demand / n if n > 0 else 0.0

    log_event(
        state,
        f"House Agent: Processed {n} households — total demand "
        f"{total_demand:.1f} kWh (avg {avg_demand:.2f} kWh/house), "
        f"forecast next-hour {total_forecast:.1f} kWh."
    )
    log_event(
        state,
        f"House Agent: {flexible_count} flexible, {critical_count} critical "
        f"households; {total_deferrable_kwh:.1f} kWh of deferrable load available."
    )

    return state
