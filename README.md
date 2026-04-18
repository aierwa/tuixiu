# 记账应用项目说明文档

## 项目概览

这是一个基于 React + TypeScript + Tailwind CSS 开发的移动端记账应用，旨在帮助用户轻松管理月度预算和支出。应用采用原生 App 风格的底部导航，提供直观的预算概览、支出记录、标签管理等功能。

### 核心功能

- **预算管理**：设置月度预算，查看预算使用情况，支持上月结余
- **支出记录**：快速添加支出，按标签分类，查看支出历史；支持**预算外支出**（不计入本月预算统计，支出页与日历中仍会展示并标注）
- **语音记账**：长按添加按钮触发语音输入，支持多条支出记录，自动识别日期、标签和金额
- **标签管理**：自定义支出标签，支持颜色区分
- **日历视图**：在首页展示日历，直观查看支出分布
- **数据持久化**：使用 Supabase 远端存储数据，确保数据不丢失，支持多人共同记账
- **账本验证**：以账本为单位进行权限验证，确保数据安全
- **记账人标识**：账本下维护多名记账人；登录后选择身份，支出写入 `bookkeeper_id`，日历当日明细可展示记账人标签

## 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| React | 18.2.0 | 前端框架 |
| TypeScript | 5.2.2 | 类型系统 |
| Tailwind CSS | 3.4.0 | 样式框架 |
| Vite | 5.0.8 | 构建工具 |
| date-fns | 3.6.0 | 日期处理 |
| @supabase/supabase-js | 2.x | Supabase SDK |
| bcryptjs | 2.x | 密码哈希验证 |
| MediaRecorder API | - | 浏览器语音录制 |
| Tencent Cloud ASR | - | 语音识别服务 |
| Zhiyuan API | - | 智能数据提取 |

## 项目结构

```
src/
├── components/           # 组件目录
│   ├── BudgetOverview.tsx    # 预算概览组件（环形进度图）
│   ├── BudgetSetting.tsx     # 预算设置组件
│   ├── CalendarView.tsx      # 日历视图组件
│   ├── ExpenseForm.tsx       # 支出表单组件（弹窗）
│   ├── ExpenseList.tsx       # 支出列表组件
│   ├── TagManager.tsx        # 标签管理组件
│   ├── LedgerAuth.tsx        # 账本验证组件
│   ├── BookkeeperPicker.tsx  # 登录后选择记账人
│   └── Notification.tsx      # 通知弹窗组件
├── contexts/            # 状态管理
│   └── BudgetContext.tsx     # 预算上下文（包含 reducer）
├── hooks/               # 自定义钩子
│   └── useLocalStorage.ts    # 本地存储钩子
├── lib/                 # 库文件
│   └── supabase.ts           # Supabase 客户端配置
├── types/               # 类型定义
│   └── index.ts              # 接口类型定义
├── utils/               # 工具函数
│   ├── budgetUtils.ts        # 预算相关工具
│   ├── dateUtils.ts          # 日期相关工具
│   └── bookkeeperStorage.ts  # 记账人本地存储（与 ledgerId 绑定）
├── App.tsx              # 应用主组件
├── main.tsx             # 应用入口
└── index.css            # 全局样式
```

## 核心功能详解

### 1. 预算管理

**BudgetOverview 组件**：
- 环形进度图展示预算使用情况
- 实时显示剩余预算和使用百分比
- 状态提示（预算充足/已过半/预算紧张）
- 点击环形图打开预算详情弹窗
- 支持编辑本月基础预算和上月结余

**BudgetSetting 组件**：
- 设置月度预算金额
- 查看预算相关信息
- 自动同步预算数据到 Supabase

### 2. 支出管理

**ExpenseForm 组件**：
- 弹窗形式的支出添加界面
- 支持输入金额、选择日期和标签
- 可选勾选「预算外支出」（默认不勾选）；写入数据库字段 `outside_budget`
- 标签选择采用网格布局，直观易用
- 自动同步支出数据到 Supabase

**ExpenseList 组件**：
- 按所选月份区间汇总总支出与各标签占比（金额**含预算外**）
- 若存在预算外支出，在「总支出」及对应分类名称后以较小字号展示「含预算外¥xx」

**预算统计**：`budgetUtils.calculateMonthlySpent` 仅统计当月且 `outside_budget` 为否的支出，用于环形图、剩余预算及 `budgets.spent` 等；预算外不影响本月预算占用。

### 3. 标签管理

**TagManager 组件**：
- 管理支出标签
- 支持添加、编辑、删除标签
- 每个标签可设置颜色
- 标签操作同步到 Supabase

### 4. 日历视图

**CalendarView 组件**：
- 在首页展示当月日历
- 标记有支出的日期
- 点击日期查看当日支出；明细中预算外记录在与记账人标签同风格的小标签中展示为「**外**」，且可删除单条支出（同步 Supabase）

### 5. 账本验证

