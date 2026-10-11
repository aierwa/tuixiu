import React, { createContext, useContext, useReducer, useEffect, useState, useCallback, useRef } from 'react';
import { AppState, Action, Budget, Expense, Tag } from '../types';
import { supabase } from '../lib/supabase';
import { getStoredBookkeeper } from '../utils/bookkeeperStorage';
import { formatMonth, getCurrentMonth } from '../utils/dateUtils';
import { 
  calculateMonthlySpent, 
  calculateEffectiveBudget,
  calculateRemainingBudget,
  calculateNextHistoricalBalance,
  updateBudgetForNewMonth, 
  shouldUpdateBudget
} from '../utils/budgetUtils';

// 初始状态
const initialState: AppState = {
  budget: {
    monthlyAmount: 0,
    currentMonth: '',
    remaining: 0,
    spent: 0,
    lastMonthBalance: 0,
    historicalBalance: 0
  },
  expenses: [],
  tags: [],
  isAuthenticated: false,
  currentBookkeeper: null
};

// Reducer 函数
const budgetReducer = (state: AppState, action: Action): AppState => {
  switch (action.type) {
    case 'SET_BUDGET': {
      const nextBudget: Budget = {
        ...state.budget,
        monthlyAmount: action.payload.monthlyAmount,
        lastMonthBalance: action.payload.lastMonthBalance,
        historicalBalance: action.payload.historicalBalance,
        currentMonth: action.payload.currentMonth ?? getCurrentMonth(),
        spent: action.payload.spent ?? state.budget.spent,
        remaining: 0
      };

      return {
        ...state,
        budget: {
          ...nextBudget,
          // 从数据库加载时保留已核算的 remaining；手动修改预算时重新计算。
          remaining: action.payload.remaining ?? calculateRemainingBudget(nextBudget, nextBudget.spent)
        }
      };
    }

    case 'SET_EXPENSES': {
      const spent = calculateMonthlySpent(action.payload);
      return {
        ...state,
        expenses: action.payload,
        budget: {
          ...state.budget,
          spent,
          remaining: calculateRemainingBudget(state.budget, spent)
        }
      };
    }
    
    case 'ADD_EXPENSE':
      const newExpense: Expense = action.payload as Expense;
      const updatedExpenses = [...state.expenses, newExpense];
      const newSpent = calculateMonthlySpent(updatedExpenses);
      return {
        ...state,
        expenses: updatedExpenses,
        budget: {
          ...state.budget,
          spent: newSpent,
          remaining: calculateEffectiveBudget(state.budget) - newSpent
        }
      };
    
    case 'DELETE_EXPENSE':
      const filteredExpenses = state.expenses.filter(expense => expense.id !== action.payload);
      const deletedSpent = calculateMonthlySpent(filteredExpenses);
      return {
        ...state,
        expenses: filteredExpenses,
        budget: {
          ...state.budget,
          spent: deletedSpent,
          remaining: calculateEffectiveBudget(state.budget) - deletedSpent
        }
      };
    
    case 'ADD_TAG':
      const newTag: Tag = action.payload as Tag;
      return {
        ...state,
        tags: [...state.tags, newTag]
      };
    
    case 'UPDATE_TAG':
      return {
        ...state,
        tags: state.tags.map(tag => 
          tag.id === action.payload.id ? action.payload : tag
        )
      };
    
    case 'DELETE_TAG':
      return {
        ...state,
        tags: state.tags.filter(tag => tag.id !== action.payload)
      };
    
    case 'UPDATE_BUDGET_STATUS':
      if (shouldUpdateBudget(state.budget.currentMonth)) {
        const updatedBudget = updateBudgetForNewMonth(state.budget, state.budget.monthlyAmount);
        return {
          ...state,
          budget: updatedBudget
        };
      }
      return state;
    
    case 'SET_LEDGER':
      return {
        ...state,
        ledger: action.payload,
        isAuthenticated: true
      };
    
    case 'SET_AUTHENTICATED':
      return {
        ...state,
        isAuthenticated: action.payload
      };

    case 'SET_BOOKKEEPER':
      return {
        ...state,
        currentBookkeeper: action.payload
      };
    
    case 'CLEAR_EXPENSES':
      return {
        ...state,
        expenses: [],
        budget: {
          ...state.budget,
          spent: 0,
          remaining: calculateEffectiveBudget(state.budget)
        }
      };
    
    case 'CLEAR_TAGS':
      return {
        ...state,
        tags: []
      };
    
    default:
      return state;
  }
};

// 创建上下文
interface BudgetContextType {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  loading: boolean;
  authError: string | null; // 连接失败与登录失效分开处理，支持保留登录信息后重试
  checkAuth: () => Promise<boolean>;
  loadData: (ledgerId: string, ledger: any) => Promise<void>;
}

const BudgetContext = createContext<BudgetContextType | undefined>(undefined);

