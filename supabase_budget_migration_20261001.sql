-- 修正 2026 年 9 月预算被初始化中间状态覆盖的问题，并重算 2026 年 10 月预算。
-- 预算内支出以 expenses.outside_budget = false（或 NULL）为准，预算外支出不计入 spent。
DO $$
DECLARE
  v_ledger_id UUID := 'a7a5720f-e2a1-4c13-be22-5c461d9221cc';
  v_august_spent NUMERIC(10, 2);
  v_august_remaining NUMERIC(10, 2);
  v_september_spent NUMERIC(10, 2);
  v_september_historical NUMERIC(10, 2);
  v_september_remaining NUMERIC(10, 2);
  v_october_spent NUMERIC(10, 2);
BEGIN
  SELECT COALESCE(SUM(amount), 0)
    INTO v_august_spent
    FROM expenses
   WHERE ledger_id = v_ledger_id
     AND date >= '2026-08-01'
     AND date < '2026-09-01'
     AND outside_budget IS NOT TRUE;

  v_august_remaining := ROUND(7000.00 + LEAST(0::NUMERIC, 2197.10) - v_august_spent, 2);

  -- 8 月数据已经核算正确，这里按明细重新写入，保证后续月份的起点一致。
  UPDATE budgets
     SET monthly_amount = 7000.00,
         last_month_balance = 167.00,
         historical_balance = 2197.10,
         spent = ROUND(v_august_spent, 2),
         remaining = v_august_remaining
   WHERE ledger_id = v_ledger_id
     AND current_month = '2026-08';

  SELECT COALESCE(SUM(amount), 0)
    INTO v_september_spent
    FROM expenses
   WHERE ledger_id = v_ledger_id
     AND date >= '2026-09-01'
     AND date < '2026-10-01'
     AND outside_budget IS NOT TRUE;

  v_september_historical := ROUND(2197.10 + v_august_remaining, 2);
  v_september_remaining := ROUND(
    7000.00 + LEAST(0::NUMERIC, v_september_historical) - v_september_spent,
    2
  );

  UPDATE budgets
     SET monthly_amount = 7000.00,
         last_month_balance = v_august_remaining,
         historical_balance = v_september_historical,
         spent = ROUND(v_september_spent, 2),
         remaining = v_september_remaining
   WHERE ledger_id = v_ledger_id
     AND current_month = '2026-09';

  SELECT COALESCE(SUM(amount), 0)
    INTO v_october_spent
    FROM expenses
   WHERE ledger_id = v_ledger_id
     AND date >= '2026-10-01'
     AND date < '2026-11-01'
     AND outside_budget IS NOT TRUE;

  v_september_remaining := ROUND(v_september_remaining, 2);

  UPDATE budgets
     SET monthly_amount = 7000.00,
         last_month_balance = v_september_remaining,
         historical_balance = ROUND(v_september_historical + v_september_remaining, 2),
         spent = ROUND(v_october_spent, 2),
         remaining = ROUND(
           7000.00
             + LEAST(0::NUMERIC, ROUND(v_september_historical + v_september_remaining, 2))
             - v_october_spent,
           2
         )
   WHERE ledger_id = v_ledger_id
     AND current_month = '2026-10';
END $$;

-- 执行后应看到：9 月 remaining = -680.60，10 月 last_month_balance = -680.60，
-- 10 月 historical_balance = 3220.10，10 月 monthly_amount = 7000.00。
SELECT current_month, monthly_amount, spent, remaining, last_month_balance, historical_balance
  FROM budgets
 WHERE ledger_id = 'a7a5720f-e2a1-4c13-be22-5c461d9221cc'
   AND current_month IN ('2026-08', '2026-09', '2026-10')
 ORDER BY current_month;
