// #region knowledge map view
// The knowledge map: five dependency layers rendered as columns, clickable topic
// nodes with SVG dependency edges, recommended paths, and a reading column for
// the selected topic (plain-language summary, sections, SQL snippets, pitfalls,
// enterprise advice and related topics).

/** One code snippet block with copy + "run in playground" actions. */
function MysqlMapSnippet(props) {
	const t = props.t;
	const snippet = props.snippet;
	const copied = props.copied;
	const onCopy = props.onCopy;
	const onRun = props.onRun;
	const code = String(snippet.code === undefined ? '' : snippet.code);
	const runnable = !/\bDELIMITER\b/i.test(code);
	return h('div', { className: 'mymap-snippet' },
		h('div', { className: 'mymap-snippetHead' },
			h('span', { className: 'mymap-snippetTitle' }, String(snippet.title === undefined ? 'SQL' : snippet.title)),
			h('div', { className: 'mymap-snippetTools' },
				h('button', { className: 'my-btn my-btnSmall my-btnGhost', type: 'button', onClick: onCopy },
					MysqlGlyph({ name: copied ? 'check' : 'copy', size: 12 }),
					h('span', null, copied ? t('map.copiedCode') : t('map.copyCode'))),
				runnable
					? h('button', { className: 'my-btn my-btnSmall', type: 'button', onClick: onRun },
						MysqlGlyph({ name: 'play', size: 11 }),
						h('span', null, t('map.runInPlayground')))
					: h('span', { className: 'my-chip my-chipSoft' }, t('common.clientOnly')))
		),
		h('pre', { className: 'mymap-code' }, h('code', null, mysqlHighlightSql(code)))
	);
}

