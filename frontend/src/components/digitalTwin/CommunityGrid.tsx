'use client';

import { useEnergyStore } from '../../store/useEnergyStore';
import House from './House';
import { useMemo } from 'react';
import * as THREE from 'three';

export default function CommunityGrid() {
  const houses = useEnergyStore((state) => state.houses);

  // Road coordinates to generate gold dashed lines
  const horizontalDashes = useMemo(() => {
    const arr = [];
    for (let x = -24; x <= 24; x += 4) {
      if (Math.abs(x) > 1) { // leave intersection clear
        arr.push(x);
      }
    }
    return arr;
  }, []);

  const verticalDashes = useMemo(() => {
    const arr = [];
    for (let z = -26; z <= 14; z += 4) {
      if (z < -8 || z > 2) { // leave intersections clear
        arr.push(z);
      }
    }
    return arr;
  }, []);

  // Tree coordinates aligned along the roads (pin-cushion style)
  const treePositions = useMemo((): [number, number, number][] => {
    return [
      // Along main vertical road (x = 0)
      [1.4, 0, -20], [-1.4, 0, -20],
      [1.4, 0, -12], [-1.4, 0, -12],
      [1.4, 0, -4], [-1.4, 0, -4],
      [1.4, 0, 4], [-1.4, 0, 4],
      [1.4, 0, 12], [-1.4, 0, 12],
      
      // Along main horizontal road (z = 0)
      [-22, 0, 1.4], [-22, 0, -1.4],
      [-10, 0, 1.4], [-10, 0, -1.4],
      [-4, 0, 1.4], [-4, 0, -1.4],
      [4, 0, 1.4], [4, 0, -1.4],
      [10, 0, 1.4], [10, 0, -1.4],
      [22, 0, 1.4], [22, 0, -1.4],
    ];
  }, []);

  return (
    <group>
      {/* Pristine ground plane - Off-white (#EAEAEA) clinical baseline */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.605, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#EAEAEA" roughness={1.0} metalness={0.0} flatShading />
      </mesh>

      {/* Houses */}
      {houses.map((house) => (
        <House key={house.id} house={house} />
      ))}

      {/* Roads - Dark charcoal gray (#555555) */}
      {/* Horizontal Main Road */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.6, 0]} receiveShadow>
        <planeGeometry args={[60, 2]} />
        <meshStandardMaterial color="#555555" roughness={0.9} metalness={0.0} flatShading />
      </mesh>
      {/* Vertical Main Road */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.6, -6]} receiveShadow>
        <planeGeometry args={[2, 44]} />
        <meshStandardMaterial color="#555555" roughness={0.9} metalness={0.0} flatShading />
      </mesh>
      {/* East Road */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[16, -0.6, -6]} receiveShadow>
        <planeGeometry args={[2, 44]} />
        <meshStandardMaterial color="#555555" roughness={0.9} metalness={0.0} flatShading />
      </mesh>
      {/* West Road */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-16, -0.6, -6]} receiveShadow>
        <planeGeometry args={[2, 44]} />
        <meshStandardMaterial color="#555555" roughness={0.9} metalness={0.0} flatShading />
      </mesh>

      {/* Dashed Center Lines - Muted Gold (#CC9944) */}
      {/* Horizontal Main Road Dashes */}
      {horizontalDashes.map((x) => (
        <mesh key={`h-dash-${x}`} rotation={[-Math.PI / 2, 0, 0]} position={[x, -0.595, 0]}>
          <planeGeometry args={[1.2, 0.08]} />
          <meshBasicMaterial color="#CC9944" />
        </mesh>
      ))}
      {/* Vertical Main Road Dashes */}
      {verticalDashes.map((z) => (
        <mesh key={`v-dash-main-${z}`} rotation={[-Math.PI / 2, 0, Math.PI / 2]} position={[0, -0.595, z]}>
          <planeGeometry args={[1.2, 0.08]} />
          <meshBasicMaterial color="#CC9944" />
        </mesh>
      ))}
      {/* East Road Dashes */}
      {verticalDashes.map((z) => (
        <mesh key={`v-dash-east-${z}`} rotation={[-Math.PI / 2, 0, Math.PI / 2]} position={[16, -0.595, z]}>
          <planeGeometry args={[1.2, 0.08]} />
          <meshBasicMaterial color="#CC9944" />
        </mesh>
      ))}
      {/* West Road Dashes */}
      {verticalDashes.map((z) => (
        <mesh key={`v-dash-west-${z}`} rotation={[-Math.PI / 2, 0, Math.PI / 2]} position={[-16, -0.595, z]}>
          <planeGeometry args={[1.2, 0.08]} />
          <meshBasicMaterial color="#CC9944" />
        </mesh>
      ))}

      {/* Foliage - Sparse deep forest green (#1E5631) pin-cushion trees lining roads */}
      {treePositions.map((pos, idx) => (
        <group key={`tree-${idx}`} position={pos}>
          {/* Trunk */}
          <mesh position={[0, 0.25, 0]} castShadow>
            <cylinderGeometry args={[0.04, 0.04, 0.5, 8]} />
            <meshStandardMaterial color="#212121" roughness={0.9} />
          </mesh>
          {/* Leaves */}
          <mesh position={[0, 0.6, 0]} castShadow>
            <sphereGeometry args={[0.22, 12, 12]} />
            <meshStandardMaterial color="#1E5631" roughness={1.0} flatShading />
          </mesh>
        </group>
      ))}

      {/* Central Agent - Rounded delivery robot with glowing yellow trim at intersection */}
      <group position={[0, -0.1, 0]}>
        {/* Wheels / base */}
        <mesh position={[0, -0.4, 0]}>
          <boxGeometry args={[0.9, 0.1, 0.9]} />
          <meshStandardMaterial color="#212121" roughness={0.8} />
        </mesh>
        {/* Silver side cylinders */}
        {[-0.48, 0.48].map((x) => (
          <mesh key={x} position={[x, -0.3, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.12, 0.12, 0.1, 12]} />
            <meshStandardMaterial color="#C2C5C7" metalness={0.9} roughness={0.1} />
          </mesh>
        ))}
        {/* Main Body (white/silver rounded shape) */}
        <mesh position={[0, 0.05, 0]} castShadow>
          <boxGeometry args={[0.8, 0.7, 0.8]} />
          <meshStandardMaterial color="#FFFFFF" roughness={0.9} flatShading />
        </mesh>
        <mesh position={[0, 0.05, 0]}>
          <boxGeometry args={[0.82, 0.4, 0.82]} />
          <meshStandardMaterial color="#C2C5C7" metalness={0.5} roughness={0.3} />
        </mesh>

        {/* Yellow Trim Glow frame */}
        <mesh position={[0, 0.05, 0.41]}>
          <planeGeometry args={[0.62, 0.52]} />
          <meshBasicMaterial color="#FFC107" />
        </mesh>

        {/* Black screen face */}
        <mesh position={[0, 0.05, 0.415]}>
          <planeGeometry args={[0.55, 0.45]} />
          <meshBasicMaterial color="#111827" />
        </mesh>

        {/* Glowing eyes (delivery robot screen face eyes) */}
        {[-0.15, 0.15].map((x, i) => (
          <mesh key={i} position={[x, 0.05, 0.42]}>
            <boxGeometry args={[0.1, 0.04, 0.01]} />
            <meshBasicMaterial color="#FFFFFF" />
          </mesh>
        ))}
      </group>

      {/* Grid overlay for aesthetic structure */}
      <gridHelper args={[60, 60, '#E0E0E0', '#EAEAEA']} position={[0, -0.598, -6]} />
    </group>
  );
}
