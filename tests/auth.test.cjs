const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const AUTH_KEY = 'budget-app-auth';
const validAuth = JSON.stringify({ ledgerId: 'ledger-1', expiresAt: '2099-01-01T00:00:00Z' });
const ledger = { id: 'ledger-1', name: 'test', default_monthly_budget: 7000 };

// 使用真实 Provider/checkAuth，只替换浏览器存储、React hooks 和远端请求；不访问线上账本。
function setup(raw = validAuth) {
  const storage = new Map(raw === null ? [] : [[AUTH_KEY, raw]]);
  let response = { data: ledger, error: null };
  let stateIndex = 0;
  const states = [];
  const actions = [];
  const react = {
    createContext: () => ({ Provider: 'provider' }),
    createElement: (type, props) => ({ type, props }),
    useState: (initial) => {
      const index = stateIndex++;
      if (!(index in states)) states[index] = initial;
      return [states[index], (value) => { states[index] = value; }];
    },
    useRef: () => ({ current: false }),
    useReducer: (_, initial) => [initial, (action) => actions.push(action)],
    useCallback: (callback) => callback,
    useEffect: () => {}
  };
  const query = (table) => {
    const result = () => {
      if (table !== 'ledgers') return { data: [], error: null };
      if (response instanceof Error) throw response;
      return response;
    };
    const builder = {
      select: () => builder,
      eq: () => builder,
      single: async () => result(),
      maybeSingle: async () => result(),
      then: (resolve, reject) => Promise.resolve().then(result).then(resolve, reject)
    };
    return builder;
  };
  const exports = {};
  const source = fs.readFileSync(path.join(__dirname, '../src/contexts/BudgetContext.tsx'), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true }
  }).outputText;
  vm.runInNewContext(compiled, {
    exports,
    require: (name) => {
      if (name === 'react') return react;
      if (name === '../lib/supabase') return { supabase: { from: query } };
      if (name === '../utils/bookkeeperStorage') return { getStoredBookkeeper: () => null };
      if (name === '../utils/dateUtils') return { getCurrentMonth: () => '2026-10' };
      if (name === '../utils/budgetUtils') return {};
      throw new Error(`Unexpected import: ${name}`);
    },
    localStorage: {
      getItem: (key) => storage.get(key) ?? null,
      removeItem: (key) => storage.delete(key)
    },
    console: { log() {}, error() {} }
  });
  const render = () => {
    stateIndex = 0;
    return exports.BudgetProvider({ children: null }).props.value;
  };
  return { storage, actions, render, respond: (value) => { response = value; } };
}

for (const failure of [new Error('Failed to fetch'), { data: null, error: { message: 'Service unavailable', status: 503 } }]) {
  test(`连接失败保留登录信息并允许重试：${failure.message ?? failure.error.message}`, async () => {
    const app = setup();
    app.respond(failure);
    assert.equal(await app.render().checkAuth(), false);
    assert.equal(app.storage.get(AUTH_KEY), validAuth);
    assert.ok(app.render().authError);
    assert.equal(app.actions.some((action) => action.type === 'SET_LEDGER'), false);
    app.respond({ data: ledger, error: null });
    assert.equal(await app.render().checkAuth(), true);
    assert.equal(app.render().authError, null);
    assert.equal(app.storage.get(AUTH_KEY), validAuth);
    assert.ok(app.actions.some((action) => action.type === 'SET_LEDGER'));
  });
}

test('确认账本不存在时清除登录信息', async () => {
  const app = setup();
  app.respond({ data: null, error: null });
  assert.equal(await app.render().checkAuth(), false);
  assert.equal(app.storage.has(AUTH_KEY), false);
  assert.equal(app.render().authError, null);
});

for (const raw of [null, '{', 'null', '{}', JSON.stringify({ ledgerId: 'ledger-1', expiresAt: 'invalid' }), JSON.stringify({ ledgerId: 'ledger-1', expiresAt: '2000-01-01' })]) {
  test(`缺失、损坏或过期的登录信息返回登录页：${raw}`, async () => {
    const app = setup(raw);
    assert.equal(await app.render().checkAuth(), false);
    assert.equal(app.storage.has(AUTH_KEY), false);
    assert.equal(app.render().authError, null);
  });
}

test('有效登录恢复成功且不延长原有效期', async () => {
  const app = setup();
  assert.equal(await app.render().checkAuth(), true);
  assert.equal(app.storage.get(AUTH_KEY), validAuth);
  assert.equal(app.render().authError, null);
});
