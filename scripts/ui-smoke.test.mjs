#!/usr/bin/env node
/**
 * Browser-half render smoke test.
 *
 * Loads the built `client.js` inside jsdom, registers the panel through a fake
 * Client context, then renders every tab against the real generated content and
 * a stubbed Host API. This catches JSX/render errors, missing translation keys
 * and broken data wiring without a real browser.
 *
 * Usage: node scripts/ui-smoke.test.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import React from 'react';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let failures = 0;
const check = (condition, label, detail) => {
	if (condition) {
		console.log('  ✓ ' + label);
	} else {
		failures += 1;
		console.log('  ✗ ' + label + (detail === undefined ? '' : ' — ' + detail));
	}
};

// ---- real content used by the stubbed Host API -----------------------------
const knowledge = JSON.parse(fs.readFileSync(path.join(root, 'knowledge', 'data.json'), 'utf8'));
const exercisesData = JSON.parse(fs.readFileSync(path.join(root, 'playground', 'exercises.json'), 'utf8'));
const schema = {
	name: 'shop',
	tables: [
		{ name: 'orders', rowCount: 24, columns: [{ name: 'id', type: 'INTEGER', primaryKey: true }, { name: 'status', type: 'VARCHAR(20)', primaryKey: false }] },
		{ name: 'products', rowCount: 15, columns: [{ name: 'id', type: 'INTEGER', primaryKey: true }, { name: 'price', type: 'DECIMAL(10,2)', primaryKey: false }] }
	]
};
const tables = exercisesData.exercises;
const firstExercise = tables[0];

// ---- translation dictionary (real zh strings from src/00-dicts.js) ---------
const dictionaryFile = fs.readFileSync(path.join(root, 'src', '00-dicts.js'), 'utf8');
const zh = new Function(dictionaryFile + '\nreturn MYSQL_ZH_BASE;')();
const t = (key, params) => {
	let text = zh[key] === undefined ? String(key) : zh[key];
	if (params !== null && params !== undefined && typeof params === 'object') {
		text = text.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, name) => (params[name] === undefined ? match : String(params[name])));
	}
	return text;
};

// ---- jsdom environment -----------------------------------------------------
const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
	url: 'http://127.0.0.1:56324/',
	pretendToBeVisual: true
});
globalThis.window = dom.window;
globalThis.document = dom.window.document;
Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true });
globalThis.localStorage = dom.window.localStorage;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

/** JSON response helper for the fetch stub. */
const jsonResponse = (payload) => ({
	ok: true,
	status: 200,
	json: async () => payload
});
let queriedSql = '';
const fetchStub = async (url, options) => {
	const route = String(url).replace('/mysql-assistant/api', '').split('?')[0];
	if (route === '/kb') return jsonResponse({ ok: true, knowledge });
	if (route === '/playground/environment') return jsonResponse({ ok: true, environment: { mode: 'compat', mysql: { host: '127.0.0.1', port: 3306, user: 'root', database: 'mysql_learn', hasPassword: false }, status: { connected: false, version: null, database: null, error: null } } });
	if (route === '/playground') return jsonResponse({ ok: true, exercises: exercisesData, schema, environment: { mode: 'compat', mysql: { host: '127.0.0.1', port: 3306, user: 'root', database: 'mysql_learn', hasPassword: false }, status: { connected: false, version: null, database: null, error: null } } });
	if (route === '/playground/query') {
		queriedSql = JSON.parse(options.body).sql;
		return jsonResponse({
			ok: true,
			result: {
				columns: ['name', 'price'],
				rows: [['轻薄笔记本', '9999'], ['旗舰手机 Pro', '6999']],
				rowCount: 2,
				affected: 0,
				elapsedMs: 3,
				messages: ['返回 2 行'],
				statements: [{ sql: queriedSql, status: '返回 2 行' }],
				truncated: false
			}
		});
	}
	if (route === '/playground/check') {
		return jsonResponse({
			ok: true,
			check: { pass: true, reason: '结果和参考答案一致，通过！', expected: { columns: ['name', 'price'], rows: [['轻薄笔记本', '9999']] }, actual: { columns: ['name', 'price'], rows: [['轻薄笔记本', '9999']] }, rowCount: 2 }
		});
	}
	if (route === '/playground/reset') return jsonResponse({ ok: true, schema });
	throw new Error('unexpected fetch ' + route);
};
dom.window.fetch = fetchStub;
globalThis.fetch = fetchStub;

