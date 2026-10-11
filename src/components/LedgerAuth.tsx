import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import bcrypt from 'bcryptjs';

interface LedgerAuthProps {
  onSuccess: () => void;
}

const LedgerAuth: React.FC<LedgerAuthProps> = ({ onSuccess }) => {
  const [ledgerName, setLedgerName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    // 只忽略名称前后空白，不改变大小写、内部字符或密码。
    const normalizedLedgerName = ledgerName.trim();
    if (!normalizedLedgerName) {
      setError('请输入账本名称');
      return;
    }
    setLoading(true);

    try {
      // 查找账本（包含密码哈希用于验证）
      const { data: ledgerWithHash, error: fetchError } = await supabase
        .from('ledgers')
        .select('*')
        .eq('name', normalizedLedgerName)
        .maybeSingle();

      // 查询失败不代表账本不存在；只有成功返回空结果才提示名称有误。
      if (fetchError) throw fetchError;
      if (!ledgerWithHash) {
        setError('账本不存在，请检查名称及大小写');
        return;
      }

      // 验证密码
      const isPasswordValid = await bcrypt.compare(password, ledgerWithHash.password_hash);
      if (!isPasswordValid) {
        setError('密码错误');
        return;
      }

      // 创建不包含密码哈希的账本对象
      const { password_hash, ...ledgerWithoutHash } = ledgerWithHash;

      // 存储验证信息到本地存储，有效期一年
      const authData = {
        ledgerId: ledgerWithoutHash.id,
        ledgerName: ledgerWithoutHash.name,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      };
      localStorage.setItem('budget-app-auth', JSON.stringify(authData));

      onSuccess();
    } catch {
      setError('暂时无法完成登录验证，请检查网络后重试；若持续失败，请联系维护者。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full">
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">记账应用</h2>
        <h3 className="text-lg text-center text-gray-600 mb-8">请输入账本信息</h3>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="ledgerName" className="block text-gray-700 text-sm font-bold mb-2">
              账本名称
            </label>
            <input
              type="text"
              id="ledgerName"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              autoComplete="username"
              value={ledgerName}
              onChange={(e) => setLedgerName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="请输入账本名称"
            />
          </div>

          <div className="mb-6">
            <label htmlFor="password" className="block text-gray-700 text-sm font-bold mb-2">
              密码
            </label>
            <input
              type="password"
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="请输入密码"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-md transition duration-200 ease-in-out disabled:opacity-50"
          >
            {loading ? '验证中...' : '登录'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LedgerAuth;