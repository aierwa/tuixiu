import React, { useState, useEffect } from 'react';
import { useBudget } from '../contexts/BudgetContext';
import { getCurrentDate } from '../utils/dateUtils';
import { supabase } from '../lib/supabase';
import { getTopFrequencyRecords, addFrequencyRecord, FrequencyRecord } from '../utils/frequencyUtils';

interface ExpenseFormProps {
  onClose: () => void;
}

const ExpenseForm: React.FC<ExpenseFormProps> = ({ onClose }) => {
  const { state, dispatch } = useBudget();
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(getCurrentDate());
  const [tag, setTag] = useState(state.tags[0]?.id || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [frequencyRecords, setFrequencyRecords] = useState<FrequencyRecord[]>([]);

  // 加载高频记录
  useEffect(() => {
    const records = getTopFrequencyRecords();
    setFrequencyRecords(records);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || !tag || !state.ledger) return;
    
    const expenseAmount = parseFloat(amount);
    if (isNaN(expenseAmount) || expenseAmount <= 0) return;

    setIsSubmitting(true);
    
    try {
      // 提交到Supabase
      const { data, error } = await supabase
        .from('expenses')
        .insert({
          ledger_id: state.ledger.id,
          amount: expenseAmount,
          date,
          tag: state.tags.find(t => t.id === tag)?.name || '',
          description: ''
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      // 提交支出记录到本地状态
      dispatch({
        type: 'ADD_EXPENSE',
        payload: data
      });

      // 添加高频记录
      const selectedTag = state.tags.find(t => t.id === tag);
      if (selectedTag) {
        addFrequencyRecord(selectedTag.id, selectedTag.name, selectedTag.color, expenseAmount);
      }

      // 重置表单并关闭弹窗
      setAmount('');
      setDate(getCurrentDate());
      setTag(state.tags[0]?.id || '');
      onClose();
    } catch (error) {
      console.error('添加支出失败:', error);
      alert('添加支出失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
          金额
        </label>
        <input
          type="number"
          id="amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full px-4 py-3.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300 text-lg"
          placeholder="请输入金额"
          min="0.01"
          step="0.01"
          required
        />
      </div>
      
      {/* 高频填写记录 */}
      {frequencyRecords.length > 0 && (
        <div className="mt-3">
          <p className="text-xs text-gray-500 mb-2">快捷填写</p>
          <div className="flex flex-wrap gap-2">
            {frequencyRecords.map((record, index) => (
              <button
                key={index}
                type="button"
                onClick={() => {
                  setAmount(record.amount.toString());
                  setTag(record.tagId);
                }}
                className="px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 flex items-center gap-2"
                style={{ backgroundColor: record.tagColor }}
              >
                <span>{record.tagName}</span>
                <span className="text-gray-700">¥{record.amount.toFixed(2)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      
      <div>
        <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
          日期
        </label>
        <input
          type="date"
          id="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full px-4 py-3.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300 text-lg"
          required
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          标签
        </label>
        <div className="grid grid-cols-2 gap-2">
          {state.tags.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTag(t.id)}
              className={`px-4 py-2 rounded-lg transition-all duration-300 border-2 ${tag === t.id ? 'border-blue-500' : 'border-transparent'}`}
              style={{ backgroundColor: t.color }}
            >
              <span>{t.name}</span>
            </button>
          ))}
        </div>
      </div>
      
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full px-4 py-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed text-lg font-medium"
      >
        {isSubmitting ? '添加中...' : '添加支出'}
      </button>
    </form>
  );
};

export default ExpenseForm;
