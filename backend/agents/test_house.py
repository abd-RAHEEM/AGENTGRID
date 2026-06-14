"""Unit tests for HouseAgent (vectorized batch processing)."""

from agents.run import generate_mock_community_state
from agents.house_agent import house_agents_fn


def test_house_agent_processes_all_households():
    state = generate_mock_community_state(seed=20)
    n_households = len(state["households"])
    assert n_households == 50

    state = house_agents_fn(state)
    assert len(state["households"]) == n_households


def test_house_agent_clamps_flexibility():
    state = generate_mock_community_state(seed=21)
    state["households"][0]["flexibility"] = 1.5  # out of range
    state["households"][1]["flexibility"] = -0.3  # out of range

    state = house_agents_fn(state)

    assert state["households"][0]["flexibility"] == 1.0
    assert state["households"][1]["flexibility"] == 0.0


def test_house_agent_validates_priority():
    state = generate_mock_community_state(seed=22)
    state["households"][0]["priority"] = "invalid_priority"

    state = house_agents_fn(state)

    assert state["households"][0]["priority"] == "normal"


def test_house_agent_clamps_negative_demand():
    state = generate_mock_community_state(seed=23)
    state["households"][0]["current_demand"] = -5.0
    state["households"][0]["forecast_demand"] = -2.0

    state = house_agents_fn(state)

    assert state["households"][0]["current_demand"] == 0.0
    assert state["households"][0]["forecast_demand"] == 0.0


def test_house_agent_logs_summary():
    state = generate_mock_community_state(seed=24)
    state = house_agents_fn(state)

    assert any("House Agent: Processed" in line for line in state["logs"])
    assert any("flexible" in line.lower() for line in state["logs"])
