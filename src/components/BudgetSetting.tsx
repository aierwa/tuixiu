import React, { useState, useEffect } from 'react';
import { useBudget } from '../contexts/BudgetContext';
import { supabase } from '../lib/supabase';
import type { Bookkeeper } from '../types';
import { setStoredBookkeeper } from '../utils/bookkeeperStorage';

const BudgetSetting: React.FC = () => {
  const { state, dispatch } = useBudget();
  const [budgetAmount, setBudgetAmount] = useState(state.budget.monthlyAmount.toString());
  const [isEditing, setIsEditing] = useState(false);
  const [bookkeepers, setBookkeepers] = useState<Bookkeeper[]>([]);
  const [bkSelectId, setBkSelectId] = useState(state.currentBookkeeper?.id || '');
  const [bkSaving, setBkSaving] = useState(false);

  useEffect(() => {
    setBudgetAmount(state.budget.monthlyAmount.toString());
  }, [state.budget.monthlyAmount]);

  useEffect(() => {
    setBkSelectId(state.currentBookkeeper?.id || '');
  }, [state.currentBookkeeper?.id]);

  useEffect(() => {
    if (!state.ledger?.id) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('bookkeepers')
        .select('id, ledger_id, name, created_at')
        .eq('ledger_id', state.ledger!.id)
        .order('name', { ascending: true });
      if (!cancelled && !error && data) {
        setBookkeepers(data as Bookkeeper[]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [state.ledger?.id]);

  const handleSaveBookkeeper = () => {
    if (!state.ledger) return;
    const bk = bookkeepers.find((b) => b.id === bkSelectId);
    if (!bk) {
      alert('请选择记账人');
      return;
    }
    setBkSaving(true);
    try {
      setStoredBookkeeper(state.ledger.id, { id: bk.id, name: bk.name });
      dispatch({ type: 'SET_BOOKKEEPER', payload: { id: bk.id, name: bk.name } });
    } finally {
      setBkSaving(false);
    }
  };

  const handleSave = async () => {
    const amount = parseFloat(budgetAmount);
    if (!isNaN(amount) && amount > 0 && state.ledger) {
      try {
        // 计算剩余预算和已支出金额
        const spent = state.budget.spent;
        const remaining = amount + state.budget.lastMonthBalance - spent;

        // 检查是否已有预算记录
        const { data: existingBudget, error: fetchError } = await supabase
          .from('budgets')
          .select('id')
          .eq('ledger_id', state.ledger.id)
          .eq('current_month', state.budget.currentMonth)
          .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
          throw fetchError;
        }

        if (existingBudget) {
          // 更新现有预算
          await supabase
            .from('budgets')
            .update({
              monthly_amount: amount,
              remaining,
              spent
            })
            .eq('id', existingBudget.id);
        } else {
          // 创建新预算
          await supabase
            .from('budgets')
            .insert({
              ledger_id: state.ledger.id,
              monthly_amount: amount,
              current_month: state.budget.currentMonth,
              remaining,
              spent,
              last_month_balance: state.budget.lastMonthBalance
            });
        }

        // 更新本地状态
        dispatch({ type: 'SET_BUDGET', payload: { monthlyAmount: amount, lastMonthBalance: state.budget.lastMonthBalance } });
        setIsEditing(false);
      } catch (error) {
        console.error('设置预算失败:', error);
        alert('设置预算失败，请重试');
      }
    }
  };

  return (
    <div className="space-y-6">
    <div className="bg-white rounded-xl shadow-md p-6 transition-all duration-300 hover:shadow-lg">
      <h2 className="text-xl font-bold mb-4 text-gray-800">记账人</h2>
      <p className="text-sm text-gray-600 mb-3">切换后新添加的支出将记在该身份下。</p>
      <div className="flex flex-col gap-3">
        <select
          value={bkSelectId}
          onChange={(e) => setBkSelectId(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 bg-white"
        >
          <option value="">请选择</option>
          {bookkeepers.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleSaveBookkeeper}
          disabled={bkSaving || !bkSelectId}
          className="w-full sm:w-auto px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {bkSaving ? '保存中…' : '保存记账人'}
        </button>
      </div>
    </div>

    <div className="bg-white rounded-xl shadow-md p-6 transition-all duration-300 hover:shadow-lg">
      <h2 className="text-xl font-bold mb-4 text-gray-800">预算设置</h2>
      {isEditing ? (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <input
            type="number"
            value={budgetAmount}
            onChange={(e) => setBudgetAmount(e.target.value)}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300"
            min="0"
            step="100"
            placeholder="请输入月度预算"
          />
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={handleSave}
              className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              保存
            </button>
            <button
              onClick={() => {
                setIsEditing(false);
                setBudgetAmount(state.budget.monthlyAmount.toString());
              }}
              className="flex-1 px-4 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-gray-400"
            >
              取消
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="text-sm text-gray-600">月度预算</p>
            <p className="text-2xl font-bold text-gray-800">¥{state.budget.monthlyAmount.toFixed(2)}</p>
          </div>
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            修改
          </button>
        </div>
      )}
    </div>
    </div>
  );
};

export default BudgetSetting;
