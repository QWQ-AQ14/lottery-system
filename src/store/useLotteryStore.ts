import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  Participant,
  Pool,
  Prize,
  Winner,
  AudioSettings,
  AudioType,
  UiSettings
} from '@/types';
import { v4 as uuidv4 } from 'uuid';

// 默认音效配置
const DEFAULT_AUDIO_SETTINGS: AudioSettings = {
  bgm: {
    url: 'https://mass-office.alipay.com/huamei_koqzbu/afts/file/nAvqR5Sfbm0AAAAAgCAAABgAenV5AQBr',
    enabled: true,
    volume: 0.3,
    name: '默认背景音乐'
  },
  rolling: {
    url: 'https://mass-office.alipay.com/huamei_koqzbu/afts/file/zWK_QabqSdkAAAAAgGAAABgAenV5AQBr',
    enabled: true,
    volume: 1.0,
    name: '默认抽奖音效'
  },
  win: {
    url: 'https://mass-office.alipay.com/huamei_koqzbu/afts/file/o2ZTSo8g9ZkAAAAAgFAAABgAenV5AQBr',
    enabled: true,
    volume: 1.0,
    name: '默认中奖音效'
  },
  fail: {
    url: 'https://webgw-internet.alipay.com/180020010001201727/shandieluiweb/image-search/fail_sound.mp3',
    enabled: false,
    volume: 0.8,
    name: '默认未中奖音效'
  },
  globalMute: false
};

// 默认UI配置
const DEFAULT_UI_SETTINGS: UiSettings = {
  logoUrl: '', // 默认不设置 Logo
  backgroundUrl:
    'https://mdn.alipayobjects.com/huamei_44euep/afts/img/A*EdrSR7mJq5QAAAAAgDAAAAgAehr2AQ/fmt.avif',
  mainTitle: '2026',
  subTitle: '新春抽奖盛典',
  slogan: '智引新｜创赢未来'
};

interface LotteryState {
  pools: Pool[];
  participants: Participant[];
  prizes: Prize[];
  winners: Winner[];
  audioSettings: AudioSettings;
  uiSettings: UiSettings;
  isAdminOpen: boolean;
  isWinnersOpen: boolean;

  // Pool Actions
  addPool: (name: string) => void;
  removePool: (id: string) => void;
  updatePool: (id: string, name: string) => void;

  // Participant Actions
  addParticipant: (p: Omit<Participant, 'id'>) => void;
  importParticipants: (data: any[], poolId: string) => void;
  removeParticipant: (id: string) => void;
  updateParticipant: (id: string, updates: Partial<Participant>) => void;
  clearPool: (poolId: string) => void;

  // Prize Actions
  addPrize: (p: Omit<Prize, 'id' | 'remaining'>) => void;
  importPrizes: (data: any[], poolId: string) => void;
  updatePrize: (id: string, updates: Partial<Prize>) => void;
  removePrize: (id: string) => void;
  clearPrizes: (poolId: string) => void;

  // Winner Actions
  recordWinners: (
    results: { participant: Participant; prize: Prize }[]
  ) => void;
  resetWinners: () => void;

  // Audio Actions
  updateAudioSettings: (
    type: AudioType | 'globalMute',
    updates: Partial<AudioSettings['bgm']> | boolean
  ) => void;
  resetAudioSettings: (type?: AudioType) => void;

  // UI Settings Actions
  updateUiSettings: (settings: Partial<UiSettings>) => void;
  resetUiSettings: () => void;

  // UI Actions
  setAdminOpen: (isOpen: boolean) => void;
  setWinnersOpen: (isOpen: boolean) => void;
}

// 检查存储配额的函数
const checkStorageQuota = () => {
  try {
    const testKey = '__storage_test__';
    const testValue = 'x'.repeat(1024); // 1KB 测试值
    localStorage.setItem(testKey, testValue);
    localStorage.removeItem(testKey);
    return true;
  } catch (e) {
    return false;
  }
};

// 安全的存储设置函数
const safeSetItem = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e) {
    if (e instanceof Error && e.name === 'QuotaExceededError') {
      console.error('存储配额已满，无法保存数据');
      return false;
    }
    throw e;
  }
};

