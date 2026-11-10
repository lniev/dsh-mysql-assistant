#!/usr/bin/env node
/**
 * Build `knowledge/data.json` from the authored content.
 *
 * Sources:
 * - knowledge/manifest.json   chapter list + page metadata (the single source of ids)
 * - knowledge/pages/<chapter>/<id>.json   one knowledge page per file
 * - knowledge/map.json        knowledge map (nodes/deps/paths)
 * - knowledge/learning-route.json  staged learning route
 * - knowledge/labs.json       enterprise labs
 *
 * Usage: node scripts/build-data.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const knowledgeDir = path.join(root, 'knowledge');
const pagesDir = path.join(knowledgeDir, 'pages');

function readJson(file, label) {
	try {
		return JSON.parse(fs.readFileSync(file, 'utf8'));
	} catch (error) {
		throw new Error(label + ' 读取失败：' + (error && error.message ? error.message : String(error)));
	}
}

const manifest = readJson(path.join(knowledgeDir, 'manifest.json'), 'knowledge/manifest.json');
const map = fs.existsSync(path.join(knowledgeDir, 'map.json')) ? readJson(path.join(knowledgeDir, 'map.json'), 'knowledge/map.json') : null;
const route = fs.existsSync(path.join(knowledgeDir, 'learning-route.json')) ? readJson(path.join(knowledgeDir, 'learning-route.json'), 'knowledge/learning-route.json') : null;
const labs = fs.existsSync(path.join(knowledgeDir, 'labs.json')) ? readJson(path.join(knowledgeDir, 'labs.json'), 'knowledge/labs.json') : null;

const pageById = new Map(manifest.pages.map((page) => [page.id, page]));
const layerById = new Map(manifest.layers.map((layer) => [layer.id, layer]));
const chapterById = new Map(manifest.chapters.map((chapter) => [chapter.id, chapter]));

const pages = {};
const missing = [];
for (const meta of manifest.pages) {
	const file = path.join(pagesDir, meta.chapter, meta.id + '.json');
	if (!fs.existsSync(file)) {
		missing.push(meta.id);
		continue;
	}
	const page = readJson(file, 'knowledge/pages/' + meta.chapter + '/' + meta.id + '.json');
	pages[meta.id] = {
		id: meta.id,
		chapter: meta.chapter,
		layer: meta.layer,
		titleZh: page.titleZh === undefined || page.titleZh === '' ? meta.titleZh : page.titleZh,
		title: page.title === undefined || page.title === '' ? meta.title : page.title,
		difficulty: typeof page.difficulty === 'number' ? page.difficulty : meta.difficulty,
		minutes: typeof page.minutes === 'number' ? page.minutes : meta.minutes,
		chapterTitleZh: chapterById.get(meta.chapter) === undefined ? meta.chapter : chapterById.get(meta.chapter).titleZh,
		summary: page.summary,
		sections: page.sections,
		keyPoints: page.keyPoints,
		snippets: page.snippets,
		pitfalls: page.pitfalls,
		enterprise: page.enterprise,
		related: page.related,
		docUrl: page.docUrl
	};
}
if (missing.length > 0) {
	console.error('✗ 缺少 ' + missing.length + ' 个知识页：' + missing.slice(0, 20).join(', ') + (missing.length > 20 ? ' …' : ''));
	console.error('  先补齐 knowledge/pages/<chapter>/<id>.json 再构建。');
	process.exit(1);
}

// Assemble chapters with their page id order (taken from the manifest).
const chapters = manifest.chapters.map((chapter) => ({
	id: chapter.id,
	titleZh: chapter.titleZh,
	title: chapter.title,
	description: chapter.description,
	layer: chapter.layer,
	icon: chapter.icon,
	items: manifest.pages.filter((page) => page.chapter === chapter.id).map((page) => page.id)
}));

// Knowledge map: fill the layer from the manifest, keep dependency edges.
let knowledgeMap = null;
if (map !== null) {
	const nodes = (Array.isArray(map.nodes) ? map.nodes : []).map((node) => {
		const meta = pageById.get(node.pageId);
		const page = pages[node.pageId];
		return {
			pageId: node.pageId,
			layer: meta === undefined ? 'foundation' : meta.layer,
			deps: Array.isArray(node.deps) ? node.deps.filter((dep) => pageById.has(dep)) : [],
			tag: typeof node.tag === 'string' ? node.tag : '',
			titleZh: page === undefined ? (meta === undefined ? node.pageId : meta.titleZh) : page.titleZh
		};
	});
	knowledgeMap = {
		titleZh: map.titleZh,
		intro: map.intro,
		layers: (Array.isArray(map.layers) ? map.layers : manifest.layers).map((layer) => ({ id: layer.id, titleZh: layer.titleZh, description: layer.description })),
		nodes,
		paths: Array.isArray(map.paths) ? map.paths : []
	};
}

const data = {
	meta: {
		generatedAt: new Date().toISOString(),
		pageCount: Object.keys(pages).length,
		chapterCount: chapters.length,
		mapNodeCount: knowledgeMap === null ? 0 : knowledgeMap.nodes.length,
		labCount: labs === null || !Array.isArray(labs.scenarios) ? 0 : labs.scenarios.length
	},
	titleZh: manifest.titleZh,
	intro: manifest.intro,
	chapters,
	pages,
	knowledgeMap,
	learningRoute: route,
	labs
};

const target = path.join(knowledgeDir, 'data.json');
fs.writeFileSync(target, JSON.stringify(data));
const size = fs.statSync(target).size;
console.log('knowledge/data.json written:', target, (size / 1024).toFixed(1) + ' KB');
console.log('  页面 ' + data.meta.pageCount + ' · 章节 ' + data.meta.chapterCount + ' · 地图节点 ' + data.meta.mapNodeCount + ' · 实战 ' + data.meta.labCount);
