import { create } from 'zustand';
import { generateHouses, scenarioData } from '../data/mockData';

export type ActiveScenario = 'normal' | 'cloudCover' | 'heatwave' | 'gridFailure' | 'evSurge';

export interface House {
  id: string;
  position: [number, number, number];
  energySource: 'renewable' | 'mixed' | 'grid';
  consumption: number;            // kWh
  solarContribution: number;      // %
}

export interface AgentDecision {
  agent: 'Solar' | 'Battery' | 'EV' | 'Grid' | 'Optimizer';
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
  setScenario: (s: ActiveScenario) => void;
  setSelectedHouse: (id: string | null) => void;
  updateCommunity: (data: Partial<EnergyStore['community']>) => void;
  triggerMockDecision: (agent: AgentDecision['agent'], message: string) => void;
  triggerNegotiation: () => void;
}

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
    
    setScenario: (s) => set((state) => {
      const data = scenarioData[s];
      
      // Update houses attributes based on scenario for visual effect
      const updatedHouses = state.houses.map((house) => {
        let consumption = house.consumption;
        let solarContribution = house.solarContribution;
        let energySource = house.energySource;

        if (s === 'cloudCover') {
          // Solar generation drops, so solar contribution drops
          if (house.energySource === 'renewable') {
            solarContribution = parseFloat((25 + Math.random() * 15).toFixed(1));
            energySource = 'mixed'; // turns mixed due to lack of solar
          } else if (house.energySource === 'mixed') {
            solarContribution = parseFloat((5 + Math.random() * 10).toFixed(1));
            energySource = 'grid'; // relies mostly on grid now
          }
        } else if (s === 'heatwave') {
          // High AC usage, so consumption surges
          consumption = parseFloat((house.consumption * 1.6).toFixed(1));
          if (house.energySource === 'renewable') {
            solarContribution = parseFloat((60 + Math.random() * 20).toFixed(1));
            energySource = 'mixed'; // loads are too high for solar alone
          }
        } else if (s === 'gridFailure') {
          // Grid-dependent houses must shut down or reduce load to absolute minimums
          if (house.energySource === 'grid') {
            consumption = parseFloat((house.consumption * 0.1).toFixed(1)); // dark
          } else if (house.energySource === 'mixed') {
            consumption = parseFloat((house.consumption * 0.5).toFixed(1)); // critical load only
            solarContribution = 100; // grid import drops to 0
          }
        } else if (s === 'evSurge') {
          // Normal house usage but load balance is active
          if (house.energySource === 'grid') {
            consumption = parseFloat((house.consumption * 0.9).toFixed(1));
          }
        } else {
          // Reset to normal values
          if (house.id) {
            // Restore default values from generated template
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

      return {
        activeScenario: s,
        community: {
          solarGeneration: data.solarGeneration,
          batteryLevel: data.batteryLevel,
          gridImport: data.gridImport,
          evCount: data.evCount,
          moneySaved: data.moneySaved,
          carbonReduced: data.carbonReduced,
          renewableUsage: data.renewableUsage,
        },
        houses: updatedHouses,
        agentDecisions: data.agentDecisions,
      };
    }),

    setSelectedHouse: (id) => set({ selectedHouse: id }),

    updateCommunity: (data) => set((state) => ({
      community: { ...state.community, ...data },
    })),

    triggerMockDecision: (agent, message) => set((state) => {
      const now = new Date();
      const timestamp = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
      const newDecision: AgentDecision = { agent, message, timestamp };
      return {
        agentDecisions: [newDecision, ...state.agentDecisions].slice(0, 20), // limit log history to 20
      };
    }),

    triggerNegotiation: () => {
      const { activeScenario } = get();
      const decisions = scenarioData[activeScenario].agentDecisions;
      set({ agentDecisions: [] });
      decisions.forEach((decision, index) => {
        setTimeout(() => {
          set((state) => ({
            agentDecisions: [
              { ...decision, timestamp: new Date().toLocaleTimeString() },
              ...state.agentDecisions
            ].slice(0, 8)
          }));
        }, index * 900);
      });
    },
  };
});
