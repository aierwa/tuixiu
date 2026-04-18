import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Bookkeeper } from '../types';
import { setStoredBookkeeper } from '../utils/bookkeeperStorage';

interface BookkeeperPickerProps {
  ledgerId: string;
  onSelected: (bookkeeper: { id: string; name: string }) => void;
}

const BookkeeperPicker: React.FC<BookkeeperPickerProps> = ({ ledgerId, onSelected }) => {
  const [list, setList] = useState<Bookkeeper[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const { data, error: qErr } = await supabase
          .from('bookkeepers')
          .select('id, ledger_id, name, created_at')
          .eq('ledger_id', ledgerId)
          .order('name', { ascending: true });

        if (qErr) throw qErr;
        if (!cancelled) {
          setList((data as Bookkeeper[]) || []);
          if (data && data.length === 1) {
            setSelectedId(data[0].id);
          }
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : '加载记账人失败');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [ledgerId]);

  const handleConfirm = () => {
    const bk = list.find((b) => b.id === selectedId);
    if (!bk) {
      setError('请选择记账人');
      return;
    }
    setStoredBookkeeper(ledgerId, { id: bk.id, name: bk.name });
    onSelected({ id: bk.id, name: bk.name });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full">
        <h2 className="text-xl font-bold text-center text-gray-800 mb-2">选择记账人</h2>
        <p className="text-sm text-center text-gray-500 mb-6">进入账本前请选择本次记账使用的身份</p>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mb-4 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center text-gray-600 py-8">加载中...</div>
        ) : list.length === 0 ? (
          <p className="text-center text-gray-600 text-sm mb-6">
            当前账本暂无记账人数据。请在 Supabase 的 <code className="text-xs bg-gray-100 px-1 rounded">bookkeepers</code> 表中为该账本添加记录后再试。
          </p>
        ) : (
          <>
            <label htmlFor="bookkeeper" className="block text-gray-700 text-sm font-medium mb-2">
              记账人
            </label>
            <select
              id="bookkeeper"
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="w-full px-3 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 bg-white mb-6"
            >
              <option value="">请选择</option>
              {list.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!selectedId}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-md transition duration-200 ease-in-out disabled:opacity-50"
            >
              进入应用
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default BookkeeperPicker;
