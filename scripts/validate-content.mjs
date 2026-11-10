#!/usr/bin/env node
/**
 * Validate the MySQL assistant content files.
 *
 * Checks `knowledge/pages/*.json` against `knowledge/manifest.json`, then the
 * optional map / route / labs / exercises files. Exits non-zero on errors so
 * content authors can self-check before merging.
 *
 * Usage: node scripts/validate-content.mjs [--only pages|map|route|labs|exercises]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const knowledgeDir = path.join(root, 'knowledge');
const pagesDir = path.join(knowledgeDir, 'pages');
const playgroundDir = path.join(root, 'playground');
const argValue = (flag) => {
	const index = process.argv.indexOf(flag);
	return index >= 0 ? process.argv[index + 1] : null;
};
const only = argValue('--only');
const chapterFilter = argValue('--chapter');

let errors = 0;
let warnings = 0;
const error = (message) => {
	errors += 1;
	console.log('  ✗ ' + message);
};
const warn = (message) => {
	warnings += 1;
	console.log('  ! ' + message);
};

function readJson(file) {
	try {
		return JSON.parse(fs.readFileSync(file, 'utf8'));
	} catch (cause) {
		return { __error: String(cause && cause.message ? cause.message : cause) };
	}
}

const manifest = readJson(path.join(knowledgeDir, 'manifest.json'));
if (manifest.__error !== undefined) {
	console.log('manifest.json 无法解析：' + manifest.__error);
	process.exit(1);
}
const pageIds = new Set(manifest.pages.map((page) => page.id));
const pageById = new Map(manifest.pages.map((page) => [page.id, page]));
const chapterIds = new Set(manifest.chapters.map((chapter) => chapter.id));
const needs = (name) => only === null || only === name;

/** Count CJK characters + latin words, ignoring whitespace. */
function charCount(text) {
	return String(text === undefined || text === null ? '' : text).replace(/\s+/g, '').length;
}

/** Validate one knowledge page file. */
function validatePage(id) {
	const meta = pageById.get(id);
	if (meta !== undefined && chapterFilter !== null && meta.chapter !== chapterFilter) return;
	const file = path.join(pagesDir, meta === undefined ? 'start' : meta.chapter, id + '.json');
	if (!fs.existsSync(file)) {
		error('缺少页面文件 knowledge/pages/' + id + '.json');
		return;
	}
	const page = readJson(file);
	if (page.__error !== undefined) {
		error(id + ' 不是合法 JSON：' + page.__error);
		return;
	}
	if (page.id !== id) error(id + ' 文件内 id 与文件名不一致（' + page.id + '）');
	if (meta === undefined) return;
	if (page.chapter !== meta.chapter) error(id + ' chapter 应为 ' + meta.chapter + '，实际 ' + page.chapter);
	if (typeof page.titleZh !== 'string' || page.titleZh.trim() === '') error(id + ' 缺少 titleZh');
	if (typeof page.summary !== 'string') error(id + ' 缺少 summary');
	else if (charCount(page.summary) < 40) error(id + ' summary 太短（' + charCount(page.summary) + ' 字）');
	else if (charCount(page.summary) > 260) warn(id + ' summary 偏长（' + charCount(page.summary) + ' 字）');
	const sections = Array.isArray(page.sections) ? page.sections : null;
	if (sections === null) error(id + ' sections 必须是数组');
	else if (sections.length < 2 || sections.length > 5) error(id + ' sections 应为 2~5 个，实际 ' + sections.length);
	else {
		for (let index = 0; index < sections.length; index += 1) {
			const section = sections[index];
			if (section === null || typeof section !== 'object') {
				error(id + ' sections[' + index + '] 不是对象');
				continue;
			}
			if (typeof section.heading !== 'string' || section.heading.trim() === '') error(id + ' sections[' + index + '] 缺少 heading');
			if (typeof section.text !== 'string' || charCount(section.text) < 50) error(id + ' sections[' + index + '].text 太短');
			else if (charCount(section.text) > 320) warn(id + ' sections[' + index + '].text 偏长（' + charCount(section.text) + ' 字）');
		}
	}
	const points = Array.isArray(page.keyPoints) ? page.keyPoints : null;
	if (points === null) error(id + ' keyPoints 必须是数组');
	else if (points.length < 3 || points.length > 7) error(id + ' keyPoints 应为 3~7 条，实际 ' + points.length);
	const snippets = Array.isArray(page.snippets) ? page.snippets : null;
	if (snippets === null) error(id + ' snippets 必须是数组');
	else if (snippets.length > 3) error(id + ' snippets 最多 3 个');
	else {
		for (let index = 0; index < snippets.length; index += 1) {
			const snippet = snippets[index];
			if (snippet === null || typeof snippet !== 'object') error(id + ' snippets[' + index + '] 不是对象');
			else {
				if (snippet.lang !== 'sql') error(id + ' snippets[' + index + '].lang 必须是 sql');
				if (typeof snippet.code !== 'string' || snippet.code.trim() === '') error(id + ' snippets[' + index + '].code 为空');
				if (typeof snippet.title !== 'string' || snippet.title.trim() === '') error(id + ' snippets[' + index + '].title 为空');
			}
		}
	}
	const pitfalls = Array.isArray(page.pitfalls) ? page.pitfalls : null;
	if (pitfalls === null) error(id + ' pitfalls 必须是数组');
	else if (pitfalls.length < 2 || pitfalls.length > 5) error(id + ' pitfalls 应为 2~5 条，实际 ' + pitfalls.length);
	if (typeof page.enterprise !== 'string' || charCount(page.enterprise) < 20) error(id + ' enterprise 太短');
	const related = Array.isArray(page.related) ? page.related : null;
	if (related === null) error(id + ' related 必须是数组');
	else {
		if (related.length < 2 || related.length > 6) error(id + ' related 应为 2~6 个，实际 ' + related.length);
		for (const ref of related) {
			if (!pageIds.has(ref)) error(id + ' related 引用了不存在的页面 ' + ref);
			if (ref === id) error(id + ' related 不能引用自己');
		}
	}
}

