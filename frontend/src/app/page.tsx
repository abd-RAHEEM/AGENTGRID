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
import { motion, AnimatePresence } from 'framer-motion';
import ChatPanel from '../components/chat/ChatPanel';
import { useBackendHealth } from '../hooks/useBackendHealth';

interface StatCardProps {
  label: string;
  value: string | number;
  unit: string;
  color?: string;
  max?: number;
}

function StatCard({ label, value, unit, color = '#FF6600', max = 500 }: StatCardProps) {
  const numericValue = typeof value === 'number' ? value : parseFloat(value as string) || 0;
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
          width: `${Math.min(100, (numericValue / max) * 100)}%`,
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
    triggerNegotiation,
    isChatOpen,
    setChatOpen,
    backendConnected
  } = useEnergyStore();

  const solarSlider   = useEnergyStore((s) => s.solarSlider);
  const batterySlider = useEnergyStore((s) => s.batterySlider);
  const gridSlider    = useEnergyStore((s) => s.gridSlider);
  const negotiationStatus = useEnergyStore((s) => s.negotiationStatus);

  useBackendHealth();  // ping backend on mount

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

  const houseNumber = useMemo(() => {
    if (!inspectedHouse) return '';
    return inspectedHouse.id.split('-')[1] || '0';
  }, [inspectedHouse]);

  const batterySupport = useMemo(() => {
    if (!inspectedHouse) return 0;
    const base = inspectedHouse.energySource === 'renewable' ? 1.8 
               : inspectedHouse.energySource === 'mixed' ? 0.8 
               : 0.0;
    let multiplier = 1.0;
    if (activeScenario === 'gridFailure') {
      multiplier = 1.6;
    } else if (activeScenario === 'cloudCover') {
      multiplier = 1.2;
    } else if (activeScenario === 'heatwave') {
      multiplier = 0.5;
    }
    return parseFloat((base * (community.batteryLevel / 100) * multiplier).toFixed(2));
  }, [inspectedHouse, community.batteryLevel, activeScenario]);

  const activeAppliances = useMemo(() => {
    if (!inspectedHouse) return [];
    const hash = parseInt(inspectedHouse.id.split('-')[1]) || 1;
    const consumption = inspectedHouse.consumption;
    const appliances = [
      { name: 'Refrigerator', minLoad: 0 },
      { name: 'LED Lighting', minLoad: 0 },
      { name: 'Smart TV', minLoad: 1.0 },
      { name: 'Air Conditioner', minLoad: 2.5 },
      { name: 'Washing Machine', minLoad: 2.0 },
      { name: 'Induction Cooktop', minLoad: 1.8 },
      { name: 'Microwave', minLoad: 1.5 },
      { name: 'Water Pump', minLoad: 3.0 },
      { name: 'EV Charger', minLoad: 4.5 }
    ];
    return appliances
      .filter((app, idx) => {
        if (activeScenario === 'gridFailure') {
          if (inspectedHouse.energySource === 'grid') return false;
          return app.name === 'Refrigerator' || app.name === 'LED Lighting';
        }
        if (activeScenario === 'heatwave' && app.name === 'Air Conditioner') return true;
        if (activeScenario === 'evSurge' && app.name === 'EV Charger') return hash % 3 === 0;
        
        if (consumption < app.minLoad) return false;
        if (app.name === 'Refrigerator' || app.name === 'LED Lighting') return true;
        return (hash + idx) % 3 !== 0;
      })
      .map(app => app.name);
  }, [inspectedHouse, activeScenario]);

  const predictedEveningDemand = useMemo(() => {
    if (!inspectedHouse) return 0;
    const hash = parseInt(inspectedHouse.id.split('-')[1]) || 1;
    let factor = 1.35 + (hash % 3) * 0.1;
    if (activeScenario === 'heatwave') {
      factor += 0.45;
    } else if (activeScenario === 'gridFailure') {
      factor = 0.35;
    }
    return parseFloat((inspectedHouse.consumption * factor).toFixed(1));
  }, [inspectedHouse, activeScenario]);

  const dailyCost = useMemo(() => {
    if (!inspectedHouse) return 0;
    let ratePerKWh = 8.5;
    if (activeScenario === 'heatwave') {
      ratePerKWh = 12.0;
    } else if (activeScenario === 'gridFailure') {
      ratePerKWh = 15.0;
    }
    const gridKWh = inspectedHouse.consumption * (1 - inspectedHouse.solarContribution / 100) * 12;
    const cost = gridKWh * ratePerKWh;
    return Math.round(cost);
  }, [inspectedHouse, activeScenario]);

  const carbonFootprint = useMemo(() => {
    if (!inspectedHouse) return 0;
    const gridKWh = inspectedHouse.consumption * (1 - inspectedHouse.solarContribution / 100) * 24;
    return parseFloat((gridKWh * 0.82).toFixed(2));
  }, [inspectedHouse]);

  const aiRecommendation = useMemo(() => {
    if (!inspectedHouse) return '';
    const source = inspectedHouse.energySource;
    const solar = inspectedHouse.solarContribution;
    
    if (activeScenario === 'gridFailure') {
      if (source === 'grid') {
        return '🚨 GRID OUTAGE ACTIVE. No local solar/battery storage detected. Recommend requesting power transfer from neighboring renewable nodes.';
      }
      return '🔌 ISLAND MODE ACTIVE. Battery storage is backing up critical appliances. Keep consumption low and avoid running water heaters.';
    }
    
    if (activeScenario === 'heatwave') {
      if (solar > 50) {
        return '☀️ HEATWAVE ALERT. Solar contribution is high. Use battery-assisted cooling. Set AC to 26°C to avoid overload.';
      }
      return '⚡ HIGH LOAD ALERT. Dynamic pricing in effect. Shift heavy cooling loads to solar peak hours or battery discharge periods.';
    }
    
    if (activeScenario === 'cloudCover') {
      if (source === 'renewable') {
        return '☁️ LOW SOLAR YIELD. Solar production is down by 60%. Postpone washing machine cycle or charge EV using grid off-peak hours.';
      }
      return '🔋 GRID BALANCING. Community battery bank is discharging. Recommend conserving energy to minimize grid import surcharges.';
    }
    
    if (activeScenario === 'evSurge') {
      return '🚗 EV CONGESTION. Community charger demand is peaking. Smart queue is active; charging delayed to maintain local voltage stability.';
    }
    
    if (source === 'renewable') {
      if (solar > 90) {
        return '✨ OPTIMAL PERFORMANCE. House is 100% self-sufficient. Consider exporting 1.5 kWh surplus power to grid to earn carbon credits.';
      }
      return '🔋 STABLE STATUS. Solar offset is optimal. Battery storage is fully charged. Perfect time to charge portable electronics.';
    }
    
    if (source === 'mixed') {
      return '📈 BALANCED OPERATION. Blending grid and solar power. Battery is at healthy levels. Grid reliance is within nominal bounds.';
    }
    
    return '🔌 RETROFIT ADVISED. House is 100% reliant on grid power. Installing a 3.2 kW solar rooftop will lower monthly costs by ~45%.';
  }, [inspectedHouse, activeScenario]);

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

  const SOLAR_CAPACITY_KWH  = 400;
  const BATTERY_CAPACITY_KWH = 30;
  const GRID_CAPACITY_KW     = 200;

  const perHouseContribution = useMemo(() => {
    if (!inspectedHouse) return null;

    const totalDemand = houses.reduce((sum, h) => sum + h.consumption, 0);
    const houseDemand = inspectedHouse.consumption;
    const demandShare = totalDemand > 0 ? houseDemand / totalDemand : 1 / 50;

    const solarAvail  = SOLAR_CAPACITY_KWH  * (solarSlider / 100) * demandShare;
    const batteryAvail = BATTERY_CAPACITY_KWH * (batterySlider / 100) * demandShare;
    const gridAvail    = GRID_CAPACITY_KW   * (gridSlider / 100)    * demandShare;

    let remaining = houseDemand;
    const solar   = Math.min(solarAvail,  remaining); remaining -= solar;
    const battery = Math.min(batteryAvail, remaining); remaining -= battery;
    const grid    = Math.min(gridAvail,   remaining); remaining -= grid;
    const unmet   = Math.max(0, remaining);

    return {
      solar:   Math.round(solar   * 100) / 100,
      battery: Math.round(battery * 100) / 100,
      grid:    Math.round(grid    * 100) / 100,
      unmet:   Math.round(unmet   * 100) / 100,
      total:   houseDemand,
    };
  }, [inspectedHouse, solarSlider, batterySlider, gridSlider, houses]);

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
        position: 'relative',
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
              {inspectedHouse ? `HOUSE H-${houseNumber} TELEMETRY` : 'AGENTGRID TWIN'}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => setChatOpen(!isChatOpen)}
              style={{
                background:    isChatOpen ? '#FF6600' : '#FFFFFF',
                border:        '2px solid #FF6600',
                color:         isChatOpen ? '#FFFFFF' : '#FF6600',
                fontFamily:    'monospace',
                fontSize:      '10px',
                fontWeight:    'bold',
                padding:       '6px 12px',
                cursor:        'pointer',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                display:       'flex',
                alignItems:    'center',
                gap:           '6px',
              }}
            >
              💬 ARIA
            </button>
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
        </div>

          <AnimatePresence mode="wait">
            {!inspectedHouse ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.15 }}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '48px 24px',
                  textAlign: 'center',
                  background: '#FFFFFF',
                  margin: '16px',
                  border: '2px solid #212121',
                  boxShadow: '4px 4px 0px 0px #212121',
                  borderRadius: '4px',
                }}
              >
                {/* Illustrative placeholder icon */}
                <svg
                  width="56"
                  height="56"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#6B7280"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ marginBottom: '20px', color: '#6B7280', opacity: 0.8 }}
                >
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                  <circle cx="12" cy="12" r="5" strokeDasharray="3 3" />
                </svg>
                <div style={{
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  color: '#212121',
                  lineHeight: '1.6',
                  maxWidth: '300px',
                }}>
                  Select a house in the 3D Digital Twin to view its energy telemetry.
                </div>
              </motion.div>
            ) : (
              <motion.div
                key={inspectedHouse.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.15 }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {/* Trigger Negotiate Button Block */}
                <div style={{ padding: '12px 16px', borderBottom: '2px solid #212121', background: '#FFFFFF' }}>
                  <button
                    onClick={triggerNegotiation}
                    disabled={negotiationStatus === 'connecting' || negotiationStatus === 'streaming'}
                    style={{
                      width: '100%',
                      background: negotiationStatus === 'streaming' ? '#6B7280'
                                : negotiationStatus === 'done'      ? '#28A745'
                                : negotiationStatus === 'error'     ? '#DC2626'
                                : '#FF6600',
                      color: '#FFFFFF',
                      border: `2px solid ${negotiationStatus === 'error' ? '#DC2626' : '#212121'}`,
                      padding: '14px 0',
                      fontFamily: 'monospace',
                      fontSize: '13px',
                      fontWeight: '900',
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      cursor: (negotiationStatus === 'connecting' || negotiationStatus === 'streaming')
                        ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      borderRadius: '4px',
                    }}
                  >
                    {negotiationStatus === 'streaming'  ? '⏳ NEGOTIATING...'
                    : negotiationStatus === 'done'     ? '✓ COMPLETE'
                    : negotiationStatus === 'error'    ? '⚠ RETRY'
                    : '▶ TRIGGER NEGOTIATE'}
                  </button>
                </div>

                {/* Telemetry Metric Cards (8 cards in 2x4 grid) */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '8px',
                  padding: '16px',
                  borderBottom: '2px solid #212121',
                }}>
                  <StatCard label="House ID" value={`H-${houseNumber}`} unit="" color="#FF6600" max={50} />
                  <StatCard label="Current Consumption" value={inspectedHouse.consumption} unit="kWh" color="#FF6600" max={10} />
                  <StatCard label="Renewable Contribution" value={inspectedHouse.solarContribution} unit="%" color="#28A745" max={100} />
                  <StatCard label="Grid Dependency" value={parseFloat((100 - inspectedHouse.solarContribution).toFixed(1))} unit="%" color="#DC2626" max={100} />
                  <StatCard label="Battery Support" value={batterySupport} unit="kWh" color="#28A745" max={5} />
                  <StatCard label="Carbon Footprint" value={carbonFootprint} unit="kg CO₂" color="#6B7280" max={20} />
                  <StatCard label="Estimated Daily Cost" value={dailyCost} unit="₹" color="#FFC107" max={500} />
                  <StatCard label="Predicted Evening Demand" value={predictedEveningDemand} unit="kWh" color="#FF6600" max={15} />
                </div>

                {/* Energy Supply Breakdown */}
                {perHouseContribution && (
                  <div style={{
                    background: '#FFFFFF',
                    border: '2px solid #212121',
                    margin: '0 16px 0 16px',
                    padding: '12px',
                  }}>
                    <div style={{
                      fontFamily: 'monospace', fontSize: '9px', fontWeight: 'bold',
                      letterSpacing: '0.12em', textTransform: 'uppercase',
                      color: '#6B7280', marginBottom: '10px',
                    }}>
                      ▸ ENERGY SUPPLY BREAKDOWN
                    </div>

                    {/* Segmented bar */}
                    <div style={{
                      height: '12px', border: '2px solid #212121',
                      display: 'flex', overflow: 'hidden', marginBottom: '10px',
                    }}>
                      {(['solar', 'battery', 'grid', 'unmet'] as const).map((key) => {
                        const colors = { solar: '#FF6600', battery: '#28A745', grid: '#DC2626', unmet: '#E8EAEB' };
                        const pct = perHouseContribution.total > 0
                          ? (perHouseContribution[key] / perHouseContribution.total) * 100
                          : 0;
                        return pct > 0 ? (
                          <div key={key} style={{ width: `${pct}%`, background: colors[key], transition: 'width 0.4s ease' }} />
                        ) : null;
                      })}
                    </div>

                    {/* Metric rows */}
                    {[
                      { label: 'SOLAR',   value: perHouseContribution.solar,   color: '#FF6600', icon: '☀️' },
                      { label: 'BATTERY', value: perHouseContribution.battery, color: '#28A745', icon: '🔋' },
                      { label: 'GRID',    value: perHouseContribution.grid,    color: '#DC2626', icon: '⚡' },
                    ].map(({ label, value, color, icon }) => (
                      <div key={label} style={{
                        display: 'flex', justifyContent: 'space-between',
                        fontFamily: 'monospace', fontSize: '9px',
                        color: '#212121', marginBottom: '4px',
                      }}>
                        <span>{icon} {label}</span>
                        <span style={{ color, fontWeight: 'bold' }}>{value.toFixed(2)} kWh</span>
                      </div>
                    ))}

                    {perHouseContribution.unmet > 0 && (
                      <div style={{
                        background: '#FEF3C7', border: '1px solid #F59E0B',
                        padding: '4px 8px', marginTop: '6px',
                        fontFamily: 'monospace', fontSize: '9px', color: '#92400E',
                        fontWeight: 'bold',
                      }}>
                        ⚠ UNMET DEMAND: {perHouseContribution.unmet.toFixed(2)} kWh
                      </div>
                    )}
                  </div>
                )}

                {/* Scenario Controls Panel */}
                <ScenarioControls
                  activeScenario={activeScenario}
                  onScenarioChange={setScenario}
                />

                {/* Household Auditor Card */}
                <div style={{
                  background: '#FFFFFF',
                  border: '2px solid #212121',
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
                  <div style={{ padding: '16px' }}>
                    {/* Node ID + source badge */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <span style={{
                        fontFamily: 'monospace', fontSize: '11px',
                        fontWeight: 'bold', color: '#6B7280', textTransform: 'uppercase',
                      }}>
                        NODE H-{houseNumber}
                      </span>
                      <span style={{
                        background: sourceColor,
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

                    {/* Energy mix bar */}
                    <div style={{ marginBottom: '12px' }}>
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
                        <span>SOLAR {inspectedHouse.solarContribution.toFixed(1)}%</span>
                        <span>GRID {(100 - inspectedHouse.solarContribution).toFixed(1)}%</span>
                      </div>
                    </div>

                    {/* Active Appliances */}
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{
                        fontFamily: 'monospace', fontSize: '9px',
                        color: '#6B7280', textTransform: 'uppercase',
                        letterSpacing: '0.1em', marginBottom: '6px',
                      }}>
                        Active Appliances
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {activeAppliances.length === 0 ? (
                          <span style={{
                            fontFamily: 'monospace',
                            fontSize: '10px',
                            color: '#6B7280',
                            fontStyle: 'italic',
                          }}>
                            No active loads (Standby/Idle)
                          </span>
                        ) : (
                          activeAppliances.map((app) => (
                            <span
                              key={app}
                              style={{
                                background: '#FFFFFF',
                                border: '1px solid #212121',
                                padding: '2px 6px',
                                fontFamily: 'monospace',
                                fontSize: '9px',
                                fontWeight: 'bold',
                                color: '#212121',
                                borderRadius: '2px',
                                boxShadow: '1px 1px 0px 0px #212121',
                              }}
                            >
                              ● {app}
                            </span>
                          ))
                        )}
                      </div>
                    </div>

                    {/* AI Recommendation */}
                    <div style={{
                      background: '#FFFFFF',
                      border: '2px solid #212121',
                      padding: '10px 12px',
                      borderRadius: '2px',
                      boxShadow: '2px 2px 0px 0px #212121',
                    }}>
                      <div style={{
                        fontFamily: 'monospace', fontSize: '9px',
                        fontWeight: 'bold', color: '#FF6600',
                        letterSpacing: '0.1em', marginBottom: '4px',
                      }}>
                        AI Recommendation
                      </div>
                      <p style={{
                        fontFamily: 'monospace', fontSize: '10px',
                        color: '#212121', margin: 0, lineHeight: 1.4,
                      }}>
                        {aiRecommendation}
                      </p>
                    </div>
                  </div>
                </div>

                <ChatPanel
                  selectedHouse={inspectedHouse}
                  perHouseContribution={perHouseContribution}
                />

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
                  ▸ HOUSE SOLAR VS LOAD FORECAST (24H)
                </div>

                <div style={{
                  background: '#FFFFFF',
                  padding: '16px',
                  height: '240px',
                  borderBottom: '2px solid #212121',
                  margin: '0 0 16px 0',
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
              </motion.div>
            )}
          </AnimatePresence>

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
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <span style={{ fontFamily: 'monospace', fontSize: '9px', color: backendConnected ? '#28A745' : '#6B7280', fontWeight: 'bold' }}>
              {backendConnected ? '● BACKEND LIVE' : '○ MOCK MODE'}
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

    </div>
  );
}
