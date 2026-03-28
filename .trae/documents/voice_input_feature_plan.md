# 语音记账功能实现计划

## 项目背景

这是一个基于 React + TypeScript + Tailwind CSS 开发的移动端记账应用，现在需要添加语音记账功能，通过长按添加按钮触发语音输入，使用腾讯云ASR进行语音识别，智谱API进行数据提取，最终将识别出的支出信息保存到Supabase。

## 实现计划

### 1. 环境准备与依赖安装

#### 1.1 安装必要的依赖包
- **Priority**: P0
- **Depends On**: None
- **Description**: 安装语音识别和API调用所需的依赖包
- **Success Criteria**: 依赖包安装成功，项目能正常构建
- **Test Requirements**:
  - `programmatic` TR-1.1: 运行 `npm install` 无错误
  - `programmatic` TR-1.2: 运行 `npm run build` 无错误
- **Notes**: 需要安装的依赖包括：
  - `axios`：用于API调用
  - 可能需要的其他依赖

#### 1.2 配置环境变量
- **Priority**: P0
- **Depends On**: 1.1
- **Description**: 配置腾讯云ASR和智谱API的API密钥
- **Success Criteria**: 环境变量配置正确，可在代码中读取
- **Test Requirements**:
  - `programmatic` TR-2.1: 环境变量文件存在且格式正确
  - `programmatic` TR-2.2: 代码能正确读取环境变量
- **Notes**: 需要在 `.env` 文件中添加以下变量：
  - `VITE_TENCENT_ASR_APP_ID`
  - `VITE_TENCENT_ASR_SECRET_ID`
  - `VITE_TENCENT_ASR_SECRET_KEY`
  - `VITE_ZHIPU_API_KEY`

### 2. 核心功能实现

#### 2.1 添加按钮长按事件处理
- **Priority**: P0
- **Depends On**: None
- **Description**: 修改App.tsx中的添加按钮，添加长按事件处理逻辑
- **Success Criteria**: 单击按钮触发原有手动添加功能，长按按钮触发语音输入
- **Test Requirements**:
  - `human-judgment` TR-3.1: 单击添加按钮能正常打开手动添加表单
  - `human-judgment` TR-3.2: 长按添加按钮能触发语音输入界面
- **Notes**: 使用 `useState` 和 `useEffect` 实现长按检测

#### 2.2 语音输入组件开发
- **Priority**: P0
- **Depends On**: 2.1, 1.2
- **Description**: 创建语音输入组件，集成腾讯云ASR
- **Success Criteria**: 能录制语音并通过腾讯云ASR进行识别
- **Test Requirements**:
  - `human-judgment` TR-4.1: 语音录制界面显示正常
  - `programmatic` TR-4.2: 语音识别功能能正常工作
- **Notes**: 组件需要处理权限请求、录音控制、识别结果获取等功能

#### 2.3 数据提取逻辑实现
- **Priority**: P0
- **Depends On**: 2.2
- **Description**: 对接智谱API，从识别结果中提取支出信息
- **Success Criteria**: 能从语音识别结果中提取出日期、标签、金额等信息
- **Test Requirements**:
  - `programmatic` TR-5.1: 能正确提取单个支出信息
  - `programmatic` TR-5.2: 能正确提取多个支出信息
- **Notes**: 需要设计合理的提示词，确保LLM能正确提取所需信息

#### 2.4 支出添加与状态管理
- **Priority**: P0
- **Depends On**: 2.3
- **Description**: 将提取的支出信息添加到Supabase并更新本地状态
- **Success Criteria**: 提取的支出信息能正确保存到Supabase并更新本地状态
- **Test Requirements**:
  - `programmatic` TR-6.1: 支出信息能正确保存到Supabase
  - `programmatic` TR-6.2: 本地状态能正确更新
- **Notes**: 复用现有的 `ADD_EXPENSE` action

