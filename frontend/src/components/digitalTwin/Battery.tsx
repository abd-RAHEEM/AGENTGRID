'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useEnergyStore } from '../../store/useEnergyStore';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

interface ChargePulseRingProps {
  index: number;
  color: string;
  isCharging: boolean;
}

function ChargePulseRing({ index, color, isCharging }: ChargePulseRingProps) {
  const ref = useRef<THREE.Mesh>(null);
  const offset = index * (1 / 3);
  
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = ((clock.getElapsedTime() * 0.4 + offset) % 1);
    ref.current.position.y = isCharging ? (t * 6) - 3 : (3 - t * 6);
    if (ref.current.material) {
      (ref.current.material as THREE.MeshBasicMaterial).opacity = Math.sin(t * Math.PI) * 0.75;
    }
  });

  return (
    <mesh ref={ref} rotation={[Math.PI / 2, 0, 0]}>
      <ringGeometry args={[1.7, 2.0, 32]} />
      <meshBasicMaterial color={color} transparent opacity={0.5} side={THREE.DoubleSide} />
    </mesh>
  );
}

export default function Battery() {
  const batteryLevel = useEnergyStore((s) => s.community.batteryLevel);
  const activeScenario = useEnergyStore((s) => s.activeScenario);
  const innerRef = useRef<THREE.Mesh>(null);
  
  const isCharging = activeScenario === 'normal' || activeScenario === 'heatwave';
  const coreColor = batteryLevel > 60 ? '#28A745' : batteryLevel > 30 ? '#FFC107' : '#FF6600';
  const maxCoreHeight = 6.0;

  useFrame(() => {
    if (!innerRef.current) return;
    const target = (batteryLevel / 100);
    
    // Smooth transition
    innerRef.current.scale.y += (target - innerRef.current.scale.y) * 0.04;
    innerRef.current.position.y = (innerRef.current.scale.y * maxCoreHeight) / 2 + 0.1;
    
    if (innerRef.current.material) {
      const mat = innerRef.current.material as THREE.MeshStandardMaterial;
      mat.color.set(coreColor);
      mat.emissive.set(coreColor);
    }
  });

  return (
    <group position={[28, 0, -10]}>
      {/* Concrete base pad */}
      <mesh receiveShadow position={[0, -4.1, 0]}>
        <boxGeometry args={[6, 0.1, 6]} />
        <meshStandardMaterial color="#374151" roughness={0.8} />
      </mesh>

      {/* Glass outer shell */}
      <mesh>
        <cylinderGeometry args={[2.2, 2.2, 8, 32]} />
        <meshPhysicalMaterial
          color="#E8EAEB"
          transparent
          opacity={0.08}
          roughness={0}
          metalness={0.1}
          transmission={0.92}
          thickness={0.5}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Charcoal metal caps */}
      {[4.15, -4.15].map((y, i) => (
        <mesh key={i} position={[0, y, 0]} castShadow>
          <cylinderGeometry args={[2.3, 2.3, 0.3, 32]} />
          <meshStandardMaterial color="#212121" metalness={0.95} roughness={0.1} />
        </mesh>
      ))}

      {/* Glowing inner core */}
      <mesh ref={innerRef} position={[0, 0, 0]} castShadow>
        <cylinderGeometry args={[1.6, 1.6, maxCoreHeight, 32]} />
        <meshStandardMaterial
          color={coreColor}
          emissive={coreColor}
          emissiveIntensity={0.9}
          transparent
          opacity={0.92}
        />
      </mesh>

      {/* Point light to project glow */}
      <pointLight color={coreColor} intensity={3.5} distance={15} position={[0, 0, 0]} />

      {/* Charge/discharge pulse rings */}
      {[0, 1, 2].map((i) => (
        <ChargePulseRing key={i} index={i} color={coreColor} isCharging={isCharging} />
      ))}

      {/* Neo-brutalist HTML label */}
      <Html pointerEvents="none" position={[0, 5.5, 0]} center>
        <div style={{
          pointerEvents: 'auto',
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
        }}>
          BATTERY — {batteryLevel}%
        </div>
      </Html>
    </group>
  );
}
