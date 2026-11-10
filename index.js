import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createSqlRuntime, splitStatements } from './host/sql-runtime.js';
import { createMysqlRuntime } from './host/mysql-runtime.js';

/** Cordis plugin name. */
export const name = 'mysql-assistant';

/** Required Host services. */
export const inject = ['webServer', 'connection', 'tools', 'systemPrompt'];

const HERE = path.dirname(fileURLToPath(import.meta.url));
const KNOWLEDGE_PATH = path.join(HERE, 'knowledge', 'data.json');
const EXERCISES_PATH = path.join(HERE, 'playground', 'exercises.json');
const SCHEMA_PATH = path.join(HERE, 'playground', 'shop-schema.sql');
const ENVIRONMENT_PATH = path.join(HERE, '.runtime', 'environment.json');
const API_PREFIX = '/mysql-assistant/api';
const MAX_BODY_BYTES = 1024 * 1024;

// #region content loading
function readJsonFile(file) {
	try {
		return JSON.parse(fs.readFileSync(file, 'utf8'));
	} catch (_error) {
		return null;
	}
}

/** Load the merged knowledge base (`knowledge/data.json`). */
function loadKnowledge() {
	const data = readJsonFile(KNOWLEDGE_PATH);
	if (data !== null && typeof data === 'object' && data.pages !== undefined) {
		return {
			ok: true,
			meta: data.meta === undefined ? {} : data.meta,
			titleZh: data.titleZh,
			intro: data.intro,
			chapters: Array.isArray(data.chapters) ? data.chapters : [],
			pages: data.pages !== null && typeof data.pages === 'object' ? data.pages : {},
			knowledgeMap: data.knowledgeMap === undefined ? null : data.knowledgeMap,
			learningRoute: data.learningRoute === undefined ? null : data.learningRoute,
			labs: data.labs === undefined ? null : data.labs
		};
	}
	return {
		ok: false,
		error: '知识库数据 knowledge/data.json 尚未生成（运行 node scripts/build-data.mjs）',
		meta: { pageCount: 0 },
		titleZh: 'MySQL 学习知识库',
		chapters: [],
		pages: {},
		knowledgeMap: null,
		learningRoute: null,
		labs: null
	};
}

/** Cached knowledge snapshot keyed by the generated file's mtime. */
let knowledgeCache = { mtimeMs: -1, data: null };

function currentKnowledge() {
	let mtimeMs = -1;
	try {
		mtimeMs = fs.statSync(KNOWLEDGE_PATH).mtimeMs;
	} catch (_error) {
		mtimeMs = -1;
	}
	if (knowledgeCache.data === null || knowledgeCache.mtimeMs !== mtimeMs) {
		knowledgeCache = { mtimeMs, data: loadKnowledge() };
	}
	return knowledgeCache.data;
}

/** Cached exercise bundle keyed by exercises.json mtime. */
let exerciseCache = { mtimeMs: -1, data: null };

function currentExercises() {
	let mtimeMs = -1;
	try {
		mtimeMs = fs.statSync(EXERCISES_PATH).mtimeMs;
	} catch (_error) {
		mtimeMs = -1;
	}
	if (exerciseCache.data === null || exerciseCache.mtimeMs !== mtimeMs) {
		const data = readJsonFile(EXERCISES_PATH);
		exerciseCache = {
			mtimeMs,
			data: data !== null && typeof data === 'object' ? data : { ok: false, error: 'playground/exercises.json 尚未生成', stages: [], exercises: [] }
		};
	}
	return exerciseCache.data;
}
// #endregion

// #region tool text formatting
function pageTitle(page) {
	return page.titleZh === undefined || page.titleZh === '' ? page.title : page.titleZh;
}

function formatSearchHit(page) {
	const summary = typeof page.summary === 'string' ? page.summary : '';
	return '- `' + page.id + '` · ' + pageTitle(page) + ' — ' + (summary.length > 150 ? summary.slice(0, 149) + '…' : summary);
}

