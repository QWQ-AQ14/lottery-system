import React, { useState } from 'react';
import { useLotteryStore } from '@/store/useLotteryStore';
import { X, Trophy, Calendar, User, Gift, Layers } from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

const WinnersList = () => {
  const { isWinnersOpen, setWinnersOpen, winners, pools } = useLotteryStore();
  const [activePoolId, setActivePoolId] = useState<string>('all');

  if (!isWinnersOpen) return null;

  const getPoolName = (poolId: string) => {
    return pools.find((p) => p.id === poolId)?.name || '未知奖池';
  };

  // Filter winners based on active tab
  const displayWinners =
    activePoolId === 'all'
      ? winners
      : winners.filter((w) => w.participant.poolId === activePoolId);

  // Sort by timestamp desc
  const sortedWinners = [...displayWinners].sort(
    (a, b) => b.timestamp - a.timestamp
  );

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[90] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 md:p-8"
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="bg-slate-900/90 border border-white/10 w-full max-w-5xl h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-white relative"
        >
          {/* Header */}
          <div className="p-6 border-b border-white/10 flex justify-between items-center bg-gradient-to-r from-slate-900 to-slate-800 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-500/20 rounded-lg border border-yellow-500/30">
                <Trophy className="text-yellow-400 w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-white tracking-wide">
                中奖荣耀榜
              </h2>
            </div>
            <button
              onClick={() => setWinnersOpen(false)}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <X className="w-6 h-6 text-slate-400 hover:text-white" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-white/10 bg-slate-900/50 overflow-x-auto flex-shrink-0 custom-scrollbar">
            <button
              onClick={() => setActivePoolId('all')}
              className={`px-6 py-4 font-medium transition-colors whitespace-nowrap flex items-center gap-2 ${
                activePoolId === 'all'
                  ? 'text-yellow-400 border-b-2 border-yellow-400 bg-yellow-400/10'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Layers size={16} />
              全部记录
            </button>
            {pools.map((pool) => (
              <button
                key={pool.id}
                onClick={() => setActivePoolId(pool.id)}
                className={`px-6 py-4 font-medium transition-colors whitespace-nowrap ${
                  activePoolId === pool.id
                    ? 'text-yellow-400 border-b-2 border-yellow-400 bg-yellow-400/10'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {pool.name}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            {sortedWinners.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-4">
                <Trophy size={64} className="opacity-20" />
                <p className="text-lg">
                  {activePoolId === 'all'
                    ? '暂无中奖记录，大奖还在等你！'
                    : '该奖池暂无中奖记录'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sortedWinners.map((winner) => (
                  <div
                    key={winner.id}
                    className="bg-white/5 border border-white/10 rounded-xl p-4 flex gap-4 items-center hover:bg-white/10 transition-all group"
                  >
                    {/* Prize Image */}
                    <div className="w-20 h-20 rounded-lg bg-black/40 overflow-hidden flex-shrink-0 border border-white/10 group-hover:border-yellow-500/30 transition-colors">
                      <img
                        src={winner.prize.image}
                        alt={winner.prize.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            'https://webgw-internet.alipay.com/180020010001201727/shandieluiweb/image-search/gift_box';
                        }}
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-1">
                        <h3
                          className="font-bold text-lg text-white truncate"
                          title={winner.participant.name}
                        >
                          {winner.participant.name}
                        </h3>
                        <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 whitespace-nowrap ml-2">
                          {getPoolName(winner.participant.poolId)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-yellow-400 text-sm font-medium mb-2">
                        <Gift size={14} />
                        <span className="truncate" title={winner.prize.name}>
                          {winner.prize.name}
                        </span>
                        <span
                          className={`text-xs px-1.5 py-0.5 rounded border ${
                            winner.prize.level === '1'
                              ? 'border-yellow-500/50 text-yellow-500'
                              : winner.prize.level === '2'
                                ? 'border-slate-400/50 text-slate-400'
                                : 'border-orange-700/50 text-orange-700'
                          }`}
                        >
                          {winner.prize.level}等奖
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-slate-500 text-xs">
                        <Calendar size={12} />
                        <span>
                          {format(winner.timestamp, 'yyyy-MM-dd HH:mm:ss')}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer Stats */}
          <div className="p-4 border-t border-white/10 bg-slate-900/50 text-sm text-slate-400 flex justify-between items-center flex-shrink-0">
            <span>
              {activePoolId === 'all' ? '总计' : '当前奖池'}产生{' '}
              {sortedWinners.length} 位幸运儿
            </span>
            <span className="text-xs opacity-50">Muse Lottery System 2026</span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default WinnersList;
