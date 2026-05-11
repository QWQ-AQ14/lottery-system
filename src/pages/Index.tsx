import React from 'react';
import ParticleBackground from '@/components/Visuals/ParticleBackground';
import LotteryMachine from '@/components/Lottery/LotteryMachine';
import AdminPanel from '@/components/Admin/AdminPanel';
import WinnersList from '@/components/Lottery/WinnersList';

const Index = () => {
  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* 3D Background */}
      <ParticleBackground />

      {/* Main Lottery Interface */}
      <LotteryMachine />

      {/* Overlays */}
      <AdminPanel />
      <WinnersList />
    </div>
  );
};

export default Index;
