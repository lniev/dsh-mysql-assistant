// #region learning route view
// Staged learning route: overall progress, optional tracks, a vertical stage
// timeline with checkable items (goal / points / deliverable / acceptance /
// related topics / practice hints) and stage checkpoints.

/** One checkable route item card. */
function MysqlRouteItem(props) {
	const t = props.t;
	const item = props.item;
	const done = props.done;
	const onToggleItem = props.onToggleItem;
	const onOpenPage = props.onOpenPage;
	const onGoPlayground = props.onGoPlayground;
	const pages = props.pages === undefined || props.pages === null ? {} : props.pages;
	const points = Array.isArray(item.points) ? item.points : MYSQL_EMPTY;
	const pageIds = Array.isArray(item.pageIds) ? item.pageIds : MYSQL_EMPTY;
	const titleOf = (id) => {
		const page = pages[id];
		if (page === undefined) return id;
		return page.titleZh === undefined || page.titleZh === '' ? page.title : page.titleZh;
	};
	const showFoot = pageIds.length > 0 || typeof item.practice === 'string';
	return h('article', { className: 'myr-item', 'data-done': done ? 'true' : 'false' },
		h('header', { className: 'myr-itemHead' },
			h('button', {
				className: 'myr-check',
				type: 'button',
				'aria-pressed': done ? 'true' : 'false',
				title: done ? t('route.markUndone') : t('route.markDone'),
				onClick: () => onToggleItem(item.id)
			}, done ? MysqlGlyph({ name: 'check', size: 12 }) : null),
			h('div', { className: 'myr-itemTitleWrap' },
				h('h4', { className: 'myr-itemTitle' }, String(item.title)),
				typeof item.goal === 'string' ? h('p', { className: 'myr-itemGoal' }, item.goal) : null
			),
			h('div', { className: 'myr-itemMeta' },
				typeof item.level === 'string' ? h('span', { className: 'myr-level' }, item.level) : null,
				typeof item.minutes === 'number' ? h('span', { className: 'my-chip my-chipSoft' }, t('route.minutes', { n: item.minutes })) : null)
		),
		points.length > 0
			? h('ul', { className: 'myr-points' }, points.map((point, index) => h('li', { key: 'p' + String(index) }, String(point))))
			: null,
		h('div', { className: 'myr-facts' },
			typeof item.deliverable === 'string' && item.deliverable !== ''
				? h('p', { className: 'myr-fact' },
					h('span', { className: 'myr-factLabel' }, t('route.deliverable')),
					h('span', { className: 'myr-factText' }, item.deliverable))
				: null,
			typeof item.accept === 'string' && item.accept !== ''
				? h('p', { className: 'myr-fact' },
					h('span', { className: 'myr-factLabel' }, t('route.accept')),
					h('span', { className: 'myr-factText' }, item.accept))
				: null,
			typeof item.practice === 'string' && item.practice !== ''
				? h('p', { className: 'myr-fact myr-factPractice' },
					h('span', { className: 'myr-factLabel' }, t('route.practice')),
					h('span', { className: 'myr-factText' }, item.practice))
				: null
		),
		showFoot
			? h('div', { className: 'myr-itemFoot' },
				h('div', { className: 'my-pillRow' }, pageIds.map((id) => h('button', {
					key: id,
					className: 'my-btn my-btnSmall my-btnGhost',
					type: 'button',
					onClick: () => onOpenPage(id)
				}, MysqlGlyph({ name: 'arrowRight', size: 10 }), h('span', null, titleOf(id))))),
				h('div', { className: 'myr-itemActions' },
					h('button', {
						className: 'my-btn my-btnSmall my-btnPrimary',
						type: 'button',
						title: t('route.goPlayground'),
						onClick: () => onGoPlayground(item)
					}, MysqlGlyph({ name: 'play', size: 11 }), h('span', null, t('route.goPlayground')))))
			: null
	);
}

