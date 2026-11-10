/**
 * Optional real-MySQL execution environment for the SQL playground.
 *
 * The plugin's default engine is the bundled MySQL-compatible kernel (sql.js).
 * This module adds a second engine that talks to a real MySQL server via
 * `mysql2`, so learners can validate SQL against their own MySQL 8 (local or a
 * Docker container) and compare behaviour with the compatible kernel.
 *
 * Configuration is stored in `playground/environment.json` (mode 0600) because
 * it may contain a password. The Host never returns the password to the client;
 * it only reports whether one is saved.
 */
import fs from 'node:fs';
import path from 'node:path';
import mysql from 'mysql2/promise';
import { splitStatements, compareResultSets } from './sql-runtime.js';

const SYSTEM_DATABASES = new Set(['mysql', 'information_schema', 'performance_schema', 'sys']);
const MAX_RESULT_ROWS = 1000;
const MAX_PREVIEW_ROWS = 30;
const DEFAULT_CONFIG = { host: '127.0.0.1', port: 3306, user: 'root', password: '', database: 'mysql_learn' };

/** Normalize one table cell for display / comparison. */
function normalizeCell(value) {
	if (value === null || value === undefined) return null;
	if (typeof value === 'number') return String(value);
	if (typeof value === 'bigint') return value.toString();
	if (typeof value === 'boolean') return value ? '1' : '0';
	if (value instanceof Date) {
		const pad = (number) => String(number).padStart(2, '0');
		return value.getFullYear() + '-' + pad(value.getMonth() + 1) + '-' + pad(value.getDate()) + ' ' + pad(value.getHours()) + ':' + pad(value.getMinutes()) + ':' + pad(value.getSeconds());
	}
	if (Buffer.isBuffer(value)) return '<binary>';
	return String(value);
}

/** Friendly message for a mysql2 error. */
function friendlyMysqlError(error) {
	const code = error !== null && error !== undefined && typeof error.code === 'string' ? error.code : '';
	const message = error !== null && error !== undefined && typeof error.message === 'string' ? error.message : String(error);
	if (code === 'ECONNREFUSED' || code === 'ENOTFOUND' || code === 'EHOSTUNREACH' || code === 'ETIMEDOUT') {
		return '无法连接 MySQL（' + code + '）：检查地址、端口、服务是否启动，以及 Docker 端口是否映射。';
	}
	if (code === 'ER_ACCESS_DENIED_ERROR') return '账号或密码不正确（ER_ACCESS_DENIED_ERROR）。';
	if (code === 'ER_BAD_DB_ERROR') return '数据库不存在（ER_BAD_DB_ERROR）：先在 MySQL 里创建该数据库。';
	if (code === 'ER_NO_SUCH_TABLE' || (typeof error.errno === 'number' && error.errno === 1146)) return "表不存在（MySQL 1146）。";
	if (code === 'ER_BAD_FIELD_ERROR' || (typeof error.errno === 'number' && error.errno === 1054)) return '字段不存在（MySQL 1054）。';
	if (code === 'ER_DUP_ENTRY' || (typeof error.errno === 'number' && error.errno === 1062)) return '唯一键冲突（MySQL 1062）。';
	if (code === 'ER_PARSE_ERROR' || (typeof error.errno === 'number' && error.errno === 1064)) return 'SQL 语法错误（MySQL 1064）：' + message;
	if (code === 'PROTOCOL_CONNECTION_LOST') return 'MySQL 连接已断开，请重试。';
	return message;
}

