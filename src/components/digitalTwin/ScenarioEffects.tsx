'use client';

import { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useEnergyStore } from '../../store/useEnergyStore';
import * as THREE from 'three';

export default function ScenarioEffects() {
  const activeScenario = useEnergyStore((s) => s.activeScenario);
  const { scene } = useThree();
  
  const ambientRef = useRef<THREE.AmbientLight>(null);
  const sunRef = useRef<THREE.DirectionalLight>(null);
  const emergencyLightRef = useRef<THREE.PointLight>(null);

  // Initialize scene properties once on mount to avoid WebGL lost context / rendering race conditions
  useEffect(() => {
    scene.background = new THREE.Color('#EAEAEA');
    scene.fog = new THREE.FogExp2('#EAEAEA', 0.002);
  }, [scene]);

  // Memoize scenario targets
  const SCENARIO_CONFIG = useMemo(() => ({
    normal: {
      background: new THREE.Color('#EAEAEA'),  // pristine clinical baseline (#EAEAEA)
      fogColor:   new THREE.Color('#EAEAEA'),
      fogDensity: 0.003,
      ambientIntensity: 1.0,
      sunColor:   new THREE.Color('#ffffff'),  // high-key soft light
      sunIntensity: 0.8,
    },
    cloudCover: {
      background: new THREE.Color('#D8DBDC'),
      fogColor:   new THREE.Color('#D8DBDC'),
      fogDensity: 0.015,
      ambientIntensity: 0.75,
      sunColor:   new THREE.Color('#cbd5e1'),
      sunIntensity: 0.3,
    },
    heatwave: {
      background: new THREE.Color('#EAD5C3'), // soft ochre-orange tint
      fogColor:   new THREE.Color('#EAD5C3'),
      fogDensity: 0.006,
      ambientIntensity: 1.25,
      sunColor:   new THREE.Color('#FF8833'),
      sunIntensity: 1.3,
    },
    gridFailure: {
      background: new THREE.Color('#C9CDD0'),
      fogColor:   new THREE.Color('#C9CDD0'),
      fogDensity: 0.016,
      ambientIntensity: 0.45,
      sunColor:   new THREE.Color('#ffb3b3'),
      sunIntensity: 0.35,
    },
    evSurge: {
      background: new THREE.Color('#D8DFE4'),
      fogColor:   new THREE.Color('#D8DFE4'),
      fogDensity: 0.005,
      ambientIntensity: 0.95,
      sunColor:   new THREE.Color('#FFE082'),
      sunIntensity: 0.9,
    },
  }), []);

  const gridHealthy = activeScenario !== 'gridFailure';
  const substationColor = gridHealthy ? '#28A745' : '#DC2626';

  // Smooth lerping of lighting and fog properties in rendering loop
  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    const target = SCENARIO_CONFIG[activeScenario] || SCENARIO_CONFIG.normal;

    // 1. Lerp ambient light intensity
    if (ambientRef.current) {
      ambientRef.current.intensity = THREE.MathUtils.lerp(ambientRef.current.intensity, target.ambientIntensity, 0.03);
    }

    // 2. Lerp sun light properties
    if (sunRef.current) {
      sunRef.current.intensity = THREE.MathUtils.lerp(sunRef.current.intensity, target.sunIntensity, 0.03);
      sunRef.current.color.lerp(target.sunColor, 0.03);
    }

    // 3. Lerp scene background color directly on the attached instance
    if (scene.background && scene.background instanceof THREE.Color) {
      scene.background.lerp(target.background, 0.03);
    }

    // 4. Lerp scene fog properties directly on the attached instance
    if (scene.fog && scene.fog instanceof THREE.FogExp2) {
      scene.fog.color.lerp(target.fogColor, 0.03);
      scene.fog.density = THREE.MathUtils.lerp(scene.fog.density, target.fogDensity, 0.03);
    }

    // 5. Emergency light flash rotation when grid failure active
    if (emergencyLightRef.current) {
      if (activeScenario === 'gridFailure') {
        emergencyLightRef.current.intensity = (Math.sin(time * 6) * 0.4 + 0.6) * 3.0;
        emergencyLightRef.current.position.x = Math.sin(time * 3) * 3;
        emergencyLightRef.current.position.z = -26 + Math.cos(time * 3) * 3;
      } else {
        emergencyLightRef.current.intensity = 0;
      }
    }
  });

  return (
    <group>
      {/* High-key ambient and sun lights */}
      <ambientLight ref={ambientRef} color="#ffffff" intensity={1.0} />
      <directionalLight
        ref={sunRef}
        castShadow
        position={[20, 35, 20]}
        color="#ffffff"
        intensity={0.8}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-far={100}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
      />

      {/* Physical Substation Mesh (Grid Connector Hub) */}
      <group position={[0, 0, -26]}>
        {/* Gravel base */}
        <mesh receiveShadow position={[0, -0.6, 0]}>
          <boxGeometry args={[6, 0.1, 5]} />
          <meshStandardMaterial color="#C2C5C7" roughness={0.9} />
        </mesh>

        {/* Substation transformer unit box */}
        <mesh castShadow position={[0, 0.4, 0]}>
          <boxGeometry args={[1.8, 1.2, 1.8]} />
          <meshStandardMaterial color="#212121" metalness={0.7} roughness={0.3} />
        </mesh>

        {/* Dynamic Health Status Indicator Light */}
        <mesh position={[0, 1.05, 0]}>
          <sphereGeometry args={[0.12, 16, 16]} />
          <meshBasicMaterial color={substationColor} />
        </mesh>

        {/* Substation cooling coils */}
        <mesh position={[1.0, 0.3, 0]} castShadow>
          <boxGeometry args={[0.2, 0.8, 1.4]} />
          <meshStandardMaterial color="#212121" metalness={0.8} roughness={0.4} />
        </mesh>
        <mesh position={[-1.0, 0.3, 0]} castShadow>
          <boxGeometry args={[0.2, 0.8, 1.4]} />
          <meshStandardMaterial color="#212121" metalness={0.8} roughness={0.4} />
        </mesh>

        {/* Substation Power Transmission Poles */}
        <group position={[0, 0.6, -1.8]}>
          <mesh castShadow position={[0, 1.5, 0]}>
            <cylinderGeometry args={[0.08, 0.14, 3.0]} />
            <meshStandardMaterial color="#212121" metalness={0.95} roughness={0.2} />
          </mesh>
          <mesh castShadow position={[0, 2.5, 0]}>
            <boxGeometry args={[2.5, 0.08, 0.08]} />
            <meshStandardMaterial color="#212121" metalness={0.95} roughness={0.2} />
          </mesh>
          <mesh castShadow position={[0, 1.8, 0]}>
            <boxGeometry args={[2.0, 0.08, 0.08]} />
            <meshStandardMaterial color="#212121" metalness={0.95} roughness={0.2} />
          </mesh>
        </group>
      </group>

      {/* Emergency flashing red light on grid failure */}
      <pointLight
        ref={emergencyLightRef}
        color="#DC2626"
        intensity={0}
        distance={25}
        position={[0, 1.5, -26]}
      />
    </group>
  );
}
