'use client';

import { useEnergyStore } from '../store/useEnergyStore';
import CommunityScene from '../components/digitalTwin/CommunityScene';
import { ScenarioControls } from '../components/dashboard/ScenarioControls';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { forecast24h } from '../data/mockData';
import { useMemo, useEffect, useState } from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  unit: string;
  color?: string;
}

function StatCard({ label, value, unit, color = '#FF6600' }: StatCardProps) {
  return (
    <div style={{
      background: '#FFFFFF',
      border: '2px solid #212121',
      padding: '14px 16px',
    }}>
      <div style={{
        fontFamily: 'monospace',
        fontSize: '9px',
        fontWeight: 'bold',
        letterSpacing: '0.12em',
        color: '#6B7280',
        textTransform: 'uppercase',
        marginBottom: '6px',
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: 'monospace',
        fontSize: '26px',
        fontWeight: '900',
        color: '#212121',
        lineHeight: 1,
        marginBottom: '4px',
      }}>
        {value}
        <span style={{ fontSize: '13px', color: '#6B7280', marginLeft: '4px' }}>
          {unit}
        </span>
      </div>
      {/* progress bar */}
      <div style={{
        height: '5px',
        background: '#E8EAEB',
        border: '1px solid #212121',
        marginTop: '8px',
      }}>
        <div style={{
          height: '100%',
          width: `${Math.min(100, (Number(value) / 500) * 100)}%`,
          background: color,
          transition: 'width 0.5s ease',
        }} />
      </div>
    </div>
  );
}

