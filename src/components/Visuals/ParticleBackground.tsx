import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Text, Float, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { useLotteryStore } from '@/store/useLotteryStore';

const Word = ({
  children,
  position
}: {
  children: string;
  position: THREE.Vector3;
}) => {
  const color = new THREE.Color();
  // 使用更鲜艳的红金色系
  const isGold = Math.random() > 0.5;
  if (isGold) {
    color.setHSL(0.1 + Math.random() * 0.05, 0.9, 0.6); // 金色
  } else {
    color.setHSL(0.98 + Math.random() * 0.02, 0.9, 0.5); // 红色
  }

  return (
    <Float
      position={[position.x, position.y, position.z]}
      speed={2}
      rotationIntensity={2}
      floatIntensity={2}
    >
      <Text
        color={color}
        fontSize={1.2} // 增大字体
        maxWidth={200}
        lineHeight={1}
        letterSpacing={0.02}
        textAlign="center"
        // 移除外部字体链接，使用默认字体以确保显示
        // 如果需要支持中文，Text 组件需要加载字体文件，这里为了稳定性
        // 我们在背景中主要展示英文/数字，或者依赖系统回退
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.02}
        outlineColor="#ffffff"
      >
        {children}
      </Text>
    </Float>
  );
};

const Cloud = ({ count = 4, radius = 20 }) => {
  const participants = useLotteryStore((state) => state.participants);

  // Create a spherical distribution of words
  const words = useMemo(() => {
    const temp = [];
    // 为了确保背景效果，如果人员名单包含中文且无法加载中文字体，
    // 我们混合使用英文关键词和人员名单（如果有）
    // 这里为了稳妥，背景球主要展示装饰性文字
    const decorativeWords = [
      { name: '2026' },
      { name: 'LUCKY' },
      { name: 'WINNER' },
      { name: 'FORTUNE' },
      { name: 'YEAR' },
      { name: 'OF' },
      { name: 'HORSE' },
      { name: 'SUCCESS' },
      { name: 'JOY' }
    ];

    // 如果有人圆，也加入部分人员名字（注意：如果没有中文字体，中文可能显示为方块）
    // 为了保证视觉效果，这里优先使用装饰性英文词汇
    const displayList = decorativeWords;

    // Ensure we have enough items to fill the cloud visually
    const itemsToRender = [];
    while (itemsToRender.length < 40) {
      itemsToRender.push(
        ...displayList.sort(() => 0.5 - Math.random()).slice(0, 5)
      );
    }

    const spherical = new THREE.Spherical();

    for (let i = 0; i < itemsToRender.length; i++) {
      // Randomize position on sphere surface
      spherical.set(
        radius,
        Math.acos(THREE.MathUtils.mapLinear(Math.random(), 0, 1, -1, 1)),
        Math.random() * Math.PI * 2
      );
      temp.push([
        new THREE.Vector3().setFromSpherical(spherical),
        itemsToRender[i].name
      ]);
    }
    return temp;
  }, [participants, radius]);

  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      // 缓慢旋转
      groupRef.current.rotation.y += 0.002;
      // 轻微浮动
      groupRef.current.position.y =
        Math.sin(state.clock.getElapsedTime() * 0.5) * 1;
    }
  });

  return (
    <group ref={groupRef}>
      {words.map(([pos, word], index) => (
        <Word key={index} position={pos as THREE.Vector3}>
          {word as string}
        </Word>
      ))}
    </group>
  );
};

const ParticleBackground = () => {
  return (
    <div className="absolute inset-0 -z-10 pointer-events-none">
      <Canvas dpr={[1, 2]} camera={{ position: [0, 0, 35], fov: 90 }}>
        <fog attach="fog" args={['#202025', 0, 80]} />
        {/* 向上移动球形云团以调整视觉重心 */}
        <group position={[0, 2, 0]}>
          <Cloud count={8} radius={18} />
        </group>
        <Stars
          radius={100}
          depth={50}
          count={3000}
          factor={4}
          saturation={0}
          fade
          speed={1}
        />
        <ambientLight intensity={0.8} />
        <pointLight position={[10, 10, 10]} intensity={1.5} />
      </Canvas>
    </div>
  );
};

export default ParticleBackground;
