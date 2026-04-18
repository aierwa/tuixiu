-- 创建账本表
CREATE TABLE IF NOT EXISTS ledgers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  default_monthly_budget NUMERIC(10, 2) NOT NULL DEFAULT 8000,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 创建预算表
CREATE TABLE IF NOT EXISTS budgets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ledger_id UUID REFERENCES ledgers(id) ON DELETE CASCADE,
  monthly_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  current_month TEXT NOT NULL,
  remaining NUMERIC(10, 2) NOT NULL DEFAULT 0,
  spent NUMERIC(10, 2) NOT NULL DEFAULT 0,
  last_month_balance NUMERIC(10, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 创建支出表
CREATE TABLE IF NOT EXISTS expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ledger_id UUID REFERENCES ledgers(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL,
  date TEXT NOT NULL,
  tag TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 创建标签表
CREATE TABLE IF NOT EXISTS tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ledger_id UUID REFERENCES ledgers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  created_at TIMESTAMP DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_budgets_ledger_id ON budgets(ledger_id);
CREATE INDEX IF NOT EXISTS idx_expenses_ledger_id ON expenses(ledger_id);
CREATE INDEX IF NOT EXISTS idx_tags_ledger_id ON tags(ledger_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);

-- 启用行级安全策略
ALTER TABLE ledgers ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

-- 创建行级安全策略
-- 允许所有用户查看和修改所有记录（仅用于开发环境）
CREATE POLICY "Allow all access to ledgers" ON ledgers
  FOR ALL USING (true);

CREATE POLICY "Allow all access to budgets" ON budgets
  FOR ALL USING (true);

CREATE POLICY "Allow all access to expenses" ON expenses
  FOR ALL USING (true);

CREATE POLICY "Allow all access to tags" ON tags
  FOR ALL USING (true);

-- 注意：在生产环境中，应该根据验证机制创建更严格的行级安全策略

-- =============================================================================
-- 以下为追加迁移（记账人）；新建库可整文件执行，已有库从本节起执行即可
-- =============================================================================

-- 账本下的记账人（在 Supabase 中按 ledger_id 手动维护数据）
CREATE TABLE IF NOT EXISTS bookkeepers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ledger_id UUID NOT NULL REFERENCES ledgers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 支出关联记账人（可为空，兼容历史数据）
ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS bookkeeper_id UUID REFERENCES bookkeepers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_bookkeepers_ledger_id ON bookkeepers(ledger_id);
CREATE INDEX IF NOT EXISTS idx_expenses_bookkeeper_id ON expenses(bookkeeper_id);

ALTER TABLE bookkeepers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to bookkeepers" ON bookkeepers
  FOR ALL USING (true);

-- =============================================================================
-- 预算外支出（不计入本月预算的 spent/remaining，仍计入总支出与分类汇总展示）
-- =============================================================================

ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS outside_budget BOOLEAN NOT NULL DEFAULT false;
