"""Unit tests for SolarAgent."""

from agents.run import generate_mock_community_state
from agents.solar_agent import solar_agent_fn, LOW_GEN_THRESHOLD_KWH
from agents.scenarios import inject_scenario


def test_solar_agent_computes_surplus():
    state = generate_mock_community_state(seed=1)
    state = solar_agent_fn(state)

    total_demand = sum(h["current_demand"] for h in state["households"])
    expected_surplus = state["solar"]["current_generation"] - total_demand

    assert "surplus_now" in state["solar"]
    assert abs(state["solar"]["surplus_now"] - expected_surplus) < 1e-6


def test_solar_agent_detects_low_gen_windows():
    state = generate_mock_community_state(seed=2)
    # Force a low forecast hour.
    state["solar"]["forecast_24h"][3] = 1.0
    state = solar_agent_fn(state)

    assert "low_gen_windows" in state["solar"]
    assert "03:00" in state["solar"]["low_gen_windows"]


def test_solar_agent_no_low_gen_windows_when_all_high():
    state = generate_mock_community_state(seed=3)
    state["solar"]["forecast_24h"] = [LOW_GEN_THRESHOLD_KWH + 100.0] * 24
    state = solar_agent_fn(state)

    assert state["solar"]["low_gen_windows"] == []


def test_solar_agent_logs_negotiation_message():
    state = generate_mock_community_state(seed=4)
    state = solar_agent_fn(state)

    assert any("Solar Agent:" in line for line in state["logs"])


def test_solar_agent_with_cloud_cover_scenario():
    state = generate_mock_community_state(seed=5)
    original_gen = state["solar"]["current_generation"]

    state = inject_scenario(state, "cloud_cover")
    state = solar_agent_fn(state)

    assert state["solar"]["current_generation"] < original_gen
    assert state["solar"]["current_generation"] == round(original_gen * 0.15, 10) or \
        abs(state["solar"]["current_generation"] - original_gen * 0.15) < 1e-6
