"""Unit tests for EVAgent."""

from datetime import datetime, timedelta, timezone

from agents.run import generate_mock_community_state
from agents.ev_agent import ev_agent_fn, V2G_MIN_FLEX_HOURS


def test_ev_agent_processes_all_evs():
    state = generate_mock_community_state(seed=30)
    n_evs = len(state["evs"])
    assert n_evs == 10

    state = ev_agent_fn(state)
    assert len(state["evs"]) == n_evs


def test_ev_agent_computes_flex_window():
    state = generate_mock_community_state(seed=31)
    now = datetime.now(timezone.utc)
    state["evs"][0]["departure_time"] = (now + timedelta(hours=6)).isoformat()

    state = ev_agent_fn(state)

    flex = state["evs"][0]["flex_window_hrs"]
    assert 5.5 <= flex <= 6.5  # allow small timing drift


def test_ev_agent_v2g_eligibility_long_window():
    state = generate_mock_community_state(seed=32)
    now = datetime.now(timezone.utc)

    state["evs"][0]["departure_time"] = (now + timedelta(hours=V2G_MIN_FLEX_HOURS + 1)).isoformat()
    state["evs"][0]["charge_needed"] = 10.0

    state = ev_agent_fn(state)

    assert state["evs"][0]["v2g_eligible"] is True


def test_ev_agent_v2g_ineligible_short_window():
    state = generate_mock_community_state(seed=33)
    now = datetime.now(timezone.utc)

    state["evs"][0]["departure_time"] = (now + timedelta(hours=1)).isoformat()
    state["evs"][0]["charge_needed"] = 10.0

    state = ev_agent_fn(state)

    assert state["evs"][0]["v2g_eligible"] is False


def test_ev_agent_handles_malformed_departure_time():
    state = generate_mock_community_state(seed=34)
    state["evs"][0]["departure_time"] = "not-a-timestamp"

    # Should not raise.
    state = ev_agent_fn(state)
    assert state["evs"][0]["flex_window_hrs"] > 0


def test_ev_agent_logs_negotiation_message():
    state = generate_mock_community_state(seed=35)
    state = ev_agent_fn(state)

    assert any("EV Agent:" in line for line in state["logs"])