/** The reading column of one topic. */
function MysqlMapTopicDetail(props) {
	const t = props.t;
	const page = props.page;
	const map = props.map;
	const chapter = props.chapter;
	const learned = props.learned;
	const onToggleLearned = props.onToggleLearned;
	const onSelect = props.onSelect;
	const onRunSql = props.onRunSql;
	const onAskAi = typeof props.onAskAi === 'function' ? props.onAskAi : function () {};
	const [copiedKey, setCopiedKey] = React.useState(null);
	const bodyRef = React.useRef(null);
	const topicId = page.id;

	React.useEffect(() => {
		setCopiedKey(null);
		if (bodyRef.current !== null) {
			try {
				bodyRef.current.scrollTo({ top: 0 });
			} catch (_error) {
				bodyRef.current.scrollTop = 0;
			}
		}
	}, [topicId]);

	const copySnippet = async (key, code) => {
		const ok = await mysqlCopyText(code);
		if (ok) {
			setCopiedKey(key);
			window.setTimeout(() => setCopiedKey((current) => (current === key ? null : current)), 1600);
		}
	};

	const summary = typeof page.summary === 'string' ? page.summary : '';
	const sections = Array.isArray(page.sections) ? page.sections : [];
	const snippets = Array.isArray(page.snippets) ? page.snippets : [];
	const points = Array.isArray(page.keyPoints) ? page.keyPoints : [];
	const pitfalls = Array.isArray(page.pitfalls) ? page.pitfalls : [];
	const related = Array.isArray(page.related) ? page.related : [];
	const node = map === null ? null : map.nodes.find((entry) => entry.pageId === topicId) || null;
	const deps = node === null || !Array.isArray(node.deps) ? [] : node.deps;
	const nextTopics = map === null ? [] : map.nodes.filter((entry) => Array.isArray(entry.deps) && entry.deps.indexOf(topicId) >= 0).slice(0, 6);
	const pages = props.pages === undefined || props.pages === null ? {} : props.pages;
	const titleOf = (id) => {
		const target = pages[id];
		if (target === undefined) return id;
		return target.titleZh === undefined || target.titleZh === '' ? target.title : target.titleZh;
	};

	const chips = (ids, tone) => h('div', { className: 'my-pillRow' }, ids.map((id) => h('button', {
		key: tone + '-' + id,
		className: 'my-topicChip',
		type: 'button',
		onClick: () => onSelect(id)
	}, MysqlGlyph({ name: 'arrowRight', size: 10 }), h('span', null, titleOf(id)))));

	return h('aside', { className: 'mymap-detail', 'aria-label': page.titleZh },
		h('header', { className: 'mymap-detailHead' },
			typeof props.onClose === 'function'
				? h('button', { className: 'my-iconBtn mymap-detailClose', type: 'button', title: t('common.closeDetail'), 'aria-label': t('common.closeDetail'), onClick: props.onClose }, MysqlGlyph({ name: 'plus', size: 13 }))
				: null,
			h('div', { className: 'mymap-breadcrumb' },
				chapter === null || chapter === undefined ? null : h('span', { className: 'mymap-breadcrumbChapter' }, chapter.titleZh),
				h('span', { className: 'mymap-breadcrumbSep' }, '/'),
				h('span', null, String(page.title))),
			h('div', { className: 'mymap-titleRow' },
				h('h2', { className: 'mymap-title' }, page.titleZh === undefined || page.titleZh === '' ? page.title : page.titleZh),
				node !== null && node.tag !== '' ? h('span', { className: 'my-chip my-chipBrand' }, node.tag) : null,
				learned === true ? h('span', { className: 'my-chip my-chipSoft' }, MysqlGlyph({ name: 'check', size: 10 }), h('span', null, t('map.nodeDone'))) : null
			),
			h('div', { className: 'mymap-metaRow' },
				h('span', { className: 'my-chip my-chipSoft' }, t('map.difficulty') + ' L' + String(page.difficulty === undefined ? 1 : page.difficulty)),
				typeof page.minutes === 'number' ? h('span', { className: 'my-chip my-chipSoft' }, t('map.minutes', { n: page.minutes })) : null,
				h('button', {
					className: learned === true ? 'my-btn my-btnSmall my-btnPrimary' : 'my-btn my-btnSmall',
					type: 'button',
					onClick: () => onToggleLearned(topicId)
				}, MysqlGlyph({ name: 'check', size: 11 }), h('span', null, learned === true ? t('map.unmarkDone') : t('map.markDone'))),
				h('button', {
					className: 'my-btn my-btnSmall my-btnGhost',
					type: 'button',
					onClick: () => onAskAi(page)
				}, MysqlGlyph({ name: 'spark', size: 11 }), h('span', null, t('map.askAi')))
			)
		),
		h('div', { className: 'mymap-detailBody my-scroll', ref: bodyRef },
			summary !== ''
				? h('section', { className: 'mymap-summaryCard' },
					h('h3', { className: 'mymap-blockTitle' }, MysqlGlyph({ name: 'info', size: 13 }), h('span', null, t('map.summary'))),
					h('p', { className: 'mymap-summaryText' }, summary))
				: null,
			sections.length > 0
				? h('section', { className: 'mymap-block' },
					h('h3', { className: 'mymap-blockTitle' }, MysqlGlyph({ name: 'layers', size: 13 }), h('span', null, t('map.sections'))),
					sections.map((section, index) => h('div', { className: 'mymap-section', key: 's' + String(index) },
						h('h4', { className: 'mymap-sectionHeading' }, String(section.heading === undefined ? '' : section.heading)),
						h('p', { className: 'mymap-sectionText' }, String(section.text === undefined ? '' : section.text)))))
				: null,
			snippets.length > 0
				? h('section', { className: 'mymap-block' },
					h('h3', { className: 'mymap-blockTitle' }, MysqlGlyph({ name: 'code', size: 13 }), h('span', null, t('map.snippets'))),
					snippets.map((snippet, index) => {
						const key = topicId + ':' + String(index);
						return h(MysqlMapSnippet, {
							key,
							t,
							snippet,
							copied: copiedKey === key,
							onCopy: () => copySnippet(key, String(snippet.code === undefined ? '' : snippet.code)),
							onRun: () => onRunSql(String(snippet.code === undefined ? '' : snippet.code), page.titleZh)
						});
					}))
				: null,
			points.length > 0
				? h('section', { className: 'mymap-block' },
					h('h3', { className: 'mymap-blockTitle' }, MysqlGlyph({ name: 'check', size: 13 }), h('span', null, t('map.keyPoints'))),
					h('ul', { className: 'mymap-points' }, points.map((point, index) => h('li', { className: 'mymap-point', key: 'p' + String(index) },
						h('span', { className: 'mymap-pointIndex' }, String(index + 1)), h('span', null, String(point))))))
				: null,
			pitfalls.length > 0
				? h('section', { className: 'mymap-block' },
					h('h3', { className: 'mymap-blockTitle' }, MysqlGlyph({ name: 'alert', size: 13 }), h('span', null, t('map.pitfalls'))),
					h('ul', { className: 'mymap-pitfalls' }, pitfalls.map((pitfall, index) => h('li', { key: 'x' + String(index) },
						h('span', { className: 'mymap-pitfallMark' }, '!'), h('span', null, String(pitfall))))))
				: null,
			typeof page.enterprise === 'string' && page.enterprise !== ''
				? h('section', { className: 'mymap-enterpriseCard' },
					h('h3', { className: 'mymap-blockTitle' }, MysqlGlyph({ name: 'shield', size: 13 }), h('span', null, t('map.enterprise'))),
					h('p', null, page.enterprise))
				: null,
			deps.length > 0
				? h('section', { className: 'mymap-block' },
					h('h3', { className: 'mymap-blockTitle' }, MysqlGlyph({ name: 'compass', size: 13 }), h('span', null, t('map.deps'))),
					chips(deps, 'dep'))
				: null,
			nextTopics.length > 0
				? h('section', { className: 'mymap-block' },
					h('h3', { className: 'mymap-blockTitle' }, MysqlGlyph({ name: 'route', size: 13 }), h('span', null, t('map.next'))),
					chips(nextTopics.map((entry) => entry.pageId), 'next'))
				: null,
			related.length > 0
				? h('section', { className: 'mymap-block' },
					h('h3', { className: 'mymap-blockTitle' }, MysqlGlyph({ name: 'book', size: 13 }), h('span', null, t('map.related'))),
					chips(related, 'rel'))
				: null
		)
	);
}

