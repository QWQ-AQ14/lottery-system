import React, { useEffect } from 'react';
import { audioManager } from '@/utils/audioManager';
import { Volume2, VolumeX, Settings, Trophy } from 'lucide-react';
import { useLotteryStore } from '@/store/useLotteryStore';
import toast from 'react-hot-toast';

const Header = () => {
  const { setAdminOpen, setWinnersOpen, audioSettings, uiSettings } =
    useLotteryStore();
  // 使用 store 中的状态作为单一数据源
  const isMuted = audioSettings.globalMute;

  // 组件挂载时尝试播放 BGM
  useEffect(() => {
    if (!isMuted && audioSettings.bgm.enabled) {
      audioManager.playBgm();

      // 延迟检查是否被浏览器拦截
      setTimeout(() => {
        if (audioManager.isAutoplayBlocked) {
          toast('点击页面任意位置开启背景音乐 🎵', {
            icon: '👆',
            duration: 5000,
            style: {
              background: 'rgba(0, 0, 0, 0.8)',
              color: '#fff',
              backdropFilter: 'blur(10px)'
            }
          });
        }
      }, 1000);
    }
  }, []); // 仅在挂载时执行一次

  // 监听 store 变化来同步播放状态（例如从后台设置中开启了 BGM）
  useEffect(() => {
    if (!isMuted && audioSettings.bgm.enabled) {
      audioManager.playBgm();
    } else if (isMuted || !audioSettings.bgm.enabled) {
      audioManager.stopBgm();
    }
  }, [isMuted, audioSettings.bgm.enabled]);

  const handleToggleMute = () => {
    audioManager.toggleMute();
  };

  return (
    <header className="flex justify-between items-center p-6 pointer-events-auto relative z-50">
      <div className="flex items-center gap-2">
        {uiSettings.logoUrl && (
          <img
            src={uiSettings.logoUrl}
            alt="Logo"
            className="h-10 w-auto object-contain drop-shadow-md"
          />
        )}
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={() => setWinnersOpen(true)}
          className="p-2.5 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-md transition-all text-white shadow-lg hover:scale-105 active:scale-95"
          title="中奖名单"
          aria-label="Winners List"
        >
          <Trophy size={20} />
        </button>
        <button
          onClick={() => setAdminOpen(true)}
          className="p-2.5 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-md transition-all text-white shadow-lg hover:scale-105 active:scale-95"
          title="设置"
          aria-label="Settings"
        >
          <Settings size={20} />
        </button>
        <button
          onClick={handleToggleMute}
          className={`p-2.5 rounded-full backdrop-blur-md transition-all text-white shadow-lg hover:scale-105 active:scale-95 ${
            isMuted
              ? 'bg-red-500/20 hover:bg-red-500/30'
              : 'bg-white/10 hover:bg-white/20'
          }`}
          title={isMuted ? '取消静音' : '静音'}
          aria-label={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>
      </div>
    </header>
  );
};

export default Header;
