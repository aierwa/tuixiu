import React, { useState } from 'react';
import { useBudget } from '../contexts/BudgetContext';
import { supabase } from '../lib/supabase';

const BudgetSetting: React.FC = () => {
  const { state, dispatch } = useBudget();
  const [budgetAmount, setBudgetAmount] = useState(state.budget.monthlyAmount.toString());
  const [isEditing, setIsEditing] = useState(false);

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
        dispatch({ type: 'SET_BUDGET', payload: amount });
        setIsEditing(false);
      } catch (error) {
        console.error('设置预算失败:', error);
        alert('设置预算失败，请重试');
      }
    }
  };

  return (
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
  );
};

export default BudgetSetting;
