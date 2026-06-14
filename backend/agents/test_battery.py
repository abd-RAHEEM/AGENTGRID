"""Unit tests for BatteryAgent."""

from agents.run import generate_mock_community_state
from agents.solar_agent import solar_agent_fn
from agents.battery_agent import battery_agent_fn, MIN_SOC_RESERVE_PCT


def test_battery_agent_computes_available_discharge():
    state = generate_mock_community_state(seed=10)
    state = solar_agent_fn(state)  # battery agent depends on solar surplus
    state = battery_agent_fn(state)

    battery = state["battery"]
    assert "available_discharge" in battery
    assert battery["available_discharge"] >= 0.0


def test_battery_agent_respects_reserve_floor():
    state = generate_mock_community_state(seed=11)
    state["battery"]["soc"] = MIN_SOC_RESERVE_PCT  # exactly at reserve floor
    state = solar_agent_fn(state)
    state = battery_agent_fn(state)

    # At reserve floor, no energy above reserve -> available_discharge == 0
    assert state["battery"]["available_discharge"] == 0.0


def test_battery_agent_respects_health_degradation():
    state = generate_mock_community_state(seed=12)
    state["battery"]["soc"] = 100.0
    state["battery"]["capacity"] = 100.0
    state["battery"]["charge_rate"] = 50.0
    state["battery"]["health_pct"] = 50.0  # degraded battery

    state = solar_agent_fn(state)
    state = battery_agent_fn(state)

    # Max rate discharge = 50 kW * 0.5 health = 25 kWh, less than energy_above_reserve
    assert state["battery"]["available_discharge"] <= 25.0 + 1e-6


def test_battery_agent_recommends_charge_on_high_surplus():
    state = generate_mock_community_state(seed=13)
    # Force a large surplus by inflating solar generation and zeroing demand.
    state["solar"]["current_generation"] = 1000.0
    for house in state["households"]:
        house["current_demand"] = 0.0
    state["battery"]["soc"] = 50.0
    state["battery"]["capacity"] = 100.0

    state = solar_agent_fn(state)
    state = battery_agent_fn(state)

    assert any("recommending charge" in line for line in state["logs"])


def test_battery_agent_logs_negotiation_message():
    state = generate_mock_community_state(seed=14)
    state = solar_agent_fn(state)
    state = battery_agent_fn(state)

    assert any("Battery Agent:" in line for line in state["logs"])