#### 2.5 弹窗提示功能
- **Priority**: P1
- **Depends On**: 2.2, 2.3, 2.4
- **Description**: 实现语音识别、数据提取、支出添加的结果提示弹窗
- **Success Criteria**: 各种操作的结果都能通过弹窗提示，轻触屏幕后消失
- **Test Requirements**:
  - `human-judgment` TR-7.1: 语音识别失败时显示错误提示
  - `human-judgment` TR-7.2: 数据提取失败时显示错误提示
  - `human-judgment` TR-7.3: 支出添加失败时显示错误提示
  - `human-judgment` TR-7.4: 支出添加成功时显示成功提示
  - `human-judgment` TR-7.5: 轻触屏幕后弹窗消失
- **Notes**: 创建通用的提示组件，支持不同类型的提示

### 3. 代码优化与测试

#### 3.1 错误处理与边界情况
- **Priority**: P1
- **Depends On**: 2.2, 2.3, 2.4
- **Description**: 完善错误处理，处理各种边界情况
- **Success Criteria**: 应用在各种错误情况下都能正常运行，不会崩溃
- **Test Requirements**:
  - `programmatic` TR-8.1: 网络错误时能正确处理
  - `programmatic` TR-8.2: API调用失败时能正确处理
  - `programmatic` TR-8.3: 语音识别超时能正确处理
- **Notes**: 添加适当的错误捕获和处理逻辑

#### 3.2 性能优化
- **Priority**: P2
- **Depends On**: 2.2, 2.3
- **Description**: 优化语音识别和API调用的性能
- **Success Criteria**: 语音识别和数据提取的响应时间在可接受范围内
- **Test Requirements**:
  - `programmatic` TR-9.1: 语音识别响应时间 < 3秒
  - `programmatic` TR-9.2: 数据提取响应时间 < 2秒
- **Notes**: 可以考虑添加加载状态，提升用户体验

#### 3.3 测试与验证
- **Priority**: P1
- **Depends On**: 所有功能实现
- **Description**: 进行全面的测试，确保功能正常
- **Success Criteria**: 所有功能都能正常工作，没有明显的bug
- **Test Requirements**:
  - `human-judgment` TR-10.1: 功能测试通过
  - `programmatic` TR-10.2: 代码检查通过
- **Notes**: 测试各种语音输入场景，确保识别和提取的准确性

## 技术实现细节

### 1. 语音识别实现

使用腾讯云ASR API，实现步骤：
1. 录制用户语音
2. 将语音文件上传到腾讯云
3. 调用ASR API进行识别
4. 获取识别结果

### 2. 数据提取实现

使用智谱API，实现步骤：
1. 构建包含语音识别结果的提示词
2. 调用智谱API
3. 解析API返回的JSON结果
4. 提取日期、标签、金额等信息

### 3. 状态管理

复用现有的 `BudgetContext`，使用 `ADD_EXPENSE` action 添加支出。

### 4. 界面实现

- 语音输入界面：显示录音状态、倒计时等
- 提示弹窗：显示各种操作的结果

## 风险评估

1. **API依赖风险**：依赖腾讯云ASR和智谱API，需要确保API密钥的安全性和稳定性
2. **语音识别准确率**：可能存在语音识别不准确的情况，需要处理识别失败的情况
3. **数据提取准确率**：LLM可能无法正确提取所有支出信息，需要处理提取失败的情况
4. **用户体验**：语音输入的响应时间可能影响用户体验，需要优化性能

## 预期成果

通过实现语音记账功能，用户可以通过长按添加按钮，使用语音输入的方式快速添加支出，提高记账的便捷性和效率。

## 实施时间预估

| 任务 | 预计时间 |
|------|----------|
| 环境准备与依赖安装 | 0.5天 |
| 配置环境变量 | 0.5天 |
| 添加按钮长按事件处理 | 0.5天 |
| 语音输入组件开发 | 1.5天 |
| 数据提取逻辑实现 | 1天 |
| 支出添加与状态管理 | 0.5天 |
| 弹窗提示功能 | 0.5天 |
| 错误处理与边界情况 | 0.5天 |
| 性能优化 | 0.5天 |
| 测试与验证 | 1天 |

总计：7天