// Provider 组件
export const BudgetProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const initialized = useRef(false);
  
  // 使用 useReducer 管理状态，直接使用初始状态
  const [state, dispatch] = useReducer(budgetReducer, initialState);
  
  // 同步预算到Supabase
  const syncBudgetToSupabase = useCallback(async (budget: Budget, ledgerId: string) => {
    try {
      const currentMonth = budget.currentMonth || getCurrentMonth(); // 格式：YYYY-MM
      
      // 检查是否存在当月预算记录
      const { data: budgets, error: checkError } = await supabase
        .from('budgets')
        .select('id')
        .eq('ledger_id', ledgerId)
        .eq('current_month', currentMonth)
        .single();
      
      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 表示未找到记录
        console.error('检查预算记录失败:', checkError);
        return;
      }
      
      if (budgets && budgets.id) {
        // 更新现有记录
        await supabase
          .from('budgets')
          .update({
            monthly_amount: budget.monthlyAmount,
            last_month_balance: budget.lastMonthBalance,
            historical_balance: budget.historicalBalance,
            remaining: budget.remaining,
            spent: budget.spent
          })
          .eq('id', budgets.id);
      } else {
        // 创建新记录
        await supabase
          .from('budgets')
          .insert({
            ledger_id: ledgerId,
            monthly_amount: budget.monthlyAmount,
            last_month_balance: budget.lastMonthBalance,
            historical_balance: budget.historicalBalance,
            current_month: currentMonth,
            remaining: budget.remaining,
            spent: budget.spent
          });
      }
    } catch (error) {
      console.error('同步预算到Supabase失败:', error);
    }
  }, []);

  // 加载数据
  const loadData = useCallback(async (ledgerId: string, ledger: any) => {
    console.log('loadData called at:', new Date().toISOString(), 'ledgerId:', ledgerId, 'ledger:', ledger);
    setLoading(true);
    try {
      // 获取当前月份
      const currentMonth = getCurrentMonth(); // 格式：YYYY-MM

      // 加载当月预算
      const { data: budgets, error: budgetError } = await supabase
        .from('budgets')
        .select('*')
        .eq('ledger_id', ledgerId)
        .eq('current_month', currentMonth);

      const budget = budgets && budgets.length > 0 ? budgets[0] : null;

      if (budget) {
        console.log('Budget found:', budget);
        // 直接更新完整的预算对象
        dispatch({
          type: 'SET_BUDGET',
          payload: {
            monthlyAmount: budget.monthly_amount,
            lastMonthBalance: budget.last_month_balance,
            historicalBalance: budget.historical_balance ?? 0,
            currentMonth: budget.current_month,
            spent: budget.spent ?? 0,
            remaining: budget.remaining ?? undefined
          }
        });
      } else if (ledger && !budgetError) {
        console.log('Creating new budget at:', new Date().toISOString(), 'currentMonth:', currentMonth);
        
        // 查询上个月的预算记录，获取结余
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        const lastMonthStr = formatMonth(lastMonth); // 格式：YYYY-MM
        
        const { data: lastMonthBudgets } = await supabase
          .from('budgets')
          .select('monthly_amount, remaining, last_month_balance, historical_balance')
          .eq('ledger_id', ledgerId)
          .eq('current_month', lastMonthStr)
          .single();
        
        // 累计上月结余：正数历史累加，负数仅滚动 remaining
        const lastMonthBalance = lastMonthBudgets?.remaining ?? 0;
        const historicalBalance = lastMonthBudgets
          ? calculateNextHistoricalBalance({
              historicalBalance: lastMonthBudgets.historical_balance ?? 0,
              remaining: lastMonthBudgets.remaining ?? 0
            })
          : 0;
        console.log('Last month balance:', lastMonthBalance, 'for month:', lastMonthStr);
        
        // 如果没有当月预算记录，创建新的预算记录
        const monthlyAmount = lastMonthBudgets?.monthly_amount ?? ledger.default_monthly_budget;
        const newBudget = {
          ledger_id: ledgerId,
          monthly_amount: monthlyAmount,
          current_month: currentMonth,
          remaining: monthlyAmount + Math.min(0, historicalBalance),
          spent: 0,
          last_month_balance: lastMonthBalance,
          historical_balance: historicalBalance
        };

        // 保存到数据库
        const { data: createdBudget, error: createError } = await supabase
          .from('budgets')
          .insert(newBudget)
          .select()
          .single();

        if (!createError && createdBudget) {
          dispatch({
            type: 'SET_BUDGET',
            payload: {
              monthlyAmount: createdBudget.monthly_amount,
              lastMonthBalance: createdBudget.last_month_balance,
              historicalBalance: createdBudget.historical_balance ?? 0,
              currentMonth: createdBudget.current_month,
              spent: createdBudget.spent ?? 0,
              remaining: createdBudget.remaining ?? undefined
            }
          });
        } else {
          // 如果创建失败，弹窗错误提示
          console.error('创建预算记录失败:', createError);
          alert('创建预算记录失败: ' + (createError?.message || '未知错误'));
          // 即使创建失败，也使用默认预算更新本地状态，确保用户可以正常使用
          // 重新查询上月结余（如果前面查询失败）
          const lastMonth = new Date();
          lastMonth.setMonth(lastMonth.getMonth() - 1);
          const lastMonthStr = formatMonth(lastMonth);
          
          const { data: lastMonthBudgets } = await supabase
            .from('budgets')
            .select('monthly_amount, remaining, last_month_balance, historical_balance')
            .eq('ledger_id', ledgerId)
            .eq('current_month', lastMonthStr)
            .single();
          
          const lastMonthBalance = lastMonthBudgets?.remaining ?? 0;
          const historicalBalance = lastMonthBudgets
            ? calculateNextHistoricalBalance({
                historicalBalance: lastMonthBudgets.historical_balance ?? 0,
                remaining: lastMonthBudgets.remaining ?? 0
              })
            : 0;
          
          const monthlyAmount = lastMonthBudgets?.monthly_amount ?? ledger.default_monthly_budget;
          dispatch({
            type: 'SET_BUDGET',
            payload: {
              monthlyAmount,
              lastMonthBalance,
              historicalBalance,
              currentMonth,
              spent: 0,
              remaining: monthlyAmount + Math.min(0, historicalBalance)
            }
          });
        }
      }

      // 加载支出（关联记账人名称便于展示）。一次性提交，避免逐条 dispatch 触发中间预算状态同步。
      const { data: expenses, error: expensesError } = await supabase
        .from('expenses')
        .select('*, bookkeeper:bookkeepers(name)')
        .eq('ledger_id', ledgerId);

      if (!expensesError && expenses) {
        const normalizedExpenses = expenses.map((raw: Record<string, unknown>) => {
          const nested = raw.bookkeeper as { name?: string } | null | undefined;
          const bookkeeper_name = nested?.name ?? null;
          const { bookkeeper: _bk, ...rest } = raw;
          return { ...rest, bookkeeper_name } as Expense;
        });
        dispatch({ type: 'SET_EXPENSES', payload: normalizedExpenses });
      }

      // 清空现有标签数据
      dispatch({ type: 'CLEAR_TAGS' });

      // 加载标签
      const { data: tags, error: tagsError } = await supabase
        .from('tags')
        .select('*')
        .eq('ledger_id', ledgerId);

      if (!tagsError && tags) {
        tags.forEach(tag => {
          dispatch({
            type: 'ADD_TAG',
            payload: tag
          });
        });
      }
    } catch (error) {
      console.error('Data loading failed:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // 检查认证状态
  const checkAuth = useCallback(async (): Promise<boolean> => {
    setAuthError(null);
    try {
      const authDataStr = localStorage.getItem('budget-app-auth');
      if (!authDataStr) {
        return false;
      }

      let authData;
      try {
        authData = JSON.parse(authDataStr);
      } catch {
        // 仅损坏、过期或确认失效的登录信息才删除，网络错误不能视为退出登录。
        localStorage.removeItem('budget-app-auth');
        return false;
      }
      const expiresAt = typeof authData?.expiresAt === 'string'
        ? Date.parse(authData.expiresAt)
        : NaN;

      if (typeof authData?.ledgerId !== 'string' || !authData.ledgerId ||
          !Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
        localStorage.removeItem('budget-app-auth');
        return false;
      }

      // 验证账本是否存在（只选择必要字段）
      const { data: ledger, error } = await supabase
        .from('ledgers')
        .select('id, name, default_monthly_budget, created_at')
        .eq('id', authData.ledgerId)
        .maybeSingle();

      // 查询错误（包括断网、超时、服务异常）保留凭据；成功查询无记录才判定账本失效。
      if (error) throw error;
      if (!ledger) {
        localStorage.removeItem('budget-app-auth');
        return false;
      }

      dispatch({ type: 'SET_LEDGER', payload: ledger });
      await loadData(authData.ledgerId, ledger);
      const storedBk = getStoredBookkeeper(authData.ledgerId);
      dispatch({
        type: 'SET_BOOKKEEPER',
        payload: storedBk ? { id: storedBk.id, name: storedBk.name } : null
      });
      return true;
    } catch (error) {
      console.error('Auth check failed:', error);
      setAuthError('暂时无法恢复登录，请检查网络后重试。已保存的登录信息不会因此被清除。');
      return false;
    }
  }, [loadData]);
  
  // 监听预算变化，同步到Supabase
  useEffect(() => {
    if (!loading && state.isAuthenticated && state.ledger && state.budget.monthlyAmount > 0) {
      syncBudgetToSupabase(state.budget, state.ledger.id);
    }
  }, [loading, state.budget, state.ledger, state.isAuthenticated, syncBudgetToSupabase]);

  // 应用启动时检查认证状态
  // 注意：checkAuth 现在在 AppWithAuth 组件中调用，这里不再重复调用
  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
    }
  }, []);
  
  return (
    <BudgetContext.Provider value={{ state, dispatch, loading, authError, checkAuth, loadData }}>
      {children}
    </BudgetContext.Provider>
  );
};

// 自定义钩子，方便组件使用上下文
export const useBudget = (): BudgetContextType => {
  const context = useContext(BudgetContext);
  if (context === undefined) {
    throw new Error('useBudget must be used within a BudgetProvider');
  }
  return context;
};
