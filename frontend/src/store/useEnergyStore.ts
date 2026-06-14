import { create } from 'zustand';
import { generateHouses, scenarioData } from '../data/mockData';

export type ActiveScenario = 'normal' | 'cloudCover' | 'heatwave' | 'gridFailure' | 'evSurge';
export type WsStatus = 'idle' | 'connecting' | 'negotiating' | 'done' | 'error';

export interface House {
  id: string;
  position: [number, number, number];
  energySource: 'renewable' | 'mixed' | 'grid';
  consumption: number;            // kWh
  solarContribution: number;      // %
}

export interface AgentDecision {
  agent: 'Solar' | 'Battery' | 'EV' | 'Grid' | 'Optimizer' | 'House';
  message: string;
  timestamp: string;
}

export interface EnergyStore {
  community: {
    solarGeneration: number;      // kWh, 0-500
    batteryLevel: number;         // %, 0-100
    gridImport: number;           // kWh
    evCount: number;              // active EVs charging
    moneySaved: number;           // ₹
    carbonReduced: number;        // kg CO₂
    renewableUsage: number;       // %
  };
  houses: House[];               // array of 50 houses
  activeScenario: ActiveScenario;
  agentDecisions: AgentDecision[];
  selectedHouse: string | null;

  // Sliders and Backend Status
  solarSlider: number;        // 0-100 (%)
  batterySlider: number;      // 0-100 (%)
  gridSlider: number;         // 0-100 (%)
  backendConnected: boolean;
  negotiationStatus: 'idle' | 'connecting' | 'streaming' | 'done' | 'error';
  
  // WebSocket status
  wsStatus: WsStatus;
  
  // Chat panel
  isChatOpen: boolean;
  selectedLanguage: 'english' | 'hindi' | 'telugu' | 'urdu';

  setScenario: (s: ActiveScenario) => void;
  setSelectedHouse: (id: string | null) => void;
  updateCommunity: (data: Partial<EnergyStore['community']>) => void;
  triggerMockDecision: (agent: AgentDecision['agent'], message: string) => void;
  triggerNegotiation: () => void;
  _runMockNegotiation: () => void;

  setSolarSlider: (pct: number) => void;
  setBatterySlider: (pct: number) => void;
  setGridSlider: (pct: number) => void;
  setBackendConnected: (v: boolean) => void;
  setWsStatus: (status: WsStatus) => void;
  setChatOpen: (open: boolean) => void;
  setLanguage: (lang: 'english' | 'hindi' | 'telugu' | 'urdu') => void;
  runSimulation: () => Promise<void>;
}

const getBackendUrl = () => {
  if (typeof window !== 'undefined') {
    return `http://${window.location.hostname}:8000`;
  }
  return process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
};

const getWsUrl = () => {
  if (typeof window !== 'undefined') {
    return `ws://${window.location.hostname}:8000`;
  }
  return process.env.NEXT_PUBLIC_BACKEND_WS_URL || process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';
};

const SCENARIO_BACKEND_MAP: Record<string, string | null> = {
  normal:      null,
  cloudCover:  'cloud_cover',
  heatwave:    'heatwave',
  gridFailure: 'grid_failure',
  evSurge:     'ev_surge',
};

const SCENARIO_METRICS = scenarioData;

const SOLAR_CAPACITY_KWH = 400;   // max solar at 100% slider
const BATTERY_CAPACITY_KWH = 30;  // max battery discharge per cycle at 100%
const GRID_CAPACITY_KW = 200;     // max grid import at 100%

let simulationTimeout: any = null;