function formatPage(page) {
	const lines = [];
	lines.push('# ' + pageTitle(page) + '（' + page.title + '）');
	lines.push('');
	lines.push('页面 id：`' + page.id + '` · 章节：' + String(page.chapterTitleZh === undefined ? page.chapter : page.chapterTitleZh) + ' · 难度：' + String(page.difficulty === undefined ? '' : 'L' + page.difficulty) + ' · 建议 ' + String(page.minutes === undefined ? '' : page.minutes) + ' 分钟');
	lines.push('');
	if (typeof page.summary === 'string' && page.summary !== '') {
		lines.push('## 通俗总结');
		lines.push(page.summary);
		lines.push('');
	}
	const sections = Array.isArray(page.sections) ? page.sections : [];
	if (sections.length > 0) {
		lines.push('## 讲解');
		for (const section of sections) {
			lines.push('### ' + String(section.heading === undefined ? '' : section.heading));
			lines.push(String(section.text === undefined ? '' : section.text));
			lines.push('');
		}
	}
	const points = Array.isArray(page.keyPoints) ? page.keyPoints : [];
	if (points.length > 0) {
		lines.push('## 关键要点');
		for (const point of points) lines.push('- ' + String(point));
		lines.push('');
	}
	const snippets = Array.isArray(page.snippets) ? page.snippets : [];
	for (const snippet of snippets) {
		lines.push('## 示例：' + String(snippet.title === undefined ? '' : snippet.title));
		lines.push('```sql');
		lines.push(String(snippet.code === undefined ? '' : snippet.code));
		lines.push('```');
		lines.push('');
	}
	const pitfalls = Array.isArray(page.pitfalls) ? page.pitfalls : [];
	if (pitfalls.length > 0) {
		lines.push('## 常见坑');
		for (const pitfall of pitfalls) lines.push('- ' + String(pitfall));
		lines.push('');
	}
	if (typeof page.enterprise === 'string' && page.enterprise !== '') {
		lines.push('## 企业级落地');
		lines.push(page.enterprise);
		lines.push('');
	}
	const related = Array.isArray(page.related) ? page.related : [];
	if (related.length > 0) lines.push('相关知识点：' + related.map((id) => '`' + String(id) + '`').join('、'));
	if (typeof page.docUrl === 'string' && page.docUrl !== '') lines.push('官方文档：' + page.docUrl);
	return lines.join('\n');
}

function formatCatalog(knowledge) {
	const lines = ['# MySQL 知识库目录（' + String(knowledge.meta.pageCount === undefined ? Object.keys(knowledge.pages).length : knowledge.meta.pageCount) + ' 个知识点，8 个章节）', ''];
	for (const chapter of knowledge.chapters) {
		lines.push('## ' + String(chapter.titleZh) + '（' + String(chapter.title) + '）');
		if (typeof chapter.description === 'string') lines.push('> ' + chapter.description);
		for (const id of (Array.isArray(chapter.items) ? chapter.items : [])) {
			const page = knowledge.pages[id];
			lines.push('- `' + id + '` · ' + (page === undefined ? id : pageTitle(page)));
		}
		lines.push('');
	}
	return lines.join('\n');
}

function formatMap(map) {
	if (map === null || typeof map !== 'object') return '知识地图数据尚未生成。';
	const lines = ['# ' + String(map.titleZh === undefined ? 'MySQL 知识地图' : map.titleZh), '', String(map.intro === undefined ? '' : map.intro), ''];
	for (const layer of (Array.isArray(map.layers) ? map.layers : [])) {
		lines.push('## ' + String(layer.titleZh) + ' — ' + String(layer.description === undefined ? '' : layer.description));
		for (const node of (Array.isArray(map.nodes) ? map.nodes : []).filter((entry) => entry.layer === layer.id)) {
			const deps = Array.isArray(node.deps) && node.deps.length > 0 ? '（前置：' + node.deps.join('、') + '）' : '';
			lines.push('- `' + node.pageId + '` · ' + String(node.titleZh) + (node.tag === '' ? '' : ' [' + node.tag + ']') + deps);
		}
		lines.push('');
	}
	const paths = Array.isArray(map.paths) ? map.paths : [];
	if (paths.length > 0) {
		lines.push('## 推荐路径');
		for (const candidate of paths) {
			lines.push('- ' + String(candidate.titleZh) + '：' + String(candidate.description === undefined ? '' : candidate.description));
			lines.push('  ' + (Array.isArray(candidate.pageIds) ? candidate.pageIds.map((id) => '`' + id + '`').join(' → ') : ''));
		}
	}
	return lines.join('\n');
}

