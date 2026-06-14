'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useEnergyStore } from '../../store/useEnergyStore';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

export default function SolarFarm() {
  const solarGen = useEnergyStore((s) => s.community.solarGeneration);
  const activeScenario = useEnergyStore((s) => s.activeScenario);
  
  const groupRef = useRef<THREE.Group>(null);
  
  // Calculate relative glow intensity based on solar output (0 - 500 kWh scale)
  const glowIntensity = Math.max((solarGen / 500) * 1.8, 0.1);

  // Shared material for panels - extremely performant
  const panelMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#1a1a1a',
    emissive: '#FF6600',
    emissiveIntensity: 0.1,
    metalness: 0.3,
    roughness: 0.4,
  }), []);

  // Support structure material - brutalist charcoal metal
  const supportMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#212121',
    metalness: 0.9,
    roughness: 0.2,
  }), []);

  // Panel layout coordinates (relative to the Solar Farm center)
  const panels = useMemo(() => {
    const arr = [];
    const rows = 3;
    const cols = 4;
    const spacingX = 2.0;
    const spacingZ = 2.2;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        arr.push({
          id: `panel-${r}-${c}`,
          x: (c - (cols - 1) / 2) * spacingX,
          z: (r - (rows - 1) / 2) * spacingZ,
        });
      }
    }
    return arr;
  }, []);

  useFrame(({ clock }) => {
    // Pulse panel material emissive intensity
    const pulse = Math.sin(clock.getElapsedTime() * 1.2) * 0.12;
    panelMaterial.emissiveIntensity = glowIntensity + pulse;

    // Rotate panels slightly to track simulated sun
    if (groupRef.current) {
      const angle = Math.sin(clock.getElapsedTime() * 0.08) * 0.1;
      groupRef.current.children.forEach((child) => {
        if (child.name === 'panel-tilt') {
          child.rotation.x = -Math.PI / 6 + angle;
        }
      });
    }
  });

  return (
    <group ref={groupRef} position={[-32, 0.1, -15]}>
      {/* Concrete base pad */}
      <mesh receiveShadow position={[0, -0.65, 0]}>
        <boxGeometry args={[9, 0.1, 7]} />
        <meshStandardMaterial color="#4b5563" roughness={0.8} />
      </mesh>

      {/* Grid of solar panels */}
      {panels.map((panel) => (
        <group key={panel.id} position={[panel.x, 0, panel.z]} name="panel-tilt" rotation={[-Math.PI / 6, 0, 0]}>
          {/* Metal Stand support */}
          <mesh castShadow position={[0, -0.4, -0.2]}>
            <cylinderGeometry args={[0.05, 0.05, 0.6]} />
            <primitive object={supportMaterial} attach="material" />
          </mesh>
          <mesh castShadow position={[0, -0.2, 0.2]}>
            <cylinderGeometry args={[0.05, 0.05, 0.3]} />
            <primitive object={supportMaterial} attach="material" />
          </mesh>

          {/* Panel Support Frame */}
          <mesh position={[0, 0.02, 0]}>
            <boxGeometry args={[1.5, 0.05, 1.2]} />
            <meshStandardMaterial color="#1e293b" metalness={0.6} roughness={0.4} />
          </mesh>

          {/* PV Cell Surface */}
          <mesh position={[0, 0.05, 0]} castShadow>
            <planeGeometry args={[1.4, 1.1]} />
            <primitive object={panelMaterial} attach="material" />
          </mesh>

          {/* Dynamic Grid lines overlay on the PV surface */}
          <mesh position={[0, 0.051, 0]}>
            <planeGeometry args={[1.38, 1.08]} />
            <meshBasicMaterial 
              color="#FF6600" 
              transparent 
              opacity={activeScenario === 'cloudCover' ? 0.05 : 0.18} 
              wireframe 
            />
          </mesh>
        </group>
      ))}

      {/* Point light above farm — orange tinted */}
      <pointLight position={[0, 8, 0]} color="#FF6600" intensity={glowIntensity * 4} distance={22} />

      {/* Neo-brutalist HTML Label */}
      <Html position={[0, 7, 0]} center pointerEvents="none">
        <div style={{
          background: '#FFFFFF',
          border: '2px solid #212121',
          padding: '4px 10px',
          fontFamily: 'monospace',
          fontSize: '11px',
          fontWeight: 'bold',
          color: '#212121',
          whiteSpace: 'nowrap',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          pointerEvents: 'auto',
        }}>
          ⚡ SOLAR FARM — {solarGen} KWH
        </div>
      </Html>
    </group>
  );
}
