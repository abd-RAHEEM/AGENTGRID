'use client';
import { useState, useEffect, useRef } from 'react';
import { useEnergyStore } from '../../store/useEnergyStore';

const SLIDER_CONFIG = [
  { key: 'solar'   as const, label: 'SOLAR',   icon: '☀️', color: '#FF6600' },
  { key: 'battery' as const, label: 'BATTERY', icon: '🔋', color: '#28A745' },
  { key: 'grid'    as const, label: 'GRID',    icon: '⚡', color: '#DC2626' },
];

export default function EnergySliders() {
  const solarSlider     = useEnergyStore((s) => s.solarSlider);
  const batterySlider   = useEnergyStore((s) => s.batterySlider);
  const gridSlider      = useEnergyStore((s) => s.gridSlider);
  const backendConnected = useEnergyStore((s) => s.backendConnected);
  const setSolarSlider   = useEnergyStore((s) => s.setSolarSlider);
  const setBatterySlider = useEnergyStore((s) => s.setBatterySlider);
  const setGridSlider    = useEnergyStore((s) => s.setGridSlider);

  // Track which sliders were auto-adjusted (show badge briefly)
  const [autoFlags, setAutoFlags] = useState({ solar: false, battery: false, grid: false });

  const values = { solar: solarSlider, battery: batterySlider, grid: gridSlider };
  const prevValues = useRef({ solar: solarSlider, battery: batterySlider, grid: gridSlider });

  useEffect(() => {
    const newAuto = {
      solar:   values.solar   !== prevValues.current.solar,
      battery: values.battery !== prevValues.current.battery,
      grid:    values.grid    !== prevValues.current.grid,
    };
    // Only flag ones that changed WITHOUT a direct user action
    // We detect indirect change by checking if the store update came from auto-compensation:
    // Simplified: flag any that changed
    if (newAuto.solar || newAuto.battery || newAuto.grid) {
      setAutoFlags(newAuto);
      const t = setTimeout(() => setAutoFlags({ solar: false, battery: false, grid: false }), 2000);
      prevValues.current = { ...values };
      return () => clearTimeout(t);
    }
    prevValues.current = { ...values };
  }, [solarSlider, batterySlider, gridSlider]);

  const handleChange = (key: 'solar' | 'battery' | 'grid', pct: number) => {
    if (key === 'solar')   setSolarSlider(pct);
    if (key === 'battery') setBatterySlider(pct);
    if (key === 'grid')    setGridSlider(pct);
  };

  const sliderValues = { solar: solarSlider, battery: batterySlider, grid: gridSlider };

  return (
    <div style={{
      background: '#FFFFFF',
      border: '2px solid #212121',
      boxShadow: '4px 4px 0px 0px #212121',
      padding: '12px',
      width: '210px',
      fontFamily: 'monospace',
      pointerEvents: 'auto',
    }}>
      {/* Header */}
      <div style={{
        fontSize: '10px', fontWeight: 'bold', letterSpacing: '0.12em',
        color: '#212121', textTransform: 'uppercase', marginBottom: '12px',
        borderBottom: '2px solid #212121', paddingBottom: '6px',
      }}>
        ⚡ SUPPLY CONTROLS
      </div>

      {/* Sliders */}
      {SLIDER_CONFIG.map(({ key, label, icon, color }) => (
        <div key={key} style={{ marginBottom: '10px' }}>
          {/* Label row */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: '4px',
          }}>
            <span style={{ fontSize: '9px', fontWeight: 'bold', letterSpacing: '0.1em', color: '#212121' }}>
              {icon} {label}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {autoFlags[key] && (
                <span style={{
                  fontSize: '7px', background: '#FFC107', color: '#212121',
                  padding: '1px 4px', fontWeight: 'bold', letterSpacing: '0.05em',
                }}>
                  AUTO
                </span>
              )}
              <span style={{ fontSize: '11px', fontWeight: '900', color, minWidth: '32px', textAlign: 'right' }}>
                {sliderValues[key]}%
              </span>
            </div>
          </div>

          {/* Range input */}
          <div style={{ position: 'relative' }}>
            <input
              type="range"
              min={0}
              max={100}
              value={sliderValues[key]}
              onChange={(e) => handleChange(key, parseInt(e.target.value))}
              style={{
                width: '100%',
                height: '6px',
                appearance: 'none',
                background: `linear-gradient(to right, ${color} 0%, ${color} ${sliderValues[key]}%, #E8EAEB ${sliderValues[key]}%, #E8EAEB 100%)`,
                border: '1px solid #212121',
                outline: 'none',
                cursor: 'pointer',
                borderRadius: '0',
              }}
            />
          </div>
        </div>
      ))}

      {/* Backend connection status */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '5px',
        borderTop: '1px solid #E8EAEB', paddingTop: '8px', marginTop: '4px',
      }}>
        <span style={{
          width: '7px', height: '7px', borderRadius: '50%',
          background: backendConnected ? '#28A745' : '#DC2626',
          flexShrink: 0,
        }} />
        <span style={{ fontSize: '8px', color: '#6B7280', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          {backendConnected ? 'BACKEND LIVE' : 'MOCK MODE'}
        </span>
      </div>
    </div>
  );
}