function formatRoute(route) {
	if (route === null || typeof route !== 'object') return '学习路线数据尚未生成。';
	const lines = ['# ' + String(route.titleZh === undefined ? 'MySQL 学习路线' : route.titleZh), '', String(route.intro === undefined ? '' : route.intro), '', '总时长（参考）：' + String(route.totalHours === undefined ? '?' : route.totalHours) + ' 小时', ''];
	for (const stage of (Array.isArray(route.stages) ? route.stages : [])) {
		lines.push('## ' + String(stage.title === undefined ? stage.id : stage.title) + ' · ' + String(stage.weeks === undefined ? '' : stage.weeks));
		lines.push('目标：' + String(stage.goal === undefined ? '' : stage.goal) + '（约 ' + String(stage.hours === undefined ? '?' : stage.hours) + ' 小时）');
		for (const item of (Array.isArray(stage.items) ? stage.items : [])) {
			lines.push('### ' + String(item.title));
			lines.push('目标：' + String(item.goal === undefined ? '' : item.goal));
			const points = Array.isArray(item.points) ? item.points : [];
			for (const point of points) lines.push('- ' + String(point));
			lines.push('交付物：' + String(item.deliverable === undefined ? '' : item.deliverable));
			lines.push('验收：' + String(item.accept === undefined ? '' : item.accept));
			const pageIds = Array.isArray(item.pageIds) ? item.pageIds : [];
			if (pageIds.length > 0) lines.push('相关知识点：' + pageIds.map((id) => '`' + id + '`').join('、'));
			lines.push('');
		}
	}
	const checkpoints = Array.isArray(route.checkpoints) ? route.checkpoints : [];
	if (checkpoints.length > 0) {
		lines.push('## 阶段验收');
		for (const checkpoint of checkpoints) lines.push('- ' + String(checkpoint.title) + '：' + String(checkpoint.description));
	}
	return lines.join('\n');
}

function formatLabs(labs) {
	if (labs === null || typeof labs !== 'object') return '企业级实战数据尚未生成。';
	const lines = ['# ' + String(labs.titleZh === undefined ? '企业级实战' : labs.titleZh), '', String(labs.intro === undefined ? '' : labs.intro), ''];
	for (const scenario of (Array.isArray(labs.scenarios) ? labs.scenarios : [])) {
		lines.push('## ' + String(scenario.titleZh) + '（' + String(scenario.level === undefined ? '' : scenario.level) + ' · 约 ' + String(scenario.hours === undefined ? '?' : scenario.hours) + ' 小时）');
		lines.push('业务背景：' + String(scenario.background === undefined ? '' : scenario.background));
		lines.push('目标：' + String(scenario.goal === undefined ? '' : scenario.goal));
		for (const step of (Array.isArray(scenario.steps) ? scenario.steps : [])) {
			lines.push('### ' + String(step.title));
			lines.push(String(step.detail === undefined ? '' : step.detail));
			if (typeof step.sql === 'string' && step.sql.trim() !== '') {
				lines.push('```sql');
				lines.push(step.sql);
				lines.push('```');
			}
		}
		const checklist = Array.isArray(scenario.checklist) ? scenario.checklist : [];
		if (checklist.length > 0) {
			lines.push('检查清单：');
			for (const entry of checklist) lines.push('- [ ] ' + String(entry));
		}
		const pitfalls = Array.isArray(scenario.pitfalls) ? scenario.pitfalls : [];
		if (pitfalls.length > 0) lines.push('常见坑：' + pitfalls.join('；'));
		const pageIds = Array.isArray(scenario.pageIds) ? scenario.pageIds : [];
		if (pageIds.length > 0) lines.push('相关知识点：' + pageIds.map((id) => '`' + id + '`').join('、'));
		lines.push('');
	}
	return lines.join('\n');
}

function formatExercises(exercises) {
	if (exercises === null || typeof exercises !== 'object') return 'SQL 练习数据尚未生成。';
	const lines = ['# SQL 操练场练习清单（' + String((Array.isArray(exercises.exercises) ? exercises.exercises : []).length) + ' 题）', ''];
	for (const stage of (Array.isArray(exercises.stages) ? exercises.stages : [])) {
		lines.push('## ' + String(stage.titleZh) + ' — ' + String(stage.description === undefined ? '' : stage.description));
		for (const exercise of (exercises.exercises || []).filter((entry) => entry.stageId === stage.id)) {
			lines.push('- `' + exercise.id + '` · ' + String(exercise.titleZh) + ' — ' + String(exercise.goal === undefined ? '' : exercise.goal));
		}
		lines.push('');
	}
	lines.push('用 action="exercise" + id 查看某题的完整描述、提示与参考答案（判题在面板里的 SQL 操练场自动完成）。');
	return lines.join('\n');
}