export const useEnergyStore = create<EnergyStore>((set, get) => {
  const initialHouses = generateHouses();
  const initialScenario = 'normal';
  const initialData = scenarioData[initialScenario];

  return {
    community: {
      solarGeneration: initialData.solarGeneration,
      batteryLevel: initialData.batteryLevel,
      gridImport: initialData.gridImport,
      evCount: initialData.evCount,
      moneySaved: initialData.moneySaved,
      carbonReduced: initialData.carbonReduced,
      renewableUsage: initialData.renewableUsage,
    },
    houses: initialHouses,
    activeScenario: initialScenario,
    agentDecisions: initialData.agentDecisions,
    selectedHouse: null,
    
    // Initial values
    solarSlider: 100,
    batterySlider: 68,       // matches initialData.batteryLevel
    gridSlider: 50,
    backendConnected: false,
    negotiationStatus: 'idle' as const,
    wsStatus: 'idle',
    isChatOpen: false,
    selectedLanguage: 'english',

    setWsStatus: (status) => set({ wsStatus: status }),
    setChatOpen: (open) => set({ isChatOpen: open }),
    setLanguage: (lang) => set({ selectedLanguage: lang }),
    setBackendConnected: (connected) => set({ backendConnected: connected }),

    runSimulation: async () => {
      if (simulationTimeout) {
        clearTimeout(simulationTimeout);
      }
      simulationTimeout = setTimeout(async () => {
        const { activeScenario, solarSlider, batterySlider, gridSlider } = get();
        try {
          const response = await fetch(`${getBackendUrl()}/simulate`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({
              scenario: activeScenario,
              solar_pct: solarSlider,
              battery_pct: batterySlider,
              grid_pct: gridSlider
            }),
            signal:  AbortSignal.timeout(5000),
          });
          if (response.ok) {
            const data = await response.json();
            set({
              community:        data.community_metrics,
              backendConnected: true,
            });
          }
        } catch (err) {
          set({ backendConnected: false });
        }
      }, 300);
    },

    setSolarSlider: (pct) => {
      set((state) => {
        const solarSupply = SOLAR_CAPACITY_KWH * (pct / 100);
        const totalDemand = state.houses.reduce((s, h) => s + h.consumption, 0);
        const deficit = Math.max(0, totalDemand - solarSupply);

        let newBattery = state.batterySlider;
        let newGrid = state.gridSlider;

        if (deficit > 0) {
          // Battery compensates first, up to 100%
          const batteryNeeded = (deficit / BATTERY_CAPACITY_KWH) * 100;
          newBattery = Math.min(100, Math.max(newBattery, Math.ceil(batteryNeeded)));
          const batteryCovers = BATTERY_CAPACITY_KWH * (newBattery / 100);
          const remaining = Math.max(0, deficit - batteryCovers);
          if (remaining > 0) {
            const gridNeeded = (remaining / GRID_CAPACITY_KW) * 100;
            newGrid = Math.min(100, Math.max(newGrid, Math.ceil(gridNeeded)));
          }
        }

        return { solarSlider: pct, batterySlider: newBattery, gridSlider: newGrid };
      });
      get().runSimulation();
    },

    setBatterySlider: (pct) => {
      set((state) => {
        const solarSupply = SOLAR_CAPACITY_KWH * (state.solarSlider / 100);
        const batterySupply = BATTERY_CAPACITY_KWH * (pct / 100);
        const totalDemand = state.houses.reduce((s, h) => s + h.consumption, 0);
        const deficit = Math.max(0, totalDemand - solarSupply - batterySupply);

        let newGrid = state.gridSlider;
        if (deficit > 0) {
          const gridNeeded = (deficit / GRID_CAPACITY_KW) * 100;
          newGrid = Math.min(100, Math.max(newGrid, Math.ceil(gridNeeded)));
        }

        return { batterySlider: pct, gridSlider: newGrid };
      });
      get().runSimulation();
    },

    setGridSlider: (pct) => {
      set((state) => {
        const solarSupply = SOLAR_CAPACITY_KWH * (state.solarSlider / 100);
        const gridSupply = GRID_CAPACITY_KW * (pct / 100);
        const totalDemand = state.houses.reduce((s, h) => s + h.consumption, 0);
        const deficit = Math.max(0, totalDemand - solarSupply - gridSupply);

        let newBattery = state.batterySlider;
        if (deficit > 0) {
          const batteryNeeded = (deficit / BATTERY_CAPACITY_KWH) * 100;
          newBattery = Math.min(100, Math.max(newBattery, Math.ceil(batteryNeeded)));
        }

        return { gridSlider: pct, batterySlider: newBattery };
      });
      get().runSimulation();
    },

    setScenario: async (scenario) => {
      set({ activeScenario: scenario });

      // Update houses attributes based on scenario for visual effect (keep original logic)
      const state = get();
      const updatedHouses = state.houses.map((house) => {
        let consumption = house.consumption;
        let solarContribution = house.solarContribution;
        let energySource = house.energySource;

        if (scenario === 'cloudCover') {
          if (house.energySource === 'renewable') {
            solarContribution = parseFloat((25 + Math.random() * 15).toFixed(1));
            energySource = 'mixed';
          } else if (house.energySource === 'mixed') {
            solarContribution = parseFloat((5 + Math.random() * 10).toFixed(1));
            energySource = 'grid';
          }
        } else if (scenario === 'heatwave') {
          consumption = parseFloat((house.consumption * 1.6).toFixed(1));
          if (house.energySource === 'renewable') {
            solarContribution = parseFloat((60 + Math.random() * 20).toFixed(1));
            energySource = 'mixed';
          }
        } else if (scenario === 'gridFailure') {
          if (house.energySource === 'grid') {
            consumption = parseFloat((house.consumption * 0.1).toFixed(1));
          } else if (house.energySource === 'mixed') {
            consumption = parseFloat((house.consumption * 0.5).toFixed(1));
            solarContribution = 100;
          }
        } else if (scenario === 'evSurge') {
          if (house.energySource === 'grid') {
            consumption = parseFloat((house.consumption * 0.9).toFixed(1));
          }
        } else {
          if (house.id) {
            const original = initialHouses.find((h) => h.id === house.id);
            if (original) {
              consumption = original.consumption;
              solarContribution = original.solarContribution;
              energySource = original.energySource;
            }
          }
        }

        return {
          ...house,
          consumption,
          solarContribution,
          energySource,
        };
      });

      set({ houses: updatedHouses });

      // Update community metrics from backend (with fallback to mockData)
      try {
        const response = await fetch(`${getBackendUrl()}/simulate`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            scenario,
            solar_pct: state.solarSlider,
            battery_pct: state.batterySlider,
            grid_pct: state.gridSlider
          }),
          signal:  AbortSignal.timeout(5000),  // 5s timeout
        });

        if (response.ok) {
          const data = await response.json();
          set(state => ({
            community:        { ...state.community, ...data.community_metrics },
            backendConnected: true,
          }));
          return;
        }
      } catch (err) {
        set({ backendConnected: false });
      }

      // Fallback: use existing mockData scenario metrics
      const scenarioMetrics = SCENARIO_METRICS[scenario];
      if (scenarioMetrics) {
        set(state => ({
          community: { ...state.community, ...scenarioMetrics },
        }));
      }
    },

    setSelectedHouse: (id) => set({ selectedHouse: id }),

    updateCommunity: (data) => set((state) => ({
      community: { ...state.community, ...data },
    })),

    triggerMockDecision: (agent, message) => set((state) => {
      const now = new Date();
      const timestamp = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
      const newDecision: AgentDecision = { agent, message, timestamp };
      return {
        agentDecisions: [newDecision, ...state.agentDecisions].slice(0, 20),
      };
    }),

    triggerNegotiation: () => {
      const { activeScenario, solarSlider, batterySlider, gridSlider } = get();
      const BACKEND_WS = getWsUrl();

      set({ negotiationStatus: 'connecting', agentDecisions: [] });

      let ws: WebSocket;
      try {
        ws = new WebSocket(`${BACKEND_WS}/ws/negotiate`);
      } catch {
        // WebSocket constructor can throw on bad URL — fall back
        get()._runMockNegotiation();
        return;
      }

      const timeout = setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          ws.close();
          get()._runMockNegotiation();
        }
      }, 5000);

      ws.onopen = () => {
        clearTimeout(timeout);
        set({ negotiationStatus: 'streaming' });
        ws.send(JSON.stringify({
          scenario: activeScenario,
          solar_pct: solarSlider,
          battery_pct: batterySlider,
          grid_pct: gridSlider,
        }));
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.type === 'log') {
            const agentMap: Record<string, AgentDecision['agent']> = {
              Solar: 'Solar', Battery: 'Battery', EV: 'EV',
              Grid: 'Grid', Optimizer: 'Optimizer', House: 'House',
            };
            const agent = (agentMap[msg.agent] ?? 'Optimizer') as AgentDecision['agent'];
            set((state) => ({
              agentDecisions: [
                { agent, message: msg.message, timestamp: msg.timestamp },
                ...state.agentDecisions,
              ].slice(0, 20),
            }));
          }

          if (msg.type === 'decisions' && msg.community_metrics) {
            const m = msg.community_metrics;
            set((state) => ({
              community: {
                ...state.community,
                solarGeneration: m.solarGeneration ?? state.community.solarGeneration,
                batteryLevel:    m.batteryLevel    ?? state.community.batteryLevel,
                gridImport:      m.gridImport      ?? state.community.gridImport,
                evCount:         m.evCount         ?? state.community.evCount,
                moneySaved:      m.moneySaved      ?? state.community.moneySaved,
                carbonReduced:   m.carbonReduced   ?? state.community.carbonReduced,
                renewableUsage:  m.renewableUsage  ?? state.community.renewableUsage,
              },
            }));
          }

          if (msg.type === 'done') {
            set({ negotiationStatus: 'done' });
            ws.close();
            setTimeout(() => set({ negotiationStatus: 'idle' }), 3000);
          }

          if (msg.type === 'error') {
            set({ negotiationStatus: 'error' });
            ws.close();
            setTimeout(() => set({ negotiationStatus: 'idle' }), 3000);
          }
        } catch {
          // ignore malformed frames
        }
      };

      ws.onerror = () => {
        clearTimeout(timeout);
        ws.close();
        get()._runMockNegotiation();
      };

      ws.onclose = () => {
        clearTimeout(timeout);
        const { negotiationStatus } = get();
        if (negotiationStatus === 'connecting' || negotiationStatus === 'streaming') {
          get()._runMockNegotiation();
        }
      };
    },

    // Internal fallback — not exposed in interface but add to store:
    _runMockNegotiation: () => {
      const { activeScenario } = get();
      const decisions = scenarioData[activeScenario].agentDecisions;
      set({ negotiationStatus: 'streaming', agentDecisions: [] });
      decisions.forEach((decision, index) => {
        setTimeout(() => {
          set((state) => ({
            agentDecisions: [
              { ...decision, timestamp: new Date().toLocaleTimeString() },
              ...state.agentDecisions,
            ].slice(0, 8),
            negotiationStatus: index === decisions.length - 1 ? 'done' : 'streaming',
          }));
        }, index * 900);
      });
      setTimeout(() => set({ negotiationStatus: 'idle' }), decisions.length * 900 + 3000);
    },
  };
});
