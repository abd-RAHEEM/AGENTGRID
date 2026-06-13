'use client';

import { useEnergyStore, AgentDecision } from '../../store/useEnergyStore';
import { Html } from '@react-three/drei';

const AGENT_ACCENT_COLORS = {
  Solar:     '#FF6600',   // NEO_ORANGE
  Battery:   '#28A745',   // NEO_GREEN
  EV:        '#FFC107',   // NEO_AMBER
  Grid:      '#DC2626',   // NEO_RED
  Optimizer: '#FF6600',   // NEO_ORANGE
};

export default function AgentOverlay() {
  const agentDecisions = useEnergyStore((state) => state.agentDecisions);

  return (
    <Html pointerEvents="none" position={[-42, 22, -25]} center>
      <div style={{
        pointerEvents: 'auto',
        width: '300px',
        background: '#FFFFFF',
        border: '2px solid #212121',
        fontFamily: 'monospace',
        boxShadow: '4px 4px 0px 0px #212121',
      }}>
        {/* Header bar */}
        <div style={{
          background: '#212121',
          color: '#FFFFFF',
          padding: '8px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '11px',
          fontWeight: 'bold',
          letterSpacing: '0.1rem',
          textTransform: 'uppercase',
        }}>
          <span>▸ AGENT NETWORK</span>
          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: '#28A745', // NEO_GREEN pulsing dot
            display: 'inline-block',
          }} />
        </div>

        {/* Decision log entries */}
        <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
          {agentDecisions.length === 0 ? (
            <div style={{
              padding: '20px 12px',
              textAlign: 'center',
              fontSize: '11px',
              color: '#6B7280',
            }}>
              AWAITING NETWORK NEGOTIATION...
            </div>
          ) : (
            agentDecisions.slice(0, 5).map((d, i) => (
              <div key={i} style={{
                background: i === 0 ? '#212121' : '#FFFFFF',  // newest entry = dark panel
                color: i === 0 ? '#FFFFFF' : '#212121',
                borderBottom: i === agentDecisions.slice(0, 5).length - 1 ? 'none' : '1px solid #212121',
                padding: '10px 12px',
                transition: 'all 0.3s ease',
              }}>
                {/* Agent name row */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '4px',
                }}>
                  <span style={{
                    fontSize: '10px',
                    fontWeight: 'bold',
                    letterSpacing: '0.08em',
                    color: AGENT_ACCENT_COLORS[d.agent],
                  }}>
                    {d.agent.toUpperCase()} AGENT
                  </span>
                  <span style={{
                    fontSize: '9px',
                    color: i === 0 ? '#9ca3af' : '#6B7280',
                  }}>
                    {d.timestamp}
                  </span>
                </div>
                {/* Message */}
                <p style={{
                  fontSize: '11px',
                  margin: 0,
                  lineHeight: '1.4',
                  color: i === 0 ? '#E8EAEB' : '#212121',
                }}>
                  {d.message}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </Html>
  );
}
