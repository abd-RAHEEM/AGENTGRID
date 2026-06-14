'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useEnergyStore } from '../../store/useEnergyStore';
import * as THREE from 'three';

interface FlowTubeProps {
  curve: THREE.CatmullRomCurve3;
  color: string;
  thickness: number;
  speed: number;
  active: boolean;
}

function FlowTube({ curve, color, thickness, speed, active }: FlowTubeProps) {
  const matRef = useRef<THREE.MeshBasicMaterial>(null);

  const dashTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 16;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 512, 16);
    // Sharp neo-brutalist dashes: no softness, hard edges
    ctx.fillStyle = '#ffffff';
    for (let x = 0; x < 512; x += 48) {
      ctx.fillRect(x, 3, 30, 10); // hard rectangle, no feathering
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(8, 1);
    return tex;
  }, []);

  useFrame((_, delta) => {
    if (!matRef.current || !active) return;
    dashTexture.offset.x -= speed * delta * 60;
  });

  // Safe thickness mapping to prevent R3F tag argument errors when inactive
  const safeThickness = thickness > 0 ? thickness : 0.01;

  return (
    <group visible={active && thickness > 0}>
      {/* Glow halo — same color at very low opacity */}
      <mesh>
        <tubeGeometry args={[curve, 80, safeThickness * 2.8, 8, false]} />
        <meshBasicMaterial color={color} transparent opacity={0.07} side={THREE.BackSide} />
      </mesh>
      {/* Main dash tube */}
      <mesh>
        <tubeGeometry args={[curve, 80, safeThickness, 8, false]} />
        <meshBasicMaterial ref={matRef} color={color} map={dashTexture} transparent opacity={1.0} />
      </mesh>
    </group>
  );
}

export default function EnergyFlow() {
  const activeScenario = useEnergyStore((state) => state.activeScenario);

  // Curves exactly as requested in specifications
  const curves = useMemo(() => ({
    solarToHouses: new THREE.CatmullRomCurve3([
      new THREE.Vector3(-28, 3, -10),
      new THREE.Vector3(-14, 8, -5),
      new THREE.Vector3(0, 6, 0),
      new THREE.Vector3(0, 2, 0),
    ]),
    solarToBattery: new THREE.CatmullRomCurve3([
      new THREE.Vector3(-28, 3, -10),
      new THREE.Vector3(0, 10, -12),
      new THREE.Vector3(28, 4, -10),
    ]),
    batteryToHouses: new THREE.CatmullRomCurve3([
      new THREE.Vector3(28, 4, -10),
      new THREE.Vector3(14, 7, -2),
      new THREE.Vector3(0, 5, 0),
      new THREE.Vector3(0, 2, 0),
    ]),
    gridToHouses: new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 1, 28),
      new THREE.Vector3(0, 3, 14),
      new THREE.Vector3(0, 2, 0),
    ]),
  }), []);

  const flowConfig = useMemo(() => ({
    normal: {
      solarToHouses:   { active: true,  thickness: 0.12, speed: 0.025, color: '#FF6600' }, // NEO_ORANGE
      solarToBattery:  { active: true,  thickness: 0.07, speed: 0.018, color: '#FFC107' }, // NEO_AMBER
      batteryToHouses: { active: false, thickness: 0.06, speed: 0.015, color: '#28A745' }, // NEO_GREEN
      gridToHouses:    { active: false, thickness: 0.06, speed: 0.012, color: '#DC2626' }, // NEO_RED
    },
    cloudCover: {
      solarToHouses:   { active: true,  thickness: 0.05, speed: 0.008, color: '#FF6600' },
      solarToBattery:  { active: false, thickness: 0.06, speed: 0.015, color: '#FFC107' },
      batteryToHouses: { active: true,  thickness: 0.15, speed: 0.030, color: '#28A745' },
      gridToHouses:    { active: true,  thickness: 0.10, speed: 0.022, color: '#DC2626' },
    },
    heatwave: {
      solarToHouses:   { active: true,  thickness: 0.14, speed: 0.028, color: '#FF6600' },
      solarToBattery:  { active: false, thickness: 0.06, speed: 0.015, color: '#FFC107' },
      batteryToHouses: { active: true,  thickness: 0.10, speed: 0.022, color: '#28A745' },
      gridToHouses:    { active: true,  thickness: 0.18, speed: 0.040, color: '#DC2626' },
    },
    gridFailure: {
      solarToHouses:   { active: true,  thickness: 0.12, speed: 0.025, color: '#FF6600' },
      solarToBattery:  { active: true,  thickness: 0.10, speed: 0.020, color: '#FFC107' },
      batteryToHouses: { active: true,  thickness: 0.18, speed: 0.035, color: '#28A745' },
      gridToHouses:    { active: false, thickness: 0.00, speed: 0.000, color: '#DC2626' },
    },
    evSurge: {
      solarToHouses:   { active: true,  thickness: 0.08, speed: 0.020, color: '#FF6600' },
      solarToBattery:  { active: false, thickness: 0.06, speed: 0.015, color: '#FFC107' },
      batteryToHouses: { active: true,  thickness: 0.12, speed: 0.025, color: '#28A745' },
      gridToHouses:    { active: true,  thickness: 0.18, speed: 0.042, color: '#DC2626' },
    },
  }), []);

  const currentConfig = flowConfig[activeScenario] || flowConfig.normal;

  return (
    <group>
      <FlowTube curve={curves.solarToHouses} {...currentConfig.solarToHouses} />
      <FlowTube curve={curves.solarToBattery} {...currentConfig.solarToBattery} />
      <FlowTube curve={curves.batteryToHouses} {...currentConfig.batteryToHouses} />
      <FlowTube curve={curves.gridToHouses} {...currentConfig.gridToHouses} />
    </group>
  );
}