// ---- load the built bundle through a fake module loader --------------------
let captured = null;
dom.window.__ModuleLoader__ = {
	load(entry) {
		captured = entry.factory((name) => {
			if (name === 'react') return React;
			throw new Error('unknown module ' + name);
		});
	}
};
const bundle = fs.readFileSync(path.join(root, 'client.js'), 'utf8');
new Function('window', 'React', bundle)(dom.window, React);

check(captured !== null && typeof captured.apply === 'function', 'client bundle factory executed');
const { apply } = captured;
let Main = null;
const ctx = {
	effect(fn) {
		fn();
		return () => {};
	},
	locale: {
		register() {},
		bind() {
			return t;
		}
	},
	slots: {
		inject(_name, run) {
			run();
		},
		register(options, component) {
			if (options.name === 'main') Main = component;
			return () => {};
		}
	}
};
apply(ctx);
check(Main !== null, 'panel registered into the main slot');

const { createRoot } = await import('react-dom/client');
const container = dom.window.document.getElementById('root');
const rootRenderer = createRoot(container);
const tick = async (ms = 40) => {
	await React.act(async () => {
		await new Promise((resolve) => setTimeout(resolve, ms));
	});
};
await React.act(async () => {
	rootRenderer.render(React.createElement(Main, { t }));
});
await tick(80);

const text = () => container.textContent || '';
const clickTab = async (label) => {
	const tabs = Array.from(container.querySelectorAll('.my-tab'));
	const tab = tabs.find((element) => (element.textContent || '').indexOf(label) >= 0);
	check(tab !== undefined, 'tab exists: ' + label);
	if (tab === undefined) return;
	await React.act(async () => {
		tab.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
	});
	await tick(80);
};

console.log('知识地图 tab…');
check(text().indexOf('MySQL 知识地图') >= 0, 'map title renders');
const mapNodes = container.querySelectorAll('.mymap-node');
check(mapNodes.length >= 60, 'map renders topic nodes', String(mapNodes.length));
check(text().indexOf('MySQL 是什么') >= 0, 'default topic detail renders');
check(text().indexOf('讲人话') >= 0, 'topic summary block renders');
check(container.querySelectorAll('.mymap-edges path').length > 0, 'dependency edges render');
check(text().indexOf('推荐路线') >= 0, 'recommended paths render');
// clicking a node must open that topic's detail (the core "clickable map" claim)
const mvccNode = Array.from(container.querySelectorAll('.mymap-node')).find((node) => (node.textContent || '').indexOf('MVCC') >= 0);
check(mvccNode !== undefined, 'MVCC node exists in the map');
if (mvccNode !== undefined) {
	await React.act(async () => {
		mvccNode.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
	});
	await tick(60);
	check((container.querySelector('.mymap-title') || {}).textContent === 'MVCC：读不加锁的秘密', 'clicking a node opens its detail');
}

console.log('学习路线 tab…');
await clickTab('学习路线');
check(text().indexOf('MySQL 学习路线') >= 0, 'route title renders');
check(text().indexOf('整体进度') >= 0, 'route progress renders');
check(text().indexOf('交付物') >= 0, 'route items render deliverables');

console.log('企业级实战 tab…');
await clickTab('企业级实战');
check(text().indexOf('电商订单库建模') >= 0, 'labs list renders');
check(text().indexOf('业务背景') >= 0, 'lab detail renders background');
check(container.querySelectorAll('.mylab-card').length >= 6, 'lab cards render');
const labAskButton = Array.from(container.querySelectorAll('button')).find((button) => (button.textContent || '').indexOf(t('labs.askAi')) >= 0);
check(labAskButton !== undefined, 'lab “ask AI” button renders');
if (labAskButton !== undefined) {
	await React.act(async () => {
		labAskButton.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
	});
	await tick(60);
	const selectedTab = Array.from(container.querySelectorAll('.my-tab')).find((tab) => tab.getAttribute('aria-selected') === 'true');
	check(selectedTab !== undefined && (selectedTab.textContent || '').indexOf(t('tab.ai')) >= 0, 'lab ask button opens the AI tab');
}