/** Validate knowledge/map.json. */
function validateMap() {
	const file = path.join(knowledgeDir, 'map.json');
	if (!fs.existsSync(file)) {
		warn('knowledge/map.json 尚未生成');
		return;
	}
	const map = readJson(file);
	if (map.__error !== undefined) {
		error('map.json 不是合法 JSON：' + map.__error);
		return;
	}
	const layers = Array.isArray(map.layers) ? map.layers : [];
	const layerIds = new Set(layers.map((layer) => layer.id));
	const expectedLayers = ['foundation', 'sql', 'optimize', 'production', 'enterprise'];
	for (const layer of expectedLayers) if (!layerIds.has(layer)) error('map.layers 缺少层 ' + layer);
	const nodes = Array.isArray(map.nodes) ? map.nodes : [];
	const seen = new Set();
	for (const node of nodes) {
		if (node === null || typeof node !== 'object') {
			error('map.nodes 存在非对象节点');
			continue;
		}
		if (!pageIds.has(node.pageId)) error('map.nodes 引用了不存在的页面 ' + node.pageId);
		if (seen.has(node.pageId)) error('map.nodes 重复页面 ' + node.pageId);
		seen.add(node.pageId);
		for (const dep of (Array.isArray(node.deps) ? node.deps : [])) {
			if (!pageIds.has(dep)) error('map.nodes ' + node.pageId + ' 的 deps 引用了不存在的页面 ' + dep);
		}
	}
	for (const page of manifest.pages) if (!seen.has(page.id)) error('map.nodes 缺少页面 ' + page.id + '（必须覆盖全部 83 页）');
	// cycle detection on the dependency graph
	const graph = new Map(nodes.map((node) => [node.pageId, Array.isArray(node.deps) ? node.deps : []]));
	const state = new Map();
	let cycle = null;
	const visit = (id, trail) => {
		if (cycle !== null) return;
		const mark = state.get(id);
		if (mark === 'done') return;
		if (mark === 'visiting') {
			cycle = trail.concat([id]).join(' → ');
			return;
		}
		state.set(id, 'visiting');
		for (const dep of graph.get(id) || []) visit(dep, trail.concat([id]));
		state.set(id, 'done');
	};
	for (const id of graph.keys()) visit(id, []);
	if (cycle !== null) error('map.nodes 存在循环依赖：' + cycle);
	const paths = Array.isArray(map.paths) ? map.paths : [];
	if (paths.length < 3) warn('map.paths 建议至少 3 条推荐路线');
	for (const candidate of paths) {
		if (!Array.isArray(candidate.pageIds) || candidate.pageIds.length < 4) error('map.paths ' + candidate.id + ' 至少要 4 个页面');
		for (const id of (Array.isArray(candidate.pageIds) ? candidate.pageIds : [])) {
			if (!pageIds.has(id)) error('map.paths ' + candidate.id + ' 引用不存在的页面 ' + id);
		}
	}
}

