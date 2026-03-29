import React, { useEffect, useState } from 'react';
import { useBudget } from '../contexts/BudgetContext';
import { getDaysRemainingInMonth } from '../utils/dateUtils';
import { calculateDailyRemaining } from '../utils/budgetUtils';

const BudgetOverview: React.FC = () => {
  const { state, dispatch } = useBudget();
  const { budget } = state;
  
  // 计算日均剩余
  const daysRemaining = getDaysRemainingInMonth();
  const dailyRemaining = calculateDailyRemaining(budget.remaining, daysRemaining);

  // 计算预算使用百分比
  const totalBudget = budget.monthlyAmount + budget.lastMonthBalance;
  const usagePercentage = budget.remaining < 0 ? 100 : (totalBudget > 0 ? (budget.spent / totalBudget) * 100 : 0);
  
  // 动画状态
  const [animatedPercentage, setAnimatedPercentage] = useState(0);
  const [animatedValues, setAnimatedValues] = useState({
    remaining: 0,
    spent: 0,
    dailyRemaining: 0
  });

  // 弹窗状态
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editMode, setEditMode] = useState({
    monthlyAmount: budget.monthlyAmount,
    lastMonthBalance: budget.lastMonthBalance
  });

  // 环形图参数
  const radius = 80;
  const strokeWidth = 12;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (animatedPercentage / 100) * circumference;

  // 动画效果
  useEffect(() => {
    // 进度动画
    const interval = setInterval(() => {
      setAnimatedPercentage(prev => {
        if (prev < usagePercentage) {
          return prev + 1;
        }
        clearInterval(interval);
        return usagePercentage;
      });
    }, 15);

    // 数字动画
    const valueInterval = setInterval(() => {
      setAnimatedValues(prev => {
        // 计算新值，使用固定步长并根据目标值调整方向
        const calculateNewValue = (current: number, target: number) => {
          // 计算当前值与目标值的差值
          const diff = target - current;
          // 计算步长，确保动画平滑
          const step = diff / 20;
          // 计算新值
          const newValue = current + step;
          
          // 根据目标值的正负，确保新值不会超过目标范围
          if (target >= 0) {
            return Math.min(newValue, target);
          } else {
            return Math.max(newValue, target);
          }
        };
        
        const newValues = {
          remaining: calculateNewValue(prev.remaining, budget.remaining),
          spent: calculateNewValue(prev.spent, budget.spent),
          dailyRemaining: calculateNewValue(prev.dailyRemaining, dailyRemaining)
        };
        
        // 检查动画是否完成，考虑目标值的正负
        const isValueReached = (current: number, target: number) => {
          // 当差值的绝对值小于0.1时，认为已达到目标值
          return Math.abs(current - target) < 0.1;
        };
        
        if (
          isValueReached(newValues.remaining, budget.remaining) &&
          isValueReached(newValues.spent, budget.spent) &&
          isValueReached(newValues.dailyRemaining, dailyRemaining)
        ) {
          // 直接设置为目标值，避免精度问题
          clearInterval(valueInterval);
          return {
            remaining: budget.remaining,
            spent: budget.spent,
            dailyRemaining: dailyRemaining
          };
        }
        
        return newValues;
      });
    }, 20);

    return () => {
      clearInterval(interval);
      clearInterval(valueInterval);
    };
  }, [budget, usagePercentage, dailyRemaining]);

  // 根据使用百分比获取颜色
  const getStatusColor = () => {
    if (budget.remaining < 0) return '#ef4444'; // red-500
    if (usagePercentage > 80) return '#ef4444'; // red-500
    if (usagePercentage > 50) return '#f59e0b'; // amber-500
    return '#10b981'; // emerald-500
  };

  const getStatusBgColor = () => {
    if (budget.remaining < 0) return 'bg-red-50';
    if (usagePercentage > 80) return 'bg-red-50';
    if (usagePercentage > 50) return 'bg-amber-50';
    return 'bg-emerald-50';
  };

  const getStatusTextColor = () => {
    if (budget.remaining < 0) return 'text-red-600';
    if (usagePercentage > 80) return 'text-red-600';
    if (usagePercentage > 50) return 'text-amber-600';
    return 'text-emerald-600';
  };

  // 处理弹窗关闭
  const handleCloseModal = () => {
    setShowDetailModal(false);
  };

  // 处理保存预算设置
  const handleSaveBudget = () => {
    dispatch({
      type: 'SET_BUDGET',
      payload: {
        monthlyAmount: parseFloat(editMode.monthlyAmount.toString()) || 0,
        lastMonthBalance: parseFloat(editMode.lastMonthBalance.toString()) || 0
      }
    });
    setShowDetailModal(false);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm">
      {/* 顶部简洁标题区 */}
      <div className="px-5 pt-6 pb-4">
        <div className="flex flex-col">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-medium text-slate-700">本月预算</h1>
            {/* 状态提示 */}
            <div className={`px-3 py-1 rounded-full ${getStatusBgColor()}`}>
              <span className={`text-xs font-medium ${getStatusTextColor()}`}>
                {budget.remaining < 0 
                  ? <span><span className="text-lg">💥</span> 已超支</span> 
                  : usagePercentage > 80 
                    ? <span><span className="text-lg">🍜</span> 预算紧张</span> 
                    : usagePercentage > 50 
                      ? <span><span className="text-lg">🍖</span> 预算过半</span> 
                      : <span><span className="text-lg">🍲</span> 预算充足</span>}
              </span>
            </div>
          </div>
          <p className="text-sm text-slate-400 mt-1">{new Date().getFullYear()}年{new Date().getMonth() + 1}月</p>
        </div>
      </div>

      {/* 环形图和两侧数据 */}
      <div className="px-5 pb-6">
        <div className="flex items-center justify-between">
          {/* 左侧：已支出 */}
          <div className="flex flex-col items-center">
            <p className="text-sm text-slate-500 mb-1">已支出</p>
            <p className="text-base font-medium text-slate-700 tracking-wide">
              <span className="text-sm">¥</span>{Math.round(animatedValues.spent)}
            </p>
          </div>

          {/* 中央：环形图 */}
          <div className="relative cursor-pointer" onClick={() => setShowDetailModal(true)}>
            {/* SVG 环形图 */}
            <svg 
              width="200" 
              height="200" 
              className="relative transform -rotate-90"
            >
              {/* 背景圆环 */}
              <circle
                cx="100"
                cy="100"
                r={radius}
                fill="none"
                stroke="#f1f5f9"
                strokeWidth={strokeWidth}
              />
              {/* 进度圆环 */}
              <circle
                cx="100"
                cy="100"
                r={radius}
                fill="none"
                stroke={getStatusColor()}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                style={{
                  transition: 'stroke-dashoffset 0.8s ease-out'
                }}
              />
            </svg>
            
            {/* 中心文字 */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-sm text-slate-400 mb-1">剩余预算</span>
              <span className={`text-3xl font-bold ${getStatusTextColor()} tracking-wide`}>
                <span className="font-normal text-lg">¥</span>{Math.round(animatedValues.remaining)}
              </span>
              <span className="text-xs text-slate-400 mt-1">
                已用 {animatedPercentage.toFixed(0)}%
              </span>
            </div>
          </div>

          {/* 右侧：剩余日均 */}
          <div className="flex flex-col items-center">
            <p className="text-sm text-slate-500 mb-1">剩余日均</p>
            <p className="text-base font-medium text-slate-700 tracking-wide">
              <span className="text-sm">¥</span>{Math.round(animatedValues.dailyRemaining)}
            </p>
          </div>
        </div>

      </div>

      {/* 预算详情弹窗 */}
      {showDetailModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-11/12 max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-slate-800">预算详情</h3>
              <button 
                className="text-slate-400 hover:text-slate-600"
                onClick={handleCloseModal}
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 总预算 */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium text-slate-600">总预算</label>
                <span className="text-lg font-semibold text-slate-800">
                  ¥{totalBudget.toFixed(2)}
                </span>
              </div>
              <p className="text-xs text-slate-400">由基础预算和上月结余计算得出</p>
            </div>

            {/* 本月基础预算 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-600 mb-2">本月基础预算</label>
              <input
                type="number"
                value={editMode.monthlyAmount}
                onChange={(e) => setEditMode(prev => ({
                  ...prev,
                  monthlyAmount: parseFloat(e.target.value) || 0
                }))}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-300"
                placeholder="输入基础预算"
              />
            </div>

            {/* 上月结余 */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-600 mb-2">上月结余</label>
              <input
                type="number"
                value={editMode.lastMonthBalance}
                onChange={(e) => setEditMode(prev => ({
                  ...prev,
                  lastMonthBalance: parseFloat(e.target.value) || 0
                }))}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-300"
                placeholder="输入上月结余"
              />
              <p className="text-xs text-slate-400 mt-1">可输入负数表示上月超支</p>
            </div>

            {/* 按钮 */}
            <div className="flex gap-3">
              <button
                className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50"
                onClick={handleCloseModal}
              >
                取消
              </button>
              <button
                className="flex-1 px-4 py-3 rounded-xl bg-slate-800 text-white font-medium hover:bg-slate-700"
                onClick={handleSaveBudget}
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BudgetOverview;
