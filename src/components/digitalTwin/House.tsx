'use client';

import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useEnergyStore, House as HouseType } from '../../store/useEnergyStore';
import * as THREE from 'three';

interface HouseProps {
  house: HouseType;
}

export default function House({ house }: HouseProps) {
  const meshRef = useRef<THREE.Group>(null);
  const selectedHouse = useEnergyStore((state) => state.selectedHouse);
  const setSelectedHouse = useEnergyStore((state) => state.setSelectedHouse);
  const [hovered, setHovered] = useState(false);

  const isSelected = selectedHouse === house.id;

  // Animate hover/selection scales in useFrame for maximum smoothness (60fps)
  useFrame((state) => {
    if (meshRef.current) {
      const targetScale = isSelected ? 1.15 : hovered ? 1.08 : 1.0;
      meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.15);
      
      // Floating animation when selected
      if (isSelected) {
        meshRef.current.position.y = Math.sin(state.clock.getElapsedTime() * 4) * 0.08 + 0.1;
      } else {
        meshRef.current.position.y = THREE.MathUtils.lerp(meshRef.current.position.y, 0, 0.1);
      }
    }
  });

  // Sector Division Colors from attached picture:
  // Sector 1 (Z >= 0, South): Orange roofs (#FF6611)
  // Sector 2 (Z < 0, North): Ochre/Yellow roofs (#DDAA44)
  const roofColor = house.position[2] >= 0 ? '#FF6611' : '#DDAA44';

  // Smart-meter status LED color matching the energy feed:
  // Renewable = Teal Green (#28A745), Mixed = Warm Amber (#FFC107), Grid = Crimson (#DC2626)
  const getStatusColor = () => {
    switch (house.energySource) {
      case 'renewable':
        return '#28A745';
      case 'mixed':
        return '#FFC107';
      case 'grid':
        return '#DC2626';
      default:
        return '#6B7280';
    }
  };

  const statusColor = getStatusColor();

  // Unified click handler to ensure selection works on either mesh
  const handleSelect = (e: any) => {
    console.log('House clicked:', house.id);
    e.stopPropagation();
    setSelectedHouse(isSelected ? null : house.id);
  };

  // Unified hover handlers to ensure pointer cursor updates correctly
  const handlePointerOver = (e: any) => {
    e.stopPropagation();
    setHovered(true);
    document.body.style.cursor = 'pointer';
  };

  const handlePointerOut = (e: any) => {
    e.stopPropagation();
    setHovered(false);
    document.body.style.cursor = 'auto';
  };

  return (
    <group
      ref={meshRef}
      position={[house.position[0], house.position[1], house.position[2]]}
    >
      {/* House Body (Clean White Cube as per clinical aesthetic) */}
      <mesh 
        castShadow 
        receiveShadow
        onClick={handleSelect}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        <boxGeometry args={[1.2, 1.2, 1.2]} />
        <meshStandardMaterial 
          color="#FFFFFF" 
          roughness={0.9}
          metalness={0.0}
          flatShading
        />
      </mesh>

      {/* Flat Slanted Roof slab */}
      <mesh 
        position={[0, 0.65, 0]} 
        castShadow
        onClick={handleSelect}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        <boxGeometry args={[1.3, 0.15, 1.3]} />
        <meshStandardMaterial 
          color={roofColor} 
          roughness={0.9} 
          metalness={0.0}
          flatShading
        />
      </mesh>

      {/* Smart Meter status LED on the front wall (visualizes feed type dynamically) */}
      <mesh 
        position={[0, 0.15, 0.61]}
        onClick={handleSelect}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial 
          color={statusColor} 
          emissive={statusColor}
          emissiveIntensity={hovered || isSelected ? 2.5 : 1.0}
        />
      </mesh>

      {/* Minimalist Door slot */}
      <mesh position={[-0.3, -0.3, 0.605]}>
        <planeGeometry args={[0.25, 0.5]} />
        <meshStandardMaterial color="#EAEAEA" roughness={1.0} />
      </mesh>

      {/* Outline highlight (Gives Digital Twin aesthetic on hover/select) */}
      {(hovered || isSelected) && (
        <lineSegments position={[0, 0, 0]}>
          <edgesGeometry args={[new THREE.BoxGeometry(1.25, 1.25, 1.25)]} />
          <lineBasicMaterial 
            color={isSelected ? '#212121' : statusColor} 
            linewidth={2} 
          />
        </lineSegments>
      )}

      {/* Selection Base ring */}
      {isSelected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.59, 0]}>
          <ringGeometry args={[0.9, 1.0, 32]} />
          <meshBasicMaterial color="#212121" side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}
