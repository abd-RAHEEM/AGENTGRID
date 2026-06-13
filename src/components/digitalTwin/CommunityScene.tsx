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
      {/* Floating Agent Messages Panel inside R3F canvas */}
      {/* Note: AgentOverlay contains the <Html> tag inside, but rendering it here directly
          outside Canvas means it won't have the Three Context.
          Wait! In Phase 2/3, we rendered AgentOverlay inside the <Canvas> context.
          Let's double check line 17 of previous implementation:
          Ah! In the previous file, AgentOverlay was rendered outside Canvas! But wait,
          in my new AgentOverlay implementation, I have <Html position={[-42, 22, -25]}>.
          The <Html> tag from @react-three/drei MUST be rendered inside a <Canvas> element to work properly!
          Yes, rendering it outside the <Canvas> will throw a React Three Fiber context error.
          So, we must render <AgentOverlay /> inside the <Canvas> tags!
          This is an extremely important fix to prevent runtime R3F errors. Let's make sure we put it inside <Canvas>!
      */}

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
