import React, { createContext, useContext, useReducer, useEffect, useState, useCallback, useRef } from 'react';
import { AppState, Action, Expense, Tag } from '../types';
import { supabase } from '../lib/supabase';
import { 
  calculateMonthlySpent, 
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
    lastMonthBalance: 0
  },
  expenses: [],
  tags: [],
  isAuthenticated: false
};

// Reducer 函数
const budgetReducer = (state: AppState, action: Action): AppState => {
  switch (action.type) {
    case 'SET_BUDGET':
      return {
        ...state,
        budget: {
          ...state.budget,
          monthlyAmount: action.payload.monthlyAmount,
          lastMonthBalance: action.payload.lastMonthBalance,
          currentMonth: new Date().toISOString().slice(0, 7), // 格式：YYYY-MM
          remaining: action.payload.monthlyAmount + action.payload.lastMonthBalance - state.budget.spent
        }
      };
    
    case 'ADD_EXPENSE':
      const newExpense: Expense = action.payload;
      const updatedExpenses = [...state.expenses, newExpense];
      const newSpent = calculateMonthlySpent(updatedExpenses);
      return {
        ...state,
        expenses: updatedExpenses,
        budget: {
          ...state.budget,
          spent: newSpent,
          remaining: state.budget.monthlyAmount + state.budget.lastMonthBalance - newSpent
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
          remaining: state.budget.monthlyAmount + state.budget.lastMonthBalance - deletedSpent
        }
      };
    
    case 'ADD_TAG':
      const newTag: Tag = action.payload;
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
    
    case 'CLEAR_EXPENSES':
      return {
        ...state,
        expenses: [],
        budget: {
          ...state.budget,
          spent: 0,
          remaining: state.budget.monthlyAmount + state.budget.lastMonthBalance
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
  checkAuth: () => Promise<boolean>;
  loadData: (ledgerId: string, ledger: any) => Promise<void>;
}

const BudgetContext = createContext<BudgetContextType | undefined>(undefined);

// Provider 组件
export const BudgetProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(false);
  const initialized = useRef(false);
  
  // 使用 useReducer 管理状态，直接使用初始状态
  const [state, dispatch] = useReducer(budgetReducer, initialState);
  
  // 同步预算到Supabase
  const syncBudgetToSupabase = useCallback(async (budget: any, ledgerId: string) => {
    try {
      const currentMonth = new Date().toISOString().slice(0, 7); // 格式：YYYY-MM
      
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
      const currentMonth = new Date().toISOString().slice(0, 7); // 格式：YYYY-MM

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
            lastMonthBalance: budget.last_month_balance
          }
        });
      } else if (ledger && !budgetError) {
        console.log('Creating new budget at:', new Date().toISOString(), 'currentMonth:', currentMonth);
        // 如果没有当月预算记录，创建新的预算记录
        const newBudget = {
          ledger_id: ledgerId,
          monthly_amount: ledger.default_monthly_budget,
          current_month: currentMonth,
          remaining: ledger.default_monthly_budget,
          spent: 0,
          last_month_balance: 0
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
              lastMonthBalance: createdBudget.last_month_balance
            }
          });
        } else {
          // 如果创建失败，弹窗错误提示
          console.error('创建预算记录失败:', createError);
          alert('创建预算记录失败: ' + (createError?.message || '未知错误'));
          // 即使创建失败，也使用默认预算更新本地状态，确保用户可以正常使用
          dispatch({
            type: 'SET_BUDGET',
            payload: {
              monthlyAmount: ledger.default_monthly_budget,
              lastMonthBalance: 0
            }
          });
        }
      }

      // 清空现有支出数据
      dispatch({ type: 'CLEAR_EXPENSES' });

      // 加载支出
      const { data: expenses, error: expensesError } = await supabase
        .from('expenses')
        .select('*')
        .eq('ledger_id', ledgerId);

      if (!expensesError && expenses) {
        expenses.forEach(expense => {
          dispatch({
            type: 'ADD_EXPENSE',
            payload: expense
          });
        });
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
    try {
      const authDataStr = localStorage.getItem('budget-app-auth');
      if (!authDataStr) {
        return false;
      }

      const authData = JSON.parse(authDataStr);
      const expiresAt = new Date(authData.expiresAt);
      
      if (expiresAt < new Date()) {
        localStorage.removeItem('budget-app-auth');
        return false;
      }

      // 验证账本是否存在（只选择必要字段）
      const { data: ledger, error } = await supabase
        .from('ledgers')
        .select('id, name, default_monthly_budget, created_at')
        .eq('id', authData.ledgerId)
        .single();

      if (error || !ledger) {
        localStorage.removeItem('budget-app-auth');
        return false;
      }

      dispatch({ type: 'SET_LEDGER', payload: ledger });
      await loadData(authData.ledgerId, ledger);
      return true;
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('budget-app-auth');
      return false;
    }
  }, [loadData]);
  
  // 监听预算变化，同步到Supabase
  useEffect(() => {
    if (state.isAuthenticated && state.ledger && state.budget.monthlyAmount > 0) {
      syncBudgetToSupabase(state.budget, state.ledger.id);
    }
  }, [state.budget, state.ledger, state.isAuthenticated, syncBudgetToSupabase]);

  // 应用启动时检查认证状态
  // 注意：checkAuth 现在在 AppWithAuth 组件中调用，这里不再重复调用
  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
    }
  }, []);
  
  return (
    <BudgetContext.Provider value={{ state, dispatch, loading, checkAuth, loadData }}>
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