export const useLotteryStore = create<LotteryState>()(
  persist(
    (set, get) => ({
      pools: [{ id: 'default', name: '默认奖池' }],
      participants: [
        {
          id: 'p1',
          name: '张三',
          department: '技术部',
          weight: 1,
          poolId: 'default'
        },
        {
          id: 'p2',
          name: '李四',
          department: '产品部',
          weight: 1,
          poolId: 'default'
        },
        {
          id: 'p3',
          name: '王五',
          department: '设计部',
          weight: 1,
          poolId: 'default'
        },
        {
          id: 'p4',
          name: '赵六',
          department: '运营部',
          weight: 1,
          poolId: 'default'
        },
        {
          id: 'p5',
          name: '孙七',
          department: '人事部',
          weight: 1,
          poolId: 'default'
        },
        {
          id: 'p6',
          name: '周八',
          department: '财务部',
          weight: 1,
          poolId: 'default'
        },
        {
          id: 'p7',
          name: '吴九',
          department: '行政部',
          weight: 1,
          poolId: 'default'
        },
        {
          id: 'p8',
          name: '郑十',
          department: '市场部',
          weight: 1,
          poolId: 'default'
        },
        {
          id: 'p9',
          name: '钱十一',
          department: '客服部',
          weight: 1,
          poolId: 'default'
        },
        {
          id: 'p10',
          name: '陈十二',
          department: '研发部',
          weight: 1,
          poolId: 'default'
        }
      ],
      prizes: [
        {
          id: 'prz1',
          poolId: 'default',
          level: '1',
          name: '神秘大奖',
          image:
            'https://webgw-internet.alipay.com/180020010001201727/shandieluiweb/image-search/gift_box',
          count: 1,
          remaining: 1
        },
        {
          id: 'prz2',
          poolId: 'default',
          level: '2',
          name: '旗舰手机',
          image:
            'https://webgw-internet.alipay.com/180020010001201727/shandieluiweb/image-search/smartphone',
          count: 2,
          remaining: 2
        },
        {
          id: 'prz3',
          poolId: 'default',
          level: '3',
          name: '智能手表',
          image:
            'https://webgw-internet.alipay.com/180020010001201727/shandieluiweb/image-search/smartwatch',
          count: 5,
          remaining: 5
        }
      ],
      winners: [],
      audioSettings: DEFAULT_AUDIO_SETTINGS,
      uiSettings: DEFAULT_UI_SETTINGS,
      isAdminOpen: false,
      isWinnersOpen: false,

      // Pool Actions Implementation
      addPool: (name) =>
        set((state) => ({
          pools: [...state.pools, { id: uuidv4(), name }]
        })),

      removePool: (id) =>
        set((state) => ({
          pools: state.pools.filter((p) => p.id !== id),
          participants: state.participants.filter((p) => p.poolId !== id),
          prizes: state.prizes.filter((p) => p.poolId !== id)
        })),

      updatePool: (id, name) =>
        set((state) => ({
          pools: state.pools.map((p) => (p.id === id ? { ...p, name } : p))
        })),

      // Participant Actions Implementation
      addParticipant: (p) =>
        set((state) => ({
          participants: [...state.participants, { ...p, id: uuidv4() }]
        })),

      importParticipants: (data, poolId) =>
        set((state) => {
          const newParticipants = data.map((row) => {
            const name = row['花名'] || row['name'] || row['姓名'] || '未知';
            const department =
              row['业务线'] || row['department'] || row['部门'] || '';
            const manager = row['主管'] || row['manager'] || '';

            let weightRaw = row['次数'] || row['weight'] || row['权重'];
            let weight = parseInt(String(weightRaw), 10);

            if (isNaN(weight) || weight < 1) {
              weight = 1;
            }

            return {
              id: uuidv4(),
              name: String(name).trim(),
              department: String(department).trim(),
              manager: String(manager).trim(),
              weight: weight,
              poolId
            };
          });

          const valid = newParticipants.filter(
            (p) => p.name && p.name !== '未知'
          );
          return { participants: [...state.participants, ...valid] };
        }),

      removeParticipant: (id) =>
        set((state) => ({
          participants: state.participants.filter((p) => p.id !== id)
        })),

      updateParticipant: (id, updates) =>
        set((state) => ({
          participants: state.participants.map((p) =>
            p.id === id ? { ...p, ...updates } : p
          )
        })),

      clearPool: (poolId) =>
        set((state) => ({
          participants: state.participants.filter((p) => p.poolId !== poolId)
        })),

      // Prize Actions Implementation
      addPrize: (p) =>
        set((state) => ({
          prizes: [...state.prizes, { ...p, id: uuidv4(), remaining: p.count }]
        })),

      importPrizes: (data, poolId) =>
        set((state) => {
          const newPrizes = data.map((row) => {
            const name =
              row['奖品名称'] || row['name'] || row['奖品'] || '未知奖品';
            let levelRaw =
              row['奖品等级'] || row['level'] || row['等级'] || '3';
            let countRaw = row['奖品数量'] || row['count'] || row['数量'] || 1;
            const image =
              row['奖品图片'] ||
              row['image'] ||
              row['图片'] ||
              'https://webgw-internet.alipay.com/180020010001201727/shandieluiweb/image-search/gift_box';

            // Normalize level
            let level: '1' | '2' | '3' = '3';
            const levelStr = String(levelRaw);
            if (levelStr.includes('1') || levelStr.includes('一')) level = '1';
            else if (levelStr.includes('2') || levelStr.includes('二'))
              level = '2';
            else if (levelStr.includes('3') || levelStr.includes('三'))
              level = '3';

            // Normalize count
            let count = parseInt(String(countRaw), 10);
            if (isNaN(count) || count < 1) count = 1;

            return {
              id: uuidv4(),
              poolId,
              level,
              name: String(name).trim(),
              image: String(image).trim(),
              count,
              remaining: count
            };
          });

          const valid = newPrizes.filter(
            (p) => p.name && p.name !== '未知奖品'
          );
          return { prizes: [...state.prizes, ...valid] };
        }),

      updatePrize: (id, updates) =>
        set((state) => ({
          prizes: state.prizes.map((p) =>
            p.id === id ? { ...p, ...updates } : p
          )
        })),

      removePrize: (id) =>
        set((state) => ({
          prizes: state.prizes.filter((p) => p.id !== id)
        })),

      clearPrizes: (poolId) =>
        set((state) => ({
          prizes: state.prizes.filter((p) => p.poolId !== poolId)
        })),

      // Winner Actions Implementation
      recordWinners: (results) =>
        set((state) => {
          const timestamp = Date.now();
          const newWinnerRecords: Winner[] = results.map(
            ({ participant, prize }) => ({
              id: uuidv4(),
              participant,
              prize,
              timestamp
            })
          );

          const prizeConsumption = new Map<string, number>();
          results.forEach(({ prize }) => {
            prizeConsumption.set(
              prize.id,
              (prizeConsumption.get(prize.id) || 0) + 1
            );
          });

          const updatedPrizes = state.prizes.map((p) => {
            const consumed = prizeConsumption.get(p.id);
            if (consumed) {
              return { ...p, remaining: Math.max(0, p.remaining - consumed) };
            }
            return p;
          });

          const winnerIds = new Set(results.map((r) => r.participant.id));
          const updatedParticipants = state.participants.filter(
            (p) => !winnerIds.has(p.id)
          );

          return {
            winners: [...newWinnerRecords, ...state.winners],
            prizes: updatedPrizes,
            participants: updatedParticipants
          };
        }),

      resetWinners: () => set({ winners: [] }),

      // Audio Actions Implementation
      updateAudioSettings: (type, updates) =>
        set((state) => {
          if (type === 'globalMute') {
            return {
              audioSettings: {
                ...state.audioSettings,
                globalMute: updates as boolean
              }
            };
          }
          return {
            audioSettings: {
              ...state.audioSettings,
              [type]: {
                ...state.audioSettings[type as AudioType],
                ...(updates as Partial<AudioSettings['bgm']>)
              }
            }
          };
        }),

      resetAudioSettings: (type) =>
        set((state) => {
          if (type) {
            return {
              audioSettings: {
                ...state.audioSettings,
                [type]: DEFAULT_AUDIO_SETTINGS[type]
              }
            };
          }
          return { audioSettings: DEFAULT_AUDIO_SETTINGS };
        }),

      // UI Settings Actions Implementation
      updateUiSettings: (settings) =>
        set((state) => ({
          uiSettings: { ...state.uiSettings, ...settings }
        })),

      resetUiSettings: () => set({ uiSettings: DEFAULT_UI_SETTINGS }),

      setAdminOpen: (isOpen) => set({ isAdminOpen: isOpen }),
      setWinnersOpen: (isOpen) => set({ isWinnersOpen: isOpen })
    }),
    {
      name: 'muse-lottery-storage',
      version: 5, // 升级版本号以应用新的默认数据
      storage: {
        getItem: (name: string) => {
          const str = localStorage.getItem(name);
          if (!str) return null;
          try {
            return JSON.parse(str);
          } catch (error) {
            console.error(`Error parsing localStorage item "${name}":`, error);
            return null;
          }
        },
        setItem: (name: string, value: any) => {
          // 检查存储配额
          if (!checkStorageQuota()) {
            console.error('存储配额不足，无法保存数据');
            return;
          }

          // 过滤掉音频文件的 base64 数据以减少存储大小
          const stateToSave = { ...value };
          if (stateToSave.state?.audioSettings) {
            const audioSettings = { ...stateToSave.state.audioSettings };
            Object.keys(audioSettings).forEach((key) => {
              if (
                key !== 'globalMute' &&
                audioSettings[key as AudioType]?.url?.startsWith('data:')
              ) {
                // 如果是 base64 数据，替换为默认 URL
                audioSettings[key as AudioType] = {
                  ...audioSettings[key as AudioType],
                  url: DEFAULT_AUDIO_SETTINGS[key as AudioType].url,
                  name: '默认音效 (因存储限制已重置)'
                };
              }
            });
            stateToSave.state.audioSettings = audioSettings;
          }

          const str = JSON.stringify(stateToSave);
          return safeSetItem(name, str);
        },
        removeItem: (name: string) => localStorage.removeItem(name)
      },
      partialize: (state) => ({
        pools: state.pools,
        participants: state.participants,
        prizes: state.prizes,
        winners: state.winners,
        uiSettings: state.uiSettings, // 持久化 UI 设置
        // 在持久化时，强制将 globalMute 设为 false
        audioSettings: {
          ...state.audioSettings,
          globalMute: false
        }
      })
    }
  )
);
