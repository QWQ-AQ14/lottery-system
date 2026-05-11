export interface Participant {
  id: string;
  name: string; // 花名
  department?: string; // 业务线
  manager?: string; // 主管
  weight: number; // 权重/次数
  poolId: string; // 所属池ID
}

export interface Prize {
  id: string;
  poolId: string;
  level: '1' | '2' | '3'; // 1等奖, 2等奖, 3等奖
  name: string;
  image: string;
  count: number; // 总数
  remaining: number; // 剩余数
}

export interface Winner {
  id: string;
  participant: Participant;
  prize: Prize;
  timestamp: number;
}

export interface Pool {
  id: string;
  name: string;
}

export type AudioType = 'bgm' | 'rolling' | 'win' | 'fail';

export interface AudioConfigItem {
  url: string;
  enabled: boolean;
  volume: number;
  name?: string; // 文件名，用于展示
}

export interface AudioSettings {
  bgm: AudioConfigItem;
  rolling: AudioConfigItem;
  win: AudioConfigItem;
  fail: AudioConfigItem;
  globalMute: boolean;
}

export interface UiSettings {
  logoUrl: string;
  backgroundUrl: string;
  mainTitle: string; // 默认 2026
  subTitle: string; // 默认 新春抽奖盛典
  slogan: string; // 默认 智引新元｜创赢未来
}
