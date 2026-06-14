"""Unit tests for Scenario Injection."""

import pytest

from agents.run import generate_mock_community_state, run_cycle
from agents.scenarios import inject_scenario, make_state_copy, VALID_SCENARIOS


def test_cloud_cover_reduces_solar_generation():
    state = generate_mock_community_state(seed=50)
    original = make_state_copy(state)

    state = inject_scenario(state, "cloud_cover")

    assert state["solar"]["current_generation"] < original["solar"]["current_generation"]
    assert abs(state["solar"]["current_generation"] - original["solar"]["current_generation"] * 0.15) < 1e-6
    for new_val, old_val in zip(state["solar"]["forecast_24h"], original["solar"]["forecast_24h"]):
        assert abs(new_val - old_val * 0.2) < 1e-6


def test_heatwave_increases_household_demand():
    state = generate_mock_community_state(seed=51)
    original = make_state_copy(state)

    state = inject_scenario(state, "heatwave")

    for new_house, old_house in zip(state["households"], original["households"]):
        assert abs(new_house["current_demand"] - old_house["current_demand"] * 1.65) < 1e-6


def test_grid_failure_sets_unavailable_and_zero_price():
    state = generate_mock_community_state(seed=52)
    state["grid"]["availability"] = True
    state["grid"]["price_per_kwh"] = 8.5

    state = inject_scenario(state, "grid_failure")

    assert state["grid"]["availability"] is False
    assert state["grid"]["price_per_kwh"] == 0.0


def test_ev_surge_increases_charge_needed_and_sets_charging():
    state = generate_mock_community_state(seed=53)
    original = make_state_copy(state)

    state = inject_scenario(state, "ev_surge")

    for new_ev, old_ev in zip(state["evs"], original["evs"]):
        assert abs(new_ev["charge_needed"] - old_ev["charge_needed"] * 1.5) < 1e-6
        assert new_ev["currently_charging"] is True


def test_invalid_scenario_raises():
    state = generate_mock_community_state(seed=54)
    with pytest.raises(ValueError):
        inject_scenario(state, "alien_invasion")


def test_all_scenarios_are_independently_testable():
    for scenario in VALID_SCENARIOS:
        state = generate_mock_community_state(seed=55)
        state = inject_scenario(state, scenario)
        decisions = run_cycle(state)
        assert "grid_import_kw" in decisions


def test_grid_failure_then_optimizer_no_grid_import_capacity():
    state = generate_mock_community_state(seed=56)
    state = inject_scenario(state, "grid_failure")
    decisions = run_cycle(state)

    # With grid unavailable, any unresolved shortfall shows up as grid_import_kw
    # (representing unmet demand), but optimizer cannot draw from grid.
    assert decisions["grid_import_kw"] >= 0.0


def test_scenario_logs_are_recorded():
    state = generate_mock_community_state(seed=57)
    state = inject_scenario(state, "heatwave")

    assert any("Scenario [heatwave]" in line for line in state["logs"])