**LedgerAuth 组件**：
- 账本名称和密码验证
- 验证信息本地存储（有效期一年）
- 未验证用户无法访问应用
- 支持密码哈希验证

### 6. 记账人标识

- **数据表**：`bookkeepers`（`ledger_id` 关联账本，`name` 为展示名），在 Supabase 中手工维护；`expenses.bookkeeper_id` 可选外键，兼容历史无记账人支出。
- **BookkeeperPicker**：账本密码验证成功并加载数据后，若本地尚未保存当前账本的记账人，则先弹出选择页；列表数据来自 `bookkeepers` 表。
- **本地存储**：键名 `budget-app-bookkeeper`，内容为 `{ id, name, ledgerId }`，仅保存在浏览器。
- **BudgetSetting**：设置页顶部可重新选择并保存记账人；之后新产生的支出（表单与语音批量）均使用该身份。
- **CalendarView**：点击日历某日打开当日明细时，若该笔支出有关联记账人名称，则在标签旁以小标签展示；无记账人时不展示占位文案。

### 7. 语音记账

**语音相关逻辑（集成在 App 内）**：
- 长按添加按钮触发语音输入
- 支持录制语音并转换为文字
- 调用 Tencent Cloud ASR 进行语音识别
- 调用 Zhiyuan API 提取支出信息（日期、标签、金额）
- 支持多条支出记录的一次性提取
- 自动将提取的支出信息保存到 Supabase（写入时 `outside_budget` 固定为 `false`）

**Notification 组件**：
- 语音识别成功/失败提示
- 数据提取成功/失败提示
- 支出添加成功/失败提示
- 轻触屏幕可关闭通知

## 状态管理

应用使用 React Context API 结合 useReducer 进行状态管理：

- **BudgetContext**：提供全局状态和 dispatch 方法
- **状态结构**：包含 budget（预算）、expenses（支出）、tags（标签）、ledger（当前账本）、isAuthenticated（认证状态）、currentBookkeeper（当前选择的记账人）
- **数据持久化**：使用 Supabase 远端存储状态，确保数据不丢失
- **本地缓存**：保持本地缓存以提高性能
- **跨月处理**：自动检测月份变化，更新预算状态

## 开发指南

### 环境搭建

1. **安装依赖**：
   ```bash
   npm install
   ```

2. **配置环境变量**：
   - 在 Supabase 控制台创建新项目
   - 获取 API 密钥（anon key）和项目 URL
   - 申请腾讯云 ASR 服务和智谱 API 密钥
   - 在 `.env` 文件中配置：
     ```
     VITE_SUPABASE_URL=your-supabase-url
     VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
     VITE_TENCENT_ASR_API_KEY=your-tencent-asr-api-key
     VITE_ZHIPU_API_KEY=your-zhiyuan-api-key
     VITE_ZHIPU_MODEL=GLM-4.7-Flash
     ```
   - `VITE_TENCENT_ASR_API_KEY`：腾讯云 ASR 服务 API 密钥
   - `VITE_ZHIPU_API_KEY`：智谱 API 密钥
   - `VITE_ZHIPU_MODEL`：智谱模型名称，可根据需要切换

3. **创建数据库表**：
   - 在 Supabase 控制台的 SQL 编辑器中执行 `supabase_schema.sql` 文件中的 SQL 语句
   - 文件前半段为基线表结构；**记账人**与**预算外**相关字段在文件末尾「追加迁移」注释段（`bookkeepers` / `bookkeeper_id` / `outside_budget`），新建项目可整文件执行，已有数据库可自对应注释段起按需执行

4. **添加账本记录**：
   - 生成密码哈希：
     ```javascript
     // 创建 generate_hash.js 文件
     const bcrypt = require('bcryptjs');
     const password = '你的账本密码';
     const saltRounds = 10;
     bcrypt.hash(password, saltRounds, (err, hash) => {
       if (err) {
         console.error(err);
       } else {
         console.log('密码哈希值:', hash);
       }
     });
     ```
   - 运行 `node generate_hash.js` 获取哈希值
   - 在 Supabase 控制台的 Table Editor 中向 `ledgers` 表插入记录：
     - `name`：账本名称
     - `password_hash`：生成的密码哈希值
     - `default_monthly_budget`：默认月度预算（可选，默认为 8000）

5. **添加记账人**：
   - 在 `ledgers` 中已有对应账本记录后，在 Table Editor 或 SQL 中向 `bookkeepers` 表插入行：
     - `ledger_id`：该账本的 UUID（与 `ledgers.id` 一致）
     - `name`：记账人显示名称（如家庭成员姓名）
   - 至少插入一条，否则登录后选择记账人步骤无选项可用

6. **启动开发服务器**：
   ```bash
   npm run dev
   ```

7. **构建生产版本**：
   ```bash
   npm run build
   ```

8. **代码检查**：
   ```bash
   npm run lint
   ```

### 开发规范

