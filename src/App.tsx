import { useState, useEffect, useRef } from 'react';
import { BudgetProvider, useBudget } from './contexts/BudgetContext';
import BudgetOverview from './components/BudgetOverview';
import BudgetSetting from './components/BudgetSetting';
import ExpenseForm from './components/ExpenseForm';
import ExpenseList from './components/ExpenseList';
import CalendarView from './components/CalendarView';
import TagManager from './components/TagManager';
import LedgerAuth from './components/LedgerAuth';
import './App.css';

function AppContent() {
  const [activeTab, setActiveTab] = useState('overview');
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const { state } = useBudget();

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            <BudgetOverview />
            <CalendarView />
          </div>
        );
      case 'tags':
        return <TagManager />;
      case 'expenses':
        return <ExpenseList />;
      case 'settings':
        return (
          <div className="space-y-6">
            <BudgetSetting />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4 pb-20">
      <div className="max-w-md mx-auto min-h-screen flex flex-col">
        <header className="text-center mb-6">
          <h1 className="text-2xl font-medium text-gray-800 font-sans">好好记账，按时<span className="bg-blue-100 text-blue-700 px-2 py-0.5 font-semibold">退休</span></h1>
        </header>
        
        <main className="flex-1">
          {renderContent()}
        </main>

        {/* 底部导航 */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 flex justify-around items-center z-10 max-w-md mx-auto">
          <button 
            className={`flex flex-col items-center py-2 px-4 ${activeTab === 'overview' ? 'text-blue-600' : 'text-gray-500'}`}
            onClick={() => setActiveTab('overview')}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-xs mt-1">首页</span>
          </button>
          <button 
            className={`flex flex-col items-center py-2 px-4 ${activeTab === 'expenses' ? 'text-blue-600' : 'text-gray-500'}`}
            onClick={() => setActiveTab('expenses')}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <span className="text-xs mt-1">支出</span>
          </button>
          <button 
            className="flex flex-col items-center py-2 px-4"
            onClick={() => setShowExpenseForm(true)}
          >
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center -mt-6">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <span className="text-xs mt-1 text-gray-500">添加</span>
          </button>
          <button 
            className={`flex flex-col items-center py-2 px-4 ${activeTab === 'tags' ? 'text-blue-600' : 'text-gray-500'}`}
            onClick={() => setActiveTab('tags')}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            <span className="text-xs mt-1">标签</span>
          </button>
          <button 
            className={`flex flex-col items-center py-2 px-4 ${activeTab === 'settings' ? 'text-blue-600' : 'text-gray-500'}`}
            onClick={() => setActiveTab('settings')}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-xs mt-1">设置</span>
            </button>
          </div>

          {/* 支出表单弹窗 */}
          {showExpenseForm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white rounded-2xl p-6 w-11/12 max-w-md">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-semibold text-gray-800">添加支出</h3>
                  <button 
                    className="text-gray-400 hover:text-gray-600"
                    onClick={() => setShowExpenseForm(false)}
                  >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <ExpenseForm onClose={() => setShowExpenseForm(false)} />
              </div>
            </div>
          )}
        </div>
      </div>
    );
}

function App() {
  return (
    <BudgetProvider>
      <AppWithAuth />
    </BudgetProvider>
  );
}

function AppWithAuth() {
  const { state, checkAuth } = useBudget();
  const [loading, setLoading] = useState(true);
  const initialized = useRef(false);

  // 应用启动时检查认证状态
  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      const checkAuthentication = async () => {
        setLoading(true);
        try {
          await checkAuth();
        } catch (error) {
          console.error('Auth check failed:', error);
        } finally {
          setLoading(false);
        }
      };

      checkAuthentication();
    }
  }, [checkAuth]);

  const handleAuthSuccess = async () => {
    // 认证成功后，手动调用 checkAuth 来更新认证状态并加载数据
    setLoading(true);
    try {
      await checkAuth();
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    state.isAuthenticated ? (
      <AppContent />
    ) : (
      <LedgerAuth onSuccess={handleAuthSuccess} />
    )
  );
}

export default App;
