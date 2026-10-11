const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const ledger = { id: 'ledger-1', name: 'aierwa', password_hash: 'test-hash' };
const connectionError = '暂时无法完成登录验证，请检查网络后重试；若持续失败，请联系维护者。';

// 执行真实登录表单，仅模拟 React、密码比较和远端查询，不读取线上密码。
function setup() {
  let stateIndex = 0;
  const states = [];
  const storage = new Map();
  const queries = [];
  const passwords = [];
  let successes = 0;
  let response = { data: ledger, error: null };
  let passwordValid = true;
  const react = {
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
    useState: (initial) => {
      const index = stateIndex++;
      if (!(index in states)) states[index] = initial;
      return [states[index], (value) => { states[index] = value; }];
    }
  };
  const from = (table) => {
    assert.equal(table, 'ledgers');
    const result = async () => {
      if (response instanceof Error) throw response;
      return response;
    };
    const builder = {
      select: () => builder,
      eq: (field, value) => { queries.push({ field, value }); return builder; },
      single: result,
      maybeSingle: result
    };
    return builder;
  };
  const exports = {};
  const source = fs.readFileSync(path.join(__dirname, '../src/components/LedgerAuth.tsx'), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true }
  }).outputText;
  vm.runInNewContext(compiled, {
    exports,
    Error,
    require: (name) => {
      if (name === 'react') return react;
      if (name === '../lib/supabase') return { supabase: { from } };
      if (name === 'bcryptjs') return { compare: async (password, hash) => {
        passwords.push({ password, hash });
        return passwordValid;
      } };
      throw new Error(`Unexpected import: ${name}`);
    },
    localStorage: { setItem: (key, value) => storage.set(key, value) }
  });
  const render = () => {
    stateIndex = 0;
    return exports.default({ onSuccess: () => { successes++; } });
  };
  const nodes = (node) => node && typeof node === 'object'
    ? [node, ...node.props.children.flatMap(nodes)] : [];
  const find = (predicate) => nodes(render()).find(predicate);
  const input = (id, value) => find((node) => node.props.id === id).props.onChange({ target: { value } });
  return {
    queries, passwords, storage, find, input,
    error: () => states[2],
    successes: () => successes,
    respond: (value) => { response = value; },
    passwordValid: (value) => { passwordValid = value; },
    submit: () => find((node) => node.type === 'form').props.onSubmit({ preventDefault() {} })
  };
}

for (const name of ['aierwa', ' aierwa ', '\u3000aierwa\u00a0\n']) {
  test(`名称前后空白不影响登录：${JSON.stringify(name)}`, async () => {
    const app = setup();
    app.input('ledgerName', name);
    app.input('password', ' password ');
    await app.submit();
    assert.deepEqual(app.queries, [{ field: 'name', value: 'aierwa' }]);
    assert.deepEqual(app.passwords, [{ password: ' password ', hash: 'test-hash' }]);
    const saved = JSON.parse(app.storage.get('budget-app-auth'));
    assert.equal(saved.ledgerName, 'aierwa');
    assert.equal(saved.ledgerId, ledger.id);
    assert.ok(Date.parse(saved.expiresAt) > Date.now());
    assert.equal('password_hash' in saved, false);
    assert.equal('password' in saved, false);
    assert.equal(app.successes(), 1);
    assert.equal(app.error(), '');
  });
}

test('纯空白名称不请求服务器', async () => {
  const app = setup();
  app.input('ledgerName', ' \u3000\t');
  await app.submit();
  assert.equal(app.error(), '请输入账本名称');
  assert.equal(app.queries.length, 0);
  assert.equal(app.successes(), 0);
});

test('名称大小写与内部字符保持原样，空结果才提示不存在', async () => {
  const app = setup();
  app.input('ledgerName', ' Ai erwa ');
  app.respond({ data: null, error: null });
  await app.submit();
  assert.equal(app.queries[0].value, 'Ai erwa');
  assert.equal(app.error(), '账本不存在，请检查名称及大小写');
  assert.equal(app.passwords.length, 0);
  assert.equal(app.storage.size, 0);
  assert.equal(app.successes(), 0);
});

for (const failure of [new Error('Failed to fetch'),
  { data: null, error: { message: 'Service unavailable', status: 503 } },
  { data: null, error: { message: 'Multiple rows', code: 'PGRST116' } }]) {
  test(`查询异常不误报不存在，允许重试：${failure.message ?? failure.error.message}`, async () => {
    const app = setup();
    app.input('ledgerName', 'aierwa');
    app.respond(failure);
    await app.submit();
    assert.equal(app.error(), connectionError);
    assert.equal(app.passwords.length, 0);
    assert.equal(app.storage.size, 0);
    assert.equal(app.successes(), 0);
    assert.equal(app.find((node) => node.type === 'button').props.disabled, false);
    app.respond({ data: ledger, error: null });
    await app.submit();
    assert.equal(app.error(), '');
    assert.equal(app.successes(), 1);
  });
}

test('错误密码不写入登录信息', async () => {
  const app = setup();
  app.input('ledgerName', 'aierwa');
  app.passwordValid(false);
  await app.submit();
  assert.equal(app.error(), '密码错误');
  assert.equal(app.storage.size, 0);
  assert.equal(app.successes(), 0);
});

test('名称输入关闭自动大写和纠错，支持登录自动填充', () => {
  const app = setup();
  const name = app.find((node) => node.props.id === 'ledgerName').props;
  assert.equal(name.autoCapitalize, 'none');
  assert.equal(name.autoCorrect, 'off');
  assert.equal(name.spellCheck, false);
  assert.equal(name.autoComplete, 'username');
  assert.equal(app.find((node) => node.props.id === 'password').props.autoComplete, 'current-password');
});
