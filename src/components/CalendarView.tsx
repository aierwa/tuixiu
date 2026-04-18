import React, { useState } from 'react';
import { useBudget } from '../contexts/BudgetContext';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, format, addDays, isSameMonth, isSameDay, parseISO, addMonths, subMonths } from 'date-fns';
import { supabase } from '../lib/supabase';

const CalendarView: React.FC = () => {
  const { state, dispatch } = useBudget();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

  // 切换到上一个月
  const prevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  // 切换到下一个月
  const nextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  // 获取当前月份的日期范围
  const today = new Date();
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  // 生成日历日期数组
  const calendarDays: Date[] = [];
  let currentDay = calendarStart;
  while (currentDay <= calendarEnd) {
    calendarDays.push(currentDay);
    currentDay = addDays(currentDay, 1);
  }

  // 计算某天的支出总额
  const getDayExpense = (date: Date): number => {
    const dateString = format(date, 'yyyy-MM-dd');
    return state.expenses
      .filter(expense => expense.date === dateString)
      .reduce((total, expense) => total + expense.amount, 0);
  };

  // 获取某天的支出记录
  const getDayExpenses = (date: Date) => {
    const dateString = format(date, 'yyyy-MM-dd');
    return state.expenses.filter(expense => expense.date === dateString);
  };

  // 处理日期点击
  const handleDateClick = (date: Date) => {
    const dateString = format(date, 'yyyy-MM-dd');
    setSelectedDate(dateString);
    setShowModal(true);
  };

  // 关闭模态框
  const closeModal = () => {
    setShowModal(false);
    setSelectedDate(null);
  };

  // 删除支出记录
  const handleDeleteExpense = async (id: string) => {
    if (window.confirm('确定要删除这条支出记录吗？')) {
      try {
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
      <div className="flex items-center justify-between mb-6">
        <button 
          onClick={prevMonth}
          className="p-2 rounded-full hover:bg-gray-100 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
        <h2 className="text-lg font-medium text-gray-700">{format(currentMonth, 'M月')}</h2>
        <button 
          onClick={nextMonth}
          className="p-2 rounded-full hover:bg-gray-100 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>
      </div>
      
      {/* 星期标题 */}
      <div className="grid grid-cols-7 mb-2">
        {['日', '一', '二', '三', '四', '五', '六'].map((day, index) => (
          <div key={index} className="text-center text-sm font-medium text-gray-600 py-2">
            {day}
          </div>
        ))}
      </div>
      
      {/* 日历网格 */}
      <div className="grid grid-cols-7 gap-0.5">
        {calendarDays.map((date, index) => {
          const dayExpense = getDayExpense(date);
          const isCurrentMonth = isSameMonth(date, currentMonth);
          const isToday = isSameDay(date, today);
          
          return (
            <div
              key={index}
              className={`
                pt-0.5 pb-1 px-1.5 rounded-lg transition-all duration-300
                ${isCurrentMonth ? 'bg-white' : 'bg-gray-50'}
                ${isToday ? 'ring-2 ring-blue-500' : ''}
                ${isCurrentMonth ? 'cursor-pointer hover:bg-blue-50' : ''}
              `}
              onClick={() => isCurrentMonth && handleDateClick(date)}
            >
              <div className="text-center leading-tight">
                <span className={`text-xs ${isCurrentMonth ? 'text-gray-800' : 'text-gray-400'}`}>
                  {format(date, 'd')}
                </span>
                {isCurrentMonth && dayExpense > 0 && (
                  <div className="text-[10px] text-red-600 font-medium leading-tight">
                    <span className="text-[8px]">¥</span>{Math.round(dayExpense)}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      {/* 支出明细模态框 */}
      {showModal && selectedDate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-800">
                {format(parseISO(selectedDate!), 'M月d日')} 支出明细
                <span className="ml-2 text-sm text-gray-500">
                  （合计 ¥{getDayExpense(parseISO(selectedDate!)).toFixed(2)}）
                </span>
              </h3>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            
            {getDayExpenses(parseISO(selectedDate)).length === 0 ? (
              <p className="text-center text-gray-600 py-4">
                当天无支出记录
              </p>
            ) : (
              <div className="space-y-3">
                {getDayExpenses(parseISO(selectedDate)).map((expense) => {
                  // 查找标签对应的颜色
                  const tagInfo = state.tags.find(t => t.name === expense.tag);
                  const tagColor = tagInfo?.color || '#E5E7EB';
                  
                  return (
                    <div key={expense.id} className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: tagColor }}>
                      <div className="min-w-0 flex-1 pr-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-gray-800">{expense.tag}</span>
                          {expense.bookkeeper_name && (
                            <span className="text-[11px] px-1.5 py-0.5 rounded bg-white/70 text-gray-700 border border-gray-200/80 shrink-0">
                              {expense.bookkeeper_name}
                            </span>
                          )}
                        </div>
                        {expense.description && (
                          <div className="text-xs text-gray-500">{expense.description}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="font-medium text-gray-800">
                        <span className="text-sm">¥</span>{expense.amount.toFixed(2)}
                      </div>
                        <button
                          onClick={() => handleDeleteExpense(expense.id)}
                          className="text-gray-400 hover:text-red-500 transition-all duration-300 p-1 rounded-full hover:bg-red-50"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18" />
                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            
            <button
              onClick={closeModal}
              className="w-full mt-6 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
            >
              关闭
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarView;