console.log('SQL 操练场 tab…');
await clickTab('SQL 操练场');
check(text().indexOf('SQL 操练场') >= 0, 'playground title renders');
check(text().indexOf(firstExercise.titleZh) >= 0, 'exercise list renders', firstExercise.titleZh);
check(text().indexOf('示例库结构') >= 0, 'schema browser renders');
const envButton = container.querySelector('.my-envBtn');
check(envButton !== null, 'execution environment button renders in the header');
if (envButton !== null) {
	await React.act(async () => {
		envButton.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
	});
	await tick(40);
	check(container.querySelector('.my-envPopover') !== null, 'environment popover opens from the header');
	check(text().indexOf('真实 MySQL') >= 0, 'real MySQL option is offered');
}
const freeButton = container.querySelector('.mypg-freeBtn');
if (freeButton !== null) {
	await React.act(async () => {
		freeButton.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
	});
	await tick(40);
	check(text().indexOf(t('pg.askAiDebug')) >= 0, 'free mode offers “ask AI to debug”');
}
// switching exercises swaps the task card and editor content
const secondExercise = tables[1];
const secondItem = Array.from(container.querySelectorAll('.mypg-ex')).find((item) => (item.textContent || '').indexOf(secondExercise.id) >= 0);
check(secondItem !== undefined, 'exercise list item exists');
if (secondItem !== undefined) {
	await React.act(async () => {
		secondItem.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
	});
	await tick(60);
	check(text().indexOf(secondExercise.titleZh) >= 0, 'clicking an exercise shows its task');
}
const editor = container.querySelector('textarea.mypg-editor');
check(editor !== null, 'SQL editor renders');
if (editor !== null) {
	const sql = 'SELECT name, price FROM products WHERE on_sale = 1;';
	const setter = Object.getOwnPropertyDescriptor(dom.window.HTMLTextAreaElement.prototype, 'value').set;
	await React.act(async () => {
		setter.call(editor, sql);
		editor.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
	});
	const runButton = Array.from(container.querySelectorAll('.mypg-editorActions button')).find((button) => (button.textContent || '').trim() === t('pg.run'));
	check(runButton !== undefined, 'run button renders');
	if (runButton !== undefined) {
		await React.act(async () => {
			runButton.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
		});
		await tick(80);
		check(queriedSql === sql, 'run button sends the editor SQL');
		check(text().indexOf('轻薄笔记本') >= 0, 'query result table renders');
		const checkButton = Array.from(container.querySelectorAll('.mypg-editorActions button')).find((button) => (button.textContent || '').indexOf(t('pg.runAndCheck')) >= 0);
		if (checkButton !== undefined) {
			await React.act(async () => {
				checkButton.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
			});
			await tick(120);
			check(text().indexOf(t('pg.pass')) >= 0, 'auto-grading result renders');
		}
	}
}

console.log('AI 问答 tab…');
await clickTab('AI 问答');
check(text().indexOf(t('ai.quickTitle')) >= 0, 'AI quick prompt strip renders');
check(container.querySelectorAll('.myai-quick .my-topicChip').length === 5, 'five quick prompts render');
check(text().indexOf(t('workspace.empty')) >= 0, 'AI tab explains that a workspace is needed');
check(container.querySelector('.my-composerInput') !== null, 'AI composer renders');

console.log('跨 tab 跳转…');
const mapTab = Array.from(container.querySelectorAll('.my-tab')).find((element) => (element.textContent || '').indexOf('知识地图') >= 0);
if (mapTab !== undefined) {
	await React.act(async () => {
		mapTab.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
	});
	await tick(60);
	const learningButton = Array.from(container.querySelectorAll('button')).find((button) => (button.textContent || '').indexOf(t('map.markDone')) >= 0);
	check(learningButton !== undefined, '“标记已学” button renders on the topic detail');
}

rootRenderer.unmount();
if (failures > 0) {
	console.log('\n✗ UI smoke test: ' + failures + ' failures');
	process.exit(1);
}
console.log('\n✓ UI smoke test passed (jsdom)');