function formatExercise(exercises, id) {
	const list = exercises === null || typeof exercises !== 'object' || !Array.isArray(exercises.exercises) ? [] : exercises.exercises;
	const exercise = list.find((entry) => entry.id === id);
	if (exercise === undefined) return '未找到练习 `' + id + '`。先不带 id 调用 action="exercise" 查看练习清单。';
	const lines = [];
	lines.push('# 练习 ' + String(exercise.id) + ' · ' + String(exercise.titleZh));
	lines.push('目标：' + String(exercise.goal === undefined ? '' : exercise.goal));
	lines.push('题目：' + String(exercise.prompt === undefined ? '' : exercise.prompt));
	lines.push('提示：' + String(exercise.hint === undefined ? '' : exercise.hint));
	lines.push('难度：L' + String(exercise.difficulty === undefined ? '?' : exercise.difficulty) + ' · 建议 ' + String(exercise.minutes === undefined ? '?' : exercise.minutes) + ' 分钟');
	const check = exercise.check !== null && typeof exercise.check === 'object' ? exercise.check : {};
	lines.push('判题方式：' + (check.mode === undefined ? 'result' : check.mode) + (check.orderSensitive === true ? '（顺序敏感）' : ''));
	lines.push('参考答案：');
	lines.push('```sql');
	lines.push(String(exercise.solutionSql === undefined ? '' : exercise.solutionSql));
	lines.push('```');
	const pageIds = Array.isArray(exercise.pageIds) ? exercise.pageIds : [];
	if (pageIds.length > 0) lines.push('相关知识点：' + pageIds.map((pageId) => '`' + pageId + '`').join('、'));
	return lines.join('\n');
}

function queryTokens(query) {
	const text = String(query === undefined || query === null ? '' : query).toLowerCase().trim();
	if (text === '') return [];
	const parts = text.split(/[\s,，、;；/]+/).filter((part) => part !== '');
	const tokens = [];
	for (const part of parts) {
		if (/^[a-z0-9@._-]+$/i.test(part)) {
			tokens.push(part);
			continue;
		}
		tokens.push(part);
		if (part.length > 3) {
			for (let index = 0; index + 2 <= part.length; index += 1) {
				const shingle = part.slice(index, index + 2);
				if (tokens.indexOf(shingle) < 0) tokens.push(shingle);
			}
		}
	}
	return tokens;
}

function searchKnowledge(knowledge, query, limit) {
	const tokens = queryTokens(query);
	if (tokens.length === 0) return [];
	const scored = [];
	for (const page of Object.values(knowledge.pages)) {
		const title = String(page.titleZh === undefined ? page.title : page.titleZh).toLowerCase();
		const en = String(page.title === undefined ? '' : page.title).toLowerCase();
		const summary = String(page.summary === undefined ? '' : page.summary).toLowerCase();
		const sectionText = (Array.isArray(page.sections) ? page.sections : []).map((section) => String(section.heading === undefined ? '' : section.heading) + ' ' + String(section.text === undefined ? '' : section.text).toLowerCase()).join(' ');
		const points = (Array.isArray(page.keyPoints) ? page.keyPoints : []).map((point) => String(point).toLowerCase());
		const pitfalls = (Array.isArray(page.pitfalls) ? page.pitfalls : []).map((entry) => String(entry).toLowerCase());
		const enterprise = String(page.enterprise === undefined ? '' : page.enterprise).toLowerCase();
		let score = 0;
		let matched = 0;
		for (const token of tokens) {
			let hit = 0;
			if (title === token) hit += 150;
			else if (title.indexOf(token) >= 0) hit += 90;
			if (en.indexOf(token) >= 0) hit += 60;
			if (summary.indexOf(token) >= 0) hit += 26;
			if (sectionText.indexOf(token) >= 0) hit += 18;
			let pointHits = 0;
			for (const point of points) if (point.indexOf(token) >= 0) pointHits += 1;
			if (pointHits > 0) hit += 12 + Math.min(pointHits, 3) * 4;
			if (pitfalls.some((entry) => entry.indexOf(token) >= 0)) hit += 8;
			if (enterprise.indexOf(token) >= 0) hit += 6;
			if (hit > 0) {
				matched += 1;
				score += hit;
			}
		}
		if (matched === 0) continue;
		score += matched * 20;
		scored.push({ page, score });
	}
	scored.sort((left, right) => right.score - left.score);
	const max = typeof limit === 'number' && limit > 0 ? Math.min(limit, 20) : 8;
	return scored.slice(0, max);
}
// #endregion

