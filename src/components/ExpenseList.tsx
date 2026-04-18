import React, { useState } from 'react';
import { useBudget } from '../contexts/BudgetContext';
import { startOfMonth, endOfMonth, format } from 'date-fns';


const ExpenseList: React.FC = () => {
  const { state } = useBudget();
  
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

  // 按标签分组：全额与预算外金额（总支出含预算外；小字展示预算外部分）
  const { expensesByTag, outsideByTag } = filteredExpenses.reduce(
    (acc, expense) => {
      if (!acc.expensesByTag[expense.tag]) acc.expensesByTag[expense.tag] = 0;
      acc.expensesByTag[expense.tag] += expense.amount;
      if (expense.outside_budget) {
        if (!acc.outsideByTag[expense.tag]) acc.outsideByTag[expense.tag] = 0;
        acc.outsideByTag[expense.tag] += expense.amount;
      }
      return acc;
    },
    {
      expensesByTag: {} as Record<string, number>,
      outsideByTag: {} as Record<string, number>
    }
  );

  // 转换为数组并按金额降序排序
  const sortedTagExpenses = Object.entries(expensesByTag)
    .map(([tag, amount]) => ({ tag, amount }))
    .sort((a, b) => b.amount - a.amount);

  // 计算总支出（含预算外）
  const totalExpense = Object.values(expensesByTag).reduce((sum, amount) => sum + amount, 0);
  const totalOutsideExpense = Object.values(outsideByTag).reduce((sum, n) => sum + n, 0);

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
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-baseline gap-3">
              <div className="min-w-0 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
                <span className="text-lg font-medium text-gray-800">总支出</span>
                {totalOutsideExpense > 0 && (
                  <span className="text-xs text-gray-500 font-normal">含预算外¥{Math.round(totalOutsideExpense)}</span>
                )}
              </div>
              <span className="text-2xl font-bold text-gray-800 shrink-0 tabular-nums">
                <span className="font-normal text-lg">¥</span>{Math.round(totalExpense)}
              </span>
            </div>
          </div>
          
          {/* 按标签分组的支出 */}
          <div className="space-y-2">
            {sortedTagExpenses.map(({ tag, amount }) => {
              // 查找标签对应的颜色
              const tagInfo = state.tags.find(t => t.name === tag);
              const tagColor = tagInfo?.color || '#E5E7EB';
              // 计算百分比
              const percentage = totalExpense > 0 ? (amount / totalExpense) * 100 : 0;
              const outsideForTag = outsideByTag[tag] ?? 0;
              
              return (
                <div 
                  key={tag} 
                  className="flex items-center justify-between p-3 rounded-lg transition-all duration-300 relative overflow-hidden"
                  style={{ 
                    background: `linear-gradient(to right, ${tagColor} ${percentage}%, #F3F4F6 ${percentage}%)`
                  }}
                >
                  <div className="min-w-0 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 relative z-10 pr-2">
                    <span className="font-medium text-gray-800">{tag}</span>
                    {outsideForTag > 0 && (
                      <span className="text-[11px] text-gray-700 font-normal">含预算外¥{Math.round(outsideForTag)}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3 shrink-0 relative z-10 tabular-nums">
                    <span className="font-bold text-gray-800 whitespace-nowrap"><span className="font-normal text-sm">¥</span>{Math.round(amount)}</span>
                    <span className="text-sm text-gray-600 whitespace-nowrap">
                      ({Math.round(percentage)}%)
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