/** Quote one identifier for a real MySQL statement. */
function quoteIdent(name) {
	return '`' + String(name).replace(/`/g, '``') + '`';
}

/** Build a safe LIMIT preview label. */
function previewRow(row) {
	return row.map((value) => (value === null ? null : String(value)));
}

/**
 * Create the real-MySQL runtime.
 * @param {{ schemaPath: string, configPath: string, connectFactory?: Function, log?: Function }} options
 */
export function createMysqlRuntime(options) {
	const schemaPath = options.schemaPath;
	const configPath = options.configPath;
	const connectFactory = typeof options.connectFactory === 'function' ? options.connectFactory : mysql.createConnection;
	const log = typeof options.log === 'function' ? options.log : () => {};
	let env = loadEnvironment();
	let connection = null;
	let connectionInfo = null;
	let lastError = null;
	let disposed = false;

	function loadEnvironment() {
		let stored = null;
		try {
			stored = JSON.parse(fs.readFileSync(configPath, 'utf8'));
		} catch (_error) {
			stored = null;
		}
		const fallback = { mode: 'compat', mysql: Object.assign({}, DEFAULT_CONFIG) };
		if (stored === null || typeof stored !== 'object') return fallback;
		const mode = stored.mode === 'mysql' ? 'mysql' : 'compat';
		const raw = stored.mysql !== null && typeof stored.mysql === 'object' ? stored.mysql : {};
		try {
			return { mode, mysql: normalizeConfig(Object.assign({}, DEFAULT_CONFIG, raw)) };
		} catch (_error) {
			return fallback;
		}
	}

	function persistEnvironment() {
		try {
			fs.mkdirSync(path.dirname(configPath), { recursive: true });
			fs.writeFileSync(configPath, JSON.stringify({ mode: env.mode, mysql: env.mysql }, null, 2), { encoding: 'utf8', mode: 0o600 });
			try {
				fs.chmodSync(configPath, 0o600);
			} catch (_error) {
				/* chmod is best-effort on some filesystems */
			}
		} catch (error) {
			log('save environment failed: ' + friendlyMysqlError(error));
		}
	}

	/** Validate and normalize a MySQL connection config. */
	function normalizeConfig(raw) {
		const host = typeof raw.host === 'string' ? raw.host.trim() : '';
		if (host === '') throw new Error('请填写 MySQL 主机地址');
		const port = Number(raw.port);
		if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('端口必须是 1–65535 的整数');
		const user = typeof raw.user === 'string' ? raw.user.trim() : '';
		if (user === '') throw new Error('请填写 MySQL 用户名');
		const database = typeof raw.database === 'string' ? raw.database.trim() : '';
		if (database === '') throw new Error('请填写要使用的数据库名（建议使用专用的学习库，如 mysql_learn）');
		const password = raw.password === undefined || raw.password === null ? '' : String(raw.password);
		return { host, port, user, password, database };
	}

	/** Merge a partial client payload with the saved config; undefined password keeps the saved one. */
	function mergeConfig(input) {
		const raw = input !== null && typeof input === 'object' ? input : {};
		return normalizeConfig({
			host: raw.host === undefined ? env.mysql.host : raw.host,
			port: raw.port === undefined ? env.mysql.port : raw.port,
			user: raw.user === undefined ? env.mysql.user : raw.user,
			password: raw.password === undefined ? env.mysql.password : raw.password,
			database: raw.database === undefined ? env.mysql.database : raw.database
		});
	}

	/** Public environment snapshot (never includes the password). */
	function publicEnvironment() {
		return {
			mode: env.mode,
			mysql: {
				host: env.mysql.host,
				port: env.mysql.port,
				user: env.mysql.user,
				database: env.mysql.database,
				hasPassword: env.mysql.password !== ''
			},
			status: {
				connected: connection !== null && connectionInfo !== null,
				version: connectionInfo === null ? null : connectionInfo.version,
				database: connectionInfo === null ? null : connectionInfo.database,
				error: lastError
			}
		};
	}

	function closeConnection() {
		const current = connection;
		connection = null;
		connectionInfo = null;
		if (current !== null) {
			try {
				const result = current.end();
				if (result !== null && result !== undefined && typeof result.catch === 'function') result.catch(function () {});
			} catch (_error) {
				/* closing is best-effort */
			}
		}
	}

	async function openConnection(config) {
		let created = null;
		try {
			created = await connectFactory({
				host: config.host,
				port: config.port,
				user: config.user,
				password: config.password,
				database: config.database,
				connectTimeout: 5000,
				charset: 'utf8mb4',
				dateStrings: true,
				multipleStatements: false
			});
			await created.ping();
			const [rows] = await created.query('SELECT VERSION() AS version, DATABASE() AS db');
			const row = Array.isArray(rows) && rows.length > 0 ? rows[0] : {};
			connection = created;
			connectionInfo = { version: row.version === undefined ? '' : String(row.version), database: row.db === null || row.db === undefined ? config.database : String(row.db) };
			lastError = null;
			log('connected to mysql ' + connectionInfo.version + ' / ' + connectionInfo.database);
			return connectionInfo;
		} catch (error) {
			if (created !== null) {
				try {
					const result = created.end();
					if (result !== null && result !== undefined && typeof result.catch === 'function') result.catch(function () {});
				} catch (_error) {
					/* ignore */
				}
			}
			lastError = friendlyMysqlError(error);
			throw new Error(lastError);
		}
	}

	async function ensureConnection() {
		if (disposed) throw new Error('真实 MySQL 运行环境已关闭');
		if (connection !== null && connectionInfo !== null) return connection;
		await openConnection(env.mysql);
		return connection;
	}

	/** Switch execution environment. Mode `compat` simply closes the real connection. */
	async function setEnvironment(input) {
		const payload = input !== null && typeof input === 'object' ? input : {};
		if (payload.mode !== 'mysql') {
			closeConnection();
			env = { mode: 'compat', mysql: payload.mysql === undefined ? env.mysql : mergeConfig(payload.mysql) };
			persistEnvironment();
			return publicEnvironment();
		}
		const config = mergeConfig(payload.mysql);
		closeConnection();
		try {
			await openConnection(config);
		} catch (error) {
			lastError = friendlyMysqlError(error);
			throw new Error(lastError);
		}
		env = { mode: 'mysql', mysql: config };
		persistEnvironment();
		return publicEnvironment();
	}

	/** Test one connection without switching or persisting it. */
	async function testConnection(input) {
		const config = mergeConfig(input);
		let created = null;
		try {
			created = await connectFactory({
				host: config.host,
				port: config.port,
				user: config.user,
				password: config.password,
				database: config.database,
				connectTimeout: 5000,
				charset: 'utf8mb4',
				dateStrings: true,
				multipleStatements: false
			});
			await created.ping();
			const [rows] = await created.query('SELECT VERSION() AS version, DATABASE() AS db');
			const row = Array.isArray(rows) && rows.length > 0 ? rows[0] : {};
			await created.end();
			return { version: row.version === undefined ? '' : String(row.version), database: row.db === null || row.db === undefined ? config.database : String(row.db) };
		} catch (error) {
			if (created !== null) {
				try {
					const result = created.end();
					if (result !== null && result !== undefined && typeof result.catch === 'function') result.catch(function () {});
				} catch (_error) {
					/* ignore */
				}
			}
			throw new Error(friendlyMysqlError(error));
		}
	}

	/** Execute one SQL script on the real MySQL connection. */
	async function query(sqlText) {
		const conn = await ensureConnection();
		const started = Date.now();
		const statements = splitStatements(sqlText);
		const result = { columns: [], rows: [], rowCount: 0, affected: 0, statements: [], messages: [], truncated: false, elapsedMs: 0 };
		if (statements.length === 0) {
			result.messages.push('没有可执行的 SQL');
			return result;
		}
		let lastRows = null;
		try {
			for (const statement of statements) {
				const [rawResult, fields] = await conn.query(statement);
				if (Array.isArray(rawResult) && Array.isArray(fields)) {
					const columns = fields.map((field) => field.name);
					const rows = rawResult.map((row) => (Array.isArray(row) ? row : columns.map((column) => row[column])));
					lastRows = { columns, rows };
					result.statements.push({ sql: statement.slice(0, 400), status: '返回 ' + rows.length + ' 行' });
					result.messages.push('返回 ' + rows.length + ' 行');
				} else {
					const affected = rawResult !== null && rawResult !== undefined && typeof rawResult.affectedRows === 'number' ? rawResult.affectedRows : 0;
					result.affected += affected;
					const message = affected > 0 ? 'Query OK, ' + affected + ' row' + (affected === 1 ? '' : 's') + ' affected' : 'Query OK';
					result.statements.push({ sql: statement.slice(0, 400), status: message });
					result.messages.push(message);
				}
			}
		} catch (error) {
			result.error = friendlyMysqlError(error);
			result.rawError = error !== null && error !== undefined && typeof error.message === 'string' ? error.message : String(error);
			result.elapsedMs = Date.now() - started;
			return result;
		}
		result.elapsedMs = Date.now() - started;
		if (lastRows !== null) {
			result.columns = lastRows.columns;
			result.truncated = lastRows.rows.length > MAX_RESULT_ROWS;
			result.rows = lastRows.rows.slice(0, MAX_RESULT_ROWS).map((row) => row.map(normalizeCell));
			result.rowCount = lastRows.rows.length;
		}
		return result;
	}

	/** Run one script inside a transaction and capture its last result set (used for grading). */
	async function runCapturedInTransaction(conn, sqlText, check) {
		const statements = splitStatements(sqlText);
		await conn.beginTransaction();
		try {
			let lastRows = null;
			for (const statement of statements) {
				const [rawResult, fields] = await conn.query(statement);
				if (Array.isArray(rawResult) && Array.isArray(fields)) {
					const columns = fields.map((field) => field.name);
					const rows = rawResult.map((row) => (Array.isArray(row) ? row : columns.map((column) => row[column])));
					lastRows = { columns, rows };
				}
			}
			if (check !== null && check.mode === 'verify' && typeof check.verifySql === 'string') {
				const verifyStatements = splitStatements(check.verifySql);
				for (const statement of verifyStatements) {
					const [rawResult, fields] = await conn.query(statement);
					if (Array.isArray(rawResult) && Array.isArray(fields)) {
						const columns = fields.map((field) => field.name);
						const rows = rawResult.map((row) => (Array.isArray(row) ? row : columns.map((column) => row[column])));
						lastRows = { columns, rows };
					}
				}
			}
			await conn.rollback();
			return lastRows;
		} catch (error) {
			try {
				await conn.rollback();
			} catch (_rollbackError) {
				/* ignore */
			}
			throw error;
		}
	}

	/** Grade one exercise on the real server using transactions for isolation. */
	async function checkExercise(exercise, sqlText) {
		const check = exercise !== null && exercise !== undefined && exercise.check !== null && typeof exercise.check === 'object' ? exercise.check : { mode: 'result' };
		if (check.mode === 'schema') {
			return { pass: false, reason: '真实 MySQL 模式下暂不支持建表判题（DDL 会隐式提交、无法回滚），请切换到「兼容内核」做这道题，或直接在数据库里检查表结构。' };
		}
		const transactionPattern = /(^|[\s;])(START\s+TRANSACTION|BEGIN|COMMIT|ROLLBACK)([\s;]|$)/i;
		if (transactionPattern.test(String(sqlText)) || transactionPattern.test(String(exercise.solutionSql))) {
			return { pass: false, reason: '真实 MySQL 模式下暂不支持事务类练习判题（显式事务会破坏判题隔离），请切换到「兼容内核」完成这道题。' };
		}
		const conn = await ensureConnection();
		let expected;
		let actual;
		try {
			expected = await runCapturedInTransaction(conn, String(exercise.solutionSql === undefined ? '' : exercise.solutionSql), check);
		} catch (error) {
			return { pass: false, reason: '参考答案执行失败（插件数据问题）：' + friendlyMysqlError(error) };
		}
		try {
			actual = await runCapturedInTransaction(conn, sqlText, check);
		} catch (error) {
			return { pass: false, reason: friendlyMysqlError(error) };
		}
		if (actual === null) return { pass: false, reason: '你的 SQL 没有返回结果集，这道题需要一条 SELECT 查询。' };
		if (expected === null) return { pass: false, reason: '参考答案没有返回结果集（插件数据问题）。' };
		const comparison = compareResultSets(expected, actual, check.orderSensitive === true);
		const preview = (outcome) => ({ columns: outcome.columns.map(String), rows: outcome.rows.slice(0, MAX_PREVIEW_ROWS).map(previewRow) });
		if (comparison.pass) return { pass: true, reason: '结果和参考答案一致，通过！（真实 MySQL）', expected: preview(expected), actual: preview(actual), rowCount: actual.rows.length };
		return { pass: false, reason: comparison.reason, hint: comparison.hint, expected: preview(expected), actual: preview(actual), rowCount: actual.rows.length };
	}

	/** Describe the configured real database for the schema browser. */
	async function schemaInfo() {
		const conn = await ensureConnection();
		const database = env.mysql.database;
		const tables = [];
		const [tableRows] = await conn.query(
			'SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = ? ORDER BY TABLE_NAME',
			[database, 'BASE TABLE']
		);
		for (const tableRow of tableRows) {
			const name = String(tableRow.name);
			const [columnRows] = await conn.query(
				'SELECT COLUMN_NAME AS name, COLUMN_TYPE AS type, IS_NULLABLE AS nullable, COLUMN_KEY AS columnKey, COLUMN_DEFAULT AS defaultValue FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? ORDER BY ORDINAL_POSITION',
				[database, name]
			);
			let rowCount = 0;
			try {
				const [countRows] = await conn.query('SELECT COUNT(*) AS n FROM ' + quoteIdent(name));
				rowCount = countRows.length > 0 ? Number(countRows[0].n) : 0;
			} catch (_error) {
				rowCount = 0;
			}
			tables.push({
				name,
				rowCount,
				columns: columnRows.map((column) => ({
					name: String(column.name),
					type: String(column.type),
					notNull: String(column.nullable) === 'NO',
					primaryKey: String(column.columnKey) === 'PRI',
					defaultValue: column.defaultValue === null || column.defaultValue === undefined ? null : String(column.defaultValue)
				})),
				indexes: []
			});
		}
		return { name: database, engine: 'mysql', tables };
	}

	/** Initialize / rebuild the sample schema in the configured real database. */
	async function reset(force) {
		const conn = await ensureConnection();
		const database = env.mysql.database;
		if (SYSTEM_DATABASES.has(database.toLowerCase())) throw new Error('不能对系统库 ' + database + ' 执行重置');
		const schemaSql = fs.readFileSync(schemaPath, 'utf8');
		const [tableRows] = await conn.query(
			'SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = ?',
			[database, 'BASE TABLE']
		);
		if (tableRows.length > 0 && force !== true) {
			throw new Error('数据库 ' + database + ' 中已有 ' + tableRows.length + ' 张表。为避免误删，重置需要显式确认（force），建议使用专用的学习库。');
		}
		if (tableRows.length > 0) {
			await conn.query('SET FOREIGN_KEY_CHECKS = 0');
			try {
				for (const tableRow of tableRows) {
					await conn.query('DROP TABLE IF EXISTS ' + quoteIdent(String(tableRow.name)));
				}
			} finally {
				await conn.query('SET FOREIGN_KEY_CHECKS = 1');
			}
		}
		for (const statement of splitStatements(schemaSql)) {
			await conn.query(statement);
		}
		return schemaInfo();
	}

	function dispose() {
		disposed = true;
		closeConnection();
	}

	return {
		environment: publicEnvironment,
		setEnvironment,
		testConnection,
		query,
		checkExercise,
		schemaInfo,
		reset,
		dispose,
		status: async () => publicEnvironment()
	};
}
