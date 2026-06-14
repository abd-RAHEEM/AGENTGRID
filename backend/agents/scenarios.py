"""
scenarios.py
Scenario Engine: mutates CommunityState to simulate real-world events
for the hackathon demo.

Implements:
- cloud_cover: solar generation drops sharply
- heatwave: household demand spikes (AC usage)
- grid_failure: grid becomes unavailable
- ev_surge: EV charging demand spikes

Each scenario function is independently testable and returns a mutated
copy-in-place of the given state.
"""

import copy

from agents.state import CommunityState
from agents.logger import log_event

VALID_SCENARIOS = {"cloud_cover", "heatwave", "grid_failure", "ev_surge"}


def inject_scenario(state: CommunityState, event: str) -> CommunityState:
    """Mutate state according to the named scenario event.

    Args:
        state: The CommunityState to mutate (mutated in place and returned).
        event: One of "cloud_cover", "heatwave", "grid_failure", "ev_surge".

    Returns:
        The mutated CommunityState.

    Raises:
        ValueError: If event is not a recognized scenario.
    """
    if event not in VALID_SCENARIOS:
        raise ValueError(
            f"Unknown scenario '{event}'. Valid scenarios: {sorted(VALID_SCENARIOS)}"
        )

    if event == "cloud_cover":
        _apply_cloud_cover(state)
    elif event == "heatwave":
        _apply_heatwave(state)
    elif event == "grid_failure":
        _apply_grid_failure(state)
    elif event == "ev_surge":
        _apply_ev_surge(state)

    return state


def _apply_cloud_cover(state: CommunityState) -> None:
    """Solar generation drops ~85%; 24h forecast drops to 20% of original."""
    solar = state["solar"]
    original_gen = solar["current_generation"]
    solar["current_generation"] = original_gen * 0.15
    solar["forecast_24h"] = [v * 0.2 for v in solar["forecast_24h"]]
    state["solar"] = solar

    log_event(
        state,
        f"Scenario [cloud_cover]: Solar generation dropped from "
        f"{original_gen:.1f} kWh to {solar['current_generation']:.1f} kWh "
        f"(-{(1 - 0.15) * 100:.0f}%)."
    )


def _apply_heatwave(state: CommunityState) -> None:
    """All household demand increases by 65% (AC spike)."""
    households = state["households"]
    total_before = sum(h["current_demand"] for h in households)

    for house in households:
        house["current_demand"] *= 1.65

    state["households"] = households
    total_after = sum(h["current_demand"] for h in households)

    log_event(
        state,
        f"Scenario [heatwave]: Household demand increased from "
        f"{total_before:.1f} kWh to {total_after:.1f} kWh (+65% AC load)."
    )


def _apply_grid_failure(state: CommunityState) -> None:
    """Grid becomes unavailable and price drops to zero."""
    grid = state["grid"]
    grid["availability"] = False
    grid["price_per_kwh"] = 0.0
    state["grid"] = grid

    log_event(
        state,
        "Scenario [grid_failure]: Grid is now unavailable (price set to 0, "
        "no import possible). Community must rely on solar + battery."
    )


def _apply_ev_surge(state: CommunityState) -> None:
    """All EVs require 50% more charge and are immediately charging."""
    evs = state["evs"]
    total_before = sum(ev["charge_needed"] for ev in evs)

    for ev in evs:
        ev["charge_needed"] *= 1.5
        ev["currently_charging"] = True

    state["evs"] = evs
    total_after = sum(ev["charge_needed"] for ev in evs)

    log_event(
        state,
        f"Scenario [ev_surge]: EV charge demand increased from "
        f"{total_before:.1f} kWh to {total_after:.1f} kWh; all "
        f"{len(evs)} EVs now actively charging."
    )


def get_scenario_description(event: str) -> str:
    """Return a short human-readable description of a scenario event."""
    descriptions = {
        "cloud_cover": "Heavy cloud cover reduces solar generation by 85%",
        "heatwave": "Heatwave increases household AC demand by 65%",
        "grid_failure": "Grid outage — no import available, price set to 0",
        "ev_surge": "Unexpected EV charging surge — demand +50%, all charging",
    }
    return descriptions.get(event, "Unknown scenario")


def make_state_copy(state: CommunityState) -> CommunityState:
    """Return a deep copy of state, useful for testing scenarios without
    mutating the original (e.g. comparing before/after)."""
    return copy.deepcopy(state)