/** Validate knowledge/learning-route.json. */
function validateRoute() {
	const file = path.join(knowledgeDir, 'learning-route.json');
	if (!fs.existsSync(file)) {
		warn('knowledge/learning-route.json 尚未生成');
		return;
	}
	const route = readJson(file);
	if (route.__error !== undefined) {
		error('learning-route.json 不是合法 JSON：' + route.__error);
		return;
	}
	if (typeof route.titleZh !== 'string' || route.titleZh.trim() === '') error('route 缺少 titleZh');
	if (typeof route.intro !== 'string' || charCount(route.intro) < 40) error('route.intro 太短');
	const stages = Array.isArray(route.stages) ? route.stages : [];
	if (stages.length < 6 || stages.length > 8) error('route.stages 应为 6~8 个，实际 ' + stages.length);
	const stageIds = new Set(stages.map((stage) => stage.id));
	let itemCount = 0;
	for (const stage of stages) {
		if (typeof stage.titleZh !== 'string' || stage.titleZh.trim() === '') error('stage ' + stage.id + ' 缺少 titleZh');
		if (typeof stage.goal !== 'string' || stage.goal.trim() === '') error('stage ' + stage.id + ' 缺少 goal');
		const items = Array.isArray(stage.items) ? stage.items : [];
		if (items.length < 3) error('stage ' + stage.id + ' items 少于 3 个');
		for (const item of items) {
			itemCount += 1;
			if (typeof item.title !== 'string' || item.title.trim() === '') error('stage ' + stage.id + ' 存在缺少 title 的 item');
			if (typeof item.deliverable !== 'string' || item.deliverable.trim() === '') error('item ' + item.id + ' 缺少 deliverable');
			if (typeof item.accept !== 'string' || item.accept.trim() === '') error('item ' + item.id + ' 缺少 accept');
			if (typeof item.practice !== 'string' || item.practice.trim() === '') error('item ' + item.id + ' 缺少 practice');
			if (!Array.isArray(item.pageIds) || item.pageIds.length < 1) error('item ' + item.id + ' 缺少 pageIds');
			for (const id of (Array.isArray(item.pageIds) ? item.pageIds : [])) {
				if (!pageIds.has(id)) error('item ' + item.id + ' 引用不存在的页面 ' + id);
			}
		}
	}
	if (itemCount < 28) warn('route 共 ' + itemCount + ' 个 item，建议 30+');
	const tracks = Array.isArray(route.tracks) ? route.tracks : [];
	if (tracks.length < 2) error('route.tracks 至少 2 条');
	for (const track of tracks) {
		for (const id of (Array.isArray(track.stageIds) ? track.stageIds : [])) {
			if (!stageIds.has(id)) error('track ' + track.id + ' 引用不存在的 stage ' + id);
		}
	}
	const checkpoints = Array.isArray(route.checkpoints) ? route.checkpoints : [];
	if (checkpoints.length < 5) warn('route.checkpoints 建议 6+ 条');
}

/** Validate knowledge/labs.json. */
function validateLabs() {
	const file = path.join(knowledgeDir, 'labs.json');
	if (!fs.existsSync(file)) {
		warn('knowledge/labs.json 尚未生成');
		return;
	}
	const labs = readJson(file);
	if (labs.__error !== undefined) {
		error('labs.json 不是合法 JSON：' + labs.__error);
		return;
	}
	if (typeof labs.titleZh !== 'string' || labs.titleZh.trim() === '') error('labs 缺少 titleZh');
	if (typeof labs.intro !== 'string' || charCount(labs.intro) < 30) error('labs.intro 太短');
	const scenarios = Array.isArray(labs.scenarios) ? labs.scenarios : [];
	if (scenarios.length < 6) error('labs.scenarios 至少 6 个，实际 ' + scenarios.length);
	for (const scenario of scenarios) {
		if (typeof scenario.titleZh !== 'string' || scenario.titleZh.trim() === '') error('scenario ' + scenario.id + ' 缺少 titleZh');
		if (typeof scenario.background !== 'string' || charCount(scenario.background) < 40) error('scenario ' + scenario.id + ' background 太短');
		if (typeof scenario.goal !== 'string' || scenario.goal.trim() === '') error('scenario ' + scenario.id + ' 缺少 goal');
		const steps = Array.isArray(scenario.steps) ? scenario.steps : [];
		if (steps.length < 3) error('scenario ' + scenario.id + ' steps 少于 3 个');
		for (const step of steps) {
			if (typeof step.title !== 'string' || step.title.trim() === '') error('scenario ' + scenario.id + ' 存在缺少 title 的 step');
			if (typeof step.detail !== 'string' || step.detail.trim() === '') error('scenario ' + scenario.id + ' 存在缺少 detail 的 step');
		}
		if (!Array.isArray(scenario.checklist) || scenario.checklist.length < 3) error('scenario ' + scenario.id + ' checklist 少于 3 条');
		if (!Array.isArray(scenario.pageIds) || scenario.pageIds.length < 2) error('scenario ' + scenario.id + ' pageIds 少于 2 个');
		for (const id of (Array.isArray(scenario.pageIds) ? scenario.pageIds : [])) {
			if (!pageIds.has(id)) error('scenario ' + scenario.id + ' 引用不存在的页面 ' + id);
		}
	}
}

