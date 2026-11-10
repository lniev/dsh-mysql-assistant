#!/usr/bin/env node
/**
 * Bundle smoke test: manifests, generated artifacts, locale/icon files and the
 * client bundle's registration marker.
 *
 * Usage: node scripts/smoke.mjs [--bundle <client.js path>]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const bundleIndex = process.argv.indexOf('--bundle');
const bundlePath = bundleIndex >= 0 ? path.resolve(process.cwd(), process.argv[bundleIndex + 1]) : path.join(root, 'client.js');
let failures = 0;
const check = (condition, label, detail) => {
	if (condition) console.log('  ✓ ' + label);
	else {
		failures += 1;
		console.log('  ✗ ' + label + (detail === undefined ? '' : ' — ' + detail));
	}
};

console.log('插件清单…');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
check(pkg.name === '@local/mysql-assistant', 'package name');
check(pkg.dsh !== undefined && pkg.dsh.client !== undefined, 'dsh.client manifest present');
check(pkg.dsh.bundle.patch === './cordis.patch.yml', 'bundle patch declared');
check(pkg.dependencies['sql.js'] !== undefined, 'sql.js dependency declared');
const patch = fs.readFileSync(path.join(root, 'cordis.patch.yml'), 'utf8');
check(patch.indexOf("@local/mysql-assistant") >= 0 && patch.indexOf('mysql-assistant') >= 0, 'cordis.patch.yml inserts the plugin row');

console.log('资源文件…');
check(fs.existsSync(path.join(root, 'icon.svg')), 'icon.svg exists');
check(JSON.parse(fs.readFileSync(path.join(root, 'locale', 'zh.json'), 'utf8')).meta.title !== '', 'locale/zh.json has a title');
check(JSON.parse(fs.readFileSync(path.join(root, 'locale', 'en.json'), 'utf8')).meta.title !== '', 'locale/en.json has a title');

console.log('生成产物…');
const knowledge = JSON.parse(fs.readFileSync(path.join(root, 'knowledge', 'data.json'), 'utf8'));
check(Object.keys(knowledge.pages).length === 83, 'knowledge/data.json contains 83 pages');
check(Array.isArray(knowledge.chapters) && knowledge.chapters.length === 8, 'knowledge/data.json contains 8 chapters');
check(knowledge.knowledgeMap !== null && knowledge.knowledgeMap.nodes.length === 83, 'knowledge map contains 83 nodes');
check(knowledge.learningRoute !== null && knowledge.learningRoute.stages.length >= 6, 'learning route generated');
check(knowledge.labs !== null && knowledge.labs.scenarios.length === 8, '8 enterprise labs generated');
const exercises = JSON.parse(fs.readFileSync(path.join(root, 'playground', 'exercises.json'), 'utf8'));
check(exercises.exercises.length === 24, '24 playground exercises');

console.log('浏览器 bundle…');
const bundle = fs.readFileSync(bundlePath, 'utf8');
check(bundle.indexOf("id: '@local/mysql-assistant'") >= 0, 'bundle id registered');
check(bundle.indexOf('function apply(ctx)') >= 0, 'apply() exported');
check(bundle.indexOf('MysqlAssistantPanel') >= 0, 'panel component present');
check(bundle.indexOf("name: 'mysql_docs'") < 0 && bundle.indexOf('ctx.tools.register') < 0, 'no host tool registration leaked into the client');
for (const forbidden of [/^\s*import\s/m, /^\s*export\s/m, /<\/script>/i]) {
	check(!forbidden.test(bundle), 'no module syntax ' + String(forbidden));
}

if (failures > 0) {
	console.log('\n✗ ' + failures + ' 个失败');
	process.exit(1);
}
console.log('\n✓ bundle smoke test passed');
