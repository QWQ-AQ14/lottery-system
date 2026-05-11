import React from 'react';
import Header from '@/components/Header';
import RedGoldBackground from '@/components/Visuals/RedGoldBackground';
import { useLotteryStore } from '@/store/useLotteryStore';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { uiSettings } = useLotteryStore();

  return (
    <div className="min-h-screen text-white overflow-hidden font-sans relative">
      {/* 背景图片层 - 替换为新图片，移除透明度限制以清晰展示 */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat pointer-events-none"
        style={{
          backgroundImage: `url("${uiSettings.backgroundUrl}")`
        }}
      />

      {/* 动态红金粒子/漩涡/骏马背景 - 保持不变 */}
      <RedGoldBackground />

      {/* Header 悬浮在最上层 */}
      <div className="absolute top-0 left-0 w-full z-50 pointer-events-none">
        <Header />
      </div>

      {/* 主内容区域 */}
      <main className="relative h-screen w-full z-10">{children}</main>
    </div>
  );
}
