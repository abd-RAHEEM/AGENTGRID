import { House, AgentDecision } from '../store/useEnergyStore';

// Generate 50 houses with specified distribution
// ~60% renewable (30 houses), 25% mixed (12 houses), 15% grid-dependent (8 houses)
export const generateHouses = (): House[] => {
  const houses: House[] = [];
  const sources: ('renewable' | 'mixed' | 'grid')[] = [
    ...Array(30).fill('renewable'),
    ...Array(12).fill('mixed'),
    ...Array(8).fill('grid'),
  ];
  
  // Shuffle deterministically or use direct indexing
  let houseIdx = 0;
  
  // Neighborhood layouts: 5 blocks of 10 houses
  // Center is (0, 0, 0)
  const blocks = [
    { startX: 6, startZ: 6, spacingX: 4, spacingZ: 4, cols: 2, rows: 5 },   // NE Block
    { startX: -10, startZ: 6, spacingX: 4, spacingZ: 4, cols: 2, rows: 5 },  // NW Block
    { startX: 6, startZ: -22, spacingX: 4, spacingZ: 4, cols: 2, rows: 5 },  // SE Block
    { startX: -10, startZ: -22, spacingX: 4, spacingZ: 4, cols: 2, rows: 5 }, // SW Block
    { startX: -22, startZ: -8, spacingX: 4, spacingZ: 4, cols: 2, rows: 5 },  // West Block
  ];

  blocks.forEach((block) => {
    for (let c = 0; c < block.cols; c++) {
      for (let r = 0; r < block.rows; r++) {
        const id = `house-${houseIdx + 1}`;
        const source = sources[houseIdx % sources.length];
        
        // Base coordinate calculation
        const x = block.startX + c * block.spacingX;
        const y = 0; // standard ground height
        const z = block.startZ + r * block.spacingZ;
        
        // Define energy consumption based on type
        // Grid uses more grid-power, Renewable uses less, Mixed in between
        let consumption = 2.5; // kWh
        let solarContribution = 0; // %
        
        if (source === 'renewable') {
          consumption = parseFloat((1.5 + Math.random() * 2.0).toFixed(1));
          solarContribution = parseFloat((80 + Math.random() * 20).toFixed(1));
        } else if (source === 'mixed') {
          consumption = parseFloat((3.0 + Math.random() * 3.0).toFixed(1));
          solarContribution = parseFloat((30 + Math.random() * 30).toFixed(1));
        } else {
          consumption = parseFloat((5.0 + Math.random() * 5.0).toFixed(1));
          solarContribution = 0;
        }

        houses.push({
          id,
          position: [x, y, z],
          energySource: source,
          consumption,
          solarContribution,
        });
        
        houseIdx++;
      }
    }
  });

  return houses;
};

