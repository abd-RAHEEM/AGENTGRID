'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useEnergyStore } from '../../store/useEnergyStore';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

interface EVBayProps {
  position: [number, number, number];
  isActive: boolean;
  scenario: string;
  bayIndex: number;
}

function EVBay({ position, isActive, scenario, bayIndex }: EVBayProps) {
  const ringRef = useRef<THREE.Mesh>(null);
  const ringOuterRef = useRef<THREE.Mesh>(null);
  const isEvSurge = scenario === 'evSurge';
  const ringColor = isEvSurge ? '#FFC107' : '#FF6600'; // amber surge, orange normal
  const pulseSpeed = isEvSurge ? 3.5 : 1.8;

  useFrame(({ clock }) => {
    if (!ringRef.current || !isActive) return;
    const t = clock.getElapsedTime() * pulseSpeed + bayIndex * 0.4;
    ringRef.current.scale.setScalar(1 + Math.sin(t) * 0.22);
    if (ringRef.current.material) {
      (ringRef.current.material as THREE.MeshBasicMaterial).opacity = 0.45 + Math.sin(t) * 0.35;
    }
    if (ringOuterRef.current) {
      ringOuterRef.current.scale.setScalar(1 + Math.sin(t + 1) * 0.12);
      if (ringOuterRef.current.material) {
        (ringOuterRef.current.material as THREE.MeshBasicMaterial).opacity = 0.18 + Math.sin(t + 1) * 0.12;
      }
    }
  });

  return (
    <group position={position}>
      {/* Ground pad */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <planeGeometry args={[3.5, 6]} />
        <meshStandardMaterial color={isActive ? '#1a0800' : '#1a1a1a'} />
      </mesh>
      
      {/* Car body */}
      <group position={[0, 0.4, 0]}>
        <mesh castShadow>
          <boxGeometry args={[1.8, 0.65, 3.5]} />
          <meshStandardMaterial
            color="#1a1a1a"
            metalness={0.8}
            roughness={0.2}
            transparent
            opacity={isActive ? 1 : 0.45}
          />
        </mesh>
        <mesh position={[0, 0.5, -0.3]} castShadow>
          <boxGeometry args={[1.55, 0.48, 2]} />
          <meshStandardMaterial color="#212121" />
        </mesh>
        
        {/* Headlights — orange when active */}
        {[-0.6, 0.6].map((x, i) => (
          <mesh key={i} position={[x, 0, 1.77]}>
            <boxGeometry args={[0.3, 0.14, 0.05]} />
            <meshStandardMaterial
              color={isActive ? '#FF6600' : '#333333'}
              emissive={isActive ? '#FF6600' : '#000000'}
              emissiveIntensity={isActive ? 2.0 : 0}
            />
          </mesh>
        ))}
      </group>

      {/* Charge pole */}
      {isActive && (
        <mesh position={[1.2, 1, 0]} castShadow>
          <cylinderGeometry args={[0.05, 0.05, 2, 8]} />
          <meshStandardMaterial color="#FF6600" emissive="#FF6600" emissiveIntensity={0.5} />
        </mesh>
      )}

      {/* Pulse rings */}
      {isActive && (
        <>
          <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
            <ringGeometry args={[1.2, 1.6, 32]} />
            <meshBasicMaterial color={ringColor} transparent opacity={0.5} side={THREE.DoubleSide} />
          </mesh>
          <mesh ref={ringOuterRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, 0]}>
            <ringGeometry args={[1.7, 2.0, 32]} />
            <meshBasicMaterial color={ringColor} transparent opacity={0.2} side={THREE.DoubleSide} />
          </mesh>
        </>
      )}
    </group>
  );
}

export default function EVZone() {
  const evCount = useEnergyStore((s) => s.community.evCount);
  const activeScenario = useEnergyStore((s) => s.activeScenario);

  return (
    <group position={[0, 0, 20]}>
      {/* Charcoal canopy */}
      <mesh position={[0, 4.5, 0]} castShadow>
        <boxGeometry args={[42, 0.25, 8]} />
        <meshStandardMaterial color="#212121" metalness={0.9} roughness={0.2} />
      </mesh>

      {/* Support columns */}
      {[-18, -9, 0, 9, 18].map((x) => (
        <mesh key={x} position={[x, 2.25, 0]} castShadow>
          <cylinderGeometry args={[0.15, 0.15, 4.5, 8]} />
          <meshStandardMaterial color="#212121" metalness={0.95} roughness={0.1} />
        </mesh>
      ))}

      {/* 10 bays */}
      {Array.from({ length: 10 }, (_, i) => (
        <EVBay
          key={i}
          position={[(i - 4.5) * 4, 0, 0]}
          isActive={i < evCount}
          scenario={activeScenario}
          bayIndex={i}
        />
      ))}

      {/* Neo-brutalist HTML Label */}
      <Html position={[0, 6.2, 0]} center pointerEvents="none">
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
          EV CHARGING — {evCount}/10 ACTIVE
        </div>
      </Html>
    </group>
  );
}