// #region mysql_docs tool
const KNOWLEDGE_GUIDANCE = `## MySQL knowledge base, learning route and SQL playground
The Harness Web UI has a "MySQL 学习助手" panel in the left sidebar with five tabs: 知识地图 (a clickable knowledge map of 83 plain-language MySQL topics), 学习路线 (a staged learning route with deliverables and acceptance criteria), 企业级实战 (8 enterprise labs: e-commerce schema, inventory oversell, order idempotency, reporting, replication, sharding, migrations), SQL 操练场 (a two-pane SQL playground with a seeded e-commerce database and automatic exercise grading) and AI 问答 (a real AI Q&A session grounded in the built-in knowledge base and the SQL playground: it explains topics, creates exercises, reviews the user's SQL and plans learning, with the plugin's system-prompt guidance to use the mysql_docs tool). The playground's default engine is a MySQL-compatible SQLite kernel, and the 执行环境 control can switch it to a real local/Docker MySQL 8 server (mysql2): note dialect gaps (stored procedures, some DDL, EXPLAIN output) when relevant, and mention the environment switch when the user wants to validate against real MySQL. When the user is learning, prefer: explain with the knowledge base -> point to the exact map topic id -> suggest the matching playground exercise id. Answer in the user's language, keep explanations plain-language and use everyday analogies like the knowledge base does.

Use the \`mysql_docs\` tool for MySQL questions instead of searching the web:
- \`action: "search"\` with \`query\` — find topics by keyword (e.g. 索引失效, MVCC, 分库分表);
- \`action: "read"\` with \`id\` — read one topic's plain-language explanation, SQL examples, pitfalls and enterprise advice;
- \`action: "list"\` — the 8-chapter table of contents;
- \`action: "map"\` — the clickable knowledge map (layers, dependencies, recommended paths);
- \`action: "route"\` — the staged learning route;
- \`action: "labs"\` — the enterprise labs;
- \`action: "exercise"\` (optional \`id\`) — list playground exercises or read one exercise, its hint and reference solution.

When the user is learning, prefer: explain with the knowledge base -> point to the exact map topic id -> suggest the matching playground exercise id. The playground is a MySQL-compatible SQLite engine, not a real mysqld: note dialect gaps (stored procedures, some DDL, EXPLAIN output) when relevant. Answer in the user's language, keep explanations plain-language and use everyday analogies like the knowledge base does.

When the user asks why a playground SQL errors or returns wrong results, use the \`mysql_playground_query\` tool to run read-only SQL (SELECT/SHOW/DESCRIBE/EXPLAIN/WITH) on the current playground environment to inspect data and reproduce the behaviour. It cannot execute writes or DDL. Explain the root cause, give the corrected SQL, and point to the related knowledge topic or exercise id.`;

