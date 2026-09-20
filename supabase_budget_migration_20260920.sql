-- 预算历史结余字段及 2026 年 8 月、9 月数据修正
ALTER TABLE budgets
  ADD COLUMN IF NOT EXISTS historical_balance NUMERIC(10, 2) NOT NULL DEFAULT 0;

UPDATE budgets
SET last_month_balance = 167.00,
    historical_balance = 2197.10,
    spent = 5296.40,
    remaining = 1703.60
WHERE ledger_id = 'a7a5720f-e2a1-4c13-be22-5c461d9221cc'
  AND current_month = '2026-08';

UPDATE budgets
SET last_month_balance = 1703.60,
    historical_balance = 3900.70,
    spent = 6617.00,
    remaining = 383.00
WHERE ledger_id = 'a7a5720f-e2a1-4c13-be22-5c461d9221cc'
  AND current_month = '2026-09';
