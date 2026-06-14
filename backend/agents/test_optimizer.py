"""Unit tests for CommunityOptimizer."""

from agents.run import generate_mock_community_state, run_cycle, run_cycle_full
from agents.solar_agent import solar_agent_fn
from agents.battery_agent import battery_agent_fn
from agents.house_agent import house_agents_fn
from agents.ev_agent import ev_agent_fn
from agents.grid_agent import grid_agent_fn
from agents.optimizer import optimizer_fn

EXPECTED_KEYS = {
    "battery_discharge_kw",
    "ev_charging_paused",
    "flex_loads_deferred",
    "renewable_utilization_pct",
    "estimated_savings_inr",
    "carbon_saved_kg",
    "grid_import_kw",
}


def _run_pipeline_manually(state):
    state = solar_agent_fn(state)
    state = battery_agent_fn(state)
    state = house_agents_fn(state)
    state = ev_agent_fn(state)
    state = grid_agent_fn(state)
    state = optimizer_fn(state)
    return state


def test_optimizer_output_schema():
    state = generate_mock_community_state(seed=40)
    state = _run_pipeline_manually(state)

    decisions = state["decisions"]
    assert set(decisions.keys()) == EXPECTED_KEYS


def test_optimizer_output_types():
    state = generate_mock_community_state(seed=41)
    state = _run_pipeline_manually(state)
    decisions = state["decisions"]

    assert isinstance(decisions["battery_discharge_kw"], float)
    assert isinstance(decisions["ev_charging_paused"], list)
    assert isinstance(decisions["flex_loads_deferred"], list)
    assert isinstance(decisions["renewable_utilization_pct"], float)
    assert isinstance(decisions["estimated_savings_inr"], float)
    assert isinstance(decisions["carbon_saved_kg"], float)
    assert isinstance(decisions["grid_import_kw"], float)


def test_optimizer_no_shortfall_no_pauses():
    state = generate_mock_community_state(seed=42)
    # Force abundant supply: huge solar, full battery, zero demand.
    state["solar"]["current_generation"] = 10000.0
    state["battery"]["soc"] = 100.0
    for house in state["households"]:
        house["current_demand"] = 0.0

    state = _run_pipeline_manually(state)
    decisions = state["decisions"]

    assert decisions["ev_charging_paused"] == []
    assert decisions["flex_loads_deferred"] == []
    assert decisions["grid_import_kw"] == 0.0


def test_optimizer_resolves_shortfall_via_battery_first():
    state = generate_mock_community_state(seed=43)
    # Force a moderate shortfall covered fully by battery discharge.
    state["solar"]["current_generation"] = 10.0
    state["grid"]["availability"] = False  # no grid import
    state["battery"]["soc"] = 100.0
    state["battery"]["capacity"] = 1000.0
    state["battery"]["charge_rate"] = 30.0
    state["battery"]["health_pct"] = 100.0

    for house in state["households"]:
        house["current_demand"] = 1.0
        house["priority"] = "normal"
        house["flexibility"] = 0.0
    for ev in state["evs"]:
        ev["currently_charging"] = False

    state = _run_pipeline_manually(state)
    decisions = state["decisions"]

    # 50 houses * 1 kWh = 50 kWh demand, solar=10, shortfall=40.
    # Battery available_discharge bounded by charge_rate=30kW -> discharges 30.
    assert decisions["battery_discharge_kw"] > 0
    assert decisions["grid_import_kw"] >= 0.0


def test_optimizer_pauses_evs_when_battery_insufficient():
    state = generate_mock_community_state(seed=44)
    state["solar"]["current_generation"] = 0.0
    state["grid"]["availability"] = False
    state["battery"]["soc"] = 15.0  # at reserve floor -> 0 available discharge
    state["battery"]["capacity"] = 100.0

    for house in state["households"]:
        house["current_demand"] = 1.0
        house["priority"] = "critical"
        house["flexibility"] = 0.0

    for ev in state["evs"]:
        ev["currently_charging"] = True
        ev["charge_needed"] = 5.0
        ev["flex_window_hrs"] = 10.0

    state = _run_pipeline_manually(state)
    decisions = state["decisions"]

    assert len(decisions["ev_charging_paused"]) > 0


def test_run_cycle_returns_decisions_only():
    state = generate_mock_community_state(seed=45)
    decisions = run_cycle(state)

    assert set(decisions.keys()) == EXPECTED_KEYS


def test_run_cycle_full_includes_logs():
    state = generate_mock_community_state(seed=46)
    result = run_cycle_full(state)

    assert "logs" in result
    assert len(result["logs"]) > 0
    assert any("Optimizer:" in line for line in result["logs"])


def test_optimizer_performance_under_2_seconds():
    import time

    state = generate_mock_community_state(seed=47)
    start = time.time()
    run_cycle(state)
    elapsed = time.time() - start

    assert elapsed < 2.0
