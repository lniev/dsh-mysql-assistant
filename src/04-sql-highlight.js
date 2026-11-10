// #region SQL highlighting
// A small, dependency-free SQL tokenizer used by the playground editor overlay
// and read-only SQL blocks. It renders React nodes, so the same tokens work in
// the highlighted <pre> behind the textarea and in knowledge/lab snippets.

/** SQL keywords (upper-case comparison). */
const MYSQL_SQL_KEYWORDS = new Set((
	'SELECT FROM WHERE JOIN INNER LEFT RIGHT FULL OUTER CROSS ON USING GROUP BY ORDER HAVING LIMIT OFFSET ' +
	'INSERT INTO VALUES UPDATE SET DELETE CREATE TABLE ALTER DROP TRUNCATE INDEX PRIMARY KEY FOREIGN REFERENCES ' +
	'UNIQUE CONSTRAINT NOT NULL DEFAULT AUTO_INCREMENT ENGINE CHARSET COLLATE COMMENT AS DISTINCT ALL UNION ' +
	'EXISTS IN BETWEEN LIKE IS AND OR CASE WHEN THEN ELSE END WITH RECURSIVE OVER PARTITION ' +
	'EXPLAIN ANALYZE START TRANSACTION BEGIN COMMIT ROLLBACK SAVEPOINT SHOW DESCRIBE DESC ASC USE ' +
	'IF EXISTS IF NOT GREATER LESS THEN INNER OUTER LATERAL ROWS RANGE PRECEDING FOLLOWING CURRENT ROW ' +
	'LOCK SHARE MODE FOR UPDATE SKIP NOWAIT RETURNING REPLACE IGNORE DUPLICATE VALUES ON CONFLICT'
).split(/\s+/));

/** Column types (upper-case comparison), highlighted separately from keywords. */
const MYSQL_SQL_TYPES = new Set((
	'INT INTEGER BIGINT SMALLINT TINYINT MEDIUMINT DECIMAL NUMERIC FLOAT DOUBLE REAL BIT BOOLEAN BOOL ' +
	'CHAR VARCHAR TEXT TINYTEXT MEDIUMTEXT LONGTEXT BLOB TINYBLOB MEDIUMBLOB LONGBLOB BINARY VARBINARY ' +
	'DATE DATETIME TIMESTAMP TIME YEAR ENUM SET JSON UNSIGNED SIGNED ZEROFILL CHARACTER'
).split(/\s+/));

/** One pass over SQL text; each match becomes an identifier, keyword, string… */
const MYSQL_SQL_TOKEN_PATTERN = /(--[^\n]*|#[^\n]*|\/\*[\s\S]*?\*\/|'(?:[^'\\]|\\.|'')*'|"(?:[^"\\]|\\.)*"|`[^`]*`|\b\d+(?:\.\d+)?\b|[A-Za-z_@][\w$]*|[(),.;*=<>!+\-/|:]+|\s+|.)/g;

/** Highlight SQL text into React nodes. */
function mysqlHighlightSql(source) {
	const text = String(source === undefined || source === null ? '' : source);
	const nodes = [];
	MYSQL_SQL_TOKEN_PATTERN.lastIndex = 0;
	let index = 0;
	let match = MYSQL_SQL_TOKEN_PATTERN.exec(text);
	while (match !== null) {
		const token = match[0];
		if (token === '') {
			MYSQL_SQL_TOKEN_PATTERN.lastIndex += 1;
			match = MYSQL_SQL_TOKEN_PATTERN.exec(text);
			continue;
		}
		let type;
		if (token.indexOf('--') === 0 || token.indexOf('#') === 0 || token.indexOf('/*') === 0) type = 'com';
		else if (token.indexOf("'") === 0 || token.indexOf('"') === 0) type = 'str';
		else if (token.indexOf('`') === 0) type = 'ident';
		else if (/^\d/.test(token)) type = 'num';
		else if (/^[A-Za-z_@]/.test(token)) {
			const upper = token.toUpperCase();
			if (MYSQL_SQL_TYPES.has(upper)) type = 'type';
			else if (MYSQL_SQL_KEYWORDS.has(upper)) type = 'kw';
			else type = /^\s*\(/.test(text.slice(MYSQL_SQL_TOKEN_PATTERN.lastIndex)) ? 'fn' : 'id';
		} else if (/^\s+$/.test(token)) type = 'ws';
		else type = 'op';
		if (type === 'ws') nodes.push(token);
		else nodes.push(h('span', { key: 'sql' + String(index), className: 'my-tok my-tok-' + type }, token));
		index += 1;
		match = MYSQL_SQL_TOKEN_PATTERN.exec(text);
	}
	return nodes;
}
// #endregion
