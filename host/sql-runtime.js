/**
 * Host-side SQL runtime for the MySQL Assistant playground.
 *
 * The playground executes SQL in a real SQL engine embedded in the Host process:
 * `sql.js` (SQLite compiled to WebAssembly). MySQL is not shipped with the app,
 * so a compatibility layer translates the MySQL dialect used by the lessons
 * (AUTO_INCREMENT, ENGINE=InnoDB, SHOW TABLES, DESCRIBE, IF(), DATE_FORMAT(),
 * `LIMIT offset, count`, ON DUPLICATE KEY UPDATE, ...) onto SQLite. The UI says
 * so explicitly: the engine is MySQL-compatible, not a real mysqld.
 *
 * Two kinds of databases exist:
 * - a long-lived "session" database the user explores and mutates, reset on demand;
 * - fresh throwaway databases for exercise checking, so user mutations and the
 *   reference solution are always compared on identical seed data.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

/** Max rows returned to the browser for one statement. */
const MAX_RESULT_ROWS = 1000;

/** Max rows kept in a check preview. */
const MAX_PREVIEW_ROWS = 30;

// #region SQL text utilities
/**
 * Split a SQL script into statements, respecting single/double quotes, backticks
 * and `--`, `#`, `/* *\/` comments. Semicolons inside strings never split.
 */
export function splitStatements(script) {
	const statements = [];
	let current = '';
	let quote = null;
	let lineComment = false;
	let blockComment = false;
	const text = String(script === undefined || script === null ? '' : script);
	for (let index = 0; index < text.length; index += 1) {
		const char = text[index];
		const next = index + 1 < text.length ? text[index + 1] : '';
		if (lineComment) {
			if (char === '\n') {
				lineComment = false;
				current += char;
			}
			continue;
		}
		if (blockComment) {
			if (char === '*' && next === '/') {
				blockComment = false;
				index += 1;
			}
			continue;
		}
		if (quote !== null) {
			current += char;
			if (char === quote) {
				if (next === quote) {
					current += next;
					index += 1;
				} else {
					quote = null;
				}
			} else if (char === '\\' && quote !== '`' && next !== '') {
				current += next;
				index += 1;
			}
			continue;
		}
		if (char === '-' && next === '-') {
			lineComment = true;
			index += 1;
			continue;
		}
		if (char === '#') {
			lineComment = true;
			continue;
		}
		if (char === '/' && next === '*') {
			blockComment = true;
			index += 1;
			continue;
		}
		if (char === "'" || char === '"' || char === '`') {
			quote = char;
			current += char;
			continue;
		}
		if (char === ';') {
			const trimmed = current.trim();
			if (trimmed !== '') statements.push(trimmed);
			current = '';
			continue;
		}
		current += char;
	}
	const tail = current.trim();
	if (tail !== '') statements.push(tail);
	return statements;
}

/** Split the body of CREATE TABLE on top-level commas. */
function splitTopLevel(text, separator) {
	const parts = [];
	let current = '';
	let depth = 0;
	let quote = null;
	for (let index = 0; index < text.length; index += 1) {
		const char = text[index];
		if (quote !== null) {
			current += char;
			if (char === quote) quote = null;
			continue;
		}
		if (char === "'" || char === '"' || char === '`') {
			quote = char;
			current += char;
			continue;
		}
		if (char === '(') {
			depth += 1;
			current += char;
			continue;
		}
		if (char === ')') {
			depth -= 1;
			current += char;
			continue;
		}
		if (char === separator && depth === 0) {
			parts.push(current);
			current = '';
			continue;
		}
		current += char;
	}
	parts.push(current);
	return parts;
}

