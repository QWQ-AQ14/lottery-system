import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLotteryStore } from '@/store/useLotteryStore';
import { audioManager } from '@/utils/audioManager';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Square } from 'lucide-react';
import { Participant, Prize } from '@/types';
import LotteryCanvas from '@/components/Visuals/LotteryCanvas';

const LotteryMachine = () => {
  const {
    pools,
    participants,
    prizes,
    recordWinners,
    isAdminOpen,
    isWinnersOpen,
    uiSettings
  } = useLotteryStore();

  // 初始化时确保有默认值
  const [selectedPoolId, setSelectedPoolId] = useState<string>('');
  // 改为选择奖项等级
  const [selectedLevel, setSelectedLevel] = useState<string>('');
  const [drawCount, setDrawCount] = useState<number>(1);

  const [isRolling, setIsRolling] = useState(false);
  const [currentDisplay, setCurrentDisplay] = useState<string>(
    uiSettings.mainTitle
  );
  const [showResult, setShowResult] = useState(false);
  const [currentResults, setCurrentResults] = useState<
    { participant: Participant; prize: Prize }[]
  >([]);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // 监听 uiSettings.mainTitle 变化，如果当前处于默认状态，则更新显示
  useEffect(() => {
    if (!isRolling && !showResult) {
      setCurrentDisplay(uiSettings.mainTitle);
    }
  }, [uiSettings.mainTitle, isRolling, showResult]);

  // 确保 selectedPoolId 有效
  useEffect(() => {
    if (pools.length > 0) {
      // 如果当前选中的 pool 不存在（比如刚初始化），则选中第一个
      if (!selectedPoolId || !pools.find((p) => p.id === selectedPoolId)) {
        setSelectedPoolId(pools[0].id);
      }
    }
  }, [pools, selectedPoolId]);

  // 组件卸载时清理定时器
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // 聚合当前池子下的奖品等级信息
  const levelStats = useMemo(() => {
    const stats = new Map<
      string,
      { label: string; count: number; prizes: Prize[] }
    >();

    prizes
      .filter((p) => p.poolId === selectedPoolId && p.remaining > 0)
      .forEach((p) => {
        const levelKey = p.level;
        const existing = stats.get(levelKey) || {
          label: `${levelKey}等奖`,
          count: 0,
          prizes: []
        };

        existing.count += p.remaining;
        existing.prizes.push(p);
        stats.set(levelKey, existing);
      });

    // 排序：1等奖 -> 2等奖 -> 3等奖
    return Array.from(stats.entries())
      .sort((a, b) => String(a[0]).localeCompare(String(b[0])))
      .map(([key, value]) => ({ key, ...value }));
  }, [prizes, selectedPoolId]);

  // 自动选择第一个有剩余的等级
  useEffect(() => {
    if (levelStats.length > 0) {
      const currentLevelExists = levelStats.find(
        (l) => l.key === selectedLevel
      );
      if (!currentLevelExists) {
        setSelectedLevel(levelStats[0].key);
      }
    } else {
      setSelectedLevel('');
    }
  }, [levelStats, selectedLevel]);

  // Reset draw count when level changes
  useEffect(() => {
    setDrawCount(1);
  }, [selectedLevel]);

  const handleStart = () => {
    if (!selectedLevel) {
      alert('请先配置并选择奖项等级');
      return;
    }

    const currentLevelStat = levelStats.find((l) => l.key === selectedLevel);
    if (!currentLevelStat) {
      alert('该奖项等级无剩余奖品');
      return;
    }

    const poolParticipants = participants.filter(
      (p) => p.poolId === selectedPoolId
    );
    if (poolParticipants.length === 0) {
      alert('奖池中没有人员');
      return;
    }

    if (poolParticipants.length < drawCount) {
      alert(`奖池人数不足 ${drawCount} 人`);
      return;
    }

    if (currentLevelStat.count < drawCount) {
      alert(
        `该奖项剩余数量不足 ${drawCount} 个 (仅剩 ${currentLevelStat.count})`
      );
      return;
    }

    // 关键修复：在用户点击时预加载所有音频，确保后续自动播放不被拦截
    audioManager.preloadAll();

    setIsRolling(true);
    audioManager.playRolling();
    setShowResult(false);
    setCurrentResults([]);

    // 清除之前的定时器（如果有）
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Rolling animation logic - 无限循环直到手动停止
    intervalRef.current = setInterval(() => {
      const randomIdx = Math.floor(Math.random() * poolParticipants.length);
      setCurrentDisplay(poolParticipants[randomIdx].name);
    }, 50);
  };

  const handleStop = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    const currentLevelStat = levelStats.find((l) => l.key === selectedLevel);
    if (currentLevelStat) {
      performDraw(currentLevelStat.prizes);
    } else {
      // 异常情况处理
      setIsRolling(false);
      audioManager.stopRolling();
    }
  };

  const performDraw = (levelPrizes: Prize[]) => {
    // 1. 准备奖品池 (将所有该等级的奖品按剩余数量展开)
    const prizePool: Prize[] = [];
    levelPrizes.forEach((p) => {
      for (let i = 0; i < p.remaining; i++) {
        prizePool.push(p);
      }
    });

    // 2. 准备人员权重池
    let weightedParticipantIds: string[] = [];
    const idToParticipantMap = new Map<string, Participant>();

    participants
      .filter((p) => p.poolId === selectedPoolId)
      .forEach((p) => {
        idToParticipantMap.set(p.id, p);
        for (let i = 0; i < p.weight; i++) {
          weightedParticipantIds.push(p.id);
        }
      });

    if (weightedParticipantIds.length === 0) {
      setIsRolling(false);
      audioManager.stopRolling();
      audioManager.playFail(); // 播放失败音效
      alert('人员不足');
      return;
    }

    const results: { participant: Participant; prize: Prize }[] = [];
    const tempParticipantIds = [...weightedParticipantIds];
    const tempPrizePool = [...prizePool];

    // 3. 循环抽取
    for (let i = 0; i < drawCount; i++) {
      if (tempParticipantIds.length === 0 || tempPrizePool.length === 0) break;

      // 抽人
      const randomPersonIndex = Math.floor(
        Math.random() * tempParticipantIds.length
      );
      const winnerId = tempParticipantIds[randomPersonIndex];
      const winner = idToParticipantMap.get(winnerId);

      // 抽奖品 (从该等级剩余奖品中随机分配一个)
      const randomPrizeIndex = Math.floor(Math.random() * tempPrizePool.length);
      const assignedPrize = tempPrizePool[randomPrizeIndex];

      if (winner && assignedPrize) {
        results.push({ participant: winner, prize: assignedPrize });

        // 移除已中奖人员的所有权重条目
        const newParticipantIds = [];
        for (const id of tempParticipantIds) {
          if (id !== winnerId) {
            newParticipantIds.push(id);
          }
        }
        tempParticipantIds.length = 0;
        tempParticipantIds.push(...newParticipantIds);

        // 移除已分配的奖品
        tempPrizePool.splice(randomPrizeIndex, 1);
      }
    }

    setIsRolling(false);

    if (results.length > 0) {
      // 播放中奖音效
      audioManager.playWin();

      // 如果只抽一个，显示名字；如果是多个，显示"恭喜中奖"
      if (results.length === 1) {
        setCurrentDisplay(results[0].participant.name);
      } else {
        setCurrentDisplay('恭喜中奖');
      }

      setCurrentResults(results);
      setShowResult(true);
      recordWinners(results);

      // Fireworks
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#FFD700', '#FF0000', '#FFFFFF']
      });
    } else {
      audioManager.playFail();
      setCurrentDisplay('未中奖');
    }
  };

  const currentLevelStat = levelStats.find((l) => l.key === selectedLevel);
  const maxDrawCount = currentLevelStat
    ? Math.min(currentLevelStat.count, 50)
    : 1;

  // 动态计算 Grid 布局 Class
  // 目标：20个以内尽量不滚动，使用更密集的网格
  const getGridClass = (count: number) => {
    if (count === 1) return 'grid-cols-1 max-w-sm';
    if (count === 2) return 'grid-cols-2 max-w-2xl';
    if (count === 3) return 'grid-cols-3 max-w-4xl';
    if (count === 4) return 'grid-cols-2 md:grid-cols-4 max-w-5xl';
    if (count === 5) return 'grid-cols-3 md:grid-cols-5 max-w-6xl';
    if (count === 6) return 'grid-cols-3 max-w-4xl'; // 2行3列
    if (count <= 8) return 'grid-cols-4 max-w-5xl'; // 2行4列
    if (count <= 10) return 'grid-cols-5 max-w-6xl'; // 2行5列

    // 11-20 个：使用更密集的布局，确保单屏显示
    // 5列布局，最多4行
    if (count <= 15) return 'grid-cols-5 max-w-full';
    if (count <= 20) return 'grid-cols-5 max-w-full';

    // >20 个：允许滚动
    return 'grid-cols-4 md:grid-cols-5';
  };

  // 判断是否需要紧凑模式 (11-20人)
  // 这种模式下会减小头像、字体和间距
  const isCompactMode =
    currentResults.length > 10 && currentResults.length <= 20;

  return (
    <div className="relative z-10 flex flex-col items-center justify-center min-h-screen text-white">
      {/* Main Display */}
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-6xl px-4 relative">
        <AnimatePresence mode="wait">
          {!showResult ? (
            <motion.div
              key="rolling"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.5, opacity: 0 }}
              className="text-center w-full flex flex-col items-center justify-center"
            >
              {/* 使用新的粒子 Canvas 组件替代原来的 h1 */}
              <LotteryCanvas
                text={currentDisplay}
                isRolling={isRolling}
                width={1000}
                height={500}
                mainTitle={uiSettings.mainTitle}
                subTitle={uiSettings.subTitle}
                slogan={uiSettings.slogan}
              />

              {/* 抽奖状态提示与停止按钮区域 - 位于 Canvas 下方 */}
              <div className="absolute bottom-[10%] flex flex-col items-center gap-6 z-20">
                {isRolling && (
                  <>
                    <p className="text-2xl text-yellow-300 animate-pulse font-bold drop-shadow-md">
                      正在抽取 {drawCount} 位幸运儿...
                    </p>

                    <motion.button
                      initial={{ scale: 0, opacity: 0, y: 20 }}
                      animate={{ scale: 1, opacity: 1, y: 0 }}
                      exit={{ scale: 0, opacity: 0, y: 20 }}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleStop}
                      className="px-12 py-4 bg-red-600 hover:bg-red-700 text-white rounded-full font-bold text-xl shadow-[0_0_20px_rgba(220,38,38,0.6)] border-2 border-red-400 flex items-center gap-3 transition-all"
                    >
                      <Square fill="currentColor" className="w-6 h-6" />
                      停止抽奖
                    </motion.button>
                  </>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="result"
              initial={{ scale: 0.5, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              className="bg-white/10 backdrop-blur-xl border border-white/20 p-6 rounded-3xl text-center shadow-2xl w-full max-h-[90vh] flex flex-col"
            >
              <div className="mb-2 flex-shrink-0">
                <span className="inline-block px-4 py-1 rounded-full bg-yellow-500/20 text-yellow-300 border border-yellow-500/50 text-sm font-bold mb-1">
                  恭喜中奖
                </span>
                <h2 className="text-2xl font-bold text-yellow-400">
                  {/* 修复：优先使用当前结果中的奖品等级信息，避免因库存归零自动切换 Level 导致标题显示错误 */}
                  {currentResults.length > 0
                    ? `${currentResults[0].prize.level}等奖`
                    : currentLevelStat?.label || '中奖名单'}
                </h2>
              </div>

              {/* Winners Grid */}
              <div className="flex-1 w-full overflow-y-auto min-h-0 p-2 custom-scrollbar flex flex-col justify-center">
                <div
                  className={`grid gap-3 w-full mx-auto ${getGridClass(currentResults.length)}`}
                >
                  {currentResults.map(({ participant, prize }) => (
                    <motion.div
                      key={participant.id}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{
                        type: 'spring',
                        stiffness: 260,
                        damping: 20
                      }}
                      className={`bg-black/30 rounded-xl flex flex-col items-center justify-center border border-white/10 hover:bg-white/10 transition-colors relative group ${
                        isCompactMode
                          ? 'p-1.5 min-h-[90px]' // 紧凑模式：更小的高度和内边距
                          : currentResults.length <= 10
                            ? 'p-3 min-h-[140px]'
                            : 'p-4'
                      }`}
                    >
                      <div
                        className={`${
                          isCompactMode
                            ? 'w-8 h-8 text-xs mb-1' // 紧凑模式：更小的头像
                            : currentResults.length > 20
                              ? 'w-16 h-16 text-2xl mb-2'
                              : 'w-14 h-14 text-xl mb-2'
                        } bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center font-bold shadow-lg overflow-hidden flex-shrink-0`}
                      >
                        {participant.name.charAt(0)}
                      </div>
                      <h3
                        className={`${isCompactMode ? 'text-sm' : 'text-xl'} font-bold truncate w-full text-center`}
                      >
                        {participant.name}
                      </h3>
                      <p
                        className={`${isCompactMode ? 'text-[10px]' : 'text-sm'} text-slate-400 truncate w-full text-center mb-0.5`}
                      >
                        {participant.department || ' '}
                      </p>
                      <div
                        className={`px-2 py-0.5 bg-yellow-500/20 rounded text-yellow-300 border border-yellow-500/30 w-full truncate text-center ${isCompactMode ? 'text-[10px]' : 'text-xs'}`}
                      >
                        {prize.name}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              <div className="mt-4 flex-shrink-0">
                <button
                  onClick={() => {
                    setShowResult(false);
                    setCurrentDisplay(uiSettings.mainTitle); // 重置回默认显示
                    // 停止中奖音效
                    audioManager.stop('win');
                    // 恢复背景音乐
                    audioManager.playBgm();
                  }}
                  className="px-8 py-3 bg-white text-slate-900 rounded-full font-bold hover:bg-slate-200 transition shadow-lg hover:scale-105 active:scale-95"
                >
                  继续抽奖
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Control Bar - 仅在未抽奖时显示 */}
      <AnimatePresence>
        {!showResult && !isAdminOpen && !isWinnersOpen && !isRolling && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-0 left-0 right-0 z-50 w-full bg-gradient-to-t from-red-950/95 via-red-900/90 to-red-900/80 backdrop-blur-md border-t-2 border-yellow-500/50 p-6 shadow-[0_-4px_20px_rgba(220,38,38,0.3)]"
          >
            <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex flex-col">
                  <label className="text-xs text-yellow-200/80 mb-1 font-medium">
                    抽奖池
                  </label>
                  <select
                    value={selectedPoolId}
                    onChange={(e) => setSelectedPoolId(e.target.value)}
                    className="bg-red-950/50 border border-yellow-600/50 rounded px-3 py-2 text-sm min-w-[120px] text-yellow-50 focus:ring-2 focus:ring-yellow-500 outline-none hover:border-yellow-500 transition-colors"
                  >
                    {pools.map((p) => (
                      <option key={p.id} value={p.id} className="text-black">
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col">
                  <label className="text-xs text-yellow-200/80 mb-1 font-medium">
                    选择奖项
                  </label>
                  <select
                    value={selectedLevel}
                    onChange={(e) => setSelectedLevel(e.target.value)}
                    className="bg-red-950/50 border border-yellow-600/50 rounded px-3 py-2 text-sm min-w-[200px] text-yellow-50 focus:ring-2 focus:ring-yellow-500 outline-none hover:border-yellow-500 transition-colors"
                  >
                    <option value="" className="text-black">
                      请选择奖项...
                    </option>
                    {levelStats.map((stat) => (
                      <option
                        key={stat.key}
                        value={stat.key}
                        className="text-black"
                      >
                        {stat.label} (余 {stat.count})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col">
                  <label className="text-xs text-yellow-200/80 mb-1 font-medium">
                    抽取数量
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max={maxDrawCount}
                      value={drawCount}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        if (!isNaN(val)) {
                          setDrawCount(
                            Math.min(Math.max(1, val), maxDrawCount)
                          );
                        }
                      }}
                      disabled={!selectedLevel}
                      className="bg-red-950/50 border border-yellow-600/50 rounded px-3 py-2 text-sm w-20 text-yellow-50 focus:ring-2 focus:ring-yellow-500 outline-none text-center hover:border-yellow-500 transition-colors"
                    />
                    <span className="text-xs text-yellow-200/60">
                      (最大 {maxDrawCount})
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleStart}
                disabled={!selectedLevel}
                className={`
              flex items-center gap-2 px-8 py-4 rounded-full font-bold text-lg shadow-[0_4px_14px_rgba(234,179,8,0.4)] transition-all transform hover:scale-105 active:scale-95 border border-yellow-400/30
              bg-gradient-to-r from-red-600 via-red-500 to-yellow-500 hover:from-red-500 hover:via-red-400 hover:to-yellow-400 text-white ring-4 ring-red-900/30
              ${!selectedLevel ? 'opacity-50 cursor-not-allowed' : ''}
            `}
              >
                <Play fill="currentColor" className="text-yellow-100" />
                <span className="text-yellow-50 drop-shadow-md">开始抽奖</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LotteryMachine;
