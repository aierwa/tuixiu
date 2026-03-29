import { format, startOfMonth, endOfMonth, differenceInDays, isSameMonth, parseISO } from 'date-fns';

// 获取当前月份的字符串表示 (YYYY-MM)
export const getCurrentMonth = (): string => {
  return format(new Date(), 'yyyy-MM');
};

// 获取当前日期的字符串表示 (YYYY-MM-DD)
export const getCurrentDate = (): string => {
  return format(new Date(), 'yyyy-MM-dd');
};

// 计算当月剩余天数
export const getDaysRemainingInMonth = (): number => {
  const today = new Date();
  const endOfCurrentMonth = endOfMonth(today);
  return differenceInDays(endOfCurrentMonth, today) + 1; // +1 包含今天
};

// 检查日期是否在当月
export const isDateInCurrentMonth = (dateString: string): boolean => {
  if (!dateString) return false;
  try {
    const date = parseISO(dateString);
    if (isNaN(date.getTime())) return false;
    const today = new Date();
    return isSameMonth(date, today);
  } catch {
    return false;
  }
};

// 获取月份的开始日期
export const getStartOfMonth = (date: Date = new Date()): Date => {
  return startOfMonth(date);
};

// 获取月份的结束日期
export const getEndOfMonth = (date: Date = new Date()): Date => {
  return endOfMonth(date);
};

// 格式化日期为 YYYY-MM-DD
export const formatDate = (date: Date): string => {
  return format(date, 'yyyy-MM-dd');
};

// 格式化月份为 YYYY-MM
export const formatMonth = (date: Date): string => {
  return format(date, 'yyyy-MM');
};
