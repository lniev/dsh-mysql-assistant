#!/usr/bin/env node
/**
 * Dev-only visual preview generator for the knowledge map.
 *
 * Builds a standalone HTML page (default `/tmp/mysql-map-preview.html`) that
 * boots the built client bundle with the real generated knowledge data, a
 * stubbed Host API and React UMD, so a headless browser can screenshot the map
 * without the Harness shell. Useful to iterate on layout/edge styling.
 *
 * Usage:
 *   node scripts/preview-map.mjs [--out /tmp/map.html] [--select "SELECT"]
 * Then screenshot with Chrome headless:
 *   "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new \
 *     --disable-gpu --hide-scrollbars --window-size=1440,1000 \
 *     --screenshot=/tmp/mysql-map.png --virtual-time-budget=4000 \
 *     "file:///tmp/mysql-map-preview.html"
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argValue = (flag, fallback) => {
	const index = process.argv.indexOf(flag);
	return index >= 0 && typeof process.argv[index + 1] === 'string' ? process.argv[index + 1] : fallback;
};
const outPath = path.resolve(argValue('--out', '/tmp/mysql-map-preview.html'));
const selectTitle = argValue('--select', 'SELECT：从表里挑列');
const hoverTitle = argValue('--hover', '');
const envPanel = process.argv.indexOf('--env') >= 0;
const allEdges = process.argv.indexOf('--all') >= 0;
const pathTitle = argValue('--path', '');
const tabTitle = argValue('--tab', '');
const darkMode = process.argv.indexOf('--dark') >= 0;
const lightTokens = `
    --dsw-alias-bg-base: #f7f7f8;
    --dsw-alias-bg-layer-1: #ffffff;
    --dsw-alias-bg-layer-2: #f0f0f3;
    --dsw-alias-bg-overlay: #ffffff;
    --dsw-alias-border-l1: #e4e4e9;
    --dsw-alias-border-l2: #d0d0d8;
    --dsw-alias-brand-primary: #4f6bed;
    --dsw-alias-label-primary: #1c1c21;
    --dsw-alias-label-secondary: #6b6b76;
    --dsw-alias-state-error-primary: #d64545;
    --dsw-alias-state-idle-primary: #a0a0aa;
    --dsw-alias-state-success-primary: #2f9e6e;
    --dsw-alias-state-warn-primary: #c98a1b;
    --dsw-specific-sidebar-fill: #f2f2f5;`;
const darkTokens = `
    --dsw-alias-bg-base: #141417;
    --dsw-alias-bg-layer-1: #1c1c21;
    --dsw-alias-bg-layer-2: #26262d;
    --dsw-alias-bg-overlay: #232329;
    --dsw-alias-border-l1: #2e2e36;
    --dsw-alias-border-l2: #41414c;
    --dsw-alias-brand-primary: #7f9cff;
    --dsw-alias-label-primary: #ececf1;
    --dsw-alias-label-secondary: #9c9caa;
    --dsw-alias-state-error-primary: #f07171;
    --dsw-alias-state-idle-primary: #6b6b78;
    --dsw-alias-state-success-primary: #4ade9a;
    --dsw-alias-state-warn-primary: #e3b341;
    --dsw-specific-sidebar-fill: #1a1a1f;`;

const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const knowledge = JSON.parse(read('knowledge/data.json'));
const exercises = JSON.parse(read('playground/exercises.json'));
const dictionaryFile = read('src/00-dicts.js');
const zh = new Function(dictionaryFile + '\nreturn MYSQL_ZH_BASE;')();

const react = read('node_modules/react/umd/react.development.js');
const reactDom = read('node_modules/react-dom/umd/react-dom.development.js');
const client = read('client.js');

const schema = {
	name: 'shop',
	tables: [
		{ name: 'orders', rowCount: 24, columns: [{ name: 'id', type: 'INTEGER', primaryKey: true }, { name: 'status', type: 'VARCHAR(20)', primaryKey: false }] },
		{ name: 'products', rowCount: 15, columns: [{ name: 'id', type: 'INTEGER', primaryKey: true }, { name: 'price', type: 'DECIMAL(10,2)', primaryKey: false }] }
	]
};

const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>MySQL Assistant — map preview</title>
<style>
  /* approximate DSH theme tokens so the preview renders like the app */
  :root {
    ${darkMode ? darkTokens : lightTokens}
  }
  html, body, #root { height: 100%; margin: 0; }
  body { overflow: hidden; background: var(--dsw-alias-bg-base); }
