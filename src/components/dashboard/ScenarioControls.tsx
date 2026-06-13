'use client';

import { ActiveScenario } from '../../store/useEnergyStore';

const SCENARIOS = [
  { id: 'normal',      label: 'NORMAL',    icon: '☀️',  accent: '#28A745' },
  { id: 'cloudCover',  label: 'CLOUD',     icon: '☁️',  accent: '#6B7280' },
  { id: 'heatwave',    label: 'HEATWAVE',  icon: '🔥',  accent: '#FF6600' },
  { id: 'gridFailure', label: 'OUTAGE',    icon: '⚡',  accent: '#DC2626' },
  { id: 'evSurge',     label: 'EV SURGE',  icon: '🚗',  accent: '#FFC107' },
] as const;

interface ScenarioControlsProps {
  activeScenario: ActiveScenario;
  onScenarioChange: (s: ActiveScenario) => void;
}

export function ScenarioControls({ activeScenario, onScenarioChange }: ScenarioControlsProps) {
  return (
    <div style={{
      background: '#FFFFFF',
      border: '2px solid #212121',
      padding: '16px',
      marginBottom: '0',
    }}>
      {/* Section header */}
      <p style={{
        fontFamily: 'monospace',
        fontSize: '10px',
        fontWeight: 'bold',
        letterSpacing: '0.12em',
        color: '#6B7280',
        textTransform: 'uppercase',
        marginBottom: '12px',
        margin: '0 0 12px 0',
      }}>
        ▸ SCENARIO SIMULATOR
      </p>

      {/* 5 scenario buttons in a row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
        {SCENARIOS.map((s) => {
          const isActive = activeScenario === s.id;
          return (
            <button
              key={s.id}
              onClick={() => onScenarioChange(s.id as ActiveScenario)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                padding: '10px 4px',
                border: isActive ? `2px solid ${s.accent}` : '2px solid #212121',
                background: isActive ? s.accent : '#FFFFFF',
                color: isActive ? '#FFFFFF' : '#212121',
                fontFamily: 'monospace',
                fontSize: '9px',
                fontWeight: 'bold',
                letterSpacing: '0.05em',
                cursor: 'pointer',
                textTransform: 'uppercase',
                transition: 'all 0.15s ease',
                outline: 'none',
              }}
            >
              <span style={{ fontSize: '18px' }}>{s.icon}</span>
              <span>{s.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
