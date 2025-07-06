import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';

function AnimatedPoints() {
  const ref = useRef<THREE.Points>(null);
  
  // Generate random points in 3D space
  const [positions, colors] = useMemo(() => {
    const positions = new Float32Array(2000 * 3);
    const colors = new Float32Array(2000 * 3);
    
    for (let i = 0; i < 2000; i++) {
      // Random positions in a sphere
      const r = Math.random() * 25;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
      
      // Purple to blue gradient colors
      const t = Math.random();
      colors[i * 3] = 0.5 + t * 0.5;     // R
      colors[i * 3 + 1] = 0.2 + t * 0.6; // G  
      colors[i * 3 + 2] = 0.8 + t * 0.2; // B
    }
    
    return [positions, colors];
  }, []);

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.x = state.clock.elapsedTime * 0.05;
      ref.current.rotation.y = state.clock.elapsedTime * 0.02;
    }
  });

  return (
    <Points ref={ref} positions={positions} colors={colors}>
      <PointMaterial
        size={0.002}
        vertexColors
        transparent
        opacity={0.6}
        sizeAttenuation={true}
        depthWrite={false}
      />
    </Points>
  );
}

function FloatingOrbs() {
  const orbsRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (orbsRef.current) {
      orbsRef.current.rotation.y = state.clock.elapsedTime * 0.1;
      orbsRef.current.children.forEach((child, index) => {
        child.position.y = Math.sin(state.clock.elapsedTime + index) * 2;
      });
    }
  });

  return (
    <group ref={orbsRef}>
      {Array.from({ length: 8 }, (_, i) => (
        <mesh
          key={i}
          position={[
            Math.cos((i / 8) * Math.PI * 2) * 12,
            0,
            Math.sin((i / 8) * Math.PI * 2) * 12
          ]}
        >
          <sphereGeometry args={[0.5, 16, 16]} />
          <meshBasicMaterial
            color={i % 2 === 0 ? '#8B5CF6' : '#06B6D4'}
            transparent
            opacity={0.3}
          />
        </mesh>
      ))}
    </group>
  );
}

export function Scene3D() {
  return (
    <Canvas
      camera={{ position: [0, 0, 20], fov: 60 }}
      className="absolute inset-0"
    >
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      
      <AnimatedPoints />
      <FloatingOrbs />
    </Canvas>
  );
}