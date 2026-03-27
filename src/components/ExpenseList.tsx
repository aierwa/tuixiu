import React, { useState } from 'react';
import { useBudget } from '../contexts/BudgetContext';
import { startOfMonth, endOfMonth, format, parseISO } from 'date-fns';
import { supabase } from '../lib/supabase';

const ExpenseList: React.FC = () => {
  const { state, dispatch } = useBudget();
  
  // 设置默认日期范围为当月
  const today = new Date();
  const defaultStartDate = format(startOfMonth(today), 'yyyy-MM-dd');
  const defaultEndDate = format(endOfMonth(today), 'yyyy-MM-dd');
  
  // 日期范围状态
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);

  // 过滤出日期范围内的支出记录
  const filteredExpenses = state.expenses.filter(expense => {
    const expenseDate = new Date(expense.date);
    return expenseDate >= new Date(startDate) && expenseDate <= new Date(endDate);
  });

  // 按标签分组计算支出金额
  const expensesByTag = filteredExpenses.reduce((acc, expense) => {
    if (!acc[expense.tag]) {
      acc[expense.tag] = 0;
    }
    acc[expense.tag] += expense.amount;
    return acc;
  }, {} as Record<string, number>);

  // 转换为数组并按金额降序排序
  const sortedTagExpenses = Object.entries(expensesByTag)
    .map(([tag, amount]) => ({ tag, amount }))
    .sort((a, b) => b.amount - a.amount);

  // 计算总支出
  const totalExpense = Object.values(expensesByTag).reduce((sum, amount) => sum + amount, 0);

  const handleDelete = async (id: string) => {
    if (window.confirm('确定要删除这条支出记录吗？')) {
      try {
        console.log('删除支出记录:', { id, ledgerId: state.ledger?.id, hasLedger: !!state.ledger });
        
        if (!state.ledger || !state.ledger.id) {
          console.error('账本信息不存在');
          alert('账本信息不存在，无法删除支出记录');
          return;
        }
        
        // 从Supabase中删除
        const { error } = await supabase
          .from('expenses')
          .delete()
          .eq('id', id)
          .eq('ledger_id', state.ledger.id);

        if (error) {
          console.error('Supabase删除错误:', error);
          throw error;
        }

        // 从本地状态中删除
        dispatch({ type: 'DELETE_EXPENSE', payload: id });
      } catch (error) {
        console.error('删除支出失败:', error);
        alert('删除支出失败，请重试');
      }
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-6 transition-all duration-300 hover:shadow-lg">
      <div className="flex items-center justify-center mb-6 gap-2">
        <input
          type="month"
          value={startDate.substring(0, 7)}
          onChange={(e) => setStartDate(`${e.target.value}-01`)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <span className="text-gray-600">至</span>
        <input
          type="month"
          value={endDate.substring(0, 7)}
          onChange={(e) => {
            // 获取所选月份的最后一天
            const year = parseInt(e.target.value.substring(0, 4));
            const month = parseInt(e.target.value.substring(5, 7)) - 1;
            const lastDay = new Date(year, month + 1, 0).getDate();
            setEndDate(`${e.target.value}-${lastDay.toString().padStart(2, '0')}`);
          }}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      
      {sortedTagExpenses.length === 0 ? (
        <div className="text-center text-gray-600 py-12">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-4 text-gray-400">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p>所选期间暂无支出记录</p>
          <p className="text-sm mt-2">添加您的第一笔支出吧！</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* 总支出 */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-lg font-medium text-gray-800">总支出</span>
              <span className="text-2xl font-bold text-gray-800">¥{Math.round(totalExpense)}</span>
            </div>
          </div>
          
          {/* 按标签分组的支出 */}
          <div className="space-y-3">
            {sortedTagExpenses.map(({ tag, amount }) => {
              // 查找标签对应的颜色
              const tagInfo = state.tags.find(t => t.name === tag);
              const tagColor = tagInfo?.color || '#E5E7EB';
              
              return (
                <div key={tag} className="flex items-center justify-between p-4 rounded-lg transition-all duration-300" style={{ backgroundColor: tagColor }}>
                  <div className="font-medium text-gray-800">{tag}</div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-gray-800">¥{Math.round(amount)}</span>
                    <span className="text-sm text-gray-600">
                      ({Math.round((amount / totalExpense) * 100)}%)
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseList;
