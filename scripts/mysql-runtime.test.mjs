#!/usr/bin/env node
/**
 * Real-MySQL runtime tests using an injected fake mysql2 connection.
 *
 * A live MySQL server is not available in CI, so this suite exercises the
 * runtime's own logic (environment switching, statement execution, schema
 * discovery, transaction-based grading and sample-data reset) against a fake
 * connection that mimics the mysql2 API.
 *
 * Usage: node scripts/mysql-runtime.test.mjs
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createMysqlRuntime } from '../host/mysql-runtime.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let failures = 0;
const check = (condition, label, detail) => {
	if (condition) console.log('  ✓ ' + label);
	else {
		failures += 1;
		console.log('  ✗ ' + label + (detail === undefined ? '' : ' — ' + detail));
	}
};

/** One fake mysql2 connection good enough for this runtime's queries. */
function createFakeConnection() {
	const state = { inTransaction: false, rolledBack: 0, committed: 0, dropped: [] };
	const connection = {
		ping: async () => {},
		end: async () => {},
		beginTransaction: async () => {
			state.inTransaction = true;
		},
		rollback: async () => {
			state.inTransaction = false;
			state.rolledBack += 1;
		},
		commit: async () => {
			state.inTransaction = false;
			state.committed += 1;
		},
		query: async (sql, params) => {
			const text = String(sql).trim();
			if (/^SELECT VERSION\(\)/.test(text)) {
				return [[{ version: '8.0.36', db: 'mysql_learn' }], [{ name: 'version' }, { name: 'db' }]];
			}
			if (/information_schema\.TABLES/i.test(text)) {
				return [[{ name: 'users' }, { name: 'orders' }], [{ name: 'name' }]];
			}
			if (/information_schema\.COLUMNS/i.test(text)) {
				return [[
					{ name: 'id', type: 'bigint', nullable: 'NO', columnKey: 'PRI', defaultValue: null },
					{ name: 'name', type: 'varchar(50)', nullable: 'YES', columnKey: '', defaultValue: null }
				], [{}]];
			}
			if (/^SELECT COUNT\(\*\) AS n FROM/i.test(text)) return [[{ n: 10 }], [{ name: 'n' }]];
			if (/^(SET FOREIGN_KEY_CHECKS|DROP TABLE|CREATE TABLE|INSERT INTO|CREATE INDEX)/i.test(text)) {
				return [{ affectedRows: 0 }, undefined];
			}
			const number = /^SELECT\s+(\d+)\s+AS\s+a$/i.exec(text);
			if (number !== null) return [[{ a: Number(number[1]) }], [{ name: 'a' }]];
			if (/^SELECT .+ AS a$/i.test(text)) return [[{ a: 1 }], [{ name: 'a' }]];
			return [[], undefined];
		},
		state
	};
	return connection;
}

console.log('环境管理…');
const configDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mysql-runtime-test-'));
const configPath = path.join(configDir, 'environment.json');
const runtime = createMysqlRuntime({
	schemaPath: path.join(root, 'playground', 'shop-schema.sql'),
	configPath,
	connectFactory: async () => createFakeConnection()
});
const initial = runtime.environment();
check(initial.mode === 'compat', 'default mode is the compatible kernel');
check(initial.mysql !== undefined && initial.mysql.password === undefined, 'password is not exposed');
const switched = await runtime.setEnvironment({ mode: 'mysql', mysql: { host: '127.0.0.1', port: 3306, user: 'root', password: 'secret', database: 'mysql_learn' } });
check(switched.mode === 'mysql' && switched.status.connected === true, 'switching to real MySQL connects');
check(switched.status.version === '8.0.36', 'server version is reported');
check(switched.mysql.password === undefined, 'password stays server-side');
check(fs.existsSync(configPath), 'environment is persisted');
const saved = JSON.parse(fs.readFileSync(configPath, 'utf8'));
check(saved.mysql.password === 'secret', 'saved config contains the password locally');
const fileMode = fs.statSync(configPath).mode & 0o777;
check((fileMode & 0o077) === 0, 'config file is private (0600)', String(fileMode.toString(8)));

console.log('SQL 执行…');
const result = await runtime.query('SELECT 1 AS a;');
check(result.error === undefined && result.columns[0] === 'a', 'query returns columns');
check(result.rows[0][0] === '1', 'query normalizes values', JSON.stringify(result.rows));

console.log('结构浏览…');
const schema = await runtime.schemaInfo();
check(schema.engine === 'mysql' && schema.tables.length === 2, 'schema lists real tables');
check(schema.tables[0].columns.length === 2 && schema.tables[0].rowCount === 10, 'schema lists columns and row counts');

console.log('判题…');
const pass = await runtime.checkExercise({ solutionSql: 'SELECT 1 AS a', check: { mode: 'result' } }, 'SELECT 1 AS a');
check(pass.pass === true, 'correct answer passes');
const fail = await runtime.checkExercise({ solutionSql: 'SELECT 1 AS a', check: { mode: 'result' } }, 'SELECT 2 AS a');
check(fail.pass === false, 'wrong answer fails');
const unsupported = await runtime.checkExercise({ solutionSql: 'CREATE TABLE x (id INT)', check: { mode: 'schema', table: 'x', columns: ['id'] } }, 'CREATE TABLE x (id INT)');
check(unsupported.pass === false && unsupported.reason.indexOf('暂不支持') >= 0, 'DDL checks are rejected with a clear reason');
const txUnsupported = await runtime.checkExercise({ solutionSql: 'START TRANSACTION; SELECT 1 AS a; ROLLBACK;', check: { mode: 'result' } }, 'START TRANSACTION; SELECT 1 AS a; ROLLBACK;');
check(txUnsupported.pass === false && txUnsupported.reason.indexOf('事务') >= 0, 'transaction exercises are rejected with a clear reason');

console.log('重置示例库…');
const resetSchema = await runtime.reset(true);
check(resetSchema.tables.length === 2, 'reset rebuilds the sample schema');
let blockedError = '';
try {
	await runtime.reset(false);
} catch (error) {
	blockedError = error.message;
}
check(blockedError.indexOf('已有') >= 0, 'reset without force refuses to drop existing tables');

console.log('切回兼容内核…');
const back = await runtime.setEnvironment({ mode: 'compat' });
check(back.mode === 'compat' && back.status.connected === false, 'switching back disconnects the real MySQL connection');
check(JSON.parse(fs.readFileSync(configPath, 'utf8')).mode === 'compat', 'compat mode is persisted');

runtime.dispose();
fs.rmSync(configDir, { recursive: true, force: true });
if (failures > 0) {
	console.log('\n✗ real MySQL runtime test: ' + failures + ' failures');
	process.exit(1);
}
console.log('\n✓ real MySQL runtime test passed');