/** One clickable topic card in the map. */
function MysqlMapNode(props) {
	const t = props.t;
	const node = props.node;
	const page = props.page;
	const active = props.active;
	const dim = props.dim;
	const pathOrder = props.pathOrder === undefined ? null : props.pathOrder;
	const learned = props.learned;
	const onSelect = props.onSelect;
	const register = props.register;
	const onHover = typeof props.onHover === 'function' ? props.onHover : function () {};
	const difficulty = page === undefined || page.difficulty === undefined ? 1 : page.difficulty;
	return h('button', {
		className: 'mymap-node',
		type: 'button',
		'data-active': active ? 'true' : 'false',
		'data-dim': dim ? 'true' : 'false',
		'data-learned': learned ? 'true' : 'false',
		ref: (element) => register(node.pageId, element),
		onClick: () => onSelect(node.pageId),
		onMouseEnter: () => onHover(node.pageId),
		onMouseLeave: () => onHover(null),
		onFocus: () => onHover(node.pageId),
		onBlur: () => onHover(null),
		title: page === undefined || page.summary === undefined ? '' : page.summary
	},
		h('span', { className: 'mymap-nodeTop' },
			pathOrder === null ? h('span', { className: 'mymap-nodeDot', 'aria-hidden': true }) : h('span', { className: 'mymap-nodeOrder' }, String(pathOrder)),
			h('span', { className: 'mymap-nodeTitle' }, page === undefined ? node.pageId : (page.titleZh === undefined || page.titleZh === '' ? page.title : page.titleZh)),
			learned ? h('span', { className: 'mymap-nodeCheck' }, MysqlGlyph({ name: 'check', size: 10 })) : null
		),
		h('span', { className: 'mymap-nodeMeta' },
			h('span', { className: 'mymap-nodeTag' }, node.tag === undefined || node.tag === '' ? t('map.allTopics') : node.tag),
			h('span', { className: 'mymap-dots', 'aria-label': t('map.difficulty') },
				[1, 2, 3, 4].map((level) => h('i', { key: 'd' + String(level), 'data-on': level <= difficulty ? 'true' : 'false' }))))
	);
}

/** Rounded orthogonal polyline used to route long edges above the columns. */
function mysqlOrthPath(points, radius) {
	const r = Math.max(2, Math.min(9, radius));
	let d = 'M' + points[0][0] + ',' + points[0][1];
	for (let index = 1; index < points.length - 1; index += 1) {
		const previous = points[index - 1];
		const corner = points[index];
		const next = points[index + 1];
		const inDx = Math.sign(previous[0] - corner[0]);
		const inDy = Math.sign(previous[1] - corner[1]);
		const outDx = Math.sign(next[0] - corner[0]);
		const outDy = Math.sign(next[1] - corner[1]);
		const lengthIn = Math.hypot(previous[0] - corner[0], previous[1] - corner[1]);
		const lengthOut = Math.hypot(next[0] - corner[0], next[1] - corner[1]);
		const ri = Math.min(r, lengthIn / 2, lengthOut / 2);
		if (ri < 1.5) {
			d += ' L' + corner[0] + ',' + corner[1];
			continue;
		}
		const sx = corner[0] + inDx * ri;
		const sy = corner[1] + inDy * ri;
		const ex = corner[0] + outDx * ri;
		const ey = corner[1] + outDy * ri;
		d += ' L' + sx + ',' + sy + ' Q' + corner[0] + ',' + corner[1] + ' ' + ex + ',' + ey;
	}
	const last = points[points.length - 1];
	d += ' L' + last[0] + ',' + last[1];
	return d;
}

/**
 * Long (2+ columns apart) dependencies are lifted into a viewport-level overlay:
 * each link leaves its card sideways, runs up its own gutter lane, crosses the
 * top rail, and comes back down — so it is never hidden behind the middle
 * columns, even while the columns are scrolled.
 */
