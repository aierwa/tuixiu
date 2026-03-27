// 预算数据接口
export interface Budget {
  id?: string;                     // 唯一标识
  ledger_id?: string;              // 账本ID
  monthlyAmount: number;           // 每月预算金额
  currentMonth: string;            // 当前月份 (YYYY-MM)
  remaining: number;               // 剩余预算
  spent: number;                   // 已支出金额
  lastMonthBalance: number;        // 上月结余
}

// 支出记录接口
export interface Expense {
  id: string;                      // 唯一标识
  ledger_id?: string;              // 账本ID
  amount: number;                  // 金额
  date: string;                    // 日期 (YYYY-MM-DD)
  tag: string;                     // 标签
  description?: string;            // 描述（可选）
}

// 标签数据接口
export interface Tag {
  id: string;                      // 唯一标识
  ledger_id?: string;              // 账本ID
  name: string;                    // 标签名称
  color: string;                   // 标签颜色
}

// 账本数据接口
export interface Ledger {
  id: string;                      // 唯一标识
  name: string;                    // 账本名称
  password_hash?: string;          // 密码哈希（可选，前端不需要存储）
  default_monthly_budget: number;  // 默认月度预算
  created_at?: string;             // 创建时间
}

// 应用状态接口
export interface AppState {
  budget: Budget;
  expenses: Expense[];
  tags: Tag[];
  ledger?: Ledger;                 // 当前账本
  isAuthenticated: boolean;        // 认证状态
}

// 动作类型
export type Action =
  | { type: 'SET_BUDGET'; payload: number }
  | { type: 'ADD_EXPENSE'; payload: Omit<Expense, 'id'> }
  | { type: 'DELETE_EXPENSE'; payload: string }
  | { type: 'CLEAR_EXPENSES' }
  | { type: 'ADD_TAG'; payload: Omit<Tag, 'id'> }
  | { type: 'UPDATE_TAG'; payload: Tag }
  | { type: 'DELETE_TAG'; payload: string }
  | { type: 'CLEAR_TAGS' }
  | { type: 'UPDATE_BUDGET_STATUS' }
  | { type: 'SET_LEDGER'; payload: Ledger }
  | { type: 'SET_AUTHENTICATED'; payload: boolean };
