"""
battery_agent.py
BatteryAgent: monitors state-of-charge, computes available discharge,
tracks health, and recommends charge/discharge behavior.

Responsibilities (per architecture):
- Compute available discharge
- Track SoC
- Track health
- Recommend charge/discharge
"""

from agents.state import CommunityState
from agents.logger import log_event

# Don't discharge below this SoC floor (protects battery health / reserve).
MIN_SOC_RESERVE_PCT = 15.0

# Recommend charging from solar surplus when surplus exceeds this fraction
# of total battery capacity.
CHARGE_SURPLUS_THRESHOLD_FRACTION = 0.20


def battery_agent_fn(state: CommunityState) -> CommunityState:
    """Enrich state with available_discharge and a charge/discharge recommendation.

    available_discharge is the energy (kWh) that can be drawn from the
    battery this cycle without dropping SoC below MIN_SOC_RESERVE_PCT,
    bounded by the battery's max charge_rate (kW, treated as kWh for a
    1-hour cycle) and scaled by health_pct.
    """
    battery = state["battery"]
    solar = state["solar"]

    soc = battery["soc"]
    capacity = battery["capacity"]
    charge_rate = battery["charge_rate"]
    health_pct = battery["health_pct"]

    # Energy above the reserve floor that could theoretically be discharged.
    usable_soc_pct = max(0.0, soc - MIN_SOC_RESERVE_PCT)
    energy_above_reserve = (usable_soc_pct / 100.0) * capacity

    # Bound by max discharge rate (kW for 1h cycle) and degrade by health.
    max_rate_discharge = charge_rate * (health_pct / 100.0)
    available_discharge = max(0.0, min(energy_above_reserve, max_rate_discharge))

    battery["available_discharge"] = round(available_discharge, 3)
    state["battery"] = battery

    log_event(
        state,
        f"Battery Agent: SoC {soc:.1f}%, health {health_pct:.1f}%, "
        f"available discharge {available_discharge:.1f} kWh."
    )

    # Recommend charging if solar surplus is large relative to capacity.
    surplus_now = solar.get("surplus_now", 0.0)
    surplus_threshold = capacity * CHARGE_SURPLUS_THRESHOLD_FRACTION

    if surplus_now > surplus_threshold and soc < 100.0:
        chargeable_pct = min(100.0 - soc, 100.0)
        chargeable_kwh = min(surplus_now, charge_rate, (chargeable_pct / 100.0) * capacity)
        log_event(
            state,
            f"Battery Agent: Solar surplus {surplus_now:.1f} kWh exceeds "
            f"{CHARGE_SURPLUS_THRESHOLD_FRACTION*100:.0f}% of capacity — "
            f"recommending charge of {chargeable_kwh:.1f} kWh."
        )
    elif available_discharge <= 0.0:
        log_event(
            state,
            "Battery Agent: At or below reserve floor — discharge unavailable, "
            "recommending charge-only mode."
        )

    return state
