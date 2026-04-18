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
  const [note, setNote] = useState('');
  const [date, setDate] = useState(getCurrentDate());
  const [tag, setTag] = useState(state.tags[0]?.id || '');
  const [outsideBudget, setOutsideBudget] = useState(false);
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
    if (!state.currentBookkeeper) {
      alert('请先在设置中选择记账人');
      return;
    }
    
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
          description: note.trim() || null,
          bookkeeper_id: state.currentBookkeeper?.id ?? null,
          outside_budget: outsideBudget
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      // 提交支出记录到本地状态
      dispatch({
        type: 'ADD_EXPENSE',
        payload: {
          ...data,
          bookkeeper_name: state.currentBookkeeper?.name ?? null
        }
      });

      // 添加高频记录
      const selectedTag = state.tags.find(t => t.id === tag);
      if (selectedTag) {
        addFrequencyRecord(selectedTag.id, selectedTag.name, selectedTag.color, expenseAmount);
      }

      // 重置表单并关闭弹窗
      setAmount('');
      setNote('');
      setDate(getCurrentDate());
      setTag(state.tags[0]?.id || '');
      setOutsideBudget(false);
      onClose();
    } catch (error) {
      console.error('添加支出失败:', error);
      alert('添加支出失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  const dayOfMonth =
    date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? parseInt(date.slice(8, 10), 10) : null;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <div className="flex gap-2 items-stretch">
          <input
            type="number"
            id="amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="flex-1 min-w-0 px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300 text-lg"
            placeholder="请输入金额"
            min="0.01"
            step="0.01"
            required
          />
          <div className="relative shrink-0 w-11 h-11 rounded-lg border border-gray-300 bg-white shadow-sm overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-0 hover:border-gray-400 transition-colors">
            <input
              type="date"
              id="expense-date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              aria-label="选择日期"
              className="absolute inset-0 z-20 h-full w-full cursor-pointer opacity-0"
              style={{ fontSize: 16 }}
            />
            <div
              className="pointer-events-none absolute inset-0 flex items-center justify-center"
              aria-hidden
            >
              <svg
                className="absolute left-1 right-1 top-1.5 h-7 w-7 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.75}
                aria-hidden
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="relative z-10 mt-2.5 text-sm font-bold text-gray-800 tabular-nums leading-none">
                {dayOfMonth ?? '—'}
              </span>
            </div>
          </div>
        </div>
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
                className="px-2 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 flex items-center gap-1.5"
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
        <label htmlFor="expense-note" className="block text-xs text-gray-500 mb-0.5">
          备注
        </label>
        <textarea
          id="expense-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="选填"
          maxLength={500}
          rows={1}
          className="w-full min-h-[1.75rem] max-h-16 px-2 py-1 text-xs leading-tight border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none placeholder:text-gray-400 overflow-y-auto"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          标签
        </label>
        <div className="grid grid-cols-3 gap-1.5">
          {state.tags.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTag(t.id)}
              className={`min-h-0 min-w-0 px-2 py-1.5 rounded-lg text-sm transition-all duration-300 border-2 ${tag === t.id ? 'border-indigo-500' : 'border-transparent'}`}
              style={{ backgroundColor: t.color }}
            >
              <span className="block truncate text-center leading-tight">{t.name}</span>
            </button>
          ))}
        </div>
      </div>

      <label className="flex items-center gap-2.5 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={outsideBudget}
          onChange={(e) => setOutsideBudget(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
        />
        <span className="text-sm text-gray-700">预算外支出（不计入本月预算）</span>
      </label>
      
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full px-4 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-gray-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-lg font-medium"
      >
        {isSubmitting ? '添加中...' : '添加支出'}
      </button>
    </form>
  );
};

export default ExpenseForm;