function MysqlFarEdgeOverlay(props) {
	const t = props.t;
	const scrollRef = props.scrollRef;
	const nodeEls = props.nodeEls;
	const graph = props.graph;
	const activeId = props.activeId;
	const hoveredId = props.hoveredId;
	const activePath = props.activePath;
	const pathPairs = props.pathPairs;
	const showAllEdges = props.showAllEdges;
	const [state, setState] = React.useState({ width: 0, height: 0, paths: [] });
	const frameRef = React.useRef(0);

	const compute = React.useCallback(() => {
		frameRef.current = 0;
		const scroll = scrollRef.current;
		if (scroll === null) return;
		const scrollRect = scroll.getBoundingClientRect();
		if (scrollRect.width === 0 || scrollRect.height === 0) return;
		const paths = [];
		let lane = 0;
		for (const edge of graph.edges) {
			if (edge.far !== true) continue;
			const pathPair = pathPairs.has(edge.key);
			const hoveredIn = hoveredId !== null && (edge.from === hoveredId || edge.to === hoveredId);
			const focused = edge.to === activeId || edge.to === hoveredId
				|| (!edge.sameColumn && (edge.from === activeId || edge.from === hoveredId));
			let mode = 'hidden';
			if (pathPair) mode = 'path';
			else if (activePath !== null && !hoveredIn) mode = 'hidden';
			else if (focused) mode = 'active';
			else if (showAllEdges) mode = 'dim';
			if (mode === 'hidden') continue;
			const sourceEl = nodeEls.current[edge.from];
			const targetEl = nodeEls.current[edge.to];
			if (sourceEl === undefined || sourceEl === null || targetEl === undefined || targetEl === null) continue;
			const sourceRect = sourceEl.getBoundingClientRect();
			const targetRect = targetEl.getBoundingClientRect();
			const sourceVisible = sourceRect.bottom > scrollRect.top && sourceRect.top < scrollRect.bottom;
			const targetVisible = targetRect.bottom > scrollRect.top && targetRect.top < scrollRect.bottom;
			if (!sourceVisible && !targetVisible) continue;
			const sx = sourceRect.right - scrollRect.left;
			const sy = sourceRect.top - scrollRect.top + sourceRect.height / 2;
			const tx = targetRect.left - scrollRect.left;
			const ty = targetRect.top - scrollRect.top + targetRect.height / 2;
			const laneIndex = lane % 4;
			lane += 1;
			const startX = sx + 10 + (laneIndex % 2) * 5;
			const endX = tx - 10 - (laneIndex % 2) * 5;
			const railY = 7 + laneIndex * 7;
			const d = mysqlOrthPath([[sx, sy], [startX, sy], [startX, railY], [endX, railY], [endX, ty], [tx, ty]], 6);
			paths.push({
				key: edge.key,
				d,
				mode,
				x1: sx,
				y1: sy,
				x2: tx,
				y2: ty,
				sourceVisible,
				targetVisible
			});
		}
		setState({ width: Math.round(scrollRect.width), height: Math.round(scrollRect.height), paths });
	}, [graph, activeId, hoveredId, activePath, pathPairs, showAllEdges, nodeEls, scrollRef]);

	React.useEffect(() => {
		const schedule = () => {
			if (frameRef.current !== 0) return;
			frameRef.current = window.requestAnimationFrame(compute);
		};
		compute();
		const scroll = scrollRef.current;
		if (scroll === null) return undefined;
		scroll.addEventListener('scroll', schedule, { passive: true });
		window.addEventListener('resize', schedule);
		let observer = null;
		if (typeof ResizeObserver !== 'undefined') {
			observer = new ResizeObserver(schedule);
			observer.observe(scroll);
		}
		return () => {
			scroll.removeEventListener('scroll', schedule);
			window.removeEventListener('resize', schedule);
			if (observer !== null) observer.disconnect();
			if (frameRef.current !== 0) window.cancelAnimationFrame(frameRef.current);
		};
	}, [compute, scrollRef]);

	if (state.paths.length === 0) return null;
	return h('div', { className: 'mymap-farOverlay', 'aria-hidden': true },
		h('span', { className: 'mymap-farLabel' }, MysqlGlyph({ name: 'layers', size: 11 }), h('span', null, t('map.farLabel'))),
		h('svg', { className: 'mymap-farSvg', width: state.width, height: state.height },
			h('defs', null,
				h('marker', { id: 'mymap-far-arrow-active', viewBox: '0 0 8 8', refX: 6.4, refY: 4, markerWidth: 6.5, markerHeight: 6.5, orient: 'auto-start-reverse' },
					h('path', { d: 'M0,0.6 L7.6,4 L0,7.4 Z', fill: 'var(--dsw-alias-brand-primary)' })),
				h('marker', { id: 'mymap-far-arrow-path', viewBox: '0 0 8 8', refX: 6.4, refY: 4, markerWidth: 6.5, markerHeight: 6.5, orient: 'auto-start-reverse' },
					h('path', { d: 'M0,0.6 L7.6,4 L0,7.4 Z', fill: 'var(--my-accent-warm)' }))),
			state.paths.map((entry) => h('g', { key: entry.key },
				h('path', {
					d: entry.d,
					'data-active': entry.mode === 'active' ? 'true' : 'false',
					'data-path': entry.mode === 'path' ? 'true' : 'false',
					'data-dim': entry.mode === 'dim' ? 'true' : 'false',
					markerEnd: entry.mode === 'path' ? 'url(#mymap-far-arrow-path)' : (entry.mode === 'active' ? 'url(#mymap-far-arrow-active)' : null)
				}),
				entry.mode === 'dim' ? null : h('circle', { className: 'mymap-farDot', 'data-tone': entry.mode === 'path' ? 'path' : 'active', cx: entry.x2, cy: entry.y2, r: 2.4 }),
				entry.mode === 'dim' ? null : h('circle', { className: 'mymap-farDot mymap-farOrigin', cx: entry.x1, cy: entry.y1, r: 1.7 })
			)))
	);
}

