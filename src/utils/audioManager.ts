import { useLotteryStore } from '@/store/useLotteryStore';
import { AudioType } from '@/types';

class AudioManager {
  private audioElements: Map<AudioType, HTMLAudioElement> = new Map();
  private currentUrls: Map<AudioType, string> = new Map();
  public isAutoplayBlocked: boolean = false;

  constructor() {
    // 监听用户首次交互，用于解锁音频播放
    const unlockAudio = () => {
      this.isAutoplayBlocked = false;

      // 预加载所有音频
      this.preloadAll();

      // 尝试播放背景音乐
      const state = useLotteryStore.getState();
      if (!state.audioSettings.globalMute && state.audioSettings.bgm.enabled) {
        const bgmAudio = this.audioElements.get('bgm');
        if (!bgmAudio || bgmAudio.paused) {
          this.play('bgm');
        }
      }
      // 移除监听器
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('touchstart', unlockAudio);
      document.removeEventListener('keydown', unlockAudio);
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('click', unlockAudio);
      document.addEventListener('touchstart', unlockAudio);
      document.addEventListener('keydown', unlockAudio);
    }
  }

  private getAudio(type: AudioType): HTMLAudioElement {
    const state = useLotteryStore.getState();
    const config = state.audioSettings[type];

    let audio = this.audioElements.get(type);
    const currentUrl = this.currentUrls.get(type);

    // 如果 URL 发生变化或 audio 对象不存在，则重新创建
    if (!audio || currentUrl !== config.url) {
      if (audio) {
        audio.pause();
        audio.src = '';
      }

      audio = new Audio();
      audio.src = config.url;
      audio.preload = 'auto'; // 预加载

      // 配置循环播放
      if (type === 'bgm' || type === 'rolling') {
        audio.loop = true;
      }

      // 错误处理
      audio.onerror = (e) => {
        console.error(`Audio load error for ${type}:`, e, config.url);
      };

      this.audioElements.set(type, audio);
      this.currentUrls.set(type, config.url);
    }

    // 始终更新音量，确保实时生效
    audio.volume = config.volume;

    return audio;
  }

  // 新增：预加载所有音频，确保后续播放顺畅
  preloadAll() {
    const types: AudioType[] = ['bgm', 'rolling', 'win', 'fail'];
    types.forEach((type) => {
      try {
        const audio = this.getAudio(type);
        // 仅调用 load，不播放
        audio.load();
      } catch (e) {
        console.error(`Error preloading ${type}:`, e);
      }
    });
  }

  async play(type: AudioType) {
    const state = useLotteryStore.getState();
    const config = state.audioSettings[type];
    const isGlobalMuted = state.audioSettings.globalMute;

    // 如果全局静音或该音效未启用，则不播放
    if (isGlobalMuted || !config.enabled) {
      return;
    }

    try {
      const audio = this.getAudio(type);

      // 特殊处理 BGM：如果已经在播放，不要重新开始
      if (type === 'bgm' && !audio.paused) {
        return;
      }

      // 互斥逻辑：抽奖音效和中奖音效播放时，暂停 BGM
      if (type === 'rolling' || type === 'win') {
        this.stop('bgm');
      }

      // 关键修复：对于非循环音效（如中奖音效），每次播放前重置进度
      if (type !== 'bgm' && type !== 'rolling') {
        audio.currentTime = 0;
      }

      // 尝试播放
      const playPromise = audio.play();

      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          if (error.name === 'NotAllowedError') {
            console.warn(
              `Audio autoplay blocked for ${type}. Waiting for user interaction.`
            );
            this.isAutoplayBlocked = true;
          } else {
            console.error(`Audio play failed for ${type}:`, error);
          }
        });
      }
    } catch (e) {
      console.error(`Error playing ${type} audio:`, e);
    }
  }

  stop(type: AudioType) {
    const audio = this.audioElements.get(type);
    if (audio) {
      audio.pause();
      if (type !== 'bgm') {
        audio.currentTime = 0; // 音效类重置进度，BGM 暂停保留进度
      }
    }
  }

  stopAll() {
    this.audioElements.forEach((audio) => {
      audio.pause();
    });
  }

  // 辅助方法
  playBgm() {
    this.play('bgm');
  }

  stopBgm() {
    this.stop('bgm');
  }

  playRolling() {
    this.play('rolling');
  }

  stopRolling() {
    this.stop('rolling');
    // 停止滚动音效后，不再自动恢复 BGM，由业务逻辑控制
  }

  playWin() {
    // 1. 停止滚动音效
    this.stop('rolling');
    // 2. 停止背景音乐 (防止叠加)
    this.stop('bgm');

    // 3. 播放中奖音效
    this.play('win');

    // 移除自动恢复 BGM 的逻辑，改为由用户点击"继续抽奖"时触发
  }

  playFail() {
    this.stop('rolling');
    this.stop('bgm');
    this.play('fail');

    // 移除自动恢复 BGM 的逻辑
  }

  toggleMute() {
    const state = useLotteryStore.getState();
    const newMuteState = !state.audioSettings.globalMute;

    // 更新 Store
    state.updateAudioSettings('globalMute', newMuteState);

    if (newMuteState) {
      this.stopAll();
    } else {
      // 取消静音时，尝试播放 BGM
      if (state.audioSettings.bgm.enabled) {
        this.play('bgm');
      }
    }

    return newMuteState;
  }
}

export const audioManager = new AudioManager();