export default function Home() {
  const {
    community,
    houses,
    activeScenario,
    selectedHouse,
    setScenario,
    setSelectedHouse,
    triggerNegotiation
  } = useEnergyStore();

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const inspectedHouse = useMemo(() => {
    if (!selectedHouse) return null;
    return houses.find((h) => h.id === selectedHouse) || null;
  }, [selectedHouse, houses]);

  const sourceColor = useMemo(() => {
    if (!inspectedHouse) return '#6b7280';
    if (inspectedHouse.energySource === 'renewable') return '#28A745';
    if (inspectedHouse.energySource === 'mixed') return '#FFC107';
    return '#DC2626';
  }, [inspectedHouse]);

  const chartData = useMemo(() => {
    let solarArray = forecast24h.solarNormal;
    let demandArray = forecast24h.demandNormal;

    if (activeScenario === 'cloudCover') {
      solarArray = forecast24h.solarCloudy;
    } else if (activeScenario === 'heatwave') {
      solarArray = forecast24h.solarNormal;
      demandArray = forecast24h.demandHeatwave;
    } else if (activeScenario === 'evSurge') {
      demandArray = forecast24h.demandEVSurge;
    } else if (activeScenario === 'gridFailure') {
      solarArray = forecast24h.solarNormal;
      demandArray = forecast24h.demandNormal.map((v) => Math.round(v * 0.45));
    }

    return forecast24h.hours.map((hour, idx) => ({
      hour,
      generation: solarArray[idx],
      demand: demandArray[idx],
    }));
  }, [activeScenario]);

  if (!mounted) {
    return (
      <div style={{
        display: 'flex',
        height: '100vh',
        width: '100vw',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0b0f19',
        color: '#f8fafc',
        fontFamily: 'monospace',
      }}>
        LOADING...
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      width: '100vw',
      overflow: 'hidden',
      background: '#E8EAEB',
    }}>
      
      {/* Left Pane (3D Canvas Terminal Screen) - 60% */}
      <div style={{
        flex: 1,
        height: '100%',
        position: 'relative',
      }}>
        <CommunityScene />
      </div>

      {/* Right Pane (Operations Dashboard Control Panel) - 40% */}
      <div style={{
        width: '40%',
        height: '100vh',
        background: '#E8EAEB', // NEO_BG
        borderLeft: '2px solid #212121',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '0', // tight section blocks
      }}>
        
        {/* Top Header Bar */}
        <div style={{
          background: '#212121',
          padding: '12px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '2px solid #000000',
        }}>
          <div>
            <div style={{ color: '#FF6600', fontSize: '10px', fontFamily: 'monospace', letterSpacing: '0.15em', fontWeight: 'bold' }}>
              MULTI-AGENT ENERGY OS
            </div>
            <div style={{ color: '#FFFFFF', fontSize: '20px', fontWeight: '900', letterSpacing: '-0.02em' }}>
              AGENTGRID TWIN
            </div>
          </div>
          {/* Status Indicator */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: '#FFFFFF', border: '2px solid #28A745',
            padding: '6px 12px',
            fontFamily: 'monospace', fontSize: '10px',
            fontWeight: 'bold', color: '#28A745',
            textTransform: 'uppercase', letterSpacing: '0.08em',
          }}>
            <span style={{
              width: '8px', height: '8px',
              borderRadius: '50%', background: '#28A745',
              display: 'inline-block',
            }} />
            {activeScenario === 'normal' ? 'NORMAL OPS' : activeScenario.toUpperCase()}
          </div>
        </div>

        {/* Trigger Negotiate Button Block */}
        <div style={{ padding: '12px 16px', borderBottom: '2px solid #212121', background: '#FFFFFF' }}>
          <button
            onClick={triggerNegotiation}
            style={{
              width: '100%',
              background: '#FF6600', // NEO_ORANGE - primary CTA
              color: '#FFFFFF',
              border: '2px solid #212121',
              padding: '14px 0',
              fontFamily: 'monospace',
              fontSize: '13px',
              fontWeight: '900',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'background 0.15s ease',
              borderRadius: '4px',
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#e55a00'}
            onMouseLeave={e => e.currentTarget.style.background = '#FF6600'}
          >
            ▶ TRIGGER NEGOTIATE
          </button>
        </div>

        {/* Telemetry Metric Cards (6 cards in 2x3 grid) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '8px',
          padding: '16px',
          borderBottom: '2px solid #212121',
        }}>
          <StatCard label="Solar Generation" value={community.solarGeneration} unit="kWh" color="#FF6600" />
          <StatCard label="Battery Bank" value={community.batteryLevel} unit="%" color="#28A745" />
          <StatCard label="Grid Import" value={community.gridImport} unit="kWh" color="#DC2626" />
          <StatCard label="Active EVs" value={community.evCount} unit="/10" color="#FFC107" />
          <StatCard label="Money Saved" value={community.moneySaved} unit="" color="#FF6600" />
          <StatCard label="CO₂ Offset" value={community.carbonReduced} unit="kg" color="#28A745" />
        </div>

        {/* Scenario Controls Panel */}
        <ScenarioControls
          activeScenario={activeScenario}
          onScenarioChange={setScenario}
        />

        {/* Household Auditor Card */}
        <div style={{
          background: '#FFFFFF',
          border: '2px solid #212121',
          borderTop: '2px solid #212121',
          margin: '16px',
          boxShadow: '4px 4px 0px 0px #212121',
          borderRadius: '4px',
        }}>
          {/* Section Header */}
          <div style={{
            background: '#E8EAEB',
            borderBottom: '2px solid #212121',
            padding: '8px 16px',
            fontFamily: 'monospace',
            fontSize: '10px',
            fontWeight: 'bold',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: '#212121',
          }}>
            ▸ LIVE HOUSEHOLD AUDITOR
          </div>

          {!inspectedHouse ? (
            <div style={{
              padding: '20px 16px',
              fontFamily: 'monospace',
              fontSize: '11px',
              color: '#6B7280',
            }}>
              Select a house in the 3D viewport to inspect its telemetry.
            </div>
          ) : (
            <div style={{ padding: '16px' }}>
              {/* Node ID + source badge */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{
                  fontFamily: 'monospace', fontSize: '11px',
                  fontWeight: 'bold', color: '#6B7280', textTransform: 'uppercase',
                }}>
                  NODE {inspectedHouse.id.toUpperCase()}
                </span>
                <span style={{
                  background: sourceColor, // #28A745 / #FFC107 / #DC2626
                  color: '#FFFFFF',
                  fontFamily: 'monospace',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  padding: '2px 8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}>
                  {inspectedHouse.energySource.toUpperCase()}
                </span>
              </div>

              {/* 4 metrics in 2x2 grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px',
                marginBottom: '12px',
              }}>
                {[
                  { label: 'Load Demand', value: `${inspectedHouse.consumption.toFixed(1)} kWh` },
                  { label: 'Solar Offset', value: `${inspectedHouse.solarContribution}%` },
                  { label: 'Feed Type', value: inspectedHouse.energySource },
                  { label: 'Grid Reliance', value: `${(100 - inspectedHouse.solarContribution).toFixed(1)}%` },
                ].map((m) => (
                  <div key={m.label} style={{
                    background: '#FFFFFF',
                    padding: '10px 12px',
                    border: '2px solid #212121',
                  }}>
                    <div style={{
                      fontFamily: 'monospace', fontSize: '9px',
                      color: '#6B7280', textTransform: 'uppercase',
                      letterSpacing: '0.1em', marginBottom: '4px',
                    }}>
                      {m.label}
                    </div>
                    <div style={{
                      fontFamily: 'monospace', fontSize: '15px',
                      fontWeight: '900', color: '#212121',
                      textTransform: 'uppercase',
                    }}>
                      {m.value}
                    </div>
                  </div>
                ))}
              </div>

              {/* Energy mix bar */}
              <div>
                <div style={{
                  fontFamily: 'monospace', fontSize: '9px',
                  color: '#6B7280', textTransform: 'uppercase',
                  letterSpacing: '0.1em', marginBottom: '6px',
                }}>
                  Energy Mix
                </div>
                <div style={{
                  height: '12px',
                  border: '2px solid #212121',
                  display: 'flex',
                  overflow: 'hidden',
                }}>
                  <div style={{ width: `${inspectedHouse.solarContribution}%`, background: '#28A745' }} />
                  <div style={{ flex: 1, background: '#DC2626' }} />
                </div>
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  fontFamily: 'monospace', fontSize: '10px',
                  color: '#6B7280', marginTop: '4px',
                }}>
                  <span>SOLAR {inspectedHouse.solarContribution}%</span>
                  <span>GRID {(100 - inspectedHouse.solarContribution).toFixed(1)}%</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 24H Forecast Chart section */}
        <div style={{
          background: '#E8EAEB',
          borderTop: '2px solid #212121',
          borderBottom: '2px solid #212121',
          padding: '8px 16px',
          fontFamily: 'monospace',
          fontSize: '10px',
          fontWeight: 'bold',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: '#212121',
        }}>
          ▸ COMMUNITY SOLAR VS LOAD FORECAST (24H)
        </div>

        <div style={{
          background: '#FFFFFF',
          padding: '16px',
          height: '240px',
          borderBottom: '2px solid #212121',
        }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id="solarGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FF6600" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#FF6600" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="demandGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FFC107" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#FFC107" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#E8EAEB" strokeDasharray="4 4" />
              <XAxis dataKey="hour" stroke="#212121" tick={{ fontFamily: 'monospace', fontSize: 9, fill: '#212121' }} />
              <YAxis stroke="#212121" tick={{ fontFamily: 'monospace', fontSize: 9, fill: '#212121' }} />
              <Tooltip
                contentStyle={{
                  background: '#FFFFFF',
                  border: '2px solid #212121',
                  fontFamily: 'monospace',
                  fontSize: '11px',
                  color: '#212121',
                  borderRadius: 0,
                }}
              />
              <Area type="monotone" dataKey="generation" stroke="#FF6600" strokeWidth={2} fill="url(#solarGrad)" dot={false} name="Solar Gen" />
              <Area type="monotone" dataKey="demand" stroke="#FFC107" strokeWidth={2} fill="url(#demandGrad)" dot={false} name="Load Demand" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Footer Bar */}
        <div style={{
          background: '#212121',
          borderTop: '2px solid #212121',
          padding: '12px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 'auto',
        }}>
          <span style={{
            fontFamily: 'monospace', fontSize: '9px',
            color: '#6B7280', letterSpacing: '0.1em',
          }}>
            AGENTGRID OPERATION CONSOLE v1.0.0
          </span>
          <span style={{
            fontFamily: 'monospace', fontSize: '9px',
            color: '#FF6600', letterSpacing: '0.1em',
            fontWeight: 'bold',
          }}>
            ● LIVE
          </span>
        </div>

      </div>

    </div>
  );
}