// 24-Hour Solar and Demand Forecast arrays
export const forecast24h = {
  hours: Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`),
  solarNormal: [0, 0, 0, 0, 0, 5, 25, 80, 150, 220, 260, 280, 275, 240, 180, 110, 45, 10, 0, 0, 0, 0, 0, 0],
  solarCloudy: [0, 0, 0, 0, 0, 2, 10, 32, 60, 88, 104, 112, 110, 96, 72, 44, 18, 4, 0, 0, 0, 0, 0, 0],
  demandNormal: [45, 38, 35, 35, 42, 65, 120, 180, 160, 140, 130, 135, 145, 150, 130, 125, 165, 220, 240, 210, 170, 120, 80, 55],
  demandHeatwave: [70, 60, 55, 55, 65, 95, 170, 240, 230, 220, 210, 230, 250, 260, 240, 230, 270, 320, 340, 300, 250, 180, 120, 90],
  demandEVSurge: [45, 38, 35, 35, 42, 65, 120, 195, 180, 150, 135, 140, 150, 155, 135, 130, 180, 260, 310, 290, 250, 190, 130, 75],
};

export interface ScenarioDetails {
  solarGeneration: number;
  batteryLevel: number;
  gridImport: number;
  evCount: number;
  moneySaved: number;
  carbonReduced: number;
  renewableUsage: number;
  agentDecisions: AgentDecision[];
}

export const scenarioData: Record<string, ScenarioDetails> = {
  normal: {
    solarGeneration: 280,
    batteryLevel: 68,
    gridImport: 42,
    evCount: 7,
    moneySaved: 12450,
    carbonReduced: 840,
    renewableUsage: 85,
    agentDecisions: [
      {
        agent: 'Solar',
        message: 'Peak solar generation detected at 280 kWh. Weather conditions optimal.',
        timestamp: '12:00:05',
      },
      {
        agent: 'Battery',
        message: 'Battery at 68%. Storing excess solar generation. Charge rate at 45 kW.',
        timestamp: '12:00:12',
      },
      {
        agent: 'EV',
        message: '7 active EVs charging. Smart scheduling active to maximize solar usage.',
        timestamp: '12:00:20',
      },
      {
        agent: 'Grid',
        message: 'Importing minimal backup power (42 kWh) to stabilize minor load spikes.',
        timestamp: '12:00:28',
      },
      {
        agent: 'Optimizer',
        message: 'System running in eco-balancing mode. 85% of community consumption is renewable.',
        timestamp: '12:00:35',
      },
    ],
  },
  cloudCover: {
    solarGeneration: 112,
    batteryLevel: 45,
    gridImport: 95,
    evCount: 3,
    moneySaved: 9800,
    carbonReduced: 620,
    renewableUsage: 48,
    agentDecisions: [
      {
        agent: 'Solar',
        message: 'Solar generation dropped to 112 kWh due to heavy cloud cover.',
        timestamp: '12:02:05',
      },
      {
        agent: 'Battery',
        message: 'Initiating discharge (35 kW) to cover the renewable deficit.',
        timestamp: '12:02:14',
      },
      {
        agent: 'EV',
        message: 'High demand detected. Paused charging for 4 non-critical EVs. Active count: 3.',
        timestamp: '12:02:22',
      },
      {
        agent: 'Grid',
        message: 'Grid imports increased to 95 kWh to support critical household base loads.',
        timestamp: '12:02:30',
      },
      {
        agent: 'Optimizer',
        message: 'Switched optimizer profile to Critical Load Preservation. Delaying flexible loads.',
        timestamp: '12:02:38',
      },
    ],
  },
  heatwave: {
    solarGeneration: 340,
    batteryLevel: 32,
    gridImport: 180,
    evCount: 5,
    moneySaved: 10100,
    carbonReduced: 710,
    renewableUsage: 60,
    agentDecisions: [
      {
        agent: 'Solar',
        message: 'Maximum solar output at 340 kWh. Extreme ambient light conditions.',
        timestamp: '12:04:02',
      },
      {
        agent: 'Battery',
        message: 'Battery level depleted to 32% due to continuous heavy AC demand.',
        timestamp: '12:04:10',
      },
      {
        agent: 'Grid',
        message: 'Importing 180 kWh. Community load is peaking. Voltage stable.',
        timestamp: '12:04:18',
      },
      {
        agent: 'Optimizer',
        message: 'Negotiating with Household Agents: Suggesting AC target +2°C. Dynamic pricing alert!',
        timestamp: '12:04:25',
      },
      {
        agent: 'Optimizer',
        message: 'Load balancing applied. Saved 45 kWh in peak demand. AC curtailment successful.',
        timestamp: '12:04:32',
      },
    ],
  },
  gridFailure: {
    solarGeneration: 220,
    batteryLevel: 55,
    gridImport: 0,
    evCount: 2,
    moneySaved: 15100,
    carbonReduced: 990,
    renewableUsage: 100,
    agentDecisions: [
      {
        agent: 'Grid',
        message: 'CRITICAL ALERT: Main grid line outage detected. Grid import disconnected.',
        timestamp: '12:06:01',
      },
      {
        agent: 'Optimizer',
        message: 'Isolating community. Switching to Microgrid Island Mode.',
        timestamp: '12:06:05',
      },
      {
        agent: 'Battery',
        message: 'Battery taking over as primary grid reference. Discharging at max rate (90 kW).',
        timestamp: '12:06:12',
      },
      {
        agent: 'EV',
        message: 'EV Charging paused except for emergency services. Active count: 2.',
        timestamp: '12:06:20',
      },
      {
        agent: 'Solar',
        message: 'Solar energy routed directly to critical loads and battery balancing.',
        timestamp: '12:06:28',
      },
      {
        agent: 'Optimizer',
        message: 'Community is self-sustaining in Island Mode. Critical loads: 100% active.',
        timestamp: '12:06:36',
      },
    ],
  },
  evSurge: {
    solarGeneration: 250,
    batteryLevel: 42,
    gridImport: 125,
    evCount: 10,
    moneySaved: 11200,
    carbonReduced: 780,
    renewableUsage: 65,
    agentDecisions: [
      {
        agent: 'EV',
        message: '10 EVs connected at EV Zone. Extreme charging demand: 110 kW.',
        timestamp: '12:08:04',
      },
      {
        agent: 'Solar',
        message: 'Allocating 150 kWh solar generation directly to the EV Zone charging buses.',
        timestamp: '12:08:12',
      },
      {
        agent: 'Battery',
        message: 'Discharging battery at 40 kW to assist solar in charging active vehicles.',
        timestamp: '12:08:20',
      },
      {
        agent: 'Grid',
        message: 'Grid imports bumped to 125 kWh to cushion EV startup surge.',
        timestamp: '12:08:28',
      },
      {
        agent: 'Optimizer',
        message: 'Implementing Sequential EV Charge Queue. Prioritizing low-battery vehicles.',
        timestamp: '12:08:35',
      },
    ],
  },
};