- **组件命名**：使用 PascalCase 命名组件文件
- **类型定义**：所有接口和类型定义放在 `types/index.ts` 中
- **状态管理**：使用 `useBudget` 钩子访问全局状态
- **样式**：使用 Tailwind CSS 类名，避免内联样式
- **数据持久化**：所有状态变更会自动同步到 Supabase

### 扩展指南

1. **添加新功能**：
   - 在 `components/` 目录创建新组件
   - 在 `types/index.ts` 中添加相应类型定义
   - 在 `BudgetContext.tsx` 中添加新的 action 类型和处理逻辑

2. **修改现有功能**：
   - 组件修改：直接编辑对应组件文件
   - 状态逻辑修改：修改 `BudgetContext.tsx` 中的 reducer 函数
   - 工具函数修改：编辑 `utils/` 目录下的对应文件

## 数据结构

### 预算数据 (Budget)

```typescript
interface Budget {
  id?: string;                     // 唯一标识
  ledger_id?: string;              // 账本ID
  monthlyAmount: number;           // 每月预算金额
  currentMonth: string;            // 当前月份 (YYYY-MM)
  remaining: number;               // 剩余预算
  spent: number;                   // 已支出金额
  lastMonthBalance: number;        // 上月结余
}
```

### 支出记录 (Expense)

```typescript
interface Expense {
  id: string;                      // 唯一标识
  ledger_id?: string;              // 账本ID
  amount: number;                  // 金额
  date: string;                    // 日期 (YYYY-MM-DD)
  tag: string;                     // 标签
  description?: string;            // 描述（可选）
  bookkeeper_id?: string | null;   // 记账人 ID（Supabase）
  bookkeeper_name?: string | null; // 展示用名称（关联或写入时附带）
  outside_budget?: boolean;        // 是否预算外（true 时不计入本月预算统计）
}
```

### 记账人 (Bookkeeper)

```typescript
interface Bookkeeper {
  id: string;
  ledger_id: string;
  name: string;
  created_at?: string;
}
```

### 标签数据 (Tag)

```typescript
interface Tag {
  id: string;                      // 唯一标识
  ledger_id?: string;              // 账本ID
  name: string;                    // 标签名称
  color: string;                   // 标签颜色
}
```

### 账本数据 (Ledger)

```typescript
interface Ledger {
  id: string;                      // 唯一标识
  name: string;                    // 账本名称
  password_hash: string;           // 密码哈希
  default_monthly_budget: number;  // 默认月度预算
  created_at?: string;             // 创建时间
}
```

## 核心 API

### useBudget 钩子

```typescript
const { state, dispatch, loading, checkAuth, loadData } = useBudget();
```

**参数**：无

**返回值**：
- `state`：应用状态对象
- `dispatch`：状态更新函数
- `loading`：数据加载状态
- `checkAuth`：检查认证状态的函数
- `loadData`：从 Supabase 加载数据的函数

### 状态更新 Action

- `SET_BUDGET`：设置月度预算
- `ADD_EXPENSE`：添加支出
- `DELETE_EXPENSE`：删除支出
- `ADD_TAG`：添加标签
- `UPDATE_TAG`：更新标签
- `DELETE_TAG`：删除标签
- `UPDATE_BUDGET_STATUS`：更新预算状态（跨月处理）
- `SET_LEDGER`：设置当前账本
- `SET_AUTHENTICATED`：设置认证状态
- `SET_BOOKKEEPER`：设置当前浏览器选择的记账人（与本地存储同步）

## 项目特色

1. **移动端适配**：响应式设计，适配各种手机屏幕
2. **直观的预算概览**：环形进度图展示预算使用情况
3. **便捷的支出记录**：浮动按钮 + 弹窗表单
4. **智能的语音记账**：长按添加按钮触发语音输入，支持多条支出记录
5. **智能的标签管理**：颜色区分，网格选择
6. **数据持久化**：Supabase 远端存储，数据不丢失
7. **跨月自动处理**：自动更新预算状态
8. **多人共同记账**：支持多用户使用同一账本；支持多名记账人区分支出归属
9. **安全验证**：使用 bcrypt 进行密码哈希验证
10. **实时同步**：数据实时同步到 Supabase


## 故障排除

### 调试建议

- 使用 React DevTools 查看组件状态
- 检查浏览器控制台的错误信息
- 查看 Supabase 控制台的日志
- 验证本地存储中的认证信息：`localStorage.getItem('budget-app-auth')`
- 记账人选择结果：`localStorage.getItem('budget-app-bookkeeper')`

## 总结

这是一个功能完整、界面美观的移动端记账应用，采用现代前端技术栈开发。通过本文档的指引，开发者可以快速了解项目结构和功能实现，为后续的开发和扩展提供参考。

应用现已支持多人共同记账，通过 Supabase 远端存储实现数据同步，确保数据安全和一致性。用户可以在不同设备上访问同一账本，实现数据的实时共享。同一账本内可通过记账人标识区分不同成员产生的支出，并在日历明细中按需展示；支持预算外支出标记，便于与月度预算统计区分。