function defineMysqlDocsTool(getKnowledge, getExercises) {
	return {
		name: 'mysql_docs',
		description: '查询本插件内置的 MySQL 学习知识库（83 个通俗知识点、知识地图、学习路线、企业级实战）与 SQL 操练场练习。action=search 关键词检索；action=read 读取知识点（需要 id）；action=list 目录；action=map 知识地图；action=route 学习路线；action=labs 企业实战；action=exercise 练习列表或单题详情（可选 id）。回答 MySQL 问题时优先用它，不要每次上网查文档。',
		parameters: {
			type: 'object',
			properties: {
				action: {
					type: 'string',
					enum: ['list', 'search', 'read', 'map', 'route', 'labs', 'exercise'],
					description: 'list=目录；search=关键词检索；read=读取知识点（需要 id）；map=知识地图；route=学习路线；labs=企业级实战；exercise=练习清单/单题详情'
				},
				query: {
					type: 'string',
					description: 'search 的检索词，例如 "索引失效"、"MVCC"、"分库分表"、"JOIN"'
				},
				id: {
					type: 'string',
					description: 'read 的知识点 id（如 "where-filter"、"mvcc"）或 exercise 的练习 id（如 "b1"）；可先用 list/search 获得'
				},
				limit: {
					type: 'number',
					description: 'search 返回条数上限，默认 8，最大 20'
				}
			},
			required: ['action'],
			additionalProperties: false
		},
		output: {
			schema: { type: 'string' },
			render(_args, value) {
				return [{ type: 'text', text: typeof value === 'string' ? value : JSON.stringify(value) }];
			}
		},
		async execute(args) {
			const input = args !== null && typeof args === 'object' ? args : {};
			const action = typeof input.action === 'string' ? input.action : 'search';
			const knowledge = getKnowledge();
			if (!knowledge.ok) return '知识库尚未生成：' + String(knowledge.error === undefined ? '缺少 knowledge/data.json' : knowledge.error);
			if (action === 'list') return formatCatalog(knowledge);
			if (action === 'map') return formatMap(knowledge.knowledgeMap);
			if (action === 'route') return formatRoute(knowledge.learningRoute);
			if (action === 'labs') return formatLabs(knowledge.labs);
			if (action === 'exercise') {
				const exercises = getExercises();
				const id = typeof input.id === 'string' ? input.id.trim() : '';
				return id === '' ? formatExercises(exercises) : formatExercise(exercises, id);
			}
			if (action === 'read') {
				const id = typeof input.id === 'string' ? input.id.trim() : '';
				if (id === '') return 'read 需要 id 参数；先用 action="search" 或 action="list" 找到知识点 id。';
				const page = knowledge.pages[id];
				if (page === undefined) {
					const hits = searchKnowledge(knowledge, id, 5);
					return '未找到知识点 `' + id + '`。' + (hits.length > 0 ? '\n相近知识点：\n' + hits.map((hit) => formatSearchHit(hit.page)).join('\n') : '请用 list 查看全部知识点 id。');
				}
				return formatPage(page);
			}
			const query = typeof input.query === 'string' ? input.query : '';
			if (query.trim() === '') return 'search 需要 query 参数。';
			const hits = searchKnowledge(knowledge, query, input.limit);
			if (hits.length === 0) return '没有匹配「' + query + '」的知识点。可以换关键词，或用 list 浏览目录。';
			return '# 检索「' + query + '」的知识点\n\n' + hits.map((hit) => formatSearchHit(hit.page)).join('\n') + '\n\n用 action="read" + id 读取完整内容。';
		}
	};
}

