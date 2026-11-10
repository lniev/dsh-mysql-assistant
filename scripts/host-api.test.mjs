#!/usr/bin/env node
/**
 * Host-half integration test: registers the plugin against a fake Cordis Host
 * context, then drives the registered HTTP routes and the `mysql_docs` tool.
 *
 * Usage: node scripts/host-api.test.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { EventEmitter } from 'node:events';
import { apply, inject, name } from '../index.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let failures = 0;
const check = (condition, label, detail) => {
	if (condition) console.log('  ✓ ' + label);
	else {
		failures += 1;
		console.log('  ✗ ' + label + (detail === undefined ? '' : ' — ' + detail));
	}
};

// ---- fake Host context -----------------------------------------------------
let route = null;
let tool = null;
const tools = {};
let promptSection = null;
const disposers = [];
const ctx = {
	effect(fn) {
		const dispose = fn();
		if (typeof dispose === 'function') disposers.push(dispose);
		return () => {};
	},
	get() {
		return undefined;
	},
	logger: { debug() {}, warn() {}, error() {} },
	systemPrompt: {
		section(section) {
			promptSection = section;
			return () => {};
		}
	},
	tools: {
		register(candidate) {
			tools[candidate.name] = candidate;
			if (candidate.name === 'mysql_docs') tool = candidate;
			return () => {};
		}
	},
	webServer: {
		register(registration) {
			route = registration;
			return () => {};
		}
	}
};
apply(ctx);
check(name === 'mysql-assistant', 'plugin name');
check(Array.isArray(inject) && inject.indexOf('webServer') >= 0 && inject.indexOf('tools') >= 0, 'inject list');
check(route !== null && route.path === '/mysql-assistant/api', 'API route registered at /mysql-assistant/api');
check(tool !== null && tool.name === 'mysql_docs', 'mysql_docs tool registered');
check(promptSection !== null && typeof promptSection.text === 'string' && promptSection.text.indexOf('MySQL') >= 0, 'system prompt section registered');

// ---- tiny HTTP harness -----------------------------------------------------
function makeRequest(method, url, body) {
	const req = new EventEmitter();
	req.method = method;
	req.url = url;
	if (body !== undefined) {
		process.nextTick(() => {
			req.emit('data', Buffer.from(JSON.stringify(body), 'utf8'));
			req.emit('end');
		});
	} else {
		process.nextTick(() => req.emit('end'));
	}
	return req;
}

async function call(method, url, body) {
	return new Promise((resolve, reject) => {
		const headers = {};
		let status = 0;
		const res = {
			set statusCode(value) {
				status = value;
			},
			setHeader(key, value) {
				headers[key] = value;
			},
			end(text) {
				let payload = null;
				try {
					payload = text === undefined || text === '' ? null : JSON.parse(text);
				} catch (_error) {
					payload = { raw: text };
				}
				resolve({ status, headers, payload });
			}
		};
		route.handler(makeRequest(method, url, body), res);
		setTimeout(() => reject(new Error('request timed out: ' + method + ' ' + url)), 20000);
	});
}

console.log('知识 API…');
const kb = await call('GET', '/mysql-assistant/api/kb');
check(kb.status === 200 && kb.payload.ok === true, 'GET /kb returns ok');
check(kb.payload.knowledge.meta.pageCount === 83, 'kb has 83 pages');
check(kb.payload.knowledge.knowledgeMap.nodes.length === 83, 'kb has 83 map nodes');
check(kb.payload.knowledge.learningRoute.stages.length >= 6, 'kb has a learning route');
check(kb.payload.knowledge.labs.scenarios.length === 8, 'kb has 8 labs');

console.log('操练场 API…');
const playground = await call('GET', '/mysql-assistant/api/playground');
check(playground.status === 200 && playground.payload.ok === true, 'GET /playground returns ok');
check(playground.payload.exercises.exercises.length === 24, '24 exercises served');
check(playground.payload.schema.tables.length === 7, '7 seeded tables served');

const query = await call('POST', '/mysql-assistant/api/playground/query', { sql: 'SELECT COUNT(*) AS n FROM orders;' });
check(query.status === 200 && query.payload.result.columns[0] === 'n', 'POST /playground/query returns a result set');
check(query.payload.result.rows[0][0] === '24', 'query result is computed by the engine');

const solution = JSON.parse(fs.readFileSync(path.join(root, 'playground', 'exercises.json'), 'utf8')).exercises[0];
const pass = await call('POST', '/mysql-assistant/api/playground/check', { exerciseId: solution.id, sql: solution.solutionSql });
check(pass.payload.ok === true && pass.payload.check.pass === true, 'POST /playground/check grades the reference solution as passed');
const fail = await call('POST', '/mysql-assistant/api/playground/check', { exerciseId: solution.id, sql: 'SELECT 1;' });
check(fail.payload.check.pass === false, 'POST /playground/check rejects a wrong answer');

const reset = await call('POST', '/mysql-assistant/api/playground/reset', {});
check(reset.payload.ok === true && reset.payload.schema.tables.length === 7, 'POST /playground/reset reseeds the database');

const missing = await call('GET', '/mysql-assistant/api/nope');
check(missing.status === 404, 'unknown route returns 404');

console.log('执行环境 API…');
const envDefault = await call('GET', '/mysql-assistant/api/playground/environment');
check(envDefault.status === 200 && envDefault.payload.environment.mode === 'compat', 'default execution environment is the compatible kernel');
check(envDefault.payload.environment.mysql === undefined || envDefault.payload.environment.mysql.password === undefined, 'environment never exposes the password');
const playgroundPayload = await call('GET', '/mysql-assistant/api/playground');
check(playgroundPayload.payload.environment !== undefined && playgroundPayload.payload.environment.mode === 'compat', 'playground payload carries the environment');
const badMysql = await call('POST', '/mysql-assistant/api/playground/environment', { mode: 'mysql', mysql: { host: '127.0.0.1', port: 65000, user: 'root', password: 'x', database: 'mysql_learn' } });
check(badMysql.payload.ok === false && typeof badMysql.payload.error === 'string', 'unreachable real MySQL returns a friendly error');
check(badMysql.payload.environment.mode === 'compat', 'failed switch keeps the compatible kernel');
const backCompat = await call('POST', '/mysql-assistant/api/playground/environment', { mode: 'compat' });
check(backCompat.payload.ok === true && backCompat.payload.environment.mode === 'compat', 'switching back to compat succeeds');

console.log('mysql_docs 工具…');
const list = await tool.execute({ action: 'list' });
check(typeof list === 'string' && list.indexOf('入门与心智模型') >= 0, 'action=list returns the chapter table of contents');
const search = await tool.execute({ action: 'search', query: '索引失效' });
check(search.indexOf('index-failure') >= 0, 'action=search finds index-failure');
const read = await tool.execute({ action: 'read', id: 'where-filter' });
check(read.indexOf('WHERE') >= 0 && read.indexOf('常见坑') >= 0, 'action=read returns a full topic');
const map = await tool.execute({ action: 'map' });
check(map.indexOf('建立直觉') >= 0 && map.indexOf('推荐路径') >= 0, 'action=map returns the knowledge map');
const routeText = await tool.execute({ action: 'route' });
check(routeText.indexOf('学习路线') >= 0 || routeText.indexOf('目标') >= 0, 'action=route returns the learning route');
const labs = await tool.execute({ action: 'labs' });
check(labs.indexOf('电商订单库建模') >= 0, 'action=labs returns enterprise labs');
const exerciseList = await tool.execute({ action: 'exercise' });
check(exerciseList.indexOf('24') >= 0, 'action=exercise lists playground exercises');
const exerciseOne = await tool.execute({ action: 'exercise', id: solution.id });
check(exerciseOne.indexOf(solution.titleZh) >= 0 && exerciseOne.indexOf('参考答案') >= 0, 'action=exercise returns one exercise');

console.log('mysql_playground_query 工具…');
const playgroundTool = tools.mysql_playground_query;
check(playgroundTool !== undefined && playgroundTool.name === 'mysql_playground_query', 'read-only playground query tool registered');
check(playgroundTool.output !== undefined && playgroundTool.output.schema !== undefined, 'tool declares an output schema');
const countResult = await playgroundTool.execute({ sql: 'SELECT COUNT(*) AS n FROM orders;' });
check(countResult.indexOf('24') >= 0, 'tool runs a read-only query on the playground data');
const rejectedWrite = await playgroundTool.execute({ sql: 'DELETE FROM orders;' });
check(rejectedWrite.indexOf('只允许只读') >= 0, 'tool rejects writes');
const rejectedDdl = await playgroundTool.execute({ sql: 'DROP TABLE users;' });
check(rejectedDdl.indexOf('只允许只读') >= 0, 'tool rejects DDL');

// ---- cleanup ---------------------------------------------------------------
for (const dispose of disposers) {
	try {
		dispose();
	} catch (_error) {
		/* cleanup is best-effort */
	}
}

if (failures > 0) {
	console.log('\n✗ Host API test: ' + failures + ' failures');
	process.exit(1);
}
console.log('\n✓ Host API + tool test passed');
