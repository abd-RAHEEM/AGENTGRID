"""
optimizer.py
CommunityOptimizer: resolves supply-demand mismatch, allocates battery
resources, pauses EV charging, defers flexible loads, and computes
savings/carbon metrics.

Responsibilities (per architecture):
- Resolve supply-demand mismatch
- Allocate battery resources
- Pause EV charging
- Defer flexible loads
- Compute savings
- Compute carbon reductions

Output contract (DO NOT CHANGE — frontend depends on this schema):
{
    battery_discharge_kw,
    ev_charging_paused,
    flex_loads_deferred,
    renewable_utilization_pct,
    estimated_savings_inr,
    carbon_saved_kg,
    grid_import_kw
}
"""

from agents.state import CommunityState
from agents.logger import log_event

# Approximate INR value per kWh of battery discharge that displaces grid import,
# layered on top of the raw grid price (per architecture's "approx Rs/kWh" factor).
SAVINGS_MULTIPLIER = 7.5


def optimizer_fn(state: CommunityState) -> CommunityState:
    """Resolve supply/demand mismatch and populate state['decisions'].

    Algorithm (per architecture spec):
    1. Compute total_supply = solar generation + battery available_discharge
       + grid import (if grid available, otherwise 0).
    2. Compute total_demand = sum of all household current_demand.
    3. shortfall = total_demand - total_supply.
       If shortfall > 0, resolve in order:
         a. Discharge battery up to available_discharge.
         b. Pause EVs (sorted by flex_window_hrs descending) until resolved.
         c. Defer flexible household loads (sorted by flexibility descending)
            until resolved.
    4. Compute renewable_utilization_pct, estimated_savings_inr,
       carbon_saved_kg, and final grid_import_kw.
    """
    solar = state["solar"]
    battery = state["battery"]
    households = state["households"]
    evs = state["evs"]
    grid = state["grid"]

    total_demand = sum(h["current_demand"] for h in households)

    # Grid import is bounded by max_import_kw if grid is available.
    grid_import_capacity = grid["max_import_kw"] if grid["availability"] else 0.0

    total_supply = (
        solar["current_generation"]
        + battery["available_discharge"]
        + grid_import_capacity
    )

    shortfall = total_demand - total_supply

    ev_pause: list[str] = []
    flex_deferred: list[str] = []
    bat_discharge = 0.0

    if shortfall > 0:
        # Step 1: Discharge battery up to its available capacity.
        bat_discharge = min(shortfall, battery["available_discharge"])
        shortfall -= bat_discharge

        if bat_discharge > 0:
            log_event(
                state,
                f"Optimizer: Discharging battery {bat_discharge:.1f} kWh to "
                f"cover shortfall."
            )

        # Step 2: Pause lowest-priority EVs (longest flex window first)
        # until shortfall resolved.
        if shortfall > 0:
            for ev in sorted(evs, key=lambda e: e["flex_window_hrs"], reverse=True):
                if shortfall <= 0:
                    break
                if ev["currently_charging"]:
                    ev_pause.append(ev["ev_id"])
                    flex_window = max(ev["flex_window_hrs"], 0.1)
                    shortfall -= ev["charge_needed"] / flex_window

            if ev_pause:
                log_event(
                    state,
                    f"Optimizer: Pausing {', '.join(ev_pause)} to relieve "
                    f"remaining shortfall."
                )

        # Step 3: Defer flexible household loads (most flexible first)
        # until shortfall resolved.
        if shortfall > 0:
            for h in sorted(households, key=lambda h: h["flexibility"], reverse=True):
                if shortfall <= 0:
                    break
                if h["priority"] == "flexible":
                    flex_deferred.append(h["house_id"])
                    shortfall -= h["current_demand"] * h["flexibility"]

            if flex_deferred:
                log_event(
                    state,
                    f"Optimizer: Deferring flexible loads at "
                    f"{', '.join(flex_deferred)}."
                )

    # Renewable utilization: portion of total demand met by solar generation.
    renewable_pct = (
        (solar["current_generation"] / total_demand) * 100 if total_demand > 0 else 0.0
    )
    renewable_pct = max(0.0, min(100.0, renewable_pct))

    # Savings & carbon estimates from battery discharge displacing grid import.
    savings_inr = bat_discharge * grid["price_per_kwh"] * SAVINGS_MULTIPLIER
    carbon_saved = bat_discharge * grid["carbon_intensity"] / 1000.0  # kg

    final_grid_import = max(0.0, shortfall)

    decisions = {
        "battery_discharge_kw": round(bat_discharge, 3),
        "ev_charging_paused": ev_pause,
        "flex_loads_deferred": flex_deferred,
        "renewable_utilization_pct": round(renewable_pct, 1),
        "estimated_savings_inr": round(savings_inr, 2),
        "carbon_saved_kg": round(carbon_saved, 2),
        "grid_import_kw": round(final_grid_import, 3),
    }

    state["decisions"] = decisions

    log_event(
        state,
        f"Optimizer: Final decisions — renewable utilization "
        f"{decisions['renewable_utilization_pct']:.1f}%, grid import "
        f"{decisions['grid_import_kw']:.1f} kW, savings Rs "
        f"{decisions['estimated_savings_inr']:.2f}, carbon saved "
        f"{decisions['carbon_saved_kg']:.2f} kg."
    )

    return state