/** The knowledge map view. */
function MysqlMapView(props) {
	const t = props.t;
	const kb = props.kb;
	const map = kb === null || kb === undefined ? null : kb.knowledgeMap;
	const pages = kb === null || kb === undefined || kb.pages === undefined ? {} : kb.pages;
	const chapters = kb === null || kb === undefined || !Array.isArray(kb.chapters) ? MYSQL_EMPTY : kb.chapters;
	const learned = props.learned !== null && typeof props.learned === 'object' ? props.learned : {};
	const onToggleLearned = typeof props.onToggleLearned === 'function' ? props.onToggleLearned : function () {};
	const onRunSql = typeof props.onRunSql === 'function' ? props.onRunSql : function () {};
	const onAskAi = typeof props.onAskAi === 'function' ? props.onAskAi : function () {};
	const initialPageId = props.initialPageId === undefined ? null : props.initialPageId;

	const chapterById = React.useMemo(() => {
		const result = {};
		for (const chapter of chapters) result[chapter.id] = chapter;
		return result;
	}, [chapters]);

	const mapNodes = map === null || !Array.isArray(map.nodes) ? [] : map.nodes;
	const nodeByPage = React.useMemo(() => {
		const result = {};
		for (const node of mapNodes) result[node.pageId] = node;
		return result;
	}, [mapNodes]);

	const layers = map === null || !Array.isArray(map.layers) ? MYSQL_EMPTY : map.layers;
	const paths = map === null || !Array.isArray(map.paths) ? MYSQL_EMPTY : map.paths;
	const columnIndexOf = React.useMemo(() => {
		const result = {};
		layers.forEach((layer, index) => {
			for (const node of mapNodes) if (node.layer === layer.id) result[node.pageId] = index;
		});
		return result;
	}, [layers, mapNodes]);

	// default selection: the initial handoff page, else the first topic of the map
	const fallbackId = mapNodes.length > 0 ? mapNodes[0].pageId : (chapters.length > 0 && Array.isArray(chapters[0].items) && chapters[0].items.length > 0 ? chapters[0].items[0] : null);
	const [activeId, setActiveId] = React.useState(initialPageId !== null && pages[initialPageId] !== undefined ? initialPageId : fallbackId);
	const [search, setSearch] = React.useState('');
	const [pathId, setPathId] = React.useState(null);
	const [hoveredId, setHoveredId] = React.useState(null);
	const [detailOpen, setDetailOpen] = React.useState(true);
	const [showAllEdges, setShowAllEdges] = React.useState(() => mysqlReadStore('mapShowAllEdges', false) === true);
	React.useEffect(() => {
		mysqlWriteStore('mapShowAllEdges', showAllEdges === true);
	}, [showAllEdges]);
	const nodeEls = React.useRef({});
	const innerRef = React.useRef(null);
	const canvasRef = React.useRef(null);
	const [graph, setGraph] = React.useState({ width: 0, height: 0, edges: [] });

	React.useEffect(() => {
		if (initialPageId !== null && pages[initialPageId] !== undefined) setActiveId(initialPageId);
	}, [initialPageId]);

	const activePath = pathId === null ? null : paths.find((entry) => entry.id === pathId) || null;
	const pathIndex = React.useMemo(() => {
		const result = {};
		if (activePath === null || !Array.isArray(activePath.pageIds)) return result;
		activePath.pageIds.forEach((pageId, index) => {
			result[pageId] = index + 1;
		});
		return result;
	}, [activePath]);

	// consecutive pairs of the selected recommended path, used to draw a highlighted trail
	const pathPairs = React.useMemo(() => {
		const pairs = new Set();
		if (activePath === null || !Array.isArray(activePath.pageIds)) return pairs;
		for (let index = 0; index + 1 < activePath.pageIds.length; index += 1) {
			pairs.add(activePath.pageIds[index] + '>' + activePath.pageIds[index + 1]);
		}
		return pairs;
	}, [activePath]);

	const query = search.trim().toLowerCase();
	const matches = React.useMemo(() => {
		if (query === '') return null;
		const result = {};
		for (const page of Object.values(pages)) {
			const title = String(page.titleZh === undefined ? page.title : page.titleZh).toLowerCase();
			const en = String(page.title === undefined ? '' : page.title).toLowerCase();
			const summary = String(page.summary === undefined ? '' : page.summary).toLowerCase();
			if (title.indexOf(query) >= 0 || en.indexOf(query) >= 0 || summary.indexOf(query) >= 0) result[page.id] = true;
		}
		return result;
	}, [pages, query]);
	const matchCount = matches === null ? 0 : Object.keys(matches).length;

	// edges: geometry only depends on the layout; selection/hover/path only change styling.
	// Each edge gets a "lane" offset (spread) inside its fan so fans of curves stay readable.
	React.useLayoutEffect(() => {
		const compute = () => {
			const inner = innerRef.current;
			if (inner === null) return;
			const innerRect = inner.getBoundingClientRect();
			const rects = {};
			for (const node of mapNodes) {
				const element = nodeEls.current[node.pageId];
				if (element === undefined || element === null) continue;
				const rect = element.getBoundingClientRect();
				rects[node.pageId] = {
					left: rect.left - innerRect.left,
					right: rect.right - innerRect.left,
					top: rect.top - innerRect.top,
					bottom: rect.bottom - innerRect.top,
					centerY: rect.top - innerRect.top + rect.height / 2
				};
			}
			// group edges by target (fan-in) and by source (fan-out) to assign lanes
			const incoming = {};
			const outgoing = {};
			const raw = [];
			for (const node of mapNodes) {
				if (!Array.isArray(node.deps)) continue;
				for (const dep of node.deps) {
					if (rects[dep] === undefined || rects[node.pageId] === undefined) continue;
					const key = dep + '>' + node.pageId;
					raw.push({ key, from: dep, to: node.pageId });
					(incoming[node.pageId] = incoming[node.pageId] || []).push(key);
					(outgoing[dep] = outgoing[dep] || []).push(key);
				}
			}
			// normalized lane in [-1, 1]: large fans spread across the whole gutter, small fans stay near the middle
			const lane = {};
			const addLane = (groupId, list, weight) => {
				if (list.length <= 1) return;
				const half = (list.length - 1) / 2;
				list.forEach((key, index) => {
					const normalized = (index - half) / half;
					lane[key] = (lane[key] || 0) + normalized * weight;
				});
			};
			for (const targetId of Object.keys(incoming)) addLane('in:' + targetId, incoming[targetId], 0.75);
			for (const sourceId of Object.keys(outgoing)) addLane('out:' + sourceId, outgoing[sourceId], 0.55);
			const edges = [];
			for (const edge of raw) {
				const source = rects[edge.from];
				const target = rects[edge.to];
				const x1 = source.right + 3;
				const y1 = source.centerY;
				const x2 = target.left - 7;
				const y2 = target.centerY;
				const normalized = Math.max(-1.4, Math.min(1.4, lane[edge.key] || 0));
				const sameColumn = x2 <= x1 + 18;
				const fromColumn = columnIndexOf[edge.from];
				const toColumn = columnIndexOf[edge.to];
				const far = sameColumn !== true && fromColumn !== undefined && toColumn !== undefined && Math.abs(toColumn - fromColumn) >= 2;
				let d;
				if (far) {
					// long edges are routed through the highway band above the columns at render time
					d = '';
				} else if (sameColumn) {
					// same column: a neat square bracket in the gutter left of the cards
					const fromLeft = source.left - 3;
					const toLeft = target.left - 3;
					const laneX = Math.min(fromLeft, toLeft) - 8 - Math.abs(normalized) * 18;
					const radius = 5;
					const up = y2 < y1 ? -1 : 1;
					d = 'M' + fromLeft + ',' + y1
						+ ' L' + (laneX + (fromLeft > laneX ? radius : 0)) + ',' + y1
						+ ' Q' + laneX + ',' + y1 + ' ' + laneX + ',' + (y1 + up * radius)
						+ ' L' + laneX + ',' + (y2 - up * radius)
						+ ' Q' + laneX + ',' + y2 + ' ' + (laneX + radius) + ',' + y2
						+ ' L' + toLeft + ',' + y2;
				} else {
					// forward across columns: a smooth S whose vertical tangent sits in one gutter lane
					const gutterMid = (x1 + x2) / 2;
					const gx = Math.max(x1 + 3, Math.min(x2 - 3, gutterMid + normalized * 13));
					d = 'M' + x1 + ',' + y1 + ' C' + gx + ',' + y1 + ' ' + gx + ',' + y2 + ' ' + x2 + ',' + y2;
				}
				edges.push({ key: edge.key, from: edge.from, to: edge.to, d, x1, y1, x2, y2, sameColumn, far });
			}
			setGraph({ width: inner.offsetWidth, height: inner.offsetHeight, edges });
		};
		compute();
		let observer = null;
		if (typeof ResizeObserver !== 'undefined' && innerRef.current !== null) {
			observer = new ResizeObserver(compute);
			observer.observe(innerRef.current);
		}
		window.addEventListener('resize', compute);
		return () => {
			window.removeEventListener('resize', compute);
			if (observer !== null) observer.disconnect();
		};
	}, [mapNodes, chapterById]);

	// scroll the active node into view when selected from another view
	React.useEffect(() => {
		if (activeId === null) return;
		const element = nodeEls.current[activeId];
		if (element === undefined || element === null) return;
		try {
			element.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' });
		} catch (_error) {
			/* older engines: ignore */
		}
	}, [activeId]);

	const registerNode = React.useCallback((pageId, element) => {
		nodeEls.current[pageId] = element;
	}, []);

	const selectTopic = (pageId) => {
		setActiveId(pageId);
		setDetailOpen(true);
		window.setTimeout(() => {
			if (innerRef.current !== null) {
				try {
					innerRef.current.scrollTo({ top: 0 });
				} catch (_error) {
					innerRef.current.scrollTop = 0;
				}
			}
		}, 0);
	};

	if (map === null || layers.length === 0) {
		return h('div', { className: 'mymap-view' },
			h('style', { key: 'map-styles' }, MYSQL_CSS_MAP),
			h('div', { className: 'my-empty' }, MysqlGlyph({ name: 'map', size: 26 }), h('p', null, t('map.empty')))
		);
	}

	// group nodes per layer, preserving chapter order
	const layerGroups = layers.map((layer) => {
		const groups = [];
		for (const chapter of chapters) {
			const nodes = mapNodes.filter((node) => node.layer === layer.id && nodeByPage[node.pageId] !== undefined && (Array.isArray(chapter.items) ? chapter.items.indexOf(node.pageId) >= 0 : false));
			if (nodes.length > 0) groups.push({ chapter, nodes });
		}
		const covered = new Set();
		for (const group of groups) for (const node of group.nodes) covered.add(node.pageId);
		const rest = mapNodes.filter((node) => node.layer === layer.id && !covered.has(node.pageId));
		if (rest.length > 0) groups.push({ chapter: null, nodes: rest });
		return { layer, groups };
	});

	const activePage = activeId === null ? null : pages[activeId];
	const activeNode = activeId === null ? null : nodeByPage[activeId];
	const activeChapter = activePage === undefined || activePage === null ? null : chapterById[activePage.chapter] || null;

	return h('div', { className: 'mymap-view' },
		h('style', { key: 'map-styles' }, MYSQL_CSS_MAP),
		h('div', { className: 'mymap-main' },
			h('header', { className: 'mymap-head' },
				h('div', { className: 'mymap-headText' },
					h('span', { className: 'my-eyebrow' }, t('map.eyebrow')),
					h('h2', { className: 'my-sectionTitle' }, map.titleZh === undefined ? t('map.title') : map.titleZh),
					h('p', { className: 'my-sectionIntro' }, map.intro === undefined ? t('map.introFallback') : map.intro)
				),
				h('div', { className: 'mymap-headStats' },
					h('span', { className: 'my-chip my-chipBrand' }, t('map.layers', { n: layers.length })),
					h('span', { className: 'my-chip' }, t('map.nodes', { n: mapNodes.length }))
				)
			),
			h('div', { className: 'mymap-toolbar' },
				h('div', { className: 'mymap-searchBox' },
					MysqlGlyph({ name: 'search', size: 14 }),
					h('input', {
						className: 'mymap-searchInput',
						value: search,
						placeholder: t('map.searchPlaceholder'),
						'aria-label': t('map.searchPlaceholder'),
						onChange: (event) => setSearch(event.target.value),
						onKeyDown: (event) => {
							if (event.key === 'Enter' && matches !== null) {
								const first = Object.keys(matches)[0];
								if (first !== undefined) selectTopic(first);
							}
							if (event.key === 'Escape') setSearch('');
						}
					}),
					search === '' ? null : h('button', { className: 'my-iconBtn', type: 'button', title: t('map.clearSearch'), 'aria-label': t('map.clearSearch'), onClick: () => setSearch('') }, MysqlGlyph({ name: 'plus', size: 12 }))
				),
				h('div', { className: 'mymap-pathRow' },
					h('span', { className: 'mymap-pathLabel' }, MysqlGlyph({ name: 'route', size: 13 }), h('span', null, t('map.paths'))),
					h('button', {
						className: 'mymap-pathChip',
						type: 'button',
						'data-active': pathId === null ? 'true' : 'false',
						onClick: () => setPathId(null)
					}, t('map.allTopics')),
					paths.map((candidate) => h('button', {
						key: candidate.id,
						className: 'mymap-pathChip',
						type: 'button',
						title: candidate.description,
						'data-active': pathId === candidate.id ? 'true' : 'false',
						onClick: () => setPathId((current) => (current === candidate.id ? null : candidate.id))
					}, candidate.titleZh))
				),
				query === ''
					? null
					: h('span', { className: 'mymap-matchInfo' }, matchCount === 0 ? t('map.searchEmpty') : t('map.searchCount', { n: matchCount }))
			),
			h('div', { className: 'mymap-hintRow' },
				activePath === null
					? h('span', { className: 'mymap-hintText' }, MysqlGlyph({ name: 'compass', size: 12 }), h('span', null, t('map.selectHint')))
					: h('span', { className: 'mymap-hintText' }, MysqlGlyph({ name: 'target', size: 12 }), h('span', null, t('map.filterHint', { name: activePath.titleZh })), typeof activePath.description === 'string' ? h('span', { className: 'mymap-pathDesc' }, activePath.description) : null),
				h('span', { className: 'mymap-legend' },
					h('span', { className: 'mymap-legendSample', 'aria-hidden': true }),
					h('span', { className: 'mymap-legendText' }, t('map.edgeLegend'))),
				h('button', {
					className: 'mymap-toggle',
					type: 'button',
					'data-on': showAllEdges ? 'true' : 'false',
					title: t('map.edgeToggleTitle'),
					onClick: () => setShowAllEdges((current) => !current)
				}, MysqlGlyph({ name: showAllEdges ? 'layers' : 'compass', size: 12 }),
					h('span', null, showAllEdges ? t('map.hideAllEdges') : t('map.showAllEdges'))),
				detailOpen || activePage === null || activePage === undefined
					? null
					: h('button', {
						className: 'mymap-toggle',
						type: 'button',
						onClick: () => setDetailOpen(true)
					}, MysqlGlyph({ name: 'book', size: 12 }), h('span', null, t('common.openDetail')))
			),
			h('div', { className: 'mymap-canvasArea' },
				h('div', { className: 'mymap-canvasScroll my-scroll', ref: canvasRef },
					h('div', { className: 'mymap-canvasInner', ref: innerRef },
					h('svg', { className: 'mymap-edges', width: Math.max(graph.width, 1), height: Math.max(graph.height, 1), 'aria-hidden': true },
						h('defs', null,
							h('marker', { id: 'mymap-arrow-active', viewBox: '0 0 8 8', refX: 6.4, refY: 4, markerWidth: 6.5, markerHeight: 6.5, orient: 'auto-start-reverse' },
								h('path', { d: 'M0,0.6 L7.6,4 L0,7.4 Z', fill: 'var(--dsw-alias-brand-primary)' })),
							h('marker', { id: 'mymap-arrow-path', viewBox: '0 0 8 8', refX: 6.4, refY: 4, markerWidth: 6.5, markerHeight: 6.5, orient: 'auto-start-reverse' },
								h('path', { d: 'M0,0.6 L7.6,4 L0,7.4 Z', fill: 'var(--my-accent-warm)' }))),
						(() => {
							// long (2+ columns apart) edges cannot cross the middle columns readably, so
							// they are lifted into a highway band above the columns and routed there.
							return graph.edges.map((edge) => {
								const pathPair = pathPairs.has(edge.key);
								const hoveredIn = hoveredId !== null && (edge.from === hoveredId || edge.to === hoveredId);
								// Only two kinds of relations get a solid arrow: "why this topic sits
								// here" (incoming prerequisites) and cross-column unlocks. Same-column
								// progression stays out of the picture — the chapter order and the
								// detail panel's "learn next" chips already carry it.
								const focused = edge.to === activeId || edge.to === hoveredId
									|| (!edge.sameColumn && (edge.from === activeId || edge.from === hoveredId));
								if (edge.far === true) return null;
								let mode = 'hidden';
								if (pathPair) mode = 'path';
								else if (activePath !== null && !hoveredIn) mode = 'hidden';
								else if (focused) mode = 'active';
								else if (showAllEdges) mode = 'dim';
								else if (!edge.sameColumn) mode = 'background';
								if (mode === 'hidden') return null;
								const d = edge.d;
								return h('g', { key: edge.key, className: 'mymap-edge', 'data-mode': mode },
									h('path', {
										d,
										'data-active': mode === 'active' ? 'true' : 'false',
										'data-path': mode === 'path' ? 'true' : 'false',
										'data-background': mode === 'background' ? 'true' : 'false',
										'data-dim': mode === 'dim' ? 'true' : 'false',
										markerEnd: mode === 'path' ? 'url(#mymap-arrow-path)' : (mode === 'active' ? 'url(#mymap-arrow-active)' : null)
									}),
									mode === 'active' || mode === 'path' ? h('circle', { className: 'mymap-edgeDot', 'data-tone': mode === 'path' ? 'path' : 'active', cx: edge.x2, cy: edge.y2, r: 2.4 }) : null,
									mode === 'active' || mode === 'path' ? h('circle', { className: 'mymap-edgeOrigin', cx: edge.x1, cy: edge.y1, r: 1.7 }) : null
								);
							});
						})()),
					h('div', { className: 'mymap-columns' },
						layerGroups.map(({ layer, groups }) => h('section', { className: 'mymap-layer', key: layer.id },
							h('header', { className: 'mymap-layerHead' },
								h('h3', { className: 'mymap-layerTitle' }, layer.titleZh),
								typeof layer.description === 'string' ? h('p', { className: 'mymap-layerDesc' }, layer.description) : null),
							groups.map((group) => h('div', { className: 'mymap-chapterGroup', key: group.chapter === null ? 'rest' : group.chapter.id },
								group.chapter === null ? null : h('p', { className: 'mymap-chapterTitle' }, group.chapter.titleZh),
								group.nodes.map((node) => h(MysqlMapNode, {
									key: node.pageId,
									t,
									node,
									page: pages[node.pageId],
									active: node.pageId === activeId,
									dim: (matches !== null && matches[node.pageId] !== true) || (activePath !== null && pathIndex[node.pageId] === undefined),
									pathOrder: pathIndex[node.pageId] === undefined ? null : pathIndex[node.pageId],
									learned: learned[node.pageId] === true,
									onSelect: selectTopic,
									onHover: setHoveredId,
									register: registerNode
								})))))
					)
				)
				)
			),
			h(MysqlFarEdgeOverlay, {
				t,
				scrollRef: canvasRef,
				nodeEls,
				graph,
				activeId,
				hoveredId,
				activePath,
				pathPairs,
				showAllEdges
			})
			),
		),
		activePage === undefined || activePage === null || detailOpen !== true
			? null
			: h(MysqlMapTopicDetail, {
				t,
				page: activePage,
				map,
				chapter: activeChapter,
				pages,
				learned: learned[activePage.id] === true,
				onToggleLearned,
				onSelect: selectTopic,
				onRunSql,
				onAskAi,
				onClose: () => setDetailOpen(false)
			})
	);
}
// #endregion