/** Read-only SQL runner exposed to the AI so it can debug playground queries. */
function definePlaygroundQueryTool(activeEngine) {
	const readOnly = /^(select|show|describe|desc|explain|with)\b/i;
	return {
		name: 'mysql_playground_query',
		description: '在 SQL 操练场当前执行环境上执行只读 SQL（SELECT / SHOW / DESCRIBE / EXPLAIN / WITH），用于查看练习数据、复现用户的 SQL 或验证查询结果；不能执行 INSERT/UPDATE/DELETE 或 DDL。排查操练场问题时用它核对数据。',
		parameters: {
			type: 'object',
			properties: {
				sql: { type: 'string', description: '要执行的只读 SQL，一条或多条语句' },
				limit: { type: 'number', description: '最多返回行数，默认 50，最大 200' }
			},
			required: ['sql']
		},
		output: {
			schema: { type: 'string' },
			render(_args, value) {
				return [{ type: 'text', text: typeof value === 'string' ? value : JSON.stringify(value) }];
			}
		},
		async execute(args) {
			const sql = args !== null && typeof args.sql === 'string' ? args.sql.trim() : '';
			if (sql === '') return '缺少 sql。';
			const statements = splitStatements(sql);
			if (statements.length === 0) return '没有可执行的 SQL。';
			for (const statement of statements) {
				if (!readOnly.test(statement.replace(/^[\s(]+/, ''))) return '只允许只读查询（SELECT/SHOW/DESCRIBE/EXPLAIN/WITH），不能执行写操作或 DDL。';
			}
			const limit = typeof args.limit === 'number' && Number.isFinite(args.limit) && args.limit > 0 ? Math.min(Math.floor(args.limit), 200) : 50;
			let result = null;
			try {
				result = await activeEngine().query(sql);
			} catch (error) {
				return '执行失败：' + (error !== null && error !== undefined && typeof error.message === 'string' ? error.message : String(error));
			}
			if (result.error !== undefined && result.error !== '') return '执行失败：' + result.error;
			if (!Array.isArray(result.columns) || result.columns.length === 0) return '执行成功，没有结果集（影响行数：' + String(result.affected) + '）。';
			const lines = ['列：' + result.columns.join(' | ')];
			for (const row of result.rows.slice(0, limit)) lines.push(row.map((value) => (value === null ? 'NULL' : String(value))).join(' | '));
			lines.push('共 ' + String(result.rowCount) + ' 行' + (result.rowCount > limit ? '，仅显示前 ' + String(limit) + ' 行' : '') + (result.truncated === true ? '（结果已截断）' : ''));
			return lines.join('\n');
		}
	};
}
// #endregion

// #region http helpers
function sendJson(res, status, payload) {
	res.statusCode = status;
	res.setHeader('content-type', 'application/json; charset=utf-8');
	res.setHeader('cache-control', 'no-store');
	res.end(JSON.stringify(payload));
}

function readJsonBody(req) {
	return new Promise((resolve, reject) => {
		const chunks = [];
		let size = 0;
		let failed = false;
		req.on('data', (chunk) => {
			if (failed) return;
			size += chunk.length;
			if (size > MAX_BODY_BYTES) {
				failed = true;
				reject(new Error('请求体超过 1MB 限制'));
				return;
			}
			chunks.push(chunk);
		});
		req.on('end', () => {
			if (failed) return;
			const text = Buffer.concat(chunks).toString('utf8').trim();
			if (text === '') {
				resolve({});
				return;
			}
			try {
				const parsed = JSON.parse(text);
				resolve(parsed !== null && typeof parsed === 'object' ? parsed : {});
			} catch (_error) {
				reject(new Error('请求体不是合法 JSON'));
			}
		});
		req.on('error', (error) => {
			if (!failed) reject(error);
		});
	});
}
// #endregion

// #region plugin
/**
 * Register the Host half: knowledge API, `mysql_docs` tool, prompt guidance and
 * the SQL playground runtime.
 * @param ctx - Host context carrying webServer, connection, tools and systemPrompt.
 */
export function apply(ctx) {
	const getKnowledge = () => currentKnowledge();
	const getExercises = () => currentExercises();

	const logLine = (line) => {
		try {
			if (ctx.logger !== undefined && typeof ctx.logger.debug === 'function') ctx.logger.debug('[mysql-assistant] ' + line);
		} catch (_error) {
			/* logging is best-effort */
		}
	};
	const runtime = createSqlRuntime({ schemaPath: SCHEMA_PATH, log: logLine });
	const mysqlRuntime = createMysqlRuntime({ schemaPath: SCHEMA_PATH, configPath: ENVIRONMENT_PATH, log: logLine });
	const activeEngine = () => (mysqlRuntime.environment().mode === 'mysql' ? mysqlRuntime : runtime);

	ctx.effect(() => () => {
		try {
			runtime.dispose();
		} catch (_error) {
			/* disposal is best-effort */
		}
		try {
			mysqlRuntime.dispose();
		} catch (_error) {
			/* disposal is best-effort */
		}
	}, 'mysql-assistant: SQL runtime disposal');

	ctx.effect(() => ctx.systemPrompt.section({
		name: 'mysql-assistant:knowledge',
		order: 3260,
		text: KNOWLEDGE_GUIDANCE
	}), 'mysql-assistant: prompt guidance');

	ctx.effect(() => ctx.tools.register(defineMysqlDocsTool(getKnowledge, getExercises)), 'mysql-assistant: mysql_docs tool');
	ctx.effect(() => ctx.tools.register(definePlaygroundQueryTool(activeEngine)), 'mysql-assistant: playground query tool');

	const connection = ctx.get('connection');
	/** Answer an untrusted/unauthenticated request; true when it was rejected. */
	const rejected = (req, res) => {
		try {
			if (connection === undefined || typeof connection.requestRejection !== 'function') return false;
			const rejection = connection.requestRejection(req);
			if (rejection === undefined || rejection === null) return false;
			res.statusCode = rejection;
			res.end();
			return true;
		} catch (_error) {
			return false;
		}
	};

	const handle = async (req, res) => {
		if (rejected(req, res)) return;
		let route = '';
		try {
			const url = new URL(String(req.url === undefined ? '/' : req.url), 'http://localhost');
			route = url.pathname.slice(API_PREFIX.length);
			if (route === '') route = '/';
			const method = String(req.method === undefined ? 'GET' : req.method).toUpperCase();
			if (method === 'GET' && route === '/kb') {
				sendJson(res, 200, { ok: true, knowledge: getKnowledge(), exercisesMeta: { ready: getExercises().ok !== false } });
				return;
			}
			if (method === 'GET' && route === '/status') {
				sendJson(res, 200, { ok: true, runtime: await runtime.status(), environment: mysqlRuntime.environment(), knowledgeReady: getKnowledge().ok === true, exercisesReady: getExercises().ok !== false });
				return;
			}
			if (method === 'GET' && route === '/playground/environment') {
				sendJson(res, 200, { ok: true, environment: mysqlRuntime.environment() });
				return;
			}
			if (method === 'POST' && route === '/playground/environment') {
				const body = await readJsonBody(req);
				try {
					const environment = await mysqlRuntime.setEnvironment(body);
					sendJson(res, 200, { ok: true, environment });
				} catch (error) {
					sendJson(res, 200, { ok: false, error: error !== null && error !== undefined && typeof error.message === 'string' ? error.message : String(error), environment: mysqlRuntime.environment() });
				}
				return;
			}
			if (method === 'POST' && route === '/playground/environment/test') {
				const body = await readJsonBody(req);
				try {
					const info = await mysqlRuntime.testConnection(body.mysql === undefined ? {} : body.mysql);
					sendJson(res, 200, { ok: true, info });
				} catch (error) {
					sendJson(res, 200, { ok: false, error: error !== null && error !== undefined && typeof error.message === 'string' ? error.message : String(error) });
				}
				return;
			}
			if (method === 'GET' && route === '/playground') {
				const exercises = getExercises();
				const environment = mysqlRuntime.environment();
				let schema = null;
				let schemaError = null;
				try {
					schema = await activeEngine().schemaInfo();
				} catch (error) {
					schemaError = error !== null && error !== undefined && typeof error.message === 'string' ? error.message : String(error);
				}
				sendJson(res, 200, {
					ok: true,
					exercises: exercises.ok === false ? { exercises: [], stages: [], error: exercises.error } : exercises,
					schema,
					schemaError,
					environment
				});
				return;
			}
			if (method === 'GET' && route === '/playground/schema') {
				sendJson(res, 200, { ok: true, schema: await activeEngine().schemaInfo() });
				return;
			}
			if (method === 'POST' && route === '/playground/query') {
				const body = await readJsonBody(req);
				if (typeof body.sql !== 'string') throw new Error('缺少 sql');
				sendJson(res, 200, { ok: true, result: await activeEngine().query(body.sql) });
				return;
			}
			if (method === 'POST' && route === '/playground/check') {
				const body = await readJsonBody(req);
				if (typeof body.exerciseId !== 'string' || body.exerciseId === '') throw new Error('缺少 exerciseId');
				if (typeof body.sql !== 'string') throw new Error('缺少 sql');
				const exercises = getExercises();
				const list = exercises.ok === false || !Array.isArray(exercises.exercises) ? [] : exercises.exercises;
				const exercise = list.find((entry) => entry.id === body.exerciseId);
				if (exercise === undefined) throw new Error('练习不存在：' + body.exerciseId);
				const check = await activeEngine().checkExercise(exercise, body.sql);
				sendJson(res, 200, { ok: true, check });
				return;
			}
			if (method === 'POST' && route === '/playground/reset') {
				const body = await readJsonBody(req);
				const engine = activeEngine();
				const schema = engine === mysqlRuntime ? await mysqlRuntime.reset(body.force === true) : await runtime.reset();
				sendJson(res, 200, { ok: true, schema, environment: mysqlRuntime.environment() });
				return;
			}
			sendJson(res, 404, { ok: false, error: '未知的插件接口：' + method + ' ' + route });
		} catch (error) {
			sendJson(res, 500, { ok: false, error: error !== null && error !== undefined && typeof error.message === 'string' ? error.message : String(error) });
		}
	};

	ctx.effect(() => ctx.webServer.register({ kind: 'prefix', path: API_PREFIX, handler: handle }), 'mysql-assistant: api route');
}
// #endregion
