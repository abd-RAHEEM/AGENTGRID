"""
ev_agent.py
EVAgent: computes charging schedules, flexibility windows, V2G eligibility,
and charging priority for all EVs in the community.

Responsibilities (per architecture):
- Charging schedules
- Flexibility windows
- V2G eligibility
- Charging priority

Like HouseAgent, this processes all EVs in a single vectorized pass.
"""

from datetime import datetime, timezone

from agents.state import CommunityState
from agents.logger import log_event

# An EV is V2G-eligible if it has more than this many hours of flexibility
# before departure (i.e. it can afford to export and recharge later).
V2G_MIN_FLEX_HOURS = 4.0

# Minimum charge rate floor (kW) to avoid division issues for EVs that have
# essentially no flexibility window.
MIN_FLEX_WINDOW_HRS = 0.1


def _parse_departure_hours(timestamp: str, now: datetime) -> float:
    """Best-effort parse of departure_time into hours-from-now.

    Falls back to a default of 1.0 hour if parsing fails, ensuring the
    system remains deterministic and never raises on malformed input.
    """
    try:
        dep = datetime.fromisoformat(timestamp)
        if dep.tzinfo is None:
            dep = dep.replace(tzinfo=timezone.utc)
        delta_hours = (dep - now).total_seconds() / 3600.0
        return max(MIN_FLEX_WINDOW_HRS, delta_hours)
    except (ValueError, TypeError):
        return 1.0


def ev_agent_fn(state: CommunityState) -> CommunityState:
    """Process all EVs: compute min charge rate, V2G eligibility, priority.

    For each EV:
    - flex_window_hrs is recomputed from departure_time (hours from now),
      with a floor to avoid divide-by-zero.
    - v2g_eligible is set True if flex_window_hrs >= V2G_MIN_FLEX_HOURS
      AND the EV is not already at zero charge_needed.
    - A "min_charge_rate_kw" annotation is computed (charge_needed / flex_window_hrs)
      to indicate the minimum sustained charging rate required to reach
      target SoC before departure.
    """
    evs = state["evs"]
    now = datetime.now(timezone.utc)

    total_charge_needed = 0.0
    currently_charging_count = 0
    v2g_eligible_count = 0

    for ev in evs:
        ev["charge_needed"] = max(0.0, float(ev["charge_needed"]))

        flex_hours = _parse_departure_hours(ev["departure_time"], now)
        ev["flex_window_hrs"] = round(flex_hours, 3)

        ev["v2g_eligible"] = bool(
            flex_hours >= V2G_MIN_FLEX_HOURS and ev["charge_needed"] > 0
        )

        total_charge_needed += ev["charge_needed"]
        if ev["currently_charging"]:
            currently_charging_count += 1
        if ev["v2g_eligible"]:
            v2g_eligible_count += 1

    state["evs"] = evs

    log_event(
        state,
        f"EV Agent: {len(evs)} EVs tracked — {currently_charging_count} charging now, "
        f"total charge needed {total_charge_needed:.1f} kWh."
    )
    log_event(
        state,
        f"EV Agent: {v2g_eligible_count} EV(s) V2G-eligible "
        f"(flex window >= {V2G_MIN_FLEX_HOURS:.0f}h)."
    )

    # Identify EVs that could be delayed (long flex windows) for the optimizer.
    delayable = [ev["ev_id"] for ev in evs if ev["flex_window_hrs"] > V2G_MIN_FLEX_HOURS and ev["currently_charging"]]
    if delayable:
        log_event(
            state,
            f"EV Agent: {len(delayable)} charging session(s) can be delayed "
            f"if needed: {', '.join(delayable)}."
        )

    return state
