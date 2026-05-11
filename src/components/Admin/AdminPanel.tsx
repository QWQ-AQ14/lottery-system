import React, { useState, useRef, useEffect } from 'react';
import { useLotteryStore } from '@/store/useLotteryStore';
import * as XLSX from 'xlsx';
import {
  Upload,
  Trash2,
  Plus,
  X,
  Image as ImageIcon,
  Edit2,
  Save,
  RotateCcw,
  Trophy,
  Download,
  Layers,
  Search,
  Zap,
  Filter,
  Music,
  Play,
  Square,
  Volume2,
  LayoutTemplate
} from 'lucide-react';
import { Prize, Pool, AudioType } from '@/types';
import { format } from 'date-fns';
import { audioManager } from '@/utils/audioManager';

const AdminPanel = () => {
  const {
    pools,
    participants,
    prizes,
    winners,
    audioSettings,
    uiSettings,
    addPool,
    removePool,
    updatePool,
    importParticipants,
    clearPool,
    addPrize,
    importPrizes,
    updatePrize,
    removePrize,
    clearPrizes,
    removeParticipant,
    updateParticipant,
    resetWinners,
    updateAudioSettings,
    resetAudioSettings,
    updateUiSettings,
    resetUiSettings,
    isAdminOpen,
    setAdminOpen
  } = useLotteryStore();

  const [activeTab, setActiveTab] = useState<
    'pools' | 'participants' | 'prizes' | 'winners' | 'audio' | 'ui'
  >('pools');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const prizeFileInputRef = useRef<HTMLInputElement>(null);
  const prizeImageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);

  // 初始化 selectedPool，确保有默认值
  const [selectedPool, setSelectedPool] = useState<string>('');

  // 中奖记录筛选状态
  const [winnerFilterPoolId, setWinnerFilterPoolId] = useState<string>('all');

  // 搜索状态
  const [searchTerm, setSearchTerm] = useState('');

  // 批量权重状态
  const [batchNames, setBatchNames] = useState('');
  const [weightIncrement, setWeightIncrement] = useState(1);

  // 音频上传状态
  const [uploadingAudioType, setUploadingAudioType] =
    useState<AudioType | null>(null);

  // 当 pools 加载或变化时，确保 selectedPool 有效
  useEffect(() => {
    if (pools.length > 0) {
      // 如果当前选中的 pool 不在列表中，或者还没选中，则默认选中第一个
      const poolExists = pools.find((p) => p.id === selectedPool);
      if (!selectedPool || !poolExists) {
        setSelectedPool(pools[0].id);
      }
    } else {
      setSelectedPool('');
    }
  }, [pools, selectedPool]);

  // Pool Management State
  const [newPoolName, setNewPoolName] = useState('');
  const [editingPoolId, setEditingPoolId] = useState<string | null>(null);
  const [editingPoolName, setEditingPoolName] = useState('');

  // Prize Form State
  const [newPrize, setNewPrize] = useState<Partial<Prize>>({
    level: '3',
    count: 1,
    name: '',
    image: ''
  });

  // Editing State
  const [editingPrizeId, setEditingPrizeId] = useState<string | null>(null);

  // Pool Handlers
  const handleAddPool = () => {
    if (!newPoolName.trim()) {
      alert('请输入奖池名称');
      return;
    }
    addPool(newPoolName.trim());
    setNewPoolName('');
  };

  const handleUpdatePool = (id: string) => {
    if (!editingPoolName.trim()) {
      alert('奖池名称不能为空');
      return;
    }
    updatePool(id, editingPoolName.trim());
    setEditingPoolId(null);
    setEditingPoolName('');
  };

  const handleDeletePool = (id: string) => {
    if (
      window.confirm(
        '确定要删除该奖池吗？该操作将同时删除该奖池下的所有人员和奖品！'
      )
    ) {
      removePool(id);
    }
  };

  const startEditPool = (pool: Pool) => {
    setEditingPoolId(pool.id);
    setEditingPoolName(pool.name);
  };

  // File Upload Handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        // 使用 array buffer 读取，兼容性更好
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        if (jsonData.length === 0) {
          alert('Excel 文件为空或格式不正确');
          return;
        }

        importParticipants(jsonData, selectedPool);
        alert(`成功导入 ${jsonData.length} 条数据`);

        // 重置 input，允许重复上传同一个文件
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } catch (error) {
        console.error('Excel parse error:', error);
        alert('Excel 解析失败，请确保文件格式正确');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handlePrizeFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        if (jsonData.length === 0) {
          alert('Excel 文件为空或格式不正确');
          return;
        }

        importPrizes(jsonData, selectedPool);
        alert(`成功导入 ${jsonData.length} 个奖品`);

        if (prizeFileInputRef.current) {
          prizeFileInputRef.current.value = '';
        }
      } catch (error) {
        console.error('Excel parse error:', error);
        alert('Excel 解析失败，请确保文件格式正确');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handlePrizeImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 限制图片大小 (例如 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('图片大小不能超过 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      const base64 = evt.target?.result as string;
      setNewPrize({ ...newPrize, image: base64 });

      // 重置 input
      if (prizeImageInputRef.current) {
        prizeImageInputRef.current.value = '';
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadingAudioType) return;

    // 限制音频大小 (例如 10MB，避免 localStorage 溢出)
    if (file.size > 10 * 1024 * 1024) {
      alert('音频文件过大，请上传小于 10MB 的文件');
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      const base64 = evt.target?.result as string;
      updateAudioSettings(uploadingAudioType, {
        url: base64,
        name: file.name
      });

      // 重置
      setUploadingAudioType(null);
      if (audioInputRef.current) {
        audioInputRef.current.value = '';
      }
    };
    reader.readAsDataURL(file);
  };

  const triggerAudioUpload = (type: AudioType) => {
    setUploadingAudioType(type);
    audioInputRef.current?.click();
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert('图片大小不能超过 2MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (evt) => {
      const base64 = evt.target?.result as string;
      updateUiSettings({ logoUrl: base64 });
      if (logoInputRef.current) logoInputRef.current.value = '';
    };
    reader.readAsDataURL(file);
  };

  const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('图片大小不能超过 5MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (evt) => {
      const base64 = evt.target?.result as string;
      updateUiSettings({ backgroundUrl: base64 });
      if (bgInputRef.current) bgInputRef.current.value = '';
    };
    reader.readAsDataURL(file);
  };

  const handleSavePrize = () => {
    if (!selectedPool) {
      alert('请先选择或创建一个奖池');
      return;
    }
    if (!newPrize.name || !newPrize.count) {
      alert('请填写奖品名称和数量');
      return;
    }

    const prizeImage =
      newPrize.image ||
      'https://webgw-internet.alipay.com/180020010001201727/shandieluiweb/image-search/gift_box';

    if (editingPrizeId) {
      // 更新现有奖品
      const originalPrize = prizes.find((p) => p.id === editingPrizeId);
      if (originalPrize) {
        // 计算数量差值，同步更新 remaining
        const countDiff = Number(newPrize.count) - originalPrize.count;
        const newRemaining = Math.max(0, originalPrize.remaining + countDiff);

        updatePrize(editingPrizeId, {
          level: newPrize.level as '1' | '2' | '3',
          name: newPrize.name,
          image: prizeImage,
          count: Number(newPrize.count),
          remaining: newRemaining
        });
        setEditingPrizeId(null);
      }
    } else {
      // 添加新奖品
      addPrize({
        poolId: selectedPool,
        level: newPrize.level as '1' | '2' | '3',
        name: newPrize.name,
        image: prizeImage,
        count: Number(newPrize.count)
      });
    }

    // 重置表单
    setNewPrize({
      level: '3',
      count: 1,
      name: '',
      image: ''
    });
  };

  const handleEditPrize = (prize: Prize) => {
    setEditingPrizeId(prize.id);
    setNewPrize({
      level: prize.level,
      count: prize.count,
      name: prize.name,
      image: prize.image
    });
    // 切换到奖品 Tab (虽然通常已经在该 Tab，但为了保险)
    setActiveTab('prizes');
  };

  const handleCancelEdit = () => {
    setEditingPrizeId(null);
    setNewPrize({
      level: '3',
      count: 1,
      name: '',
      image: ''
    });
  };

  const getPoolName = (poolId: string) => {
    return pools.find((p) => p.id === poolId)?.name || '未知奖池';
  };

  // 获取当前筛选后的中奖记录
  const getFilteredWinners = () => {
    if (winnerFilterPoolId === 'all') {
      return winners;
    }
    return winners.filter((w) => w.participant.poolId === winnerFilterPoolId);
  };

  const handleExportWinners = () => {
    const filteredWinners = getFilteredWinners();
    if (filteredWinners.length === 0) {
      alert('当前筛选条件下暂无中奖记录可导出');
      return;
    }

    const dataToExport = filteredWinners.map((w) => ({
      时间: format(w.timestamp, 'yyyy-MM-dd HH:mm:ss'),
      花名: w.participant.name,
      部门: w.participant.department || '-',
      奖品名称: w.prize.name,
      奖品等级: `${w.prize.level}等奖`,
      所属奖池: getPoolName(w.participant.poolId)
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '中奖名单');
    XLSX.writeFile(
      wb,
      `中奖名单_${winnerFilterPoolId === 'all' ? '全部' : getPoolName(winnerFilterPoolId)}_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`
    );
  };

  // 批量增加权重逻辑
  const handleBatchWeight = () => {
    if (!batchNames.trim()) {
      alert('请输入花名');
      return;
    }
    if (!selectedPool) {
      alert('请先选择奖池');
      return;
    }

    // 解析花名，支持顿号、逗号、空格、换行
    const names = batchNames
      .split(/[、,，\s\n]+/)
      .map((n) => n.trim())
      .filter((n) => n.length > 0);

    if (names.length === 0) return;

    const poolParticipants = participants.filter(
      (p) => p.poolId === selectedPool
    );
    let updatedCount = 0;
    const notFoundNames: string[] = [];

    names.forEach((name) => {
      // 查找匹配的人员（可能有重名，全部更新）
      const targets = poolParticipants.filter((p) => p.name === name);

      if (targets.length > 0) {
        targets.forEach((p) => {
          updateParticipant(p.id, { weight: p.weight + weightIncrement });
        });
        updatedCount += targets.length;
      } else {
        notFoundNames.push(name);
      }
    });

    let message = `成功更新 ${updatedCount} 人次的权重（增加 ${weightIncrement}）。`;
    if (notFoundNames.length > 0) {
      message += `\n\n未找到以下人员：\n${notFoundNames.join('、')}`;
    }

    alert(message);
    setBatchNames(''); // 清空输入
  };

  if (!isAdminOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 w-full max-w-4xl h-[85vh] rounded-xl shadow-2xl flex flex-col overflow-hidden text-slate-900 dark:text-white">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Layers className="w-5 h-5" /> 后台管理
          </h2>
          <button
            onClick={() => setAdminOpen(false)}
            className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-slate-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-x-auto">
          <button
            onClick={() => setActiveTab('pools')}
            className={`flex-1 min-w-[100px] py-3 font-medium transition-colors whitespace-nowrap ${activeTab === 'pools' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50 dark:bg-blue-900/20' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            奖池管理
          </button>
          <button
            onClick={() => setActiveTab('participants')}
            className={`flex-1 min-w-[100px] py-3 font-medium transition-colors whitespace-nowrap ${activeTab === 'participants' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50 dark:bg-blue-900/20' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            人员管理
          </button>
          <button
            onClick={() => setActiveTab('prizes')}
            className={`flex-1 min-w-[100px] py-3 font-medium transition-colors whitespace-nowrap ${activeTab === 'prizes' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50 dark:bg-blue-900/20' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            奖品配置
          </button>
          <button
            onClick={() => setActiveTab('winners')}
            className={`flex-1 min-w-[100px] py-3 font-medium transition-colors whitespace-nowrap ${activeTab === 'winners' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50 dark:bg-blue-900/20' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            中奖记录
          </button>
          <button
            onClick={() => setActiveTab('audio')}
            className={`flex-1 min-w-[100px] py-3 font-medium transition-colors whitespace-nowrap ${activeTab === 'audio' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50 dark:bg-blue-900/20' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            音效设置
          </button>
          <button
            onClick={() => setActiveTab('ui')}
            className={`flex-1 min-w-[100px] py-3 font-medium transition-colors whitespace-nowrap ${activeTab === 'ui' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50 dark:bg-blue-900/20' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            界面设置
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 bg-slate-50 dark:bg-slate-900/50">
          {/* Pool Selector for non-pool tabs */}
          {activeTab !== 'winners' &&
            activeTab !== 'pools' &&
            activeTab !== 'audio' &&
            activeTab !== 'ui' && (
              <div className="mb-6 flex items-center justify-between gap-4 bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-4">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                    当前操作奖池：
                  </label>
                  {pools.length > 0 ? (
                    <select
                      value={selectedPool}
                      onChange={(e) => setSelectedPool(e.target.value)}
                      className="p-2 rounded border border-slate-300 dark:bg-slate-700 dark:border-slate-600 text-slate-900 dark:text-white min-w-[200px] focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      {pools.map((p) => (
                        <option
                          key={p.id}
                          value={p.id}
                          className="text-slate-900"
                        >
                          {p.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-red-500 text-sm">
                      请先在“奖池管理”中创建奖池
                    </span>
                  )}
                </div>

                {/* 批量导入奖品按钮，仅在 prizes tab 显示 */}
                {activeTab === 'prizes' && selectedPool && (
                  <div className="flex gap-2">
                    <div className="relative">
                      <input
                        type="file"
                        ref={prizeFileInputRef}
                        onChange={handlePrizeFileUpload}
                        accept=".xlsx, .xls"
                        className="hidden"
                      />
                      <button
                        onClick={() => prizeFileInputRef.current?.click()}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors shadow-sm text-sm"
                      >
                        <Upload size={16} /> 批量导入奖品
                      </button>
                    </div>
                    <button
                      onClick={() => {
                        if (
                          window.confirm(
                            '确定要清空当前奖池的所有奖品吗？此操作不可恢复！'
                          )
                        ) {
                          clearPrizes(selectedPool);
                        }
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors border border-red-200 text-sm"
                    >
                      <Trash2 size={16} /> 清空当前奖品
                    </button>
                  </div>
                )}
              </div>
            )}

          {/* Pools Management Tab */}
          {activeTab === 'pools' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                <h3 className="text-lg font-semibold mb-4 text-slate-800 dark:text-white">
                  添加新奖池
                </h3>
                <div className="flex gap-3">
                  <input
                    type="text"
                    placeholder="输入奖池名称，如：技术部年会"
                    value={newPoolName}
                    onChange={(e) => setNewPoolName(e.target.value)}
                    className="flex-1 p-2.5 rounded border border-slate-300 dark:bg-slate-700 dark:border-slate-600 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddPool()}
                  />
                  <button
                    onClick={handleAddPool}
                    className="px-6 py-2.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center gap-2 font-medium"
                  >
                    <Plus size={18} /> 添加
                  </button>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 font-semibold">
                    <tr>
                      <th className="p-4 border-b dark:border-slate-700">
                        奖池名称
                      </th>
                      <th className="p-4 border-b dark:border-slate-700">
                        人员数量
                      </th>
                      <th className="p-4 border-b dark:border-slate-700">
                        奖品数量
                      </th>
                      <th className="p-4 border-b dark:border-slate-700 text-right">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {pools.map((pool) => (
                      <tr
                        key={pool.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                      >
                        <td className="p-4">
                          {editingPoolId === pool.id ? (
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={editingPoolName}
                                onChange={(e) =>
                                  setEditingPoolName(e.target.value)
                                }
                                className="p-1.5 rounded border border-slate-300 dark:bg-slate-600 dark:border-slate-500 text-slate-900 dark:text-white text-sm w-full"
                                autoFocus
                              />
                              <button
                                onClick={() => handleUpdatePool(pool.id)}
                                className="text-green-600 hover:text-green-700 p-1"
                                title="保存"
                              >
                                <Save size={18} />
                              </button>
                              <button
                                onClick={() => setEditingPoolId(null)}
                                className="text-slate-400 hover:text-slate-600 p-1"
                                title="取消"
                              >
                                <X size={18} />
                              </button>
                            </div>
                          ) : (
                            <span className="font-medium text-slate-900 dark:text-white text-base">
                              {pool.name}
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-slate-600 dark:text-slate-300">
                          {
                            participants.filter((p) => p.poolId === pool.id)
                              .length
                          }{' '}
                          人
                        </td>
                        <td className="p-4 text-slate-600 dark:text-slate-300">
                          {prizes.filter((p) => p.poolId === pool.id).length} 个
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => startEditPool(pool)}
                              className="text-blue-500 hover:text-blue-700 p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                              title="重命名"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button
                              onClick={() => handleDeletePool(pool.id)}
                              className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                              title="删除"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {pools.length === 0 && (
                      <tr>
                        <td
                          colSpan={4}
                          className="p-12 text-center text-slate-400"
                        >
                          <div className="flex flex-col items-center gap-2">
                            <Layers size={32} className="opacity-20" />
                            <p>暂无奖池，请在上方添加</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'participants' && (
            <div className="space-y-6">
              {selectedPool ? (
                <>
                  {/* 批量增加权重区域 */}
                  <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                    <h3 className="text-lg font-semibold mb-4 text-slate-800 dark:text-white flex items-center gap-2">
                      <Zap className="w-5 h-5 text-yellow-500" /> 批量增加权重
                    </h3>
                    <div className="flex flex-col gap-4">
                      <textarea
                        placeholder="输入花名，用逗号、顿号或空格分隔（例如：张三、李四、王五）"
                        value={batchNames}
                        onChange={(e) => setBatchNames(e.target.value)}
                        className="w-full p-3 rounded border border-slate-300 dark:bg-slate-700 dark:border-slate-600 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none min-h-[80px]"
                      />
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <label className="text-sm text-slate-600 dark:text-slate-300">
                            增加权重值:
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={weightIncrement}
                            onChange={(e) =>
                              setWeightIncrement(
                                Math.max(1, parseInt(e.target.value) || 1)
                              )
                            }
                            className="w-20 p-2 rounded border border-slate-300 dark:bg-slate-700 dark:border-slate-600 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </div>
                        <button
                          onClick={handleBatchWeight}
                          className="px-6 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors font-medium shadow-sm"
                        >
                          执行批量增加
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4 flex-wrap items-center justify-between">
                    <div className="flex gap-4 items-center flex-wrap">
                      <div className="relative">
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileUpload}
                          accept=".xlsx, .xls"
                          className="hidden"
                        />
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors shadow-sm"
                        >
                          <Upload size={18} /> 导入 Excel
                        </button>
                      </div>
                      <button
                        onClick={() => {
                          if (
                            window.confirm('确定要清空当前奖池的所有人员吗？')
                          ) {
                            clearPool(selectedPool);
                          }
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors border border-red-200"
                      >
                        <Trash2 size={18} /> 清空当前池
                      </button>
                    </div>

                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="搜索花名..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 pr-4 py-2 rounded border border-slate-300 dark:bg-slate-700 dark:border-slate-600 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm w-48 md:w-64"
                      />
                    </div>
                  </div>

                  <div className="text-xs text-slate-500 bg-blue-50 dark:bg-blue-900/20 px-3 py-2 rounded border border-blue-100 dark:border-blue-800">
                    支持列名：花名/姓名/name, 部门/业务线/department,
                    权重/次数/weight (默认1)
                  </div>

                  <div className="bg-white dark:bg-slate-800 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 font-semibold">
                        <tr>
                          <th className="p-3 border-b dark:border-slate-700">
                            花名
                          </th>
                          <th className="p-3 border-b dark:border-slate-700">
                            权重
                          </th>
                          <th className="p-3 border-b dark:border-slate-700">
                            部门
                          </th>
                          <th className="p-3 border-b dark:border-slate-700 text-right">
                            操作
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {participants
                          .filter((p) => p.poolId === selectedPool)
                          .filter((p) =>
                            p.name
                              .toLowerCase()
                              .includes(searchTerm.toLowerCase())
                          )
                          .map((p) => (
                            <tr
                              key={p.id}
                              className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                            >
                              <td className="p-3 font-medium text-slate-900 dark:text-white">
                                {p.name}
                              </td>
                              <td className="p-3 text-slate-900 dark:text-slate-300">
                                {p.weight}
                              </td>
                              <td className="p-3 text-slate-900 dark:text-slate-300">
                                {p.department || '-'}
                              </td>
                              <td className="p-3 text-right">
                                <button
                                  onClick={() => removeParticipant(p.id)}
                                  className="text-red-500 hover:text-red-700 p-1.5 hover:bg-red-50 rounded transition-colors"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        {participants.filter((p) => p.poolId === selectedPool)
                          .length === 0 && (
                          <tr>
                            <td
                              colSpan={4}
                              className="p-12 text-center text-slate-400"
                            >
                              <div className="flex flex-col items-center gap-2">
                                <Upload size={32} className="opacity-20" />
                                <p>暂无数据，请点击上方按钮导入 Excel</p>
                              </div>
                            </td>
                          </tr>
                        )}
                        {participants.filter((p) => p.poolId === selectedPool)
                          .length > 0 &&
                          participants
                            .filter((p) => p.poolId === selectedPool)
                            .filter((p) =>
                              p.name
                                .toLowerCase()
                                .includes(searchTerm.toLowerCase())
                            ).length === 0 && (
                            <tr>
                              <td
                                colSpan={4}
                                className="p-12 text-center text-slate-400"
                              >
                                <p>未找到匹配的花名</p>
                              </td>
                            </tr>
                          )}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className="text-center py-12 text-slate-500">
                  请先选择或创建一个奖池
                </div>
              )}
            </div>
          )}

          {activeTab === 'prizes' && (
            <div className="space-y-6">
              {selectedPool ? (
                <>
                  <div className="text-xs text-slate-500 bg-blue-50 dark:bg-blue-900/20 px-3 py-2 rounded border border-blue-100 dark:border-blue-800">
                    支持列名：奖品名称/name, 奖品等级/level (1/2/3),
                    奖品数量/count, 奖品图片/image (URL)
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm relative">
                    {editingPrizeId && (
                      <div className="absolute top-0 right-0 bg-blue-500 text-white text-xs px-2 py-1 rounded-bl-lg rounded-tr-lg font-bold">
                        正在编辑
                      </div>
                    )}

                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        奖品名称
                      </label>
                      <input
                        placeholder="例如：iPhone 15"
                        value={newPrize.name}
                        onChange={(e) =>
                          setNewPrize({ ...newPrize, name: e.target.value })
                        }
                        className="p-2.5 rounded border border-slate-300 dark:bg-slate-700 dark:border-slate-600 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        奖品等级
                      </label>
                      <select
                        value={newPrize.level}
                        onChange={(e) =>
                          setNewPrize({
                            ...newPrize,
                            level: e.target.value as any
                          })
                        }
                        className="p-2.5 rounded border border-slate-300 dark:bg-slate-700 dark:border-slate-600 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value="1" className="text-slate-900">
                          一等奖
                        </option>
                        <option value="2" className="text-slate-900">
                          二等奖
                        </option>
                        <option value="3" className="text-slate-900">
                          三等奖
                        </option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        奖品数量
                      </label>
                      <input
                        type="number"
                        placeholder="1"
                        min="1"
                        value={newPrize.count}
                        onChange={(e) =>
                          setNewPrize({
                            ...newPrize,
                            count: Number(e.target.value)
                          })
                        }
                        className="p-2.5 rounded border border-slate-300 dark:bg-slate-700 dark:border-slate-600 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        奖品图片
                      </label>
                      <div className="flex gap-2">
                        <input
                          placeholder="输入图片 URL"
                          value={newPrize.image}
                          onChange={(e) =>
                            setNewPrize({ ...newPrize, image: e.target.value })
                          }
                          className="flex-1 p-2.5 rounded border border-slate-300 dark:bg-slate-700 dark:border-slate-600 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                        <input
                          type="file"
                          ref={prizeImageInputRef}
                          onChange={handlePrizeImageUpload}
                          accept="image/*"
                          className="hidden"
                        />
                        <button
                          onClick={() => prizeImageInputRef.current?.click()}
                          className="px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors text-slate-700 dark:text-slate-300"
                          title="上传图片"
                        >
                          <ImageIcon size={20} />
                        </button>
                      </div>
                      {newPrize.image && (
                        <div className="mt-2 relative w-16 h-16 group">
                          <img
                            src={newPrize.image}
                            alt="Preview"
                            className="w-full h-full object-cover rounded border border-slate-200"
                          />
                          <button
                            onClick={() =>
                              setNewPrize({ ...newPrize, image: '' })
                            }
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="md:col-span-2 pt-2 flex gap-3">
                      {editingPrizeId && (
                        <button
                          onClick={handleCancelEdit}
                          className="flex-1 bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200 rounded-lg py-3 hover:bg-slate-300 dark:hover:bg-slate-600 flex items-center justify-center gap-2 transition-all"
                        >
                          <RotateCcw size={20} /> 取消编辑
                        </button>
                      )}
                      <button
                        onClick={handleSavePrize}
                        className={`flex-1 text-white rounded-lg py-3 flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg active:scale-[0.99] ${
                          editingPrizeId
                            ? 'bg-blue-600 hover:bg-blue-700'
                            : 'bg-green-600 hover:bg-green-700'
                        }`}
                      >
                        {editingPrizeId ? (
                          <Save size={20} />
                        ) : (
                          <Plus size={20} />
                        )}
                        {editingPrizeId ? '更新奖品' : '添加奖品'}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {prizes
                      .filter((p) => p.poolId === selectedPool)
                      .map((prize) => (
                        <div
                          key={prize.id}
                          className={`bg-white dark:bg-slate-800 border rounded-lg p-4 flex gap-4 items-center shadow-sm hover:shadow-md transition-all ${
                            editingPrizeId === prize.id
                              ? 'border-blue-500 ring-2 ring-blue-500/20'
                              : 'border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          <div className="w-16 h-16 rounded-lg bg-slate-100 dark:bg-slate-700 overflow-hidden flex-shrink-0 border border-slate-200 dark:border-slate-600">
                            <img
                              src={prize.image}
                              alt={prize.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src =
                                  'https://webgw-internet.alipay.com/180020010001201727/shandieluiweb/image-search/gift_box';
                              }}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start gap-2">
                              <h3
                                className="font-bold text-slate-800 dark:text-white truncate"
                                title={prize.name}
                              >
                                {prize.name}
                              </h3>
                              <span
                                className={`text-xs px-2 py-0.5 rounded whitespace-nowrap ${
                                  prize.level === '1'
                                    ? 'bg-yellow-100 text-yellow-700 border border-yellow-200'
                                    : prize.level === '2'
                                      ? 'bg-gray-100 text-gray-700 border border-gray-200'
                                      : 'bg-orange-100 text-orange-700 border border-orange-200'
                                }`}
                              >
                                {prize.level}等奖
                              </span>
                            </div>
                            <div className="mt-1 flex items-center justify-between">
                              <p className="text-sm text-slate-500">
                                剩余:{' '}
                                <span className="font-medium text-slate-700 dark:text-slate-300">
                                  {prize.remaining}
                                </span>{' '}
                                / {prize.count}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-col gap-1">
                            <button
                              onClick={() => handleEditPrize(prize)}
                              className="text-slate-400 hover:text-blue-500 p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-colors"
                              title="编辑"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm('确定要删除这个奖品吗？')) {
                                  removePrize(prize.id);
                                  if (editingPrizeId === prize.id) {
                                    handleCancelEdit();
                                  }
                                }
                              }}
                              className="text-slate-400 hover:text-red-500 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
                              title="删除"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                      ))}
                    {prizes.filter((p) => p.poolId === selectedPool).length ===
                      0 && (
                      <div className="col-span-full text-center py-12 text-slate-400 bg-white dark:bg-slate-800 rounded-lg border border-dashed border-slate-300 dark:border-slate-700">
                        <div className="flex flex-col items-center gap-2">
                          <Plus size={32} className="opacity-20" />
                          <p>当前奖池暂无奖品，请在上方添加</p>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center py-12 text-slate-500">
                  请先选择或创建一个奖池
                </div>
              )}
            </div>
          )}

          {activeTab === 'winners' && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3 w-full md:w-auto">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2 whitespace-nowrap">
                    <Filter size={16} /> 筛选奖池：
                  </label>
                  <select
                    value={winnerFilterPoolId}
                    onChange={(e) => setWinnerFilterPoolId(e.target.value)}
                    className="flex-1 md:flex-none p-2 rounded border border-slate-300 dark:bg-slate-700 dark:border-slate-600 text-slate-900 dark:text-white min-w-[150px] focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="all" className="text-slate-900">
                      全部奖池
                    </option>
                    {pools.map((p) => (
                      <option
                        key={p.id}
                        value={p.id}
                        className="text-slate-900"
                      >
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3 w-full md:w-auto justify-end">
                  <button
                    onClick={handleExportWinners}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors shadow-sm whitespace-nowrap"
                  >
                    <Download size={18} /> 导出 Excel
                  </button>
                  <button
                    onClick={() => {
                      if (
                        window.confirm(
                          '确定要清空所有中奖记录吗？此操作不可恢复！'
                        )
                      ) {
                        resetWinners();
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors border border-red-200 whitespace-nowrap"
                  >
                    <Trash2 size={18} /> 清空所有记录
                  </button>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 font-semibold">
                    <tr>
                      <th className="p-3 border-b dark:border-slate-700">
                        时间
                      </th>
                      <th className="p-3 border-b dark:border-slate-700">
                        花名
                      </th>
                      <th className="p-3 border-b dark:border-slate-700">
                        奖品
                      </th>
                      <th className="p-3 border-b dark:border-slate-700">
                        所属池
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {getFilteredWinners().map((winner) => (
                      <tr
                        key={winner.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                      >
                        <td className="p-3 text-slate-500 dark:text-slate-400">
                          {format(winner.timestamp, 'yyyy-MM-dd HH:mm:ss')}
                        </td>
                        <td className="p-3 font-medium text-slate-900 dark:text-white">
                          {winner.participant.name}
                        </td>
                        <td className="p-3 text-slate-900 dark:text-slate-300 flex items-center gap-2">
                          <img
                            src={winner.prize.image}
                            alt=""
                            className="w-6 h-6 rounded object-cover bg-slate-100"
                          />
                          {winner.prize.name}
                        </td>
                        <td className="p-3 text-slate-500 dark:text-slate-400">
                          {getPoolName(winner.participant.poolId)}
                        </td>
                      </tr>
                    ))}
                    {getFilteredWinners().length === 0 && (
                      <tr>
                        <td
                          colSpan={4}
                          className="p-12 text-center text-slate-400"
                        >
                          <div className="flex flex-col items-center gap-2">
                            <Trophy size={32} className="opacity-20" />
                            <p>
                              {winnerFilterPoolId === 'all'
                                ? '暂无中奖记录'
                                : '该奖池暂无中奖记录'}
                            </p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'audio' && (
            <div className="space-y-6">
              <input
                type="file"
                ref={audioInputRef}
                onChange={handleAudioUpload}
                accept="audio/mp3,audio/wav,audio/mpeg"
                className="hidden"
              />

              <div className="grid grid-cols-1 gap-6">
                {[
                  {
                    type: 'bgm',
                    label: '背景音乐 (循环)',
                    desc: '抽奖前的暖场音乐'
                  },
                  {
                    type: 'rolling',
                    label: '抽奖进行中 (循环)',
                    desc: '名单滚动时的紧张音效'
                  },
                  {
                    type: 'win',
                    label: '中奖时刻 (一次性)',
                    desc: '展示中奖结果时的喜庆音效'
                  },
                  {
                    type: 'fail',
                    label: '未中奖/空转 (可选)',
                    desc: '未中奖或异常时的提示音效'
                  }
                ].map((item) => {
                  const type = item.type as AudioType;
                  const config = audioSettings[type];

                  return (
                    <div
                      key={type}
                      className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row gap-6 items-start md:items-center"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="text-lg font-semibold text-slate-800 dark:text-white">
                            {item.label}
                          </h3>
                          <div
                            className={`px-2 py-0.5 rounded text-xs font-medium ${config.enabled ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}
                          >
                            {config.enabled ? '已启用' : '已禁用'}
                          </div>
                        </div>
                        <p className="text-sm text-slate-500 mb-2">
                          {item.desc}
                        </p>
                        <div
                          className="text-xs text-slate-400 truncate max-w-md"
                          title={config.name || '默认音效'}
                        >
                          当前文件: {config.name || '默认音效'}
                        </div>
                      </div>

                      <div className="flex flex-col gap-3 w-full md:w-auto">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => audioManager.play(type)}
                            className="p-2 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
                            title="试听"
                          >
                            <Play size={18} />
                          </button>
                          <button
                            onClick={() => audioManager.stop(type)}
                            className="p-2 bg-slate-50 text-slate-600 rounded hover:bg-slate-100 transition-colors"
                            title="停止"
                          >
                            <Square size={18} />
                          </button>
                          <div className="w-px h-6 bg-slate-200 mx-1"></div>
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={config.enabled}
                              onChange={(e) =>
                                updateAudioSettings(type, {
                                  enabled: e.target.checked
                                })
                              }
                              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm text-slate-700 dark:text-slate-300">
                              启用
                            </span>
                          </label>
                        </div>

                        <div className="flex items-center gap-2">
                          <Volume2 size={16} className="text-slate-400" />
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            value={config.volume}
                            onChange={(e) =>
                              updateAudioSettings(type, {
                                volume: parseFloat(e.target.value)
                              })
                            }
                            className="w-24 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                          />
                        </div>
                      </div>

                      <div className="flex gap-2 w-full md:w-auto justify-end">
                        <button
                          onClick={() => triggerAudioUpload(type)}
                          className="px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors text-sm flex items-center gap-2"
                        >
                          <Upload size={16} /> 上传
                        </button>
                        <button
                          onClick={() => resetAudioSettings(type)}
                          className="px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors text-sm flex items-center gap-2 text-slate-500"
                        >
                          <RotateCcw size={16} /> 重置
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800 text-sm text-slate-600 dark:text-slate-300 flex items-start gap-3">
                <Music className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium mb-1">音效设置说明：</p>
                  <ul className="list-disc list-inside space-y-1 opacity-80">
                    <li>支持上传 MP3, WAV 格式音频文件。</li>
                    <li>建议文件大小不超过 10MB，以免影响页面加载性能。</li>
                    <li>
                      上传的音频将保存在本地浏览器缓存中，清除缓存可能会丢失自定义音效。
                    </li>
                    <li>"抽奖进行中"音效会自动循环播放，直到抽奖结束。</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ui' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                <h3 className="text-lg font-semibold mb-4 text-slate-800 dark:text-white flex items-center gap-2">
                  <LayoutTemplate className="w-5 h-5" /> 界面文案配置
                </h3>
                <div className="grid grid-cols-1 gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      主标题 (默认: 2026)
                    </label>
                    <input
                      type="text"
                      value={uiSettings.mainTitle}
                      onChange={(e) =>
                        updateUiSettings({ mainTitle: e.target.value })
                      }
                      className="p-2.5 rounded border border-slate-300 dark:bg-slate-700 dark:border-slate-600 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      副标题 (默认: 新春抽奖盛典)
                    </label>
                    <input
                      type="text"
                      value={uiSettings.subTitle}
                      onChange={(e) =>
                        updateUiSettings({ subTitle: e.target.value })
                      }
                      className="p-2.5 rounded border border-slate-300 dark:bg-slate-700 dark:border-slate-600 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Slogan (默认: 智引新｜创赢未来)
                    </label>
                    <input
                      type="text"
                      value={uiSettings.slogan}
                      onChange={(e) =>
                        updateUiSettings({ slogan: e.target.value })
                      }
                      className="p-2.5 rounded border border-slate-300 dark:bg-slate-700 dark:border-slate-600 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                <h3 className="text-lg font-semibold mb-4 text-slate-800 dark:text-white flex items-center gap-2">
                  <ImageIcon className="w-5 h-5" /> 图片资源配置
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Logo 设置 */}
                  <div className="flex flex-col gap-3">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Logo 图片
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={uiSettings.logoUrl}
                        onChange={(e) =>
                          updateUiSettings({ logoUrl: e.target.value })
                        }
                        placeholder="输入 Logo URL"
                        className="flex-1 p-2.5 rounded border border-slate-300 dark:bg-slate-700 dark:border-slate-600 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                      <input
                        type="file"
                        ref={logoInputRef}
                        onChange={handleLogoUpload}
                        accept="image/*"
                        className="hidden"
                      />
                      <button
                        onClick={() => logoInputRef.current?.click()}
                        className="px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors text-slate-700 dark:text-slate-300"
                        title="上传图片"
                      >
                        <Upload size={20} />
                      </button>
                    </div>
                    <div className="h-20 bg-slate-100 dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden">
                      {uiSettings.logoUrl ? (
                        <img
                          src={uiSettings.logoUrl}
                          alt="Logo Preview"
                          className="h-16 object-contain"
                        />
                      ) : (
                        <span className="text-slate-400 text-sm">
                          暂无 Logo
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 背景图设置 */}
                  <div className="flex flex-col gap-3">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      背景图片
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={uiSettings.backgroundUrl}
                        onChange={(e) =>
                          updateUiSettings({ backgroundUrl: e.target.value })
                        }
                        placeholder="输入背景图 URL"
                        className="flex-1 p-2.5 rounded border border-slate-300 dark:bg-slate-700 dark:border-slate-600 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                      <input
                        type="file"
                        ref={bgInputRef}
                        onChange={handleBgUpload}
                        accept="image/*"
                        className="hidden"
                      />
                      <button
                        onClick={() => bgInputRef.current?.click()}
                        className="px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors text-slate-700 dark:text-slate-300"
                        title="上传图片"
                      >
                        <Upload size={20} />
                      </button>
                    </div>
                    <div className="h-20 bg-slate-100 dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden relative">
                      <img
                        src={uiSettings.backgroundUrl}
                        alt="Background Preview"
                        className="w-full h-full object-cover opacity-50"
                      />
                      <span className="absolute text-xs text-slate-500 bg-white/80 px-2 py-1 rounded">
                        预览
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => {
                    if (window.confirm('确定要重置所有界面设置为默认值吗？')) {
                      resetUiSettings();
                    }
                  }}
                  className="px-4 py-2 bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors border border-red-200 flex items-center gap-2"
                >
                  <RotateCcw size={16} /> 重置为默认
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