/** One stage block on the timeline. */
function MysqlRouteStage(props) {
	const t = props.t;
	const stage = props.stage;
	const index = props.index;
	const items = Array.isArray(stage.items) ? stage.items : MYSQL_EMPTY;
	const progress = props.progress;
	const collapsed = props.collapsed;
	const onToggleCollapse = props.onToggleCollapse;
	let done = 0;
	for (const item of items) if (progress[item.id] === true) done += 1;
	const percent = items.length === 0 ? 0 : Math.round((done / items.length) * 100);
	return h('section', { className: 'myr-stage', key: stage.id },
		h('div', { className: 'myr-stageRail', 'aria-hidden': true },
			h('span', { className: 'myr-stageIndex' }, String(index + 1)),
			h('span', { className: 'myr-stageLine' })
		),
		h('div', { className: 'myr-stageBody' },
			h('header', { className: 'myr-stageHead' },
				h('div', { className: 'myr-stageTitleWrap' },
					h('div', { className: 'myr-stageTitleRow' },
						h('h3', { className: 'myr-stageTitle' }, stage.titleZh === undefined ? stage.title : stage.titleZh),
						typeof stage.weeks === 'string' ? h('span', { className: 'my-chip my-chipBrand' }, stage.weeks) : null,
						typeof stage.hours === 'number' ? h('span', { className: 'my-chip my-chipSoft' }, t('route.stageHours', { n: stage.hours })) : null
					),
					typeof stage.goal === 'string' ? h('p', { className: 'myr-stageGoal' }, stage.goal) : null
				),
				h('div', { className: 'myr-stageProgress' },
					h('span', { className: 'myr-stageCount' }, t('route.stageDone', { done, total: items.length })),
					h('div', { className: 'myr-bar', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': percent },
						h('span', { className: 'myr-barFill', style: { width: String(percent) + '%' } })),
					h('button', { className: 'my-linkBtn', type: 'button', onClick: () => onToggleCollapse(stage.id) }, collapsed ? t('common.expand') : t('common.collapse'))
				)
			),
			collapsed
				? null
				: h('div', { className: 'myr-items' }, items.map((item) => h(MysqlRouteItem, {
					key: item.id,
					t,
					item,
					pages: props.pages,
					done: progress[item.id] === true,
					onToggleItem: props.onToggleItem,
					onOpenPage: props.onOpenPage,
					onGoPlayground: props.onGoPlayground
				})))
		)
	);
}

/** The learning route view. */
function MysqlRouteView(props) {
	const t = props.t;
	const kb = props.kb;
	const route = kb === null || kb === undefined ? null : kb.learningRoute;
	const pages = kb === null || kb === undefined || kb.pages === undefined ? {} : kb.pages;
	const progress = props.progress !== null && typeof props.progress === 'object' ? props.progress : {};
	const onToggleItem = typeof props.onToggleItem === 'function' ? props.onToggleItem : function () {};
	const onOpenPage = typeof props.onOpenPage === 'function' ? props.onOpenPage : function () {};
	const onGoPlayground = typeof props.onGoPlayground === 'function' ? props.onGoPlayground : function () {};
	const [trackId, setTrackId] = React.useState(null);
	const [collapsed, setCollapsed] = React.useState({});
	const mainRef = React.useRef(null);

	if (route === null || route === undefined || !Array.isArray(route.stages)) {
		return h('div', { className: 'myr-view' },
			h('style', { key: 'route-styles' }, MYSQL_CSS_ROUTE),
			h('div', { className: 'my-empty' }, MysqlGlyph({ name: 'route', size: 26 }), h('p', null, t('route.empty')))
		);
	}

	const stages = route.stages;
	const tracks = Array.isArray(route.tracks) ? route.tracks : MYSQL_EMPTY;
	const checkpoints = Array.isArray(route.checkpoints) ? route.checkpoints : MYSQL_EMPTY;
	const activeTrack = trackId === null ? (tracks.length > 0 ? tracks[0] : null) : tracks.find((track) => track.id === trackId) || null;
	const visibleStages = activeTrack === null || !Array.isArray(activeTrack.stageIds) || activeTrack.stageIds.length === 0
		? stages
		: stages.filter((stage) => activeTrack.stageIds.indexOf(stage.id) >= 0);

	let totalItems = 0;
	let doneItems = 0;
	for (const stage of visibleStages) {
		for (const item of (Array.isArray(stage.items) ? stage.items : [])) {
			totalItems += 1;
			if (progress[item.id] === true) doneItems += 1;
		}
	}
	const percent = totalItems === 0 ? 0 : Math.round((doneItems / totalItems) * 100);
	const visibleHours = visibleStages.reduce((sum, stage) => sum + (typeof stage.hours === 'number' ? stage.hours : 0), 0);
	const trackStageIds = activeTrack !== null && Array.isArray(activeTrack.stageIds) ? activeTrack.stageIds : [];
	const skippedStages = trackStageIds.length > 0 ? stages.filter((stage) => trackStageIds.indexOf(stage.id) < 0) : [];

	const switchTrack = (nextId) => {
		setTrackId(nextId);
		if (mainRef.current !== null) {
			try {
				mainRef.current.scrollTo({ top: 0, behavior: 'smooth' });
			} catch (_error) {
				mainRef.current.scrollTop = 0;
			}
		}
	};

	const toggleCollapse = (stageId) => {
		setCollapsed((current) => {
			const next = Object.assign({}, current);
			if (next[stageId] === true) delete next[stageId];
			else next[stageId] = true;
			return next;
		});
	};

	return h('div', { className: 'myr-view' },
		h('style', { key: 'route-styles' }, MYSQL_CSS_ROUTE),
		h('div', { className: 'myr-main my-scroll', ref: mainRef },
			h('header', { className: 'myr-head' },
				h('div', { className: 'myr-headText' },
					h('span', { className: 'my-eyebrow' }, t('route.eyebrow')),
					h('h2', { className: 'my-sectionTitle' }, route.titleZh === undefined ? t('route.title') : route.titleZh),
					h('p', { className: 'my-sectionIntro' }, route.intro === undefined ? t('route.introFallback') : route.intro)
				),
				h('div', { className: 'myr-progressBox' },
					h('div', { className: 'myr-progressRow' },
						h('span', null, t('route.overall')),
						h('span', { className: 'myr-progressValue' }, t('route.itemsDone', { done: doneItems, total: totalItems }))
					),
					h('div', { className: 'myr-bar myr-barBig', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': percent },
						h('span', { className: 'myr-barFill', style: { width: String(percent) + '%' } })),
					h('div', { className: 'myr-progressMeta' },
						visibleHours > 0 ? h('span', { className: 'my-chip my-chipSoft' }, t('route.trackHours', { n: visibleHours })) : null,
						h('span', { className: 'my-chip my-chipSoft' }, t('route.trackStages', { n: visibleStages.length })))
				)
			),
			tracks.length > 0
				? h('div', { className: 'myr-tracks' },
					h('span', { className: 'myr-trackLabel' }, t('route.track')),
					tracks.map((track) => h('button', {
						key: track.id,
						className: 'myr-track',
						type: 'button',
						'data-active': activeTrack !== null && activeTrack.id === track.id ? 'true' : 'false',
						title: track.description,
						onClick: () => switchTrack(track.id)
					}, h('span', { className: 'myr-trackName' }, track.titleZh),
						h('span', { className: 'myr-trackCount' }, String(Array.isArray(track.stageIds) ? track.stageIds.length : stages.length)))))
				: null,
			activeTrack !== null
				? h('div', { className: 'myr-trackSummary' },
					h('div', { className: 'myr-trackSummaryText' },
						h('strong', { className: 'myr-trackSummaryTitle' }, activeTrack.titleZh),
						typeof activeTrack.description === 'string' && activeTrack.description !== ''
							? h('p', { className: 'myr-trackSummaryDesc' }, activeTrack.description)
							: null,
						skippedStages.length > 0
							? h('p', { className: 'myr-trackSkipped' }, t('route.skippedStages', { names: skippedStages.map((stage) => stage.titleZh === undefined ? stage.title : stage.titleZh).join('、') }))
							: null),
					h('div', { className: 'myr-trackStats' },
						h('span', { className: 'my-chip my-chipBrand' }, t('route.trackStages', { n: visibleStages.length })),
						h('span', { className: 'my-chip my-chipSoft' }, t('route.trackItems', { n: totalItems })),
						visibleHours > 0 ? h('span', { className: 'my-chip my-chipSoft' }, t('route.trackHours', { n: visibleHours })) : null))
				: null,
			h('div', { className: 'myr-timeline' }, visibleStages.map((stage, index) => h(MysqlRouteStage, {
				key: stage.id,
				t,
				stage,
				index,
				pages,
				progress,
				collapsed: collapsed[stage.id] === true,
				onToggleCollapse: toggleCollapse,
				onToggleItem,
				onOpenPage,
				onGoPlayground
			}))),
			checkpoints.length > 0
				? h('section', { className: 'myr-checkpoints' },
					h('h3', { className: 'myr-checkpointsTitle' }, MysqlGlyph({ name: 'check', size: 14 }), h('span', null, t('route.checkpoints'))),
					h('div', { className: 'myr-checkpointGrid' }, checkpoints.map((checkpoint, index) => h('div', { className: 'myr-checkpoint', key: 'cp' + String(index) },
						h('span', { className: 'myr-checkpointIndex' }, '✓'),
						h('div', null,
							h('strong', null, String(checkpoint.title)),
							h('p', null, String(checkpoint.description)))))))
				: null
		)
	);
}
// #endregion
