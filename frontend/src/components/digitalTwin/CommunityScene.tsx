'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import CommunityGrid from './CommunityGrid';
import SolarFarm from './SolarFarm';
import Battery from './Battery';
import EVZone from './EVZone';
import EnergyFlow from './EnergyFlow';
import ScenarioEffects from './ScenarioEffects';
import AgentOverlay from './AgentOverlay';
import EnergySliders from '../dashboard/EnergySliders';
export default function CommunityScene() {
  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: '100%',
      minHeight: '500px',
      background: '#0f172a',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute',
        top: '16px',
        left: '16px',
        zIndex: '10',
        pointerEvents: 'none',
      }}>
        <EnergySliders />
      </div>

      {/* R3F Canvas */}
      <Canvas
        shadows
        camera={{ position: [-30, 22, 32], fov: 45 }}
        gl={{ antialias: true, alpha: false }}
      >
        {/* Floating Agent Messages Panel (Anchored to world space coordinates) */}
        <AgentOverlay />

        {/* Dynamic environmental weather effects & lights */}
        <ScenarioEffects />

        {/* 50 House Community Grid Layout */}
        <CommunityGrid />

        {/* Solar Farm panel array */}
        <SolarFarm />

        {/* Cylinder battery storage */}
        <Battery />

        {/* EV Parking bays */}
        <EVZone />

        {/* Animated particle flows */}
        <EnergyFlow />

        {/* Camera interaction controls */}
        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          maxPolarAngle={Math.PI / 2 - 0.05} // Don't let camera go below ground
          minDistance={10}
          maxDistance={65}
          target={[0, 0, 0]}
        />
      </Canvas>

      {/* Floating Camera Help Tip Overlay - Neo-Brutalist Reskinned */}
      <div style={{
        position: 'absolute',
        bottom: '16px',
        right: '16px',
        pointerEvents: 'none',
        background: '#FFFFFF',
        border: '2px solid #212121',
        padding: '6px 12px',
        fontFamily: 'monospace',
        fontSize: '9px',
        fontWeight: 'bold',
        color: '#212121',
        borderRadius: '4px',
        letterSpacing: '0.05em',
        boxShadow: '2px 2px 0px 0px #212121',
      }}>
        DRAG TO ROTATE • PINCH TO ZOOM • RIGHT-CLICK DRAG TO PAN
      </div>
    </div>
  );
}