/** Unquote one identifier (`t`, "t", [t] or db.t). */
function unquoteIdentifier(raw) {
	let value = String(raw === undefined || raw === null ? '' : raw).trim();
	value = value.replace(/^[`"'\[]+|[`"'\]]+$/g, '');
	if (value.indexOf('.') >= 0) {
		const parts = value.split('.');
		value = parts[parts.length - 1].replace(/^[`"'\[]+|[`"'\]]+$/g, '');
	}
	return value;
}

/** Whole-number normalizer used when comparing result cells. */
function normalizeCell(value) {
	if (value === null || value === undefined) return null;
	if (typeof value === 'number') {
		if (!Number.isFinite(value)) return String(value);
		return String(value);
	}
	if (typeof value === 'boolean') return value ? '1' : '0';
	if (value instanceof Uint8Array) return '<binary>';
	if (typeof value === 'bigint') return value.toString();
	return String(value);
}

/** Render a result set as comparable rows. */
function comparableRows(columns, rows) {
	return rows.map((row) => row.map(normalizeCell));
}

/** Compare two result sets with normalized values. */
export function compareResultSets(expected, actual, orderSensitive) {
	const expectedColumns = expected.columns.map((column) => String(column).toLowerCase());
	const actualColumns = actual.columns.map((column) => String(column).toLowerCase());
	if (expectedColumns.length !== actualColumns.length) {
		return { pass: false, reason: '返回的列数不对：参考结果有 ' + expectedColumns.length + ' 列（' + expected.columns.join('、') + '），你的结果有 ' + actualColumns.length + ' 列。', hint: '检查 SELECT 的列清单，题目要求返回哪些列就只写哪些列。' };
	}
	const mismatchColumn = expectedColumns.findIndex((column, index) => column !== actualColumns[index]);
	if (mismatchColumn >= 0) {
		return { pass: false, reason: '第 ' + (mismatchColumn + 1) + ' 列的名称/顺序不对：参考为 ' + expected.columns[mismatchColumn] + '，你的为 ' + actual.columns[mismatchColumn] + '。', hint: '调整 SELECT 的列顺序或别名，让结果列与题目要求一致。' };
	}
	const expectedRows = comparableRows(expected.columns, expected.rows);
	const actualRows = comparableRows(actual.columns, actual.rows);
	const render = (row) => row.map((value) => (value === null ? 'NULL' : JSON.stringify(value))).join(' | ');
	if (expectedRows.length !== actualRows.length) {
		return { pass: false, reason: '结果行数不对：参考结果 ' + expectedRows.length + ' 行，你的结果 ' + actualRows.length + ' 行。', hint: '检查 WHERE 条件是否漏了、JOIN 是否重复匹配、GROUP BY 是否遗漏。' };
	}
	const keyOf = (row) => row.map((value) => (value === null ? '∅' : String(value))).join('\u0001');
	if (orderSensitive) {
		for (let index = 0; index < expectedRows.length; index += 1) {
			if (keyOf(expectedRows[index]) !== keyOf(actualRows[index])) {
				return { pass: false, reason: '第 ' + (index + 1) + ' 行的值不对：参考 ' + render(expectedRows[index]) + '，你的 ' + render(actualRows[index]) + '。', hint: '检查 ORDER BY 的排序字段和方向（ASC/DESC），以及筛选条件。' };
			}
		}
		return { pass: true };
	}
	const expectedCounts = new Map();
	for (const row of expectedRows) {
		const key = keyOf(row);
		expectedCounts.set(key, (expectedCounts.get(key) || 0) + 1);
	}
	for (const row of actualRows) {
		const key = keyOf(row);
		const count = expectedCounts.get(key);
		if (count === undefined || count === 0) {
			return { pass: false, reason: '结果里出现了参考答案中没有的行：' + render(row) + '。', hint: '检查 WHERE / JOIN 条件，可能是筛选范围写过宽或关联条件不对。' };
		}
		expectedCounts.set(key, count - 1);
	}
	return { pass: true };
}
// #endregion

// #region MySQL → SQLite translation
/** Registered helper functions (MySQL names) on one database. */
function registerFunctions(db) {
	db.create_function('NOW', () => formatNow());
	db.create_function('SYSDATE', () => formatNow());
	db.create_function('CURDATE', () => formatNow().slice(0, 10));
	db.create_function('CURTIME', () => formatNow().slice(11));
	db.create_function('UNIX_TIMESTAMP', (value) => {
		if (value === null || value === undefined) return Math.floor(Date.now() / 1000);
		const time = Date.parse(String(value).replace(' ', 'T'));
		return Number.isFinite(time) ? Math.floor(time / 1000) : null;
	});
	db.create_function('FROM_UNIXTIME', (seconds) => {
		const numeric = Number(seconds);
		if (!Number.isFinite(numeric)) return null;
		return formatDate(new Date(numeric * 1000));
	});
	db.create_function('IF', (condition, whenTrue, whenFalse) => (condition === null || condition === undefined ? whenFalse : (condition ? whenTrue : whenFalse)));
	db.create_function('CONCAT', (...args) => (args.some((value) => value === null || value === undefined) ? null : args.map((value) => String(value)).join('')));
	db.create_function('CONCAT_WS', (separator, ...args) => {
		if (separator === null || separator === undefined) return null;
		return args.filter((value) => value !== null && value !== undefined).map((value) => String(value)).join(String(separator));
	});
	db.create_function('YEAR', (value) => (value === null || value === undefined ? null : Number.parseInt(String(value).slice(0, 4), 10) || null));
	db.create_function('MONTH', (value) => (value === null || value === undefined ? null : Number.parseInt(String(value).slice(5, 7), 10) || null));
	db.create_function('DAY', (value) => (value === null || value === undefined ? null : Number.parseInt(String(value).slice(8, 10), 10) || null));
	db.create_function('DATE_FORMAT', (value, format) => {
		if (value === null || value === undefined || format === null || format === undefined) return null;
		return mysqlDateFormat(String(value), String(format));
	});
	db.create_function('STR_TO_DATE', (value) => (value === null || value === undefined ? null : String(value)));
	db.create_function('FIND_IN_SET', (needle, haystack) => {
		if (needle === null || needle === undefined || haystack === null || haystack === undefined) return null;
		const list = String(haystack).split(',');
		const position = list.indexOf(String(needle));
		return position >= 0 ? position + 1 : 0;
	});
	db.create_function('LAST_INSERT_ID', () => lastInsertId);
	db.create_function('VERSION', () => '8.0.36 (MySQL-compatible playground engine)');
	db.create_function('DATABASE', () => 'shop');
	db.create_function('USER', () => 'student@localhost');
}

/** Last insert id tracked per execution (MySQL LAST_INSERT_ID). */
let lastInsertId = 0;

/** 'YYYY-MM-DD HH:MM:SS' of now. */
function formatNow() {
	return formatDate(new Date());
}

/** Format a Date as MySQL DATETIME. */
function formatDate(date) {
	const pad = (value) => String(value).padStart(2, '0');
	return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()) + ' ' + pad(date.getHours()) + ':' + pad(date.getMinutes()) + ':' + pad(date.getSeconds());
}

/** A small subset of MySQL DATE_FORMAT tokens on top of a plain date string. */
function mysqlDateFormat(value, format) {
	const source = String(value);
	const date = new Date(source.replace(' ', 'T'));
	const valid = Number.isFinite(date.getTime());
	const parts = valid
		? {
			Y: String(date.getFullYear()),
			m: String(date.getMonth() + 1).padStart(2, '0'),
			d: String(date.getDate()).padStart(2, '0'),
			H: String(date.getHours()).padStart(2, '0'),
			i: String(date.getMinutes()).padStart(2, '0'),
			s: String(date.getSeconds()).padStart(2, '0'),
			e: String(date.getDate()),
			M: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][date.getMonth()],
			b: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][date.getMonth()]
		}
		: { Y: source.slice(0, 4), m: source.slice(5, 7), d: source.slice(8, 10), H: '00', i: '00', s: '00', e: source.slice(8, 10), M: '', b: '' };
	return format.replace(/%([YmdHiseMb])/g, (match, token) => (parts[token] === undefined ? match : parts[token]));
}

/**
 * Translate one MySQL statement into a SQLite statement.
 * Returns { kind: 'sql' | 'special' | 'noop', sql, special, table }.
 */
export function translateStatement(raw) {
	let statement = String(raw).trim();
	if (statement === '') return { kind: 'noop' };
	const upper = statement.toUpperCase();

	// ---- statements that produce MySQL-style result sets -------------------
	if (/^SHOW\s+(?:FULL\s+)?TABLES\b/.test(upper)) {
		const fromMatch = /\bFROM\s+([`"\w.]+)/i.exec(statement);
		return { kind: 'special', special: 'showTables', table: fromMatch === null ? '' : unquoteIdentifier(fromMatch[1]) };
	}
	if (/^SHOW\s+DATABASES\b/.test(upper)) return { kind: 'special', special: 'showDatabases' };
	if (/^SHOW\s+(?:FULL\s+)?COLUMNS\s+FROM\s+/.test(upper) || /^SHOW\s+FIELDS\s+FROM\s+/.test(upper)) {
		const match = /FROM\s+([`"\w.]+)/i.exec(statement);
		return { kind: 'special', special: 'describe', table: match === null ? '' : unquoteIdentifier(match[1]) };
	}
	if (/^SHOW\s+CREATE\s+TABLE\s+/.test(upper)) {
		const match = /TABLE\s+([`"\w.]+)/i.exec(statement);
		return { kind: 'special', special: 'showCreateTable', table: match === null ? '' : unquoteIdentifier(match[1]) };
	}
	if (/^SHOW\s+(?:INDEX|INDEXES|KEYS)\s+(?:FROM|IN)\s+/.test(upper)) {
		const match = /(?:FROM|IN)\s+([`"\w.]+)/i.exec(statement);
		return { kind: 'special', special: 'showIndex', table: match === null ? '' : unquoteIdentifier(match[1]) };
	}
	if (/^(?:DESCRIBE|DESC)\s+/.test(upper) && !/^DESC\s*$/.test(upper)) {
		const match = /^(?:DESCRIBE|DESC)\s+([`"\w.]+)/i.exec(statement);
		return { kind: 'special', special: 'describe', table: match === null ? '' : unquoteIdentifier(match[1]) };
	}
	if (/^SHOW\s+(?:VARIABLES|STATUS|ENGINES|WARNINGS|ERRORS)\b/.test(upper)) {
		return { kind: 'special', special: 'showGeneric', text: statement };
	}

	// ---- no-op / admin statements -----------------------------------------
	if (/^USE\s+/i.test(statement)) return { kind: 'noop', message: '数据库已切换（操练场只有一个示例库 shop）' };
	if (/^SET\s+/i.test(statement)) return { kind: 'noop', message: 'SET 语句在操练场中不生效（已忽略）' };
	if (/^(?:CREATE|DROP)\s+DATABASE\b/i.test(statement)) return { kind: 'noop', message: '操练场只有一个示例库 shop，创建/删除数据库已忽略' };
	if (/^(?:LOCK|UNLOCK)\s+TABLES\b/i.test(statement)) return { kind: 'noop', message: 'LOCK TABLES 在操练场中不生效（已忽略）' };
	if (/^(?:CREATE|ALTER|DROP)\s+USER\b/i.test(statement) || /^(?:GRANT|REVOKE)\b/i.test(statement) || /^SET\s+(?:PASSWORD|GLOBAL|SESSION)\b/i.test(statement)) {
		return { kind: 'noop', message: '账号与权限语句需要真实 MySQL 管理员执行；操练场的兼容内核没有用户体系，本句已跳过' };
	}
	if (/^FLUSH\b/i.test(statement)) return { kind: 'noop', message: 'FLUSH 语句在操练场中不生效（已忽略）' };
	if (/^DELIMITER\b/i.test(statement)) return { kind: 'noop', message: 'DELIMITER 是 mysql 客户端指令，不是 SQL；请在真实 MySQL 客户端执行带触发器/存储过程的脚本' };
	if (/^SHOW\s+PROCESSLIST\b/i.test(statement)) return { kind: 'special', special: 'showProcesslist' };

	// ---- DDL rewrite -------------------------------------------------------
	if (/^CREATE\s+(?:TEMPORARY\s+)?TABLE\b/i.test(statement)) return rewriteCreateTable(statement);
	if (/^TRUNCATE\s+(?:TABLE\s+)?/i.test(statement)) {
		const match = /^TRUNCATE\s+(?:TABLE\s+)?([`"\w.]+)/i.exec(statement);
		const table = match === null ? '' : unquoteIdentifier(match[1]);
		return { kind: 'sql', sql: 'DELETE FROM ' + quoteIdent(table), truncate: table };
	}
	if (/^ALTER\s+TABLE\b/i.test(statement)) return rewriteAlterTable(statement);

	// ---- EXPLAIN: teach with the friendlier QUERY PLAN --------------------
	if (/^EXPLAIN\s+(?:ANALYZE\s+|FORMAT\s*=\s*\w+\s+)?(?:SELECT|INSERT|UPDATE|DELETE|WITH|REPLACE)\b/i.test(upper)) {
		const inner = statement.replace(/^EXPLAIN\s+(?:ANALYZE\s+|FORMAT\s*=\s*\w+\s+)?/i, '');
		return { kind: 'sql', sql: 'EXPLAIN QUERY PLAN ' + translateQuery(inner).sql, explain: true };
	}

	// ---- ordinary statements ----------------------------------------------
	return translateQuery(statement);
}

/** Quote one identifier for SQLite. */
function quoteIdent(name) {
	return '`' + String(name).replace(/`/g, '``') + '`';
}

/** Re-assemble a CREATE TABLE statement on the SQLite dialect. */
function rewriteCreateTable(statement) {
	const match = /^CREATE\s+(?:TEMPORARY\s+)?TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([`"\w.]+)\s*\(/i.exec(statement);
	if (match === null) return { kind: 'sql', sql: statement };
	const table = unquoteIdentifier(match[1]);
	const openIndex = statement.indexOf('(', match.index + match[0].length - 1);
	let closeIndex = -1;
	let depth = 0;
	let quote = null;
	for (let index = openIndex; index < statement.length; index += 1) {
		const char = statement[index];
		if (quote !== null) {
			if (char === quote) quote = null;
			continue;
		}
		if (char === "'" || char === '"' || char === '`') {
			quote = char;
			continue;
		}
		if (char === '(') depth += 1;
		else if (char === ')') {
			depth -= 1;
			if (depth === 0) {
				closeIndex = index;
				break;
			}
		}
	}
	if (closeIndex < 0) return { kind: 'sql', sql: statement };
	const body = statement.slice(openIndex + 1, closeIndex);
	const definitions = [];
	const indexes = [];
	for (const rawDefinition of splitTopLevel(body, ',')) {
		let definition = rawDefinition.trim();
		if (definition === '') continue;
		const definitionUpper = definition.toUpperCase();
		// table-level foreign keys are dropped in the playground (SQLite pragma would
		// enforce them only when explicitly enabled, and the lessons explain them).
		if (/^(?:CONSTRAINT\s+\[?[`"\w]*\]?\s+)?FOREIGN\s+KEY\b/i.test(definition)) continue;
		// table-level KEY / INDEX definitions become separate CREATE INDEX statements.
		if (/^(?:UNIQUE\s+)?(?:KEY|INDEX)\b/i.test(definition) && !/^PRIMARY\s+KEY/i.test(definition)) {
			const indexMatch = /^(UNIQUE\s+)?(?:KEY|INDEX)\s+([`"\w]+)\s*\(([^)]*)\)/i.exec(definition);
			if (indexMatch !== null) {
				const columns = indexMatch[3].split(',').map((column) => column.trim().split(/\s+/)[0].replace(/[`"']/g, ''));
				indexes.push({ name: indexMatch[2].replace(/[`"']/g, ''), unique: indexMatch[1] !== undefined, columns });
			}
			continue;
		}
		if (/^FULLTEXT\b/i.test(definitionUpper)) continue;
		definition = rewriteColumnDefinition(definition);
		if (definition !== '') definitions.push(definition);
	}
	if (definitions.length === 0) return { kind: 'sql', sql: statement };
	let sql = 'CREATE TABLE ' + quoteIdent(table) + ' (' + definitions.join(', ') + ')';
	const createIndexes = indexes.map((index) => 'CREATE ' + (index.unique ? 'UNIQUE ' : '') + 'INDEX IF NOT EXISTS ' + quoteIdent(index.name) + ' ON ' + quoteIdent(table) + ' (' + index.columns.map(quoteIdent).join(', ') + ')');
	if (createIndexes.length > 0) sql = sql + '; ' + createIndexes.join('; ');
	return { kind: 'sql', sql, table };
}

/** Rewrite one column definition to a SQLite-friendly form. */
function rewriteColumnDefinition(definition) {
	let text = definition;
	text = text.replace(/\bUNSIGNED\b/gi, '');
	text = text.replace(/\bZEROFILL\b/gi, '');
	// INTEGER PRIMARY KEY is SQLite's rowid alias, so AUTO_INCREMENT columns become INTEGER.
	text = text.replace(/\b(?:BIGINT|MEDIUMINT|INT|INTEGER|SMALLINT|TINYINT)\s*(?:\(\s*\d+\s*\))?\s*PRIMARY\s+KEY\s+AUTO_INCREMENT/gi, 'INTEGER PRIMARY KEY');
	text = text.replace(/\b(?:BIGINT|MEDIUMINT|INT|INTEGER|SMALLINT|TINYINT)\s*(?:\(\s*\d+\s*\))?(?=\s*(?:NOT\s+NULL\s*)?AUTO_INCREMENT)/gi, 'INTEGER');
	text = text.replace(/\bAUTO_INCREMENT\b/gi, '');
	text = text.replace(/\b(?:ENUM|SET)\s*\([^)]*\)/gi, 'TEXT');
	text = text.replace(/\bJSON\b/gi, 'TEXT');
	text = text.replace(/\s+CHARACTER\s+SET\s+\w+/gi, '');
	text = text.replace(/\s+COLLATE\s+\w+/gi, '');
	text = text.replace(/\s+COMMENT\s+'(?:[^'\\]|\\.)*'/gi, '');
	text = text.replace(/\s+ON\s+UPDATE\s+CURRENT_TIMESTAMP(?:\(\d*\))?/gi, '');
	text = text.replace(/\s+GENERATED\s+ALWAYS\s+AS\s*\([^)]*\)\s*(?:STORED|VIRTUAL)?/gi, '');
	text = text.trim().replace(/,\s*$/, '');
	return text;
}

/** Rewrite ALTER TABLE statements onto the SQLite dialect. */
function rewriteAlterTable(statement) {
	let text = statement.trim();
	const tableMatch = /^ALTER\s+TABLE\s+([`"\w.]+)\s+(.*)$/is.exec(text);
	const table = tableMatch === null ? '' : unquoteIdentifier(tableMatch[1]);
	const body = tableMatch === null ? '' : tableMatch[2].trim();
	// ADD [UNIQUE] INDEX / KEY becomes a standalone CREATE INDEX.
	const addIndex = /^ADD\s+(UNIQUE\s+)?(?:INDEX|KEY)\s+([`"\w]+)\s*\(([^)]*)\)/i.exec(body);
	if (addIndex !== null) {
		const unique = addIndex[1] !== undefined;
		const indexName = addIndex[2].replace(/[`"']/g, '');
		const columns = addIndex[3].split(',').map((column) => column.trim().split(/\s+/)[0].replace(/[`"']/g, ''));
		return { kind: 'sql', sql: 'CREATE ' + (unique ? 'UNIQUE ' : '') + 'INDEX IF NOT EXISTS ' + quoteIdent(indexName) + ' ON ' + quoteIdent(table) + ' (' + columns.map(quoteIdent).join(', ') + ')' };
	}
	// DROP INDEX / ADD PRIMARY KEY / MODIFY / CHANGE have no SQLite equivalent.
	const dropIndex = /^DROP\s+(?:INDEX|KEY)\s+([`"\w]+)/i.exec(body);
	if (dropIndex !== null) return { kind: 'sql', sql: 'DROP INDEX IF EXISTS ' + quoteIdent(dropIndex[1].replace(/[`"']/g, '')) };
	if (/^(?:ADD\s+)?(?:CONSTRAINT\s+[`"\w]+\s+)?PRIMARY\s+KEY\b/i.test(body)) {
		return { kind: 'noop', message: 'SQLite 兼容内核不支持给已有表追加主键；真实 MySQL 中这是一次大表 DDL，需谨慎。' };
	}
	if (/^(?:MODIFY|CHANGE)\b/i.test(body)) {
		return { kind: 'noop', message: 'MODIFY / CHANGE 列定义在兼容内核中不生效（真实 MySQL 8.0 支持，大表需用 Online DDL）。' };
	}
	// ADD COLUMN / DROP COLUMN / RENAME TO pass through after stripping MySQL-only bits.
	text = text.replace(/\s+ENGINE\s*=\s*\w+/gi, '');
	text = text.replace(/\bADD\s+(?:COLUMN\s+)?(?:IF\s+NOT\s+EXISTS\s+)?/i, 'ADD COLUMN ');
	text = text.replace(/\s+AFTER\s+[`"\w]+/gi, '');
	text = text.replace(/\s+FIRST\b/gi, '');
	text = text.replace(/\s+COMMENT\s+'(?:[^'\\]|\\.)*'/gi, '');
	text = text.replace(/\s+UNSIGNED\b/gi, '');
	text = text.replace(/\bAUTO_INCREMENT\b/gi, '');
	return { kind: 'sql', sql: text };
}

/** Rewrite the non-DDL parts of the MySQL dialect. */
function translateQuery(statement) {
	let sql = statement.trim();
	// transaction syntax
	sql = sql.replace(/\bSTART\s+TRANSACTION\s+WITH\s+CONSISTENT\s+SNAPSHOT\b/gi, 'BEGIN');
	sql = sql.replace(/\bSTART\s+TRANSACTION\b/gi, 'BEGIN');
	sql = sql.replace(/\bSET\s+TRANSACTION\s+ISOLATION\s+LEVEL\s+(\w+)\b/gi, '-- isolation level: $1');
	// locking clauses (SQLite serializes writers; the lesson still explains them)
	sql = sql.replace(/\s+LOCK\s+IN\s+SHARE\s+MODE\b/gi, '');
	sql = sql.replace(/\s+FOR\s+UPDATE(?:\s+NOWAIT|\s+SKIP\s+LOCKED)?\b/gi, '');
	sql = sql.replace(/\s+FOR\s+SHARE(?:\s+NOWAIT|\s+SKIP\s+LOCKED)?\b/gi, '');
	sql = sql.replace(/\bSQL_CALC_FOUND_ROWS\b/gi, '');
	// deep pagination offset form
	sql = sql.replace(/\bLIMIT\s+(\d+)\s*,\s*(\d+)/gi, 'LIMIT $2 OFFSET $1');
	// INSERT variants
	sql = sql.replace(/^(\s*)INSERT\s+IGNORE\b/i, '$1INSERT OR IGNORE');
	// ON DUPLICATE KEY UPDATE -> ON CONFLICT DO UPDATE SET (with VALUES(col) rewrite)
	if (/\bON\s+DUPLICATE\s+KEY\s+UPDATE\b/i.test(sql)) {
		sql = sql.replace(/\bON\s+DUPLICATE\s+KEY\s+UPDATE\b/gi, 'ON CONFLICT DO UPDATE SET');
		sql = sql.replace(/\bVALUES\s*\(\s*([`"\w]+)\s*\)/gi, 'excluded.$1');
	}
	// function name aliases that SQLite spells differently
	sql = sql.replace(/\bSUBSTRING\s*\(/gi, 'substr(');
	sql = sql.replace(/\bSUBSTR\s*\(/gi, 'substr(');
	sql = sql.replace(/\bCHAR_LENGTH\s*\(/gi, 'length(');
	sql = sql.replace(/\bCHARACTER_LENGTH\s*\(/gi, 'length(');
	// CAST target types
	sql = sql.replace(/\bAS\s+(SIGNED|UNSIGNED)\b/gi, 'AS INTEGER');
	sql = sql.replace(/\bAS\s+(CHAR|DATETIME|DATE|DECIMAL)\b/gi, 'AS TEXT');
	// GROUP_CONCAT ... SEPARATOR 'x'
	sql = sql.replace(/(GROUP_CONCAT\s*\([^)]*\))\s+SEPARATOR\s+('[^']*'|"[^"]*")/gi, '$1, $2');
	// NULL-safe equality
	sql = sql.replace(/\s*<=>\s*/g, ' IS ');
	// DATE_ADD / DATE_SUB with INTERVAL
	sql = sql.replace(/\b(?:DATE_ADD|ADDDATE)\s*\(\s*([^,]+?)\s*,\s*INTERVAL\s+(\d+)\s+(DAY|MONTH|YEAR|HOUR|MINUTE|SECOND)\s*\)/gi, (match, value, amount, unit) => 'date(' + value + ", '+" + amount + ' ' + unit.toLowerCase() + "s')");
	sql = sql.replace(/\b(?:DATE_SUB|SUBDATE)\s*\(\s*([^,]+?)\s*,\s*INTERVAL\s+(\d+)\s+(DAY|MONTH|YEAR|HOUR|MINUTE|SECOND)\s*\)/gi, (match, value, amount, unit) => 'date(' + value + ", '-" + amount + ' ' + unit.toLowerCase() + "s')");
	sql = sql.replace(/\bDATEDIFF\s*\(\s*([^,]+?)\s*,\s*([^)]+?)\s*\)/gi, "CAST(julianday($1) - julianday($2) AS INTEGER)");
	// MySQL JSON operators -> json_extract
	sql = sql.replace(/([`"\w.]+)\s*->>\s*('[^']*'|"[^"]*")/g, 'json_extract($1, $2)');
	sql = sql.replace(/([`"\w.]+)\s*->\s*('[^']*'|"[^"]*")/g, 'json_extract($1, $2)');
	return { kind: 'sql', sql };
}
// #endregion

// #region special statement rendering
/** MySQL SHOW TABLES result. */
function showTables(db) {
	return db.exec("SELECT name AS `Tables_in_shop` FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name");
}

/** MySQL SHOW DATABASES result. */
function showDatabases(db) {
	return db.exec("SELECT 'shop' AS `Database`");
}

/** MySQL DESCRIBE result from PRAGMA table_info. */
function describeTable(db, table) {
	const safe = quoteIdent(table);
	let info;
	try {
		info = db.exec('PRAGMA table_info(' + safe + ')');
	} catch (_error) {
		info = [];
	}
	if (info.length === 0) return { error: "表 '" + table + "' 不存在" };
	const uniqueColumns = new Set();
	try {
		const indexList = db.exec('PRAGMA index_list(' + safe + ')');
		for (const entry of indexList.length > 0 ? indexList[0].values : []) {
			const unique = Number(entry[2]) === 1;
			const origin = entry[3] === undefined ? '' : String(entry[3]);
			if (!unique || origin === 'pk') continue;
			try {
				for (const row of db.exec('PRAGMA index_info(' + quoteIdent(String(entry[1])) + ')')[0].values) uniqueColumns.add(String(row[2]));
			} catch (_error) {
				/* ignore */
			}
		}
	} catch (_error) {
		/* ignore */
	}
	const rows = info[0].values.map((row) => {
		const name = String(row[1]);
		const type = String(row[2] || 'TEXT');
		const nullable = Number(row[3]) === 0 ? 'NO' : 'YES';
		const isPrimary = Number(row[5]) > 0;
		const key = isPrimary ? 'PRI' : (uniqueColumns.has(name) ? 'UNI' : '');
		const defaultValue = row[4] === null ? null : String(row[4]);
		return [name, type, nullable, key, defaultValue, isPrimary ? 'auto_increment' : ''];
	});
	return { columns: ['Field', 'Type', 'Null', 'Key', 'Default', 'Extra'], rows };
}

/** MySQL SHOW CREATE TABLE result reconstructed from SQLite metadata. */
function showCreateTable(db, table) {
	const describe = describeTable(db, table);
	if (describe.error !== undefined) return { error: describe.error };
	const lines = describe.rows.map((row) => {
		const [name, type, nullable, key, defaultValue, extra] = row;
		let line = '  `' + name + '` ' + type;
		if (nullable === 'NO') line += ' NOT NULL';
		if (key === 'PRI') line += ' PRIMARY KEY';
		if (defaultValue !== null && defaultValue !== '') line += ' DEFAULT ' + (String(defaultValue).toUpperCase() === 'CURRENT_TIMESTAMP' ? 'CURRENT_TIMESTAMP' : "'" + String(defaultValue).replace(/'/g, "''") + "'");
		if (extra === 'auto_increment') line += ' AUTO_INCREMENT';
		return line;
	});
	const ddl = 'CREATE TABLE `' + table + '` (\n' + lines.join(',\n') + '\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4';
	return { columns: ['Table', 'Create Table'], rows: [[table, ddl]] };
}

/** MySQL SHOW INDEX result from SQLite metadata. */
function showIndex(db, table) {
	let list;
	try {
		list = db.exec('PRAGMA index_list(' + quoteIdent(table) + ')');
	} catch (_error) {
		list = [];
	}
	const rows = [];
	for (const entry of list.length > 0 ? list[0].values : []) {
		const name = String(entry[1]);
		const unique = Number(entry[2]) === 1 ? 0 : 1;
		let columns = [];
		try {
			columns = db.exec('PRAGMA index_info(' + quoteIdent(name) + ')')[0].values.map((row) => String(row[2]));
		} catch (_error) {
			columns = [];
		}
		columns.forEach((column, index) => rows.push([table, unique, name, index + 1, column, 'A', 0, null, 'BTREE', '']));
	}
	return { columns: ['Table', 'Non_unique', 'Key_name', 'Seq_in_index', 'Column_name', 'Collation', 'Cardinality', 'Sub_part', 'Index_type', 'Comment'], rows };
}
// #endregion

// #region engine
/** Result shape returned to the client for one execution. */
function emptyResult() {
	return { columns: [], rows: [], rowCount: 0, affected: 0, statements: [], messages: [], truncated: false, elapsedMs: 0 };
}

/**
 * Create the SQL runtime.
 * @param {{ schemaPath: string, log?: (line: string) => void }} options
 */
export function createSqlRuntime(options) {
	const schemaPath = options.schemaPath;
	const log = typeof options.log === 'function' ? options.log : () => {};
	let enginePromise = null;
	let schemaPromise = null;
	let sessionDb = null;
	let sessionReady = null;
	let disposed = false;

	async function engine() {
		if (enginePromise === null) {
			enginePromise = (async () => {
				const initSqlJs = require('sql.js');
				const wasmPath = path.join(path.dirname(require.resolve('sql.js')), 'sql-wasm.wasm');
				const SQL = await initSqlJs({ locateFile: () => wasmPath });
				return SQL;
			})().catch((error) => {
				enginePromise = null;
				throw error;
			});
		}
		return enginePromise;
	}

	async function schemaText() {
		if (schemaPromise === null) {
			schemaPromise = Promise.resolve(fs.readFileSync(schemaPath, 'utf8')).catch((error) => {
				schemaPromise = null;
				throw new Error('示例库文件 playground/shop-schema.sql 读取失败：' + String(error && error.message ? error.message : error));
			});
		}
		return schemaPromise;
	}

	/** Create a fresh database seeded from shop-schema.sql. */
	async function createSeededDb() {
		const [SQL, schema] = await Promise.all([engine(), schemaText()]);
		const db = new SQL.Database();
		registerFunctions(db);
		const statements = splitStatements(schema);
		for (const statement of statements) {
			const translated = translateStatement(statement);
			if (translated.kind === 'noop') continue;
			if (translated.kind === 'special') continue;
			runSql(db, translated.sql);
		}
		return db;
	}

	/** Execute one already-translated SQL string (may contain several statements). */
	function runSql(db, sqlText) {
		const parts = splitStatements(sqlText);
		for (const part of parts) {
			if (part.trim() === '') continue;
			const stmt = db.prepare(part);
			try {
				while (stmt.step()) {
					/* consume; the caller re-runs statements that need rows */
				}
			} finally {
				stmt.free();
			}
		}
	}

	/** Ensure the long-lived session database exists. */
	function ensureSession() {
		if (sessionReady === null) {
			sessionReady = createSeededDb().then((db) => {
				sessionDb = db;
				return db;
			}).catch((error) => {
				sessionReady = null;
				throw error;
			});
		}
		return sessionReady;
	}

	/** Execute one statement and collect its outcome. */
	function executeStatement(db, rawStatement) {
		const translated = translateStatement(rawStatement);
		if (translated.kind === 'noop') return { kind: 'ok', message: translated.message === undefined ? 'OK' : translated.message, affected: 0 };
		if (translated.kind === 'special') {
			if (translated.special === 'showTables') {
				const result = showTables(db);
				return { kind: 'rows', columns: result.length > 0 ? result[0].columns : [], rows: result.length > 0 ? result[0].values : [], affected: 0 };
			}
			if (translated.special === 'showDatabases') {
				const result = showDatabases(db);
				return { kind: 'rows', columns: result[0].columns, rows: result[0].values, affected: 0 };
			}
			if (translated.special === 'describe') {
				const result = describeTable(db, translated.table);
				if (result.error !== undefined) throw new Error(result.error);
				return { kind: 'rows', columns: result.columns, rows: result.rows, affected: 0 };
			}
			if (translated.special === 'showCreateTable') {
				const result = showCreateTable(db, translated.table);
				if (result.error !== undefined) throw new Error(result.error);
				return { kind: 'rows', columns: result.columns, rows: result.rows, affected: 0 };
			}
			if (translated.special === 'showIndex') {
				const result = showIndex(db, translated.table);
				return { kind: 'rows', columns: result.columns, rows: result.rows, affected: 0 };
			}
			if (translated.special === 'showProcesslist') {
				return {
					kind: 'rows',
					columns: ['Id', 'User', 'Host', 'db', 'Command', 'Time', 'State', 'Info'],
					rows: [[1, 'student', 'localhost:3306', 'shop', 'Query', 0, 'executing', 'SHOW PROCESSLIST']],
					affected: 0
				};
			}
			return { kind: 'rows', columns: ['Variable_name', 'Value'], rows: [['playground', 'MySQL 兼容内核（SQLite）']], affected: 0 };
		}
		// ordinary statement
		const parts = splitStatements(translated.sql);
		let last = { kind: 'ok', message: 'Query OK', affected: 0 };
		for (const part of parts) {
			if (part.trim() === '') continue;
			const stmt = db.prepare(part);
			try {
				const columnNames = typeof stmt.getColumnNames === 'function' ? stmt.getColumnNames() : [];
				const rows = [];
				const isQuery = columnNames.length > 0;
				while (stmt.step()) {
					const object = stmt.getAsObject();
					rows.push(columnNames.map((name) => object[name]));
				}
				if (isQuery) {
					last = { kind: 'rows', columns: columnNames, rows, affected: 0 };
				} else {
					const modified = db.getRowsModified();
					last = { kind: 'ok', message: modified > 0 ? 'Query OK, ' + modified + ' row' + (modified === 1 ? '' : 's') + ' affected' : 'Query OK', affected: modified };
					if (/^INSERT\b/i.test(part)) {
						const idResult = db.exec('SELECT last_insert_rowid()');
						if (idResult.length > 0 && idResult[0].values.length > 0) lastInsertId = Number(idResult[0].values[0][0]);
					}
				}
			} finally {
				stmt.free();
			}
			if (translated.explain === true && last.kind === 'rows') {
				last.explain = true;
			}
		}
		if (translated.truncate !== undefined) {
			try {
				db.run("DELETE FROM sqlite_sequence WHERE name = '" + translated.truncate.replace(/'/g, "''") + "'");
			} catch (_error) {
				/* no AUTOINCREMENT column: nothing to reset */
			}
		}
		return last;
	}

	/** Convert a statement outcome into a MySQL-ish status line. */
	function statusLine(outcome) {
		if (outcome.kind === 'rows') return '返回 ' + outcome.rows.length + ' 行';
		return outcome.message === undefined ? 'OK' : outcome.message;
	}

	/** Translate low-level engine errors into a friendlier bilingual hint. */
	function friendlyError(error) {
		const raw = String(error === null || error === undefined ? '' : (error.message === undefined ? error : error.message));
		const table = /no such table:\s*([\w.]+)/i.exec(raw);
		if (table !== null) return { message: "表 '" + table[1] + "' 不存在（MySQL: Table '" + table[1] + "' doesn't exist）", raw };
		const column = /no such column:\s*([\w.`]+)/i.exec(raw);
		if (column !== null) return { message: "字段 '" + column[1] + "' 不存在（MySQL: Unknown column '" + column[1] + "'）", raw };
		const unique = /UNIQUE constraint failed:\s*([\w.,\s]+)/i.exec(raw);
		if (unique !== null) return { message: '唯一键冲突：' + unique[1].trim() + ' 已存在相同值（MySQL: Duplicate entry）', raw };
		const notNull = /NOT NULL constraint failed:\s*([\w.]+)/i.exec(raw);
		if (notNull !== null) return { message: '非空约束失败：' + notNull[1] + ' 不能为 NULL（MySQL: Column cannot be null）', raw };
		const syntax = /syntax error|near "|incomplete input/i.exec(raw);
		if (syntax !== null) return { message: 'SQL 语法错误，检查关键字拼写、括号和引号（内核原始信息：' + raw + '）', raw };
		return { message: raw, raw };
	}

	/** Execute a user SQL string against the session database. */
	async function query(sqlText) {
		if (disposed) throw new Error('SQL 运行环境已关闭');
		const db = await ensureSession();
		const started = Date.now();
		const statements = splitStatements(sqlText);
		const result = emptyResult();
		if (statements.length === 0) {
			result.messages.push('没有可执行的 SQL');
			return result;
		}
		let last = null;
		for (const statement of statements) {
			try {
				const outcome = executeStatement(db, statement);
				result.statements.push({ sql: statement.slice(0, 400), status: statusLine(outcome) });
				result.messages.push(statusLine(outcome));
				if (outcome.kind === 'rows') {
					last = outcome;
				} else {
					result.affected += outcome.affected === undefined ? 0 : outcome.affected;
				}
			} catch (error) {
				const friendly = friendlyError(error);
				result.error = friendly.message;
				result.rawError = friendly.raw;
				result.elapsedMs = Date.now() - started;
				return result;
			}
		}
		result.elapsedMs = Date.now() - started;
		if (last !== null && last.kind === 'rows') {
			result.columns = last.columns;
			result.truncated = last.rows.length > MAX_RESULT_ROWS;
			result.rows = last.rows.slice(0, MAX_RESULT_ROWS).map((row) => row.map(normalizeCell));
			result.rowCount = last.rows.length;
			result.explain = last.explain === true;
		}
		return result;
	}

	/** Run `sqlText` on a fresh seeded database and return its last result set. */
	function runOnce(db, sqlText, check) {
		const statements = splitStatements(sqlText);
		let last = null;
		for (const statement of statements) {
			const outcome = executeStatement(db, statement);
			if (outcome.kind === 'rows') last = outcome;
		}
		if (check !== null && typeof check.mode === 'string' && check.mode === 'verify' && typeof check.verifySql === 'string') {
			const verifyStatements = splitStatements(check.verifySql);
			let verifyOutcome = null;
			for (const statement of verifyStatements) {
				const outcome = executeStatement(db, statement);
				if (outcome.kind === 'rows') verifyOutcome = outcome;
			}
			return verifyOutcome;
		}
		return last;
	}

	/** Run a check comparing the user SQL against the reference solution on fresh DBs. */
	async function checkExercise(exercise, sqlText) {
		if (exercise === null || typeof exercise !== 'object') throw new Error('练习不存在');
		const check = exercise.check !== null && typeof exercise.check === 'object' ? exercise.check : { mode: 'result' };
		const mode = check.mode === undefined ? 'result' : check.mode;
		// schema checks: run the user script then inspect table structure
		if (mode === 'schema') {
			const db = await createSeededDb();
			try {
				for (const statement of splitStatements(sqlText)) executeStatement(db, statement);
				const table = String(check.table === undefined ? '' : check.table);
				const expectedColumns = Array.isArray(check.columns) ? check.columns.map((column) => String(column).toLowerCase()) : [];
				let info;
				try {
					info = db.exec('PRAGMA table_info(' + quoteIdent(table) + ')');
				} catch (_error) {
					info = [];
				}
				if (info.length === 0) return { pass: false, reason: "没有找到表 '" + table + "'，检查表名是否拼错、CREATE TABLE 是否执行成功。", expected: { table, columns: expectedColumns }, actual: null };
				const actualColumns = info[0].values.map((row) => String(row[1]));
				const missing = expectedColumns.filter((column) => actualColumns.indexOf(column) < 0);
				if (missing.length > 0) return { pass: false, reason: "表 '" + table + "' 存在，但缺少字段：" + missing.join('、') + '。', expected: { table, columns: expectedColumns }, actual: { table, columns: actualColumns } };
				const order = expectedColumns.every((column, index) => actualColumns[index] === column);
				return { pass: true, reason: order ? "表 '" + table + "' 的字段与题目要求完全一致。" : "表 '" + table + "' 包含全部要求字段（字段顺序与参考答案不同，不影响通过）。", expected: { table, columns: expectedColumns }, actual: { table, columns: actualColumns } };
			} finally {
				db.close();
			}
		}
		// result / verify checks: compare against the reference solution
		const referenceDb = await createSeededDb();
		const userDb = await createSeededDb();
		try {
			let expected;
			let actual;
			try {
				expected = runOnce(referenceDb, String(exercise.solutionSql === undefined ? '' : exercise.solutionSql), check);
			} catch (error) {
				return { pass: false, reason: '参考答案执行失败（这是插件数据的问题，请反馈）：' + friendlyError(error).message };
			}
			try {
				actual = runOnce(userDb, sqlText, check);
			} catch (error) {
				return { pass: false, reason: friendlyError(error).message };
			}
			if (actual === null) return { pass: false, reason: '你的 SQL 没有返回结果集。这道题需要一条 SELECT 查询（或 verify 模式下需要产生可校验的结果）。' };
			if (expected === null) return { pass: false, reason: '这道题的参考答案没有返回结果集（插件数据问题，请反馈）。' };
			const orderSensitive = check.orderSensitive === true;
			const comparison = compareResultSets(expected, actual, orderSensitive);
			const preview = (outcome) => ({
				columns: outcome.columns.map(String),
				rows: outcome.rows.slice(0, MAX_PREVIEW_ROWS).map((row) => row.map((value) => (value === null ? null : String(value))))
			});
			if (comparison.pass) return { pass: true, reason: '结果和参考答案一致，通过！', expected: preview(expected), actual: preview(actual), rowCount: actual.rows.length };
			return {
				pass: false,
				reason: comparison.reason,
				hint: comparison.hint,
				expected: preview(expected),
				actual: preview(actual),
				rowCount: actual.rows.length
			};
		} finally {
			referenceDb.close();
			userDb.close();
		}
	}


	/** Describe the current session database for the schema browser. */
	async function schemaInfo() {
		const db = await ensureSession();
		const tables = [];
		let tableRows = [];
		try {
			tableRows = db.exec("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name");
		} catch (_error) {
			tableRows = [];
		}
		for (const row of tableRows.length > 0 ? tableRows[0].values : []) {
			const name = String(row[0]);
			let columns = [];
			let count = 0;
			let indexes = [];
			try {
				const info = db.exec('PRAGMA table_info(' + quoteIdent(name) + ')');
				columns = (info.length > 0 ? info[0].values : []).map((entry) => ({ name: String(entry[1]), type: String(entry[2] || ''), notNull: Number(entry[3]) === 1, primaryKey: Number(entry[5]) > 0, defaultValue: entry[4] === null ? null : String(entry[4]) }));
				const countResult = db.exec('SELECT COUNT(*) FROM ' + quoteIdent(name));
				count = countResult.length > 0 ? Number(countResult[0].values[0][0]) : 0;
				const indexList = db.exec('PRAGMA index_list(' + quoteIdent(name) + ')');
				indexes = (indexList.length > 0 ? indexList[0].values : []).map((entry) => ({ name: String(entry[1]), unique: Number(entry[2]) === 1 }));
			} catch (_error) {
				/* keep partial table info */
			}
			tables.push({ name, columns, rowCount: count, indexes });
		}
		return { name: 'shop', tables };
	}

	/** Reset the session database to the seed state. */
	async function reset() {
		const db = await ensureSession();
		try {
			db.close();
		} catch (_error) {
			/* closing is best-effort */
		}
		sessionDb = null;
		sessionReady = null;
		await ensureSession();
		return schemaInfo();
	}

	/** Release resources. */
	function dispose() {
		disposed = true;
		try {
			if (sessionDb !== null) sessionDb.close();
		} catch (_error) {
			/* disposal is best-effort */
		}
		sessionDb = null;
		sessionReady = null;
	}

	return { query, checkExercise, schemaInfo, reset, dispose, status: async () => ({ engine: 'sql.js (SQLite / MySQL-compatible)', sessionReady: sessionDb !== null }) };
}
// #endregion