</style>
</head>
<body>
<div id="root"></div>
<script>${react}</script>
<script>${reactDom}</script>
<script>
  window.__DATA__ = ${JSON.stringify({ knowledge, exercises, schema, zh })};
  window.localStorage.setItem('mysql-assistant:tab', JSON.stringify('map'));
  window.__ModuleLoader__ = {
    load: function (entry) {
      window.__ENTRY__ = entry;
    }
  };
</script>
<script>${client}</script>
<script>
(function () {
  const data = window.__DATA__;
  const zh = data.zh;
  function t(key, params) {
    let text = zh[key] === undefined ? String(key) : zh[key];
    if (params && typeof params === 'object') {
      text = text.replace(/\\{([a-zA-Z0-9_]+)\\}/g, function (match, name) {
        return params[name] === undefined ? match : String(params[name]);
      });
    }
    return text;
  }
  const jsonResponse = function (payload) {
    return { ok: true, status: 200, json: async function () { return payload; } };
  };
  window.fetch = async function (url, options) {
    const route = String(url).replace('/mysql-assistant/api', '').split('?')[0];
    if (route === '/kb') return jsonResponse({ ok: true, knowledge: data.knowledge });
    const demoEnvironment = { mode: 'compat', mysql: { host: '127.0.0.1', port: 3306, user: 'root', database: 'mysql_learn', hasPassword: false }, status: { connected: false, version: null, database: null, error: null } };
    if (route === '/playground') return jsonResponse({ ok: true, exercises: data.exercises, schema: data.schema, environment: demoEnvironment });
    if (route === '/playground/environment/test') return jsonResponse({ ok: true, info: { version: '8.0.36', database: 'mysql_learn' } });
    if (route === '/playground/environment') {
      if (String(options.method || 'GET').toUpperCase() === 'GET') return jsonResponse({ ok: true, environment: demoEnvironment });
      const body = JSON.parse(options.body);
      const next = body.mode === 'mysql' ? { mode: 'mysql', mysql: Object.assign({}, demoEnvironment.mysql, { hasPassword: true }), status: { connected: true, version: '8.0.36', database: 'mysql_learn', error: null } } : demoEnvironment;
      return jsonResponse({ ok: true, environment: next });
    }
    if (route === '/playground/query') return jsonResponse({ ok: true, result: { columns: ['name', 'order_count', 'total'], rows: [['张三', 3, '38062.70'], ['李四', 2, '22190.00'], ['王五', 2, '9999.00']], rowCount: 3, affected: 0, elapsedMs: 1, messages: ['返回 3 行'], statements: [], truncated: false } });
    if (route === '/playground/check') return jsonResponse({ ok: true, check: { pass: true, reason: 'ok', expected: { columns: ['name'], rows: [['x']] }, actual: { columns: ['name'], rows: [['x']] } } });
    if (route === '/playground/reset') return jsonResponse({ ok: true, schema: data.schema });
    throw new Error('unexpected fetch ' + route);
  };
  const React = window.React;
  const h = React.createElement;
  let Main = null;
  const entry = window.__ENTRY__;
  const captured = entry.factory(function (name) {
    if (name === 'react') return React;
    throw new Error('unknown module ' + name);
  });
  const sampleTime = Date.now() - 60000;
  const sampleRecords = [
    { type: 'event', event: { type: 'user/message', seq: 1, time: sampleTime, data: { id: 'u1', source: { kind: 'user' }, content: [{ type: 'text', text: '请用生活比喻讲清「索引失效」，再给我 3 道由浅入深的练习。' }] } } },
    { type: 'event', event: { type: 'tool/call', seq: 2, time: sampleTime + 800, data: { callId: 'c1', name: 'mysql_docs', arguments: '{"action":"search","query":"索引失效"}' } } },
    { type: 'event', event: { type: 'tool/result', seq: 3, time: sampleTime + 1200, data: { message: { isError: false, source: { callId: 'c1' }, content: [{ type: 'text', text: '- index-failure 索引失效的常见场景：给列套函数、隐式类型转换、LIKE 以 % 开头、联合索引跳列…' }] } } } },
    { type: 'event', event: { type: 'assistant/message', seq: 4, time: sampleTime + 3000, data: { turn: 1, step: 1, message: { id: 'a1', content: [{ type: 'text', text: '索引像书的目录：目录还在，但你的查询方式让它用不上。\\n\\n## 最常见的 4 个坑\\n- 给列套函数：WHERE DATE(created_at) = ... → 改成范围查询\\n- 隐式类型转换：字符串列和数字比较 → 两边类型一致\\n- LIKE 以 % 开头：LIKE %手机 → 改成前缀匹配或全文检索\\n- 联合索引跳列：(a,b,c) 直接查 b → 从最左列开始用\\n\\n## 3 道练习\\n1. 用 EXPLAIN 判断 WHERE status = paid 是否走索引。\\n2. 把 WHERE YEAR(created_at)=2026 改成能走索引的写法。\\n3. 为 (user_id, status, created_at) 设计一条不跳列的查询。' }] } } } }
  ];
  const fakeRemote = {
    session: {
      state: async function () { return { ok: true, value: {} }; },
      create: async function () { return { ok: true, value: { sessionId: 'preview-coach' } }; },
      rename: async function () { return { ok: true }; },
      prompt: async function () { return { ok: true }; },
      follow: function (address, signal) {
        return (async function* () {
          yield { type: 'snapshot', records: sampleRecords, assistantStream: null };
          await new Promise(function (resolve) { if (signal) signal.addEventListener('abort', resolve); else setTimeout(resolve, 120000); });
        })();
      },
      observeState: function (address, signal) {
        return (async function* () {
          yield { running: false };
          await new Promise(function (resolve) { if (signal) signal.addEventListener('abort', resolve); else setTimeout(resolve, 120000); });
        })();
      }
    }
  };
  const ctx = {
    effect: function (fn) { fn(); return function () {}; },
    locale: { register: function () {}, bind: function () { return t; } },
    remote: fakeRemote,
    uiWorkspace: { openSession: function () {} },
    slots: {
      inject: function (name, run) { run(); },
      register: function (options, component) { if (options.name === 'main') Main = component; return function () {}; }
    }
  };
  captured.apply(ctx);
  const rootEl = document.getElementById('root');
  const root = window.ReactDOM.createRoot(rootEl);
  const fakeSessions = function () { return { byId: {} }; };
  const fakeWorkspaces = function () { return { items: [{ workspaceId: 'preview-ws', title: '预览工作区', path: '/tmp/mysql-assistant-ws', sessionIds: [], createdAt: new Date().toISOString() }] }; };
  root.render(h(Main, { t: t, useSessions: fakeSessions, useWorkspaces: fakeWorkspaces }));
  function findByText(selector, text) {
    const nodes = Array.prototype.slice.call(document.querySelectorAll(selector));
    return nodes.find(function (element) { return (element.textContent || '').indexOf(text) >= 0; });
  }
  setTimeout(function () {
    const node = findByText('.mymap-node', ${JSON.stringify(selectTitle)});
    if (node) node.click();
    if (node) node.scrollIntoView({ block: 'center' });
    const pathChip = ${JSON.stringify(pathTitle)} === '' ? null : findByText('.mymap-pathChip', ${JSON.stringify(pathTitle)});
    if (pathChip) pathChip.click();
    if (${allEdges ? 'true' : 'false'}) {
      const toggle = document.querySelector('.mymap-toggle');
      if (toggle) toggle.click();
    }
  }, 400);
  ${tabTitle === '' ? '' : `
  setTimeout(function () {
    const tab = findByText('.my-tab', ${JSON.stringify(tabTitle)});
    if (tab) tab.click();
  }, 300);`}
  ${envPanel ? `
  setTimeout(function () {
    const button = document.querySelector('.my-envBtn');
    if (button) button.click();
  }, 600);
  setTimeout(function () {
    const mode = Array.from(document.querySelectorAll('.my-envMode')).find(function (el) { return (el.textContent || '').indexOf('真实 MySQL') >= 0; });
    if (mode) mode.click();
  }, 950);` : ''}
  ${hoverTitle === '' ? '' : `
  setTimeout(function () {
    const node = findByText('.mymap-node', ${JSON.stringify(hoverTitle)});
    if (node) node.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
  }, 800);`}
})();
</script>
</body>
</html>
`;

fs.writeFileSync(outPath, html);
console.log('preview written:', outPath, (fs.statSync(outPath).size / 1024).toFixed(1) + ' KB');
