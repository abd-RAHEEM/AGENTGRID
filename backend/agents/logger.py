"""
logger.py
Lightweight logging helper for agent negotiation logs.

Each agent appends a human-readable string to state["logs"] describing
the decision it made. These logs are displayed in the hackathon demo
(Step 5 of the demo flow: "Agent negotiation log scrolls...").
"""

from agents.state import CommunityState


def log_event(state: CommunityState, message: str) -> None:
    """Append a human-readable log line to the shared state.

    Args:
        state: The CommunityState being mutated.
        message: A human-readable description of the agent's decision,
            e.g. "Solar Agent: Generation reduced by 60%".
    """
    if "logs" not in state or state["logs"] is None:
        state["logs"] = []
    state["logs"].append(message)


def get_logs(state: CommunityState) -> list[str]:
    """Return the accumulated negotiation logs."""
    return state.get("logs", [])


def clear_logs(state: CommunityState) -> None:
    """Reset the negotiation logs (used at the start of a new cycle)."""
    state["logs"] = []