/** Validate playground/exercises.json + shop-schema.sql. */
function validateExercises() {
	const file = path.join(playgroundDir, 'exercises.json');
	const schemaFile = path.join(playgroundDir, 'shop-schema.sql');
	if (!fs.existsSync(file)) {
		warn('playground/exercises.json 尚未生成');
		return;
	}
	const data = readJson(file);
	if (data.__error !== undefined) {
		error('exercises.json 不是合法 JSON：' + data.__error);
		return;
	}
	if (!fs.existsSync(schemaFile)) error('缺少 playground/shop-schema.sql');
	if (typeof data.titleZh !== 'string' || data.titleZh.trim() === '') error('exercises 缺少 titleZh');
	const stages = Array.isArray(data.stages) ? data.stages : [];
	if (stages.length < 3) error('exercises.stages 至少 3 个');
	const stageIds = new Set(stages.map((stage) => stage.id));
	const exercises = Array.isArray(data.exercises) ? data.exercises : [];
	if (exercises.length < 15) error('exercises 数量少于 15，实际 ' + exercises.length);
	const seen = new Set();
	for (const exercise of exercises) {
		if (typeof exercise.id !== 'string' || exercise.id === '') error('exercise 缺少 id');
		if (seen.has(exercise.id)) error('exercise id 重复：' + exercise.id);
		seen.add(exercise.id);
		if (!stageIds.has(exercise.stageId)) error('exercise ' + exercise.id + ' 的 stageId 不存在');
		if (typeof exercise.prompt !== 'string' || charCount(exercise.prompt) < 10) error('exercise ' + exercise.id + ' prompt 太短');
		if (typeof exercise.solutionSql !== 'string' || exercise.solutionSql.trim() === '') error('exercise ' + exercise.id + ' 缺少 solutionSql');
		if (typeof exercise.starterSql !== 'string') error('exercise ' + exercise.id + ' 缺少 starterSql');
		if (typeof exercise.hint !== 'string' || exercise.hint.trim() === '') error('exercise ' + exercise.id + ' 缺少 hint');
		const check = exercise.check !== null && typeof exercise.check === 'object' ? exercise.check : {};
		const mode = check.mode === undefined ? 'result' : check.mode;
		if (['result', 'verify', 'schema'].indexOf(mode) < 0) error('exercise ' + exercise.id + ' check.mode 非法：' + mode);
		if (mode === 'verify' && (typeof check.verifySql !== 'string' || check.verifySql.trim() === '')) error('exercise ' + exercise.id + ' verify 模式缺少 verifySql');
		if (mode === 'schema') {
			if (typeof check.table !== 'string' || check.table === '') error('exercise ' + exercise.id + ' schema 模式缺少 table');
			if (!Array.isArray(check.columns) || check.columns.length === 0) error('exercise ' + exercise.id + ' schema 模式缺少 columns');
		}
		if (!Array.isArray(exercise.pageIds) || exercise.pageIds.length < 1) error('exercise ' + exercise.id + ' 缺少 pageIds');
		for (const id of (Array.isArray(exercise.pageIds) ? exercise.pageIds : [])) {
			if (!pageIds.has(id)) error('exercise ' + exercise.id + ' 引用不存在的页面 ' + id);
		}
	}
}

if (needs('pages')) {
	console.log('检查知识页（' + manifest.pages.length + ' 页）…');
	for (const page of manifest.pages) validatePage(page.id);
}
if (needs('map')) {
	console.log('检查知识地图…');
	validateMap();
}
if (needs('route')) {
	console.log('检查学习路线…');
	validateRoute();
}
if (needs('labs')) {
	console.log('检查企业实战…');
	validateLabs();
}
if (needs('exercises')) {
	console.log('检查 SQL 操练场…');
	validateExercises();
}
console.log('');
console.log(errors === 0 ? '✓ 内容校验通过' + (warnings > 0 ? '（' + warnings + ' 个提醒）' : '') : '✗ ' + errors + ' 个错误，' + warnings + ' 个提醒');
process.exit(errors === 0 ? 0 : 1);
