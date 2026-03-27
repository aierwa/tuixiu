import { Budget, Expense } from '../types';
import { getCurrentMonth, isDateInCurrentMonth } from './dateUtils';

// 计算当月支出总额
export const calculateMonthlySpent = (expenses: Expense[]): number => {
  return expenses
    .filter(expense => isDateInCurrentMonth(expense.date))
    .reduce((total, expense) => total + expense.amount, 0);
};

// 计算剩余预算
export const calculateRemainingBudget = (budget: Budget, spent: number): number => {
  return budget.monthlyAmount + budget.lastMonthBalance - spent;
};

// 计算日均剩余预算
export const calculateDailyRemaining = (remaining: number, daysRemaining: number): number => {
  if (daysRemaining <= 0) return 0;
  return remaining / daysRemaining;
};

// 检查是否需要更新预算（跨月）
export const shouldUpdateBudget = (currentMonth: string): boolean => {
  return currentMonth !== getCurrentMonth();
};

// 更新预算状态（跨月时）
export const updateBudgetForNewMonth = (oldBudget: Budget, monthlyAmount: number): Budget => {
  const newMonth = getCurrentMonth();
  const lastMonthBalance = oldBudget.remaining;
  
  return {
    monthlyAmount,
    currentMonth: newMonth,
    remaining: monthlyAmount + lastMonthBalance,
    spent: 0,
    lastMonthBalance
  };
};

// 生成默认标签
export const generateDefaultTags = () => {
  return [
    { id: '1', name: '餐饮', color: '#FF6B6B' },
    { id: '2', name: '交通', color: '#4ECDC4' },
    { id: '3', name: '购物', color: '#45B7D1' },
    { id: '4', name: '娱乐', color: '#96CEB4' },
    { id: '5', name: '医疗', color: '#FFEAA7' },
    { id: '6', name: '其他', color: '#DDA0DD' }
  ];
};

// 生成初始预算
export const generateInitialBudget = (defaultMonthlyBudget: number = 8000): Budget => {
  return {
    monthlyAmount: defaultMonthlyBudget,
    currentMonth: getCurrentMonth(),
    remaining: defaultMonthlyBudget,
    spent: 0,
    lastMonthBalance: 0
  };
};
