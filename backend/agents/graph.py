"""
graph.py
LangGraph graph topology for AGENTGRID multi-agent system.

Sequential, deterministic flow (no branching, no subgraphs, no dynamic
routing):

    SolarAgent -> BatteryAgent -> HouseAgent -> EVAgent -> GridAgent -> Optimizer
"""

from langgraph.graph import StateGraph

from agents.state import CommunityState
from agents.solar_agent import solar_agent_fn
from agents.battery_agent import battery_agent_fn
from agents.house_agent import house_agents_fn
from agents.ev_agent import ev_agent_fn
from agents.grid_agent import grid_agent_fn
from agents.optimizer import optimizer_fn


def build_graph():
    """Construct and compile the AGENTGRID LangGraph state graph."""
    graph = StateGraph(CommunityState)

    # Register nodes
    graph.add_node("solar_agent", solar_agent_fn)
    graph.add_node("battery_agent", battery_agent_fn)
    graph.add_node("house_agents", house_agents_fn)
    graph.add_node("ev_agent", ev_agent_fn)
    graph.add_node("grid_agent", grid_agent_fn)
    graph.add_node("optimizer", optimizer_fn)

    # Sequential flow — each agent enriches state before passing it on.
    graph.set_entry_point("solar_agent")
    graph.add_edge("solar_agent", "battery_agent")
    graph.add_edge("battery_agent", "house_agents")
    graph.add_edge("house_agents", "ev_agent")
    graph.add_edge("ev_agent", "grid_agent")
    graph.add_edge("grid_agent", "optimizer")
    graph.set_finish_point("optimizer")

    return graph.compile()


# Compile once at module load — reused across cycles.
app = build_graph()
