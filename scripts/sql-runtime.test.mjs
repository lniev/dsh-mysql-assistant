#!/usr/bin/env node
/**
 * Host SQL runtime tests: MySQL→SQLite translation, seed data, schema browser,
 * every exercise reference solution and a few negative checks.
 *
 * Usage: node scripts/sql-runtime.test.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createSqlRuntime, translateStatement, splitStatements } from '../host/sql-runtime.js';

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

console.log('SQL 文本工具…');
const statements = splitStatements("SELECT 1; SELECT 'a;b' -- x;\n; UPDATE t SET a = 1;");
check(statements.length === 3, 'statement splitter keeps strings and comments intact', JSON.stringify(statements));
check(translateStatement('SELECT * FROM t LIMIT 10, 20').sql === 'SELECT * FROM t LIMIT 20 OFFSET 10', 'LIMIT offset,count rewritten');
check(translateStatement('SHOW TABLES').special === 'showTables', 'SHOW TABLES becomes a special statement');
check(/CREATE TABLE `t`/.test(translateStatement('CREATE TABLE t (id BIGINT PRIMARY KEY AUTO_INCREMENT, name VARCHAR(20)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4').sql), 'CREATE TABLE rewritten without MySQL engine options');

const exercises = JSON.parse(fs.readFileSync(path.join(root, 'playground', 'exercises.json'), 'utf8'));
const runtime = createSqlRuntime({ schemaPath: path.join(root, 'playground', 'shop-schema.sql') });

const schema = await runtime.schemaInfo();
console.log('示例库结构…');
const tableNames = schema.tables.map((table) => table.name);
check(tableNames.length === 7, '7 tables seeded', tableNames.join(','));
check(tableNames.indexOf('order_items') >= 0, 'order_items exists');
check(schema.tables.find((table) => table.name === 'orders').rowCount === 24, 'orders has 24 seed rows');

console.log('SQL 执行…');
const select = await runtime.query('SELECT name, price FROM products WHERE on_sale = 1 ORDER BY price DESC LIMIT 3;');
check(select.columns.length === 2 && select.rows.length === 3, 'SELECT returns columns/rows');
check(select.error === undefined, 'SELECT has no error');
const mysqlFunctions = await runtime.query("SELECT IF(1=1,'y','n') AS a, CONCAT('x','y') AS b, DATE_FORMAT('2026-03-01 12:00:00','%Y-%m') AS c;");
check(mysqlFunctions.rows[0][0] === 'y' && mysqlFunctions.rows[0][1] === 'xy' && mysqlFunctions.rows[0][2] === '2026-03', 'MySQL helper functions work');
const showTables = await runtime.query('SHOW TABLES;');
check(showTables.rows.length === 7, 'SHOW TABLES works');
const described = await runtime.query('DESCRIBE products;');
check(described.columns[0] === 'Field' && described.rows.length >= 5, 'DESCRIBE works');
const reset = await runtime.reset();
check(reset.tables.find((table) => table.name === 'users').rowCount === 10, 'reset restores seed data');
const invalid = await runtime.query('SELECT * FROM missing_table;');
check(typeof invalid.error === 'string' && invalid.error.indexOf('不存在') >= 0, 'missing table produces a friendly error');

console.log('判题（24 道参考答案）…');
let passed = 0;
for (const exercise of exercises.exercises) {
	const result = await runtime.checkExercise(exercise, exercise.solutionSql);
	if (result.pass) passed += 1;
	else console.log('  ✗ ' + exercise.id + ' — ' + result.reason);
}
check(passed === exercises.exercises.length, 'all ' + exercises.exercises.length + ' reference solutions pass', passed + ' passed');

const first = exercises.exercises[0];
const wrong = await runtime.checkExercise(first, 'SELECT name FROM products;');
check(wrong.pass === false, 'wrong answer is rejected');
runtime.dispose();

if (failures > 0) {
	console.log('\n✗ ' + failures + ' 个失败');
	process.exit(1);
}
console.log('\n✓ SQL 运行时测试全部通过